import { run, now } from "@/lib/db";
import { handler, ok, body, fail } from "@/lib/api";
import { requireUser } from "@/lib/auth";
export const POST = handler(async (req: Request) => {
  await requireUser("admin");
  const b = await body(req);
  if (!b.name_ar || !b.name_en || !(Number(b.price) > 0)) return fail(400, "invalid_plan");
  const slug = `${String(b.name_en).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now().toString(36)}`;
  const { id } = run(
    "INSERT INTO plans(slug,name_ar,name_en,desc_ar,desc_en,price,interval_days,free_deliveries,discount_pct,no_service_fee,express_discount_pct,priority_support,color,popular,active,sort,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,0,1,99,?)",
    slug, b.name_ar, b.name_en, b.desc_ar || "", b.desc_en || "", Number(b.price), Number(b.interval_days) || 30, Number(b.free_deliveries ?? -1), Number(b.discount_pct) || 0, b.no_service_fee ? 1 : 0, Number(b.express_discount_pct) || 0, b.priority_support ? 1 : 0, b.color || "#1A62EC", now(),
  );
  return ok({ id }, 201);
});
