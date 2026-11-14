import { all, get, now, run, tx } from "@/lib/db";
import { handler, ok, body, fail } from "@/lib/api";
import { clearSession, currentUser, requireUser } from "@/lib/auth";
import { activeSubscription } from "@/lib/subscriptions";

export const GET = handler(async () => {
  const u = await currentUser();
  if (!u) return ok({ user: null });
  const addresses = await all("SELECT * FROM addresses WHERE user_id=? ORDER BY is_default DESC, id", u.id);
  const unread = (await get<any>("SELECT COUNT(*) c FROM notifications WHERE user_id=? AND read=0", u.id))!.c;
  const favorites = (await all<any>("SELECT partner_id FROM favorites WHERE user_id=?", u.id)).map((f) => f.partner_id);
  const stats = await get<any>("SELECT COUNT(*) orders, COALESCE(SUM(total),0) spent FROM orders WHERE customer_id=? AND status='delivered'", u.id);
  const m = u.role === "customer" ? await activeSubscription(u.id) : null;
  const member = m ? { plan: m.plan, benefits: m.benefits, sub: { id: m.sub.id, auto_renew: m.sub.auto_renew, current_period_end: m.sub.current_period_end, deliveries_used: m.sub.deliveries_used } } : null;
  return ok({ user: u, addresses, unread, favorites, stats, member });
});

export const PATCH = handler(async (req: Request) => {
  const u = await requireUser();
  const { name, email } = await body(req);
  if (name) await run("UPDATE users SET name=? WHERE id=?", String(name).slice(0, 80), u.id);
  if (email !== undefined) await run("UPDATE users SET email=? WHERE id=?", String(email).slice(0, 120), u.id);
  return ok({ ok: true });
});

/**
 * In-app account deletion (required by Apple App Store Guideline 5.1.1(v) and Google Play).
 * Personal data is erased; order records are kept anonymized for accounting/tax obligations.
 */
export const DELETE = handler(async () => {
  const u = await requireUser();
  if (u.role === "admin") return fail(403, "admin_cannot_self_delete");
  const busy = await get<any>(
    "SELECT COUNT(*) AS c FROM orders WHERE (customer_id=? OR driver_id=?) AND status NOT IN ('delivered','cancelled')",
    u.id, u.driver_id ?? -1,
  );
  if (busy!.c > 0) return fail(409, "active_orders_exist");
  const ts = now();
  await tx(async () => {
    await run("UPDATE users SET name=?, phone=?, email=NULL, status='deleted', deleted_at=?, wallet=0, points=0, partner_id=NULL WHERE id=?", "Deleted user", `deleted:${u.id}:${Date.now()}`, ts, u.id);
    if (u.wallet > 0) await run("INSERT INTO wallet_tx(user_id,amount,kind,note,created_at) VALUES(?,?,?,?,?)", u.id, -u.wallet, "closed", "Account deleted", ts);
    await run("UPDATE orders SET address_text='—', address_lat=0, address_lng=0, notes=NULL, review=NULL WHERE customer_id=?", u.id);
    await run("UPDATE subscriptions SET status='cancelled', auto_renew=0, cancelled_at=? WHERE user_id=? AND status='active'", ts, u.id);
    for (const t of ["addresses", "favorites", "notifications", "push_subscriptions", "mobile_push_tokens"]) await run(`DELETE FROM ${t} WHERE user_id=?`, u.id);
    await run("DELETE FROM media WHERE user_id=? AND private=1", u.id); // photos of their items
    await run("DELETE FROM otp_codes WHERE phone=?", u.phone);
    if (u.driver_id) await run("UPDATE drivers SET status='offline', plate=NULL, lat=NULL, lng=NULL WHERE id=?", u.driver_id);
  });
  await clearSession();
  return ok({ ok: true });
});
