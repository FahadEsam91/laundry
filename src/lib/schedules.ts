import "server-only";
import { all, get, insert, now, run } from "./db";
import { HttpError, type SessionUser } from "./auth";
import { createOrder, notify } from "./orders";
import { getSettings } from "./settings";

/** Orders are created this long before the scheduled pickup, so the laundry and a rider can accept in time. */
const LEAD_MS = 3 * 3600 * 1000;

type Item = { product_id: number; qty: number };

// ------------------------------------------------------------------------------------------- time zones
function parts(d: Date, tz: string) {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const o: Record<string, number> = {};
  for (const p of f.formatToParts(d)) if (p.type !== "literal") o[p.type] = Number(p.value);
  return o as { year: number; month: number; day: number; hour: number; minute: number; second: number };
}
const offsetMs = (d: Date, tz: string) => {
  const p = parts(d, tz);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(d.getTime() / 1000) * 1000;
};

/** Next moment after `from` that falls on one of `days` (0 = Sunday … 6 = Saturday) at `time` (HH:MM) in `tz`. */
export function nextRun(days: number[], time: string, tz: string, from = new Date()): Date | null {
  const [h, m] = time.split(":").map(Number);
  for (let i = 0; i <= 8; i++) {
    const p = parts(new Date(from.getTime() + i * 86400000), tz);
    const weekday = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
    if (!days.includes(weekday)) continue;
    const wall = Date.UTC(p.year, p.month - 1, p.day, h, m);
    const at = new Date(wall - offsetMs(new Date(wall), tz));
    if (at.getTime() > from.getTime() + 60000) return at;
  }
  return null;
}

// ------------------------------------------------------------------------------------------- validation
async function clean(userId: number, b: any) {
  const days = [...new Set((Array.isArray(b.days) ? b.days : []).map(Number).filter((d: number) => Number.isInteger(d) && d >= 0 && d <= 6))] as number[];
  if (!days.length) throw new HttpError(400, "schedule_days_required");
  const time = String(b.time || "");
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time) || time < "07:00" || time > "22:00") throw new HttpError(400, "schedule_time_invalid");
  return { days: days.sort(), time };
}

export async function createSchedule(user: SessionUser, b: any) {
  const { days, time } = await clean(user.id, b);
  const partner = await get<any>("SELECT id FROM partners WHERE id=? AND status='active'", b.partner_id);
  if (!partner) throw new HttpError(400, "partner_unavailable");
  if (!(await get("SELECT 1 FROM addresses WHERE id=? AND user_id=?", b.address_id, user.id))) throw new HttpError(400, "address_required");
  const items: Item[] = (Array.isArray(b.items) ? b.items : []).map((i: any) => ({ product_id: Number(i.product_id), qty: Math.max(1, Math.min(99, Number(i.qty) || 1)) }));
  if (!items.length) throw new HttpError(400, "empty_basket");
  for (const i of items) if (!(await get("SELECT 1 FROM products WHERE id=? AND partner_id=? AND active=1", i.product_id, partner.id))) throw new HttpError(400, "item_unavailable");
  const pay = ["cash", "card_pos", "invoice"].includes(b.payment_method) ? b.payment_method : "cash";
  if ((await all("SELECT id FROM schedules WHERE user_id=? AND active=1", user.id)).length >= 5) throw new HttpError(400, "too_many_schedules");
  const s = await getSettings();
  const next = nextRun(days, time, s.timezone || "Asia/Baghdad");
  const id = await insert(
    "INSERT INTO schedules(user_id,partner_id,address_id,days,time,items,express,payment_method,notes,active,next_run_at,created_at) VALUES(?,?,?,?,?,?,?,?,?,1,?,?)",
    user.id, partner.id, b.address_id, days.join(","), time, JSON.stringify(items), b.express ? 1 : 0, pay, b.notes ? String(b.notes).slice(0, 300) : null, next?.toISOString() ?? null, now(),
  );
  return { id, next_run_at: next?.toISOString() ?? null };
}

