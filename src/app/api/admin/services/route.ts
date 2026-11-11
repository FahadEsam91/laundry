import { all } from "@/lib/db";
import { handler, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
export const GET = handler(async () => {
  await requireUser("admin");
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  return ok({
    services: all(
      `SELECT s.*,
        (SELECT COUNT(DISTINCT partner_id) FROM products p WHERE p.service_id=s.id AND p.active=1) partners,
        (SELECT COUNT(*) FROM products p WHERE p.service_id=s.id) products,
        (SELECT COALESCE(SUM(i.qty*i.unit_price),0) FROM order_items i JOIN orders o ON o.id=i.order_id WHERE i.service_id=s.id AND o.status!='cancelled' AND o.created_at>=?) sales_30,
        (SELECT ROUND(AVG(price)) FROM products p WHERE p.service_id=s.id AND p.active=1) avg_price
       FROM services s ORDER BY s.sort`,
      since,
    ),
  });
});
