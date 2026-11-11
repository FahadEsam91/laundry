import { all, get } from "@/lib/db";
import { handler, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
export const GET = handler(async (req: Request) => {
  await requireUser("admin");
  const sp = new URL(req.url).searchParams;
  const q = sp.get("q")?.trim();
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const size = 20;
  const where = q ? "u.role='customer' AND (u.name LIKE ? OR u.phone LIKE ?)" : "u.role='customer'";
  const params = q ? [`%${q}%`, `%${q}%`] : [];
  const customers = all(
    `SELECT u.id,u.name,u.phone,u.wallet,u.points,u.status,u.created_at,u.last_seen,
      (SELECT COUNT(*) FROM orders o WHERE o.customer_id=u.id AND o.status!='cancelled') orders,
      (SELECT COALESCE(SUM(total),0) FROM orders o WHERE o.customer_id=u.id AND o.status='delivered') spent,
      (SELECT MAX(created_at) FROM orders o WHERE o.customer_id=u.id) last_order,
      (SELECT area FROM addresses a WHERE a.user_id=u.id ORDER BY is_default DESC LIMIT 1) area
     FROM users u WHERE ${where} ORDER BY spent DESC LIMIT ? OFFSET ?`,
    ...params, size, (page - 1) * size,
  );
  const total = get<any>(`SELECT COUNT(*) c FROM users u WHERE ${where}`, ...params)!.c;
  return ok({ customers, total, page, size });
});