export async function updateSchedule(userId: number, id: number, b: any) {
  const sc = await get<any>("SELECT * FROM schedules WHERE id=? AND user_id=?", id, userId);
  if (!sc) throw new HttpError(404, "not_found");
  const days = b.days !== undefined || b.time !== undefined ? await clean(userId, { days: b.days ?? sc.days.split(","), time: b.time ?? sc.time }) : { days: sc.days.split(",").map(Number), time: sc.time };
  const active = b.active === undefined ? !!sc.active : !!b.active;
  const s = await getSettings();
  const next = active ? nextRun(days.days, days.time, s.timezone || "Asia/Baghdad") : null;
  await run("UPDATE schedules SET days=?, time=?, active=?, next_run_at=?, last_error=NULL WHERE id=?", days.days.join(","), days.time, active ? 1 : 0, next?.toISOString() ?? null, id);
  return { next_run_at: next?.toISOString() ?? null };
}

export async function listSchedules(userId: number) {
  const rows = await all<any>(
    `SELECT s.*, p.name_ar partner_ar, p.name_en partner_en, p.color, p.color2, p.initials, p.logo_url, a.area address_area, a.label address_label
     FROM schedules s JOIN partners p ON p.id=s.partner_id LEFT JOIN addresses a ON a.id=s.address_id WHERE s.user_id=? ORDER BY s.active DESC, s.id DESC`,
    userId,
  );
  for (const r of rows) {
    r.days = r.days.split(",").map(Number);
    r.items = JSON.parse(r.items);
    r.items_count = r.items.reduce((a: number, i: Item) => a + i.qty, 0);
  }
  return rows;
}

// ------------------------------------------------------------------------------------------- runner
let running = false;
/** Creates the orders of every schedule whose next pickup is within the lead time. Safe to call often. */
export async function runSchedules() {
  if (running) return;
  running = true;
  try {
    const s = await getSettings();
    const tz = s.timezone || "Asia/Baghdad";
    const horizon = new Date(Date.now() + LEAD_MS).toISOString();
    const due = await all<any>("SELECT * FROM schedules WHERE active=1 AND next_run_at IS NOT NULL AND next_run_at<=?", horizon);
    for (const sc of due) {
      const at = sc.next_run_at as string;
      const following = nextRun(sc.days.split(",").map(Number), sc.time, tz, new Date(new Date(at).getTime() + 60000));
      // claim this occurrence first, so two servers (or two ticks) never create it twice
      const { changes } = await run("UPDATE schedules SET next_run_at=?, last_run_at=? WHERE id=? AND next_run_at=?", following?.toISOString() ?? null, at, sc.id, at);
      if (!changes) continue;
      const u = await get<any>("SELECT id,name,phone,role,partner_id FROM users WHERE id=? AND (status IS NULL OR status!='deleted')", sc.user_id);
      if (!u) { await run("UPDATE schedules SET active=0 WHERE id=?", sc.id); continue; }
      const pickup = new Date(at) < new Date() ? "asap" : at;
      try {
        const o = await createOrder(u as SessionUser, {
          partner_id: sc.partner_id, address_id: sc.address_id, items: JSON.parse(sc.items), express: !!sc.express,
          payment_method: sc.payment_method, notes: sc.notes || undefined, pickup_slot: pickup, schedule_id: sc.id,
        });
        await run("UPDATE schedules SET last_order_id=?, last_error=NULL WHERE id=?", o.id, sc.id);
        await notify(u.id, "🔁 تم إنشاء طلبك المجدول", "🔁 Your scheduled order is placed", `${o.code} • سيأتي المندوب في الموعد المحدد`, `${o.code} • a rider will come at your usual time`, o.id);
      } catch (e: any) {
        const code = String(e?.code || e?.message || "error");
        await run("UPDATE schedules SET last_error=? WHERE id=?", code, sc.id);
        await notify(u.id, "⚠️ تعذر إنشاء طلبك المجدول", "⚠️ Your scheduled order couldn't be placed", "افتح الطلبات المجدولة لمعرفة السبب", "Open your scheduled pickups to see why", undefined, "/account/schedules");
      }
    }
  } finally {
    running = false;
  }
}
