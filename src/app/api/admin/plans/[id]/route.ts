import { run } from "@/lib/db";
import { handler, ok, body } from "@/lib/api";
import { requireUser } from "@/lib/auth";
const FIELDS = ["name_ar", "name_en", "desc_ar", "desc_en", "price", "interval_days", "free_deliveries", "discount_pct", "express_discount_pct", "color", "sort"];
const BOOLS = ["no_service_fee", "priority_support", "popular", "active"];
export const PATCH = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireUser("admin");
  const id = Number((await params).id);
  const b = await body(req);
  for (const k of FIELDS) if (b[k] !== undefined) run(`UPDATE plans SET ${k}=? WHERE id=?`, b[k], id);
  for (const k of BOOLS) if (b[k] !== undefined) run(`UPDATE plans SET ${k}=? WHERE id=?`, b[k] ? 1 : 0, id);
  if (b.popular) run("UPDATE plans SET popular=0 WHERE id!=?", id);
  return ok({ ok: true });
});
