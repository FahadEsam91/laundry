import { run } from "@/lib/db";
import { handler, ok, body } from "@/lib/api";
import { requireUser } from "@/lib/auth";
export const POST = handler(async (req: Request) => {
  const u = await requireUser("driver");
  const b = await body(req);
  if (b.status) run("UPDATE drivers SET status=? WHERE user_id=?", b.status === "online" ? "online" : "offline", u.id);
  if (Number.isFinite(b.lat) && Number.isFinite(b.lng)) run("UPDATE drivers SET lat=?,lng=? WHERE user_id=?", b.lat, b.lng, u.id);
  return ok({ ok: true });
});
