import { all, run } from "@/lib/db";
import { handler, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
export const GET = handler(async () => {
  const u = await requireUser();
  return ok({ notifications: all("SELECT * FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 60", u.id) });
});
export const POST = handler(async () => {
  const u = await requireUser();
  run("UPDATE notifications SET read=1 WHERE user_id=?", u.id);
  return ok({ ok: true });
});
