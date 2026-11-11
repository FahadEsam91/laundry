import { all, get, run, now, insert } from "@/lib/db";
import { handler, ok, body, fail } from "@/lib/api";
import { requireUser } from "@/lib/auth";
export const GET = handler(async () => {
  await requireUser("admin");
  return ok({ promos: await all("SELECT p.*,(SELECT COALESCE(SUM(discount),0) FROM orders o WHERE o.promo_code=p.code AND o.status!='cancelled') total_discount FROM promos p ORDER BY active DESC,id DESC") });
});
export const POST = handler(async (req: Request) => {
  await requireUser("admin");
  const b = await body(req);
  const code = String(b.code || "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
  if (code.length < 3) return fail(400, "invalid_code");
  if (!["percent", "fixed", "delivery"].includes(b.kind)) return fail(400, "invalid_kind");
  if (await get("SELECT 1 FROM promos WHERE code=?", code)) return fail(409, "code_exists");
  const id = await insert(
    "INSERT INTO promos(code,kind,value,min_order,max_discount,usage_limit,used,first_order_only,active,expires_at,title_ar,title_en,created_at) VALUES(?,?,?,?,?,?,0,?,1,?,?,?,?)",
    code, b.kind, Number(b.value) || 0, Number(b.min_order) || 0, Number(b.max_discount) || null, Number(b.usage_limit) || null, b.first_order_only ? 1 : 0, b.expires_at || null, b.title_ar || code, b.title_en || code, now(),
  );
  return ok({ id }, 201);
});
