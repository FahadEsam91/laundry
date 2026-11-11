import { get, run } from "@/lib/db";
import { handler, ok, body, fail } from "@/lib/api";
import { requireUser } from "@/lib/auth";
export const PATCH = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireUser("admin");
  const id = Number((await params).id);
  const d = get<any>("SELECT * FROM drivers WHERE id=?", id);
  if (!d) return fail(404, "not_found");
  const b = await body(req);
  if (b.status) run("UPDATE drivers SET status=? WHERE id=?", b.status, id);
  if (b.vehicle) run("UPDATE drivers SET vehicle=? WHERE id=?", b.vehicle, id);
  if (b.plate !== undefined) run("UPDATE drivers SET plate=? WHERE id=?", b.plate, id);
  if (b.user_status) run("UPDATE users SET status=? WHERE id=?", b.user_status, d.user_id);
  if (b.user_status === "suspended") run("UPDATE drivers SET status='offline' WHERE id=?", id);
  return ok({ ok: true });
});
