import { get, run, now } from "@/lib/db";
import { handler, ok, body, fail } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { invalidateZones, parsePolygon, setZonePartners } from "@/lib/zones";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler(async (req: Request, { params }: Ctx) => {
  const me = await requirePermission("zones.manage");
  const id = Number((await params).id);
  if (!(await get("SELECT 1 FROM zones WHERE id=?", id))) return fail(404, "not_found");
  const b = await body(req);
  const changes: Record<string, any> = {};
  if (b.name_ar !== undefined) changes.name_ar = String(b.name_ar).trim().slice(0, 60) || null;
  if (b.name_en !== undefined) changes.name_en = String(b.name_en).trim().slice(0, 60) || null;
  if (changes.name_ar === null || changes.name_en === null) return fail(400, "name_required");
  if (b.polygon !== undefined) changes.polygon = JSON.stringify(parsePolygon(b.polygon));
  if (typeof b.color === "string" && /^#[0-9A-Fa-f]{6}$/.test(b.color)) changes.color = b.color;
  if (b.active !== undefined) changes.active = b.active ? 1 : 0;
  for (const [k, v] of Object.entries(changes)) await run(`UPDATE zones SET ${k}=?, updated_at=? WHERE id=?`, v, now(), id);
  await setZonePartners(id, b.partner_ids);
  invalidateZones();
  const action = Object.keys(changes).length === 1 && "active" in changes ? (changes.active ? "zone.open" : "zone.close") : "zone.update";
  await audit(me, action, "zone", id, { ...changes, polygon: changes.polygon ? "updated" : undefined, partners: Array.isArray(b.partner_ids) ? b.partner_ids.length : undefined });
  return ok({ ok: true });
});

export const DELETE = handler(async (_req: Request, { params }: Ctx) => {
  const me = await requirePermission("zones.manage");
  const id = Number((await params).id);
  const z = await get<any>("SELECT name_ar,name_en FROM zones WHERE id=?", id);
  if (!z) return fail(404, "not_found");
  await run("DELETE FROM partner_zones WHERE zone_id=?", id);
  await run("DELETE FROM zones WHERE id=?", id);
  invalidateZones();
  await audit(me, "zone.delete", "zone", id, z);
  return ok({ ok: true });
});
