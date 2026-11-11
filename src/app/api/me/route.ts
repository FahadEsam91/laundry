import { all, get, run } from "@/lib/db";
import { handler, ok, body } from "@/lib/api";
import { currentUser, requireUser } from "@/lib/auth";

export const GET = handler(async () => {
  const u = await currentUser();
  if (!u) return ok({ user: null });
  const addresses = all("SELECT * FROM addresses WHERE user_id=? ORDER BY is_default DESC, id", u.id);
  const unread = get<any>("SELECT COUNT(*) c FROM notifications WHERE user_id=? AND read=0", u.id)!.c;
  const favorites = all<any>("SELECT partner_id FROM favorites WHERE user_id=?", u.id).map((f) => f.partner_id);
  const stats = get<any>("SELECT COUNT(*) orders, COALESCE(SUM(total),0) spent FROM orders WHERE customer_id=? AND status='delivered'", u.id);
  return ok({ user: u, addresses, unread, favorites, stats });
});

export const PATCH = handler(async (req: Request) => {
  const u = await requireUser();
  const { name, email } = await body(req);
  if (name) run("UPDATE users SET name=? WHERE id=?", String(name).slice(0, 80), u.id);
  if (email !== undefined) run("UPDATE users SET email=? WHERE id=?", String(email).slice(0, 120), u.id);
  return ok({ ok: true });
});
