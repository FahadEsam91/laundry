import { all } from "@/lib/db";
import { handler, ok, fail } from "@/lib/api";
import { requireUser } from "@/lib/auth";
export const GET = handler(async () => {
  const u = await requireUser("partner");
  if (!u.partner_id) return fail(403, "no_partner");
  return ok({ products: all("SELECT p.*,s.name_ar s_ar,s.name_en s_en,s.slug FROM products p JOIN services s ON s.id=p.service_id WHERE p.partner_id=? ORDER BY s.sort,p.id", u.partner_id) });
});
