import "server-only";
import { randomBytes } from "node:crypto";
import { all, get, insert, now, run, tx } from "./db";
import { HttpError, can, type SessionUser } from "./auth";

/** Unambiguous alphabet for printed labels (no 0/O, 1/I/L). */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export type Stage = "collect" | "receive" | "ready";
const STAGE_COL: Record<Stage, string> = { collect: "collected_at", receive: "received_at", ready: "ready_at" };

function newCode() {
  const b = randomBytes(8);
  let s = "";
  for (let i = 0; i < 8; i++) s += ALPHABET[b[i] % ALPHABET.length];
  return `NQ-${s.slice(0, 4)}-${s.slice(4)}`;
}

/** Codes are printed in upper case; scanners and people may type them differently. */
export function normalizeTag(raw: unknown) {
  const s = String(raw ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const body = s.startsWith("NQ") ? s.slice(2) : s;
  return body.length === 8 ? `NQ-${body.slice(0, 4)}-${body.slice(4)}` : null;
}

export async function createBatch(count: number) {
  const n = Math.max(1, Math.min(500, Math.floor(count) || 0));
  const batch = new Date().toISOString().slice(0, 16).replace("T", " ");
  const codes: string[] = [];
  await tx(async () => {
    while (codes.length < n) {
      const c = newCode();
      if (await get("SELECT 1 FROM tags WHERE code=?", c)) continue;
      await run("INSERT INTO tags(code,batch,created_at) VALUES(?,?,?)", c, batch, now());
      codes.push(c);
    }
  });
  return { batch, codes };
}

/** Who may scan at which stage of which order. */
function allowed(u: SessionUser, o: any, stage: Stage) {
  if (can(u, "orders.manage")) return true;
  if (u.role === "driver" && stage === "collect") return !!u.driver_id && o.driver_id === u.driver_id && ["driver_assigned", "picked_up"].includes(o.status);
  if (u.role === "partner") return o.partner_id === u.partner_id && ["picked_up", "at_laundry", "processing", "ready"].includes(o.status);
  return false;
}

/**
 * Scan a label on an order. A blank label becomes a new garment of the order's customer (needs the item type);
 * a known label must belong to the same customer. Each stage is recorded once.
 */
export async function scanTag(u: SessionUser, orderId: number, rawCode: unknown, stage: Stage, productId?: number, name?: string) {
  const code = normalizeTag(rawCode);
  if (!code) throw new HttpError(400, "tag_invalid");
  if (!STAGE_COL[stage]) throw new HttpError(400, "invalid_action");
  return await tx(async () => {
    const o = await get<any>("SELECT * FROM orders WHERE id=?", orderId);
    if (!o) throw new HttpError(404, "not_found");
    if (!allowed(u, o, stage)) throw new HttpError(403, "forbidden");
    const tag = await get<any>("SELECT * FROM tags WHERE code=?", code);
    if (!tag) throw new HttpError(404, "tag_unknown");
    let g = tag.garment_id ? await get<any>("SELECT * FROM garments WHERE id=?", tag.garment_id) : null;
    if (g && g.customer_id !== o.customer_id) throw new HttpError(409, "tag_other_customer");
    let created = false;
    if (!g) {
      if (stage === "ready") throw new HttpError(409, "tag_not_on_order");
      const item = productId ? await get<any>("SELECT oi.product_id,oi.name_ar,oi.name_en,oi.icon FROM order_items oi WHERE oi.order_id=? AND oi.product_id=?", orderId, productId) : null;
      if (!item) throw new HttpError(400, "tag_item_required");
      const gid = await insert(
        "INSERT INTO garments(customer_id,tag,product_id,name,icon,notes,created_at) VALUES(?,?,?,?,?,?,?)",
        o.customer_id, code, item.product_id, (name && String(name).slice(0, 60)) || item.name_ar, item.icon, null, now(),
      );
      await run("UPDATE tags SET garment_id=? WHERE code=?", gid, code);
      g = await get<any>("SELECT * FROM garments WHERE id=?", gid);
      created = true;
    }
    const link = await get<any>("SELECT * FROM order_garments WHERE order_id=? AND garment_id=?", orderId, g.id);
    if (!link) {
      if (stage === "ready") throw new HttpError(409, "tag_not_on_order");
      await run("INSERT INTO order_garments(order_id,garment_id) VALUES(?,?)", orderId, g.id);
    }
    await run(`UPDATE order_garments SET ${STAGE_COL[stage]}=COALESCE(${STAGE_COL[stage]},?) WHERE order_id=? AND garment_id=?`, now(), orderId, g.id);
    return { garment: { id: g.id, tag: g.tag, name: g.name, icon: g.icon }, created, counts: await stageCounts(orderId) };
  });
}

export async function stageCounts(orderId: number) {
  const r = (await get<any>(
    "SELECT COUNT(*) total, COUNT(collected_at) collected, COUNT(received_at) received, COUNT(ready_at) ready, COUNT(delivered_at) delivered FROM order_garments WHERE order_id=?",
    orderId,
  ))!;
  return { total: Number(r.total), collected: Number(r.collected), received: Number(r.received), ready: Number(r.ready), delivered: Number(r.delivered) };
}

/** Per-garment progress for an order. */
export async function orderGarments(orderId: number) {
  return await all<any>(
    `SELECT g.id,g.tag,g.name,g.icon,g.wash_count,og.collected_at,og.received_at,og.ready_at,og.delivered_at
     FROM order_garments og JOIN garments g ON g.id=og.garment_id WHERE og.order_id=? ORDER BY g.id`,
    orderId,
  );
}

/** Called when an order is delivered: every garment on it is cleaned once more. */
export async function deliverGarments(orderId: number) {
  const ts = now();
  await run("UPDATE order_garments SET delivered_at=? WHERE order_id=? AND delivered_at IS NULL", ts, orderId);
  await run(
    "UPDATE garments SET wash_count=wash_count+1, last_order_id=?, last_cleaned_at=? WHERE id IN (SELECT garment_id FROM order_garments WHERE order_id=?)",
    orderId, ts, orderId,
  );
}

export async function wardrobe(customerId: number) {
  return await all<any>(
    `SELECT g.*, (SELECT o.code FROM orders o WHERE o.id=g.last_order_id) last_order_code,
       (SELECT o2.status FROM order_garments og2 JOIN orders o2 ON o2.id=og2.order_id WHERE og2.garment_id=g.id AND o2.status NOT IN ('delivered','cancelled') ORDER BY o2.id DESC LIMIT 1) active_status
     FROM garments g WHERE g.customer_id=? ORDER BY COALESCE(g.last_cleaned_at, g.created_at) DESC`,
    customerId,
  );
}
