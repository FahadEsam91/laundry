import { get } from "@/lib/db";
import { handler, ok, fail } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { autopilotTick, listOrders } from "@/lib/orders";

export const GET = handler(async (req: Request) => {
  const u = await requireUser("partner");
  const pid = u.role === "admin" ? Number(new URL(req.url).searchParams.get("partner_id")) || 1 : u.partner_id;
  if (!pid) return fail(403, "no_partner");
  autopilotTick();
  const partner = get<any>("SELECT * FROM partners WHERE id=?", pid);
  const active = listOrders("o.partner_id=? AND o.status NOT IN ('delivered','cancelled')", [pid], 200);
  const history = listOrders("o.partner_id=? AND o.status IN ('delivered','cancelled')", [pid], 30);
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const today = get<any>(
    "SELECT COUNT(*) orders, COALESCE(SUM(subtotal),0) sales FROM orders WHERE partner_id=? AND status!='cancelled' AND created_at>=?",
    pid, since.toISOString(),
  );
  const month = get<any>(
    "SELECT COUNT(*) orders, COALESCE(SUM(subtotal),0) sales, AVG(rating) rating FROM orders WHERE partner_id=? AND status='delivered' AND created_at>=?",
    pid, new Date(Date.now() - 30 * 86400000).toISOString(),
  );
  return ok({ partner, active, history, today, month, net: month.sales * (1 - partner.commission / 100) });
});
