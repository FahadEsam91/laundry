import { get, run, tx, now } from "@/lib/db";
import { handler, ok, body, fail } from "@/lib/api";
import { can, HttpError, requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/orders";
export const POST = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const me = await requirePermission("customers.view");
  const id = Number((await params).id);
  if (!await get("SELECT 1 FROM users WHERE id=? AND role='customer'", id)) return fail(404, "not_found");
  const b = await body(req);
  if (!can(me, b.action === "credit" ? "customers.credit" : "customers.manage")) throw new HttpError(403, "forbidden");
  if (b.action === "credit") {
    const amount = Math.round(Number(b.amount));
    if (!amount) return fail(400, "invalid_amount");
    await tx(async () => {
      await run("UPDATE users SET wallet=wallet+? WHERE id=?", amount, id);
      await run("INSERT INTO wallet_tx(user_id,amount,kind,note,created_at) VALUES(?,?,?,?,?)", id, amount, "credit", b.note || "Support credit", now());
      await notify(id, "💰 تمت إضافة رصيد لمحفظتك", "💰 Wallet credited", `أُضيف ${amount} إلى محفظتك`, `${amount} was added to your wallet`);
    });
  } else if (b.action === "status") await run("UPDATE users SET status=? WHERE id=?", b.status === "suspended" ? "suspended" : "active", id);
  else return fail(400, "invalid_action");
  await audit(me, b.action === "credit" ? "customer.credit" : `customer.${b.status === "suspended" ? "suspend" : "restore"}`, "user", id, b.action === "credit" ? { amount: Number(b.amount), note: b.note } : undefined);
  return ok({ ok: true });
});
