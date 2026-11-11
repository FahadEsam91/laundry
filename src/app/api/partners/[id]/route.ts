import { all, get } from "@/lib/db";
import { handler, ok, fail } from "@/lib/api";

export const GET = handler(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const partner = get<any>("SELECT * FROM partners WHERE id=? AND status='active'", Number(id));
  if (!partner) return fail(404, "not_found");
  const products = all("SELECT p.*,s.slug AS service_slug FROM products p JOIN services s ON s.id=p.service_id WHERE p.partner_id=? AND p.active=1 ORDER BY s.sort, p.popular DESC, p.id", partner.id);
  const services = all("SELECT DISTINCT s.* FROM services s JOIN products p ON p.service_id=s.id WHERE p.partner_id=? AND p.active=1 AND s.active=1 ORDER BY s.sort", partner.id);
  const reviews = all("SELECT o.rating,o.review,o.created_at,u.name FROM orders o JOIN users u ON u.id=o.customer_id WHERE o.partner_id=? AND o.rating IS NOT NULL AND o.review IS NOT NULL AND o.review!='' ORDER BY o.created_at DESC LIMIT 6", partner.id);
  return ok({ partner, products, services, reviews });
});
