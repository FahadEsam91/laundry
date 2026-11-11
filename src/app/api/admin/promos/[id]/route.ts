import { run } from "@/lib/db";
import { handler, ok, body } from "@/lib/api";
import { requireUser } from "@/lib/auth";
type Ctx = { params: Promise<{ id: string }> };
export const PATCH = handler(async (req: Request, { params }: Ctx) => {
  await requireUser("admin");
  const id = Number((await params).id);
  const b = await body(req);
  for (const k of ["value", "min_order", "max_discount", "usage_limit", "expires_at", "title_ar", "title_en"]) if (b[k] !== undefined) run(`UPDATE promos SET ${k}=? WHERE id=?`, b[k], id);
  if (b.active !== undefined) run("UPDATE promos SET active=? WHERE id=?", b.active ? 1 : 0, id);
  return ok({ ok: true });
});
export const DELETE = handler(async (_req: Request, { params }: Ctx) => {
  await requireUser("admin");
  run("DELETE FROM promos WHERE id=?", Number((await params).id));
  return ok({ ok: true });
});
