import { run } from "@/lib/db";
import { handler, ok, body } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
const FIELDS = ["name_ar", "name_en", "desc_ar", "desc_en", "price", "interval_days", "free_deliveries", "discount_pct", "express_discount_pct", "color", "sort"];
const BOOLS = ["no_service_fee", "priority_support", "popular", "active"];
export const PATCH = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const me = await requirePermission("subscriptions.manage");
  const id = Number((await params).id);
  const b = await body(req);
  for (const k of FIELDS) if (b[k] !== undefined) await run(`UPDATE plans SET ${k}=? WHERE id=?`, b[k], id);
  for (const k of BOOLS) if (b[k] !== undefined) await run(`UPDATE plans SET ${k}=? WHERE id=?`, b[k] ? 1 : 0, id);
  if (b.popular) await run("UPDATE plans SET popular=0 WHERE id!=?", id);
  await audit(me, "plan.update", "plan", id, b);
  return ok({ ok: true });
});
