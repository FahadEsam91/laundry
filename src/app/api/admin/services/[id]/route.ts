import { run } from "@/lib/db";
import { handler, ok, body } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
export const PATCH = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const me = await requirePermission("catalog.manage");
  const id = Number((await params).id);
  const b = await body(req);
  for (const k of ["name_ar", "name_en", "desc_ar", "desc_en", "color", "sort"]) if (b[k] !== undefined) await run(`UPDATE services SET ${k}=? WHERE id=?`, b[k], id);
  if (b.active !== undefined) await run("UPDATE services SET active=? WHERE id=?", b.active ? 1 : 0, id);
  await audit(me, "service.update", "service", id, b);
  return ok({ ok: true });
});
