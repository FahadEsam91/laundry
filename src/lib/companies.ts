import "server-only";
import { all, get } from "./db";

/** Month bounds (YYYY-MM) as ISO strings, in UTC; billing months are labelled by order creation date. */
export function monthRange(month: string) {
  const m = /^(\d{4})-(\d{2})$/.exec(month) ? month : new Date().toISOString().slice(0, 7);
  const [y, mo] = m.split("-").map(Number);
  return { month: m, from: new Date(Date.UTC(y, mo - 1, 1)).toISOString(), to: new Date(Date.UTC(y, mo, 1)).toISOString() };
}

/** Everything billed to a company in a month: the itemised orders and the amounts due / paid. */
export async function statement(companyId: number, month: string) {
  const r = monthRange(month);
  const company = await get<any>("SELECT * FROM companies WHERE id=?", companyId);
  if (!company) return null;
  const orders = await all<any>(
    `SELECT o.id,o.code,o.created_at,o.status,o.subtotal,o.delivery_fee,o.express_fee,o.service_fee,o.discount,o.company_discount,o.vat,o.total,o.payment_status,o.items_count,
       u.name customer_name, u.phone customer_phone, p.name_ar partner_ar, p.name_en partner_en
     FROM orders o JOIN users u ON u.id=o.customer_id JOIN partners p ON p.id=o.partner_id
     WHERE o.company_id=? AND o.payment_method='invoice' AND o.status!='cancelled' AND o.created_at>=? AND o.created_at<? ORDER BY o.created_at`,
    companyId, r.from, r.to,
  );
  const sum = (f: (o: any) => number) => orders.reduce((a, o) => a + Number(f(o)), 0);
  return {
    company, month: r.month, orders,
    totals: {
      orders: orders.length,
      subtotal: sum((o) => o.subtotal),
      discount: sum((o) => o.company_discount),
      total: sum((o) => o.total),
      due: sum((o) => (o.payment_status === "invoiced" ? o.total : 0)),
      paid: sum((o) => (o.payment_status === "paid" ? o.total : 0)),
    },
  };
}
