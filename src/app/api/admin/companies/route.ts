import { all, insert, now } from "@/lib/db";
import { handler, ok, body, fail } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { monthRange } from "@/lib/companies";

const num = (v: unknown, max: number) => Math.max(0, Math.min(max, Number(v) || 0));

export const GET = handler(async () => {
  await requirePermission("companies.manage");
  const r = monthRange("");
  const companies = await all<any>(
    `SELECT c.*,
      (SELECT COUNT(*) FROM users u WHERE u.company_id=c.id AND u.status!='deleted') members,
      (SELECT COALESCE(SUM(o.total),0) FROM orders o WHERE o.company_id=c.id AND o.payment_method='invoice' AND o.status!='cancelled' AND o.created_at>=?) month_total,
      (SELECT COALESCE(SUM(o.total),0) FROM orders o WHERE o.company_id=c.id AND o.payment_status='invoiced' AND o.status!='cancelled') outstanding
     FROM companies c ORDER BY c.active DESC, c.name`,
    r.from,
  );
  return ok({ companies });
});

/** { name, contact_name?, phone?, email?, address?, tax_id?, discount_pct?, credit_limit? } */
export const POST = handler(async (req: Request) => {
  const me = await requirePermission("companies.manage");
  const b = await body(req);
  const name = String(b.name || "").trim().slice(0, 80);
  if (!name) return fail(400, "name_required");
  const id = await insert(
    "INSERT INTO companies(name,contact_name,phone,email,address,tax_id,discount_pct,credit_limit,active,created_at) VALUES(?,?,?,?,?,?,?,?,1,?)",
    name, b.contact_name || null, b.phone || null, b.email || null, b.address || null, b.tax_id || null, num(b.discount_pct, 50), num(b.credit_limit, 1e10), now(),
  );
  await audit(me, "company.create", "company", id, { name, discount_pct: num(b.discount_pct, 50) });
  return ok({ id }, 201);
});
