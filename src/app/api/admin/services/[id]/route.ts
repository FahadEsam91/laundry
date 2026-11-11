import { run } from "@/lib/db";
import { handler, ok, body } from "@/lib/api";
import { requireUser } from "@/lib/auth";
export const PATCH = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireUser("admin");
  const id = Number((await params).id);
  const b = await body(req);
  for (const k of ["name_ar", "name_en", "desc_ar", "desc_en", "color", "sort"]) if (b[k] !== undefined) await run(`UPDATE services SET ${k}=? WHERE id=?`, b[k], id);
  if (b.active !== undefined) await run("UPDATE services SET active=? WHERE id=?", b.active ? 1 : 0, id);
  return ok({ ok: true });
});
