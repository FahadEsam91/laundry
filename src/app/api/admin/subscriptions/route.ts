import { all, get } from "@/lib/db";
import { handler, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { renewDue } from "@/lib/subscriptions";
import { getSettings } from "@/lib/settings";

export const GET = handler(async (req: Request) => {
  await requireUser("admin");
  renewDue();
  const sp = new URL(req.url).searchParams;
  const status = sp.get("status") || "active";
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const size = 20;
  const nowIso = new Date().toISOString();
  const since30 = new Date(Date.now() - 30 * 86400000).toISOString();
  const s = getSettings();

  const plans = all<any>(
    `SELECT p.*,
      (SELECT COUNT(*) FROM subscriptions x WHERE x.plan_id=p.id AND x.status='active') subscribers,
      (SELECT COUNT(*) FROM subscriptions x WHERE x.plan_id=p.id AND x.status='active' AND x.auto_renew=0) cancelling
     FROM plans p ORDER BY p.sort,p.price`,
  );
  const active = plans.reduce((a, p) => a + p.subscribers, 0);
  // MRR = recurring revenue of members that will renew, normalized to 30 days
  const mrr = plans.reduce((a, p) => a + (p.subscribers - p.cancelling) * p.price * (30 / p.interval_days), 0);
  const revenue30 = get<any>("SELECT COALESCE(SUM(amount),0) v FROM subscription_payments WHERE created_at>=?", since30)!.v;
  const new30 = get<any>("SELECT COUNT(*) c FROM subscriptions WHERE started_at>=?", since30)!.c;
  const churned30 = get<any>("SELECT COUNT(*) c FROM subscriptions WHERE cancelled_at>=? OR (status='expired' AND current_period_end>=? AND current_period_end<=?)", since30, since30, nowIso)!.c;
  const savings30 = get<any>("SELECT COALESCE(SUM(sub_savings),0) v FROM orders WHERE subscription_id IS NOT NULL AND status!='cancelled' AND created_at>=?", since30)!.v;
  const memberOrders = get<any>("SELECT COUNT(*) c, COALESCE(AVG(total),0) aov FROM orders WHERE subscription_id IS NOT NULL AND status!='cancelled' AND created_at>=?", since30)!;
  const otherOrders = get<any>("SELECT COALESCE(AVG(total),0) aov FROM orders WHERE subscription_id IS NULL AND status!='cancelled' AND created_at>=?", since30)!;

  // active members over the last 60 days (one point per day)
  const tz = s.timezone || "UTC";
  const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
  const subsAll = all<any>("SELECT started_at,cancelled_at,status,current_period_end FROM subscriptions");
  const series = [];
  for (let i = 59; i >= 0; i--) {
    const t = Date.now() - i * 86400000;
    const iso = new Date(t).toISOString();
    const members = subsAll.filter((x) => x.started_at <= iso && (x.status === "active" ? true : (x.status === "expired" ? x.current_period_end : x.cancelled_at || x.current_period_end) > iso)).length;
    series.push({ date: dayKey.format(new Date(t)), members });
  }

  const where = status === "all" ? "1=1" : status === "cancelling" ? "s.status='active' AND s.auto_renew=0" : "s.status=?";
  const params = status === "all" || status === "cancelling" ? [] : [status];
  const subscribers = all(
    `SELECT s.*,u.name,u.phone,p.name_ar plan_ar,p.name_en plan_en,p.color,p.price,p.free_deliveries,
       (SELECT COALESCE(SUM(amount),0) FROM subscription_payments sp WHERE sp.subscription_id=s.id) paid,
       (SELECT COALESCE(SUM(sub_savings),0) FROM orders o WHERE o.subscription_id=s.id AND o.status!='cancelled') saved
     FROM subscriptions s JOIN users u ON u.id=s.user_id JOIN plans p ON p.id=s.plan_id WHERE ${where} ORDER BY s.started_at DESC LIMIT ? OFFSET ?`,
    ...params, size, (page - 1) * size,
  );
  const total = get<any>(`SELECT COUNT(*) c FROM subscriptions s WHERE ${where}`, ...params)!.c;
  const customers = get<any>("SELECT COUNT(*) c FROM users WHERE role='customer'")!.c;

  return ok({
    kpis: { active, mrr, arr: mrr * 12, revenue30, new30, churned30, churnRate: active ? (churned30 / (active + churned30)) * 100 : 0, savings30, penetration: customers ? (active / customers) * 100 : 0, memberAov: memberOrders.aov, otherAov: otherOrders.aov, memberOrders: memberOrders.c },
    plans,
    series,
    subscribers,
    total,
    page,
    size,
  });
});
