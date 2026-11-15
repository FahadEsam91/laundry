import { all, get, insert, now, run, tx } from "@/lib/db";
import { handler, ok, body, fail } from "@/lib/api";
import { normalizePhone, requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { monthRange, statement } from "@/lib/companies";

type Ctx = { params: Promise<{ id: string }> };
const FIELDS = ["name", "contact_name", "phone", "email", "address", "tax_id", "discount_pct", "credit_limit", "active"];

/** Company details, its staff and the statement for ?month=YYYY-MM (default: this month). */
export const GET = handler(async (req: Request, { params }: Ctx) => {
  await requirePermission("companies.manage");
  const id = Number((await params).id);
  const st = await statement(id, new URL(req.url).searchParams.get("month") || "");
  if (!st) return fail(404, "not_found");
  const members = await all("SELECT id,name,phone,created_at FROM users WHERE company_id=? AND status!='deleted' ORDER BY name", id);
  return ok({ ...st, members });
});

export const PATCH = handler(async (req: Request, { params }: Ctx) => {
  const me = await requirePermission("companies.manage");
  const id = Number((await params).id);
  if (!(await get("SELECT 1 FROM companies WHERE id=?", id))) return fail(404, "not_found");
  const b = await body(req);
  const patch: Record<string, any> = {};
  for (const k of FIELDS) if (b[k] !== undefined) patch[k] = k === "discount_pct" ? Math.max(0, Math.min(50, Number(b[k]) || 0)) : k === "credit_limit" ? Math.max(0, Number(b[k]) || 0) : k === "active" ? (b[k] ? 1 : 0) : String(b[k]).slice(0, 120);
  for (const [k, v] of Object.entries(patch)) await run(`UPDATE companies SET ${k}=? WHERE id=?`, v, id);
  await audit(me, "company.update", "company", id, patch);
  return ok({ ok: true });
});

/** Actions: { action: "add_member", phone, name? } | { action: "remove_member", user_id } | { action: "settle", month } */
export const POST = handler(async (req: Request, { params }: Ctx) => {
  const me = await requirePermission("companies.manage");
  const id = Number((await params).id);
  if (!(await get("SELECT 1 FROM companies WHERE id=?", id))) return fail(404, "not_found");
  const b = await body(req);
  if (b.action === "add_member") {
    const phone = normalizePhone(String(b.phone || ""));
    if (!phone) return fail(400, "invalid_phone");
    const u = await get<any>("SELECT id,role,company_id FROM users WHERE phone=?", phone);
    if (u && u.role !== "customer") return fail(409, "member_not_customer");
    if (u && u.company_id && u.company_id !== id) return fail(409, "member_other_company");
    const uid = u ? u.id : await insert("INSERT INTO users(name,phone,role,created_at) VALUES(?,?,'customer',?)", String(b.name || "").slice(0, 60) || phone, phone, now());
    await run("UPDATE users SET company_id=? WHERE id=?", id, uid);
    await audit(me, "company.member_add", "company", id, { phone });
    return ok({ user_id: uid });
  }
  if (b.action === "remove_member") {
    await run("UPDATE users SET company_id=NULL WHERE id=? AND company_id=?", Number(b.user_id), id);
    await audit(me, "company.member_remove", "company", id, { user_id: b.user_id });
    return ok({ ok: true });
  }
  if (b.action === "settle") {
    const r = monthRange(String(b.month || ""));
    const n = await tx(async () => (await run(
      "UPDATE orders SET payment_status='paid' WHERE company_id=? AND payment_method='invoice' AND payment_status='invoiced' AND status!='cancelled' AND created_at>=? AND created_at<?",
      id, r.from, r.to,
    )).changes);
    await audit(me, "company.settle", "company", id, { month: r.month, orders: n });
    return ok({ settled: n });
  }
  return fail(400, "invalid_action");
});
