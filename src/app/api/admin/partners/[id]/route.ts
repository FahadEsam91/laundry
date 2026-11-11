import { get, run } from "@/lib/db";
import { handler, ok, body, fail } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";

const FIELDS = ["name_ar", "name_en", "desc_ar", "desc_en", "area_ar", "area_en", "lat", "lng", "eta_hours", "express_hours", "delivery_fee", "min_order", "commission", "is_open", "status", "featured", "tags", "phone"];

export const PATCH = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const me = await requirePermission("partners.manage");
  const id = Number((await params).id);
  if (!await get("SELECT 1 FROM partners WHERE id=?", id)) return fail(404, "not_found");
  const b = await body(req);
  for (const k of FIELDS) if (b[k] !== undefined) await run(`UPDATE partners SET ${k}=? WHERE id=?`, typeof b[k] === "boolean" ? (b[k] ? 1 : 0) : b[k], id);
  if (b.status === "active") await run("UPDATE partners SET is_open=1 WHERE id=? AND is_open=0 AND status='active'", id);
  await audit(me, b.status && Object.keys(b).length <= 2 ? `partner.${b.status}` : "partner.update", "partner", id, Object.fromEntries(FIELDS.filter((k) => b[k] !== undefined).map((k) => [k, b[k]])));
  return ok({ ok: true });
});
