import { all, get } from "@/lib/db";
import { handler, ok } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { autopilotTick, listOrders } from "@/lib/orders";
import { getSettings } from "@/lib/settings";

const pct = (a: number, b: number) => (b ? ((a - b) / b) * 100 : a ? 100 : 0);

export const GET = handler(async (req: Request) => {
  const me = await requirePermission("dashboard.view");
  await autopilotTick();
  const s = await getSettings();
  const days = Math.min(365, Math.max(1, Number(new URL(req.url).searchParams.get("days")) || 30));
  const nowT = Date.now();
  const start = new Date(nowT - days * 86400000).toISOString();
  const prevStart = new Date(nowT - 2 * days * 86400000).toISOString();
  const tz = s.timezone || "UTC";
  const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
  const hourKey = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hourCycle: "h23" });

  const rows = await all<any>(
    `SELECT o.id,o.status,o.total,o.subtotal,o.delivery_fee,o.service_fee,o.express_fee,o.discount,o.payment_method,o.created_at,o.rating,o.partner_id,p.commission
     FROM orders o JOIN partners p ON p.id=o.partner_id WHERE o.created_at>=?`,
    prevStart,
  );
  const cur = rows.filter((r) => r.created_at >= start);
  const prev = rows.filter((r) => r.created_at < start);
  const agg = (list: any[]) => {
    const valid = list.filter((r) => r.status !== "cancelled");
    const gmv = valid.reduce((a, r) => a + r.total, 0);
    const revenue = valid.reduce((a, r) => a + (r.subtotal * r.commission) / 100 + r.service_fee + r.delivery_fee + r.express_fee * 0.3 - r.discount, 0);
    const cancelled = list.length - valid.length;
    const rated = valid.filter((r) => r.rating);
    return {
      gmv,
      revenue,
      orders: valid.length,
      aov: valid.length ? gmv / valid.length : 0,
      cancelRate: list.length ? (cancelled / list.length) * 100 : 0,
      rating: rated.length ? rated.reduce((a, r) => a + r.rating, 0) / rated.length : 0,
    };
  };
  const A = agg(cur), B = agg(prev);
  const newCust = (await get<any>("SELECT COUNT(*) c FROM users WHERE role='customer' AND created_at>=?", start))!.c;
  const newCustPrev = (await get<any>("SELECT COUNT(*) c FROM users WHERE role='customer' AND created_at>=? AND created_at<?", prevStart, start))!.c;
  const activeNow = (await get<any>("SELECT COUNT(*) c FROM orders WHERE status NOT IN ('delivered','cancelled')"))!.c;

  // daily series
  const series: Record<string, { date: string; gmv: number; orders: number; revenue: number }> = {};
  for (let i = days - 1; i >= 0; i--) {
    const k = dayKey.format(new Date(nowT - i * 86400000));
    series[k] = { date: k, gmv: 0, orders: 0, revenue: 0 };
  }
  const hourly = Array.from({ length: 24 }, (_, h) => ({ hour: h, orders: 0 }));
  const payment: Record<string, number> = {};
  for (const r of cur) {
    if (r.status === "cancelled") continue;
    const k = dayKey.format(new Date(r.created_at));
    if (series[k]) {
      series[k].gmv += r.total;
      series[k].orders += 1;
      series[k].revenue += (r.subtotal * r.commission) / 100 + r.service_fee + r.delivery_fee - r.discount;
    }
    hourly[Number(hourKey.format(new Date(r.created_at))) % 24].orders++;
    payment[r.payment_method] = (payment[r.payment_method] || 0) + 1;
  }

  const statusCounts = await all<any>("SELECT status, COUNT(*) c FROM orders WHERE created_at>=? OR status NOT IN ('delivered','cancelled') GROUP BY status", start);
  const byService = await all<any>(
    `SELECT s.slug,s.name_ar,s.name_en,s.color,SUM(i.qty*i.unit_price) sales,SUM(i.qty) qty FROM order_items i JOIN orders o ON o.id=i.order_id JOIN services s ON s.id=i.service_id
     WHERE o.created_at>=? AND o.status!='cancelled' GROUP BY s.id ORDER BY sales DESC`,
    start,
  );
  const topPartners = await all<any>(
    `SELECT p.id,p.name_ar,p.name_en,p.color,p.color2,p.initials,p.rating,COUNT(o.id) orders,SUM(o.total) gmv
     FROM orders o JOIN partners p ON p.id=o.partner_id WHERE o.created_at>=? AND o.status!='cancelled' GROUP BY p.id ORDER BY gmv DESC LIMIT 6`,
    start,
  );
  const live = await all<any>(
    `SELECT o.id,o.code,o.status,o.address_lat lat,o.address_lng lng,p.lat p_lat,p.lng p_lng,p.name_ar partner_ar,p.name_en partner_en,u.name customer_name
     FROM orders o JOIN partners p ON p.id=o.partner_id JOIN users u ON u.id=o.customer_id WHERE o.status NOT IN ('delivered','cancelled')`,
  );
  const drivers = await all<any>("SELECT d.id,d.lat,d.lng,d.status,u.name FROM drivers d JOIN users u ON u.id=d.user_id WHERE d.status='online'");
  const partners = await all<any>("SELECT id,name_ar,name_en,lat,lng,color,is_open FROM partners WHERE status='active'");

  return ok({
    kpis: {
      gmv: { value: A.gmv, delta: pct(A.gmv, B.gmv) },
      revenue: { value: A.revenue, delta: pct(A.revenue, B.revenue) },
      orders: { value: A.orders, delta: pct(A.orders, B.orders) },
      aov: { value: A.aov, delta: pct(A.aov, B.aov) },
      customers: { value: newCust, delta: pct(newCust, newCustPrev) },
      cancelRate: { value: A.cancelRate, delta: A.cancelRate - B.cancelRate },
      rating: { value: A.rating, delta: A.rating - B.rating },
      active: { value: activeNow },
    },
    series: Object.values(series),
    hourly,
    payment: Object.entries(payment).map(([method, count]) => ({ method, count })),
    statusCounts,
    byService,
    topPartners,
    recent: await listOrders("1=1", [], 8),
    live,
    drivers,
    partners,
  });
});
