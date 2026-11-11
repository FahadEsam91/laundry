import { get, run } from "@/lib/db";
import { handler, ok, fail, body } from "@/lib/api";
import { can, requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
export const PATCH = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const u = await requireUser();
  if (u.role !== "partner" && !can(u, "partners.manage")) return fail(403, "forbidden");
  const id = Number((await params).id);
  const p = await get<any>("SELECT partner_id FROM products WHERE id=?", id);
  if (!p || (u.role === "partner" && p.partner_id !== u.partner_id)) return fail(404, "not_found");
  const b = await body(req);
  if (b.price !== undefined && Number(b.price) >= 0) await run("UPDATE products SET price=? WHERE id=?", Number(b.price), id);
  if (b.active !== undefined) await run("UPDATE products SET active=? WHERE id=?", b.active ? 1 : 0, id);
  if (b.popular !== undefined) await run("UPDATE products SET popular=? WHERE id=?", b.popular ? 1 : 0, id);
  if (u.role === "admin") await audit(u, "product.update", "product", id, b);
  return ok({ ok: true });
});
