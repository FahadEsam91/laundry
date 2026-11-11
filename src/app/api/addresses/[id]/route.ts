import { get, run } from "@/lib/db";
import { handler, ok, body, fail } from "@/lib/api";
import { requireUser } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler(async (req: Request, { params }: Ctx) => {
  const u = await requireUser();
  const id = Number((await params).id);
  if (!get("SELECT 1 FROM addresses WHERE id=? AND user_id=?", id, u.id)) return fail(404, "not_found");
  const b = await body(req);
  if (b.is_default) {
    run("UPDATE addresses SET is_default=0 WHERE user_id=?", u.id);
    run("UPDATE addresses SET is_default=1 WHERE id=?", id);
  }
  for (const k of ["label", "area", "street", "building", "notes", "lat", "lng"]) if (b[k] !== undefined) run(`UPDATE addresses SET ${k}=? WHERE id=?`, b[k], id);
  return ok({ ok: true });
});

export const DELETE = handler(async (_req: Request, { params }: Ctx) => {
  const u = await requireUser();
  const id = Number((await params).id);
  run("DELETE FROM addresses WHERE id=? AND user_id=?", id, u.id);
  const def = get("SELECT 1 FROM addresses WHERE user_id=? AND is_default=1", u.id);
  if (!def) run("UPDATE addresses SET is_default=1 WHERE id=(SELECT id FROM addresses WHERE user_id=? LIMIT 1)", u.id);
  return ok({ ok: true });
});
