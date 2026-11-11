import { run } from "@/lib/db";
import { handler, ok, body } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
type Ctx = { params: Promise<{ id: string }> };
export const PATCH = handler(async (req: Request, { params }: Ctx) => {
  const me = await requirePermission("promos.manage");
  const id = Number((await params).id);
  const b = await body(req);
  for (const k of ["value", "min_order", "max_discount", "usage_limit", "expires_at", "title_ar", "title_en"]) if (b[k] !== undefined) await run(`UPDATE promos SET ${k}=? WHERE id=?`, b[k], id);
  if (b.active !== undefined) await run("UPDATE promos SET active=? WHERE id=?", b.active ? 1 : 0, id);
  await audit(me, b.active !== undefined && Object.keys(b).length === 1 ? (b.active ? "promo.enable" : "promo.disable") : "promo.update", "promo", id, b);
  return ok({ ok: true });
});
export const DELETE = handler(async (_req: Request, { params }: Ctx) => {
  const me2 = await requirePermission("promos.manage");
  const pid = Number((await params).id);
  await run("DELETE FROM promos WHERE id=?", pid);
  await audit(me2, "promo.delete", "promo", pid);
  return ok({ ok: true });
});
