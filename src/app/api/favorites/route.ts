import { get, run } from "@/lib/db";
import { handler, ok, body } from "@/lib/api";
import { requireUser } from "@/lib/auth";
export const POST = handler(async (req: Request) => {
  const u = await requireUser();
  const { partner_id } = await body(req);
  const ex = await get("SELECT 1 FROM favorites WHERE user_id=? AND partner_id=?", u.id, partner_id);
  if (ex) await run("DELETE FROM favorites WHERE user_id=? AND partner_id=?", u.id, partner_id);
  else await run("INSERT INTO favorites(user_id,partner_id) VALUES(?,?)", u.id, partner_id);
  return ok({ favorite: !ex });
});
