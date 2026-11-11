import { all } from "@/lib/db";
import { handler, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { autopilotTick, countOrders, listOrders } from "@/lib/orders";

export const GET = handler(async (req: Request) => {
  await requireUser("admin");
  await autopilotTick();
  const sp = new URL(req.url).searchParams;
  const where: string[] = ["1=1"];
  const params: any[] = [];
  const status = sp.get("status");
  if (status === "active") where.push("o.status NOT IN ('delivered','cancelled')");
  else if (status) (where.push("o.status=?"), params.push(status));
  const partner = sp.get("partner");
  if (partner) (where.push("o.partner_id=?"), params.push(Number(partner)));
  const customer = sp.get("customer");
  if (customer) (where.push("o.customer_id=?"), params.push(Number(customer)));
  const q = sp.get("q")?.trim();
  if (q) (where.push("(o.code LIKE ? OR u.name LIKE ? OR u.phone LIKE ?)"), params.push(`%${q}%`, `%${q}%`, `%${q}%`));
  const w = where.join(" AND ");
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const size = Math.min(500, Number(sp.get("size")) || 20);

  if (sp.get("format") === "csv") {
    const rows = await listOrders(w, params, 10000);
    const cols = ["code", "created_at", "status", "customer_name", "customer_phone", "partner_en", "driver_name", "items_count", "subtotal", "total", "payment_method", "payment_status"];
    const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = "﻿" + [cols.join(","), ...rows.map((r: any) => cols.map((c) => esc(r[c])).join(","))].join("\n");
    return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="nuqa-orders-${Date.now()}.csv"` } });
  }
  const counts = await all<any>("SELECT status,COUNT(*) c FROM orders GROUP BY status");
  return ok({ orders: await listOrders(w, params, size, (page - 1) * size), total: await countOrders(w, params), page, size, counts });
});
