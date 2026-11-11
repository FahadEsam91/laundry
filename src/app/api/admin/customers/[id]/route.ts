import { get, run, tx, now } from "@/lib/db";
import { handler, ok, body, fail } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { notify } from "@/lib/orders";
export const POST = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireUser("admin");
  const id = Number((await params).id);
  if (!get("SELECT 1 FROM users WHERE id=? AND role='customer'", id)) return fail(404, "not_found");
  const b = await body(req);
  if (b.action === "credit") {
    const amount = Math.round(Number(b.amount));
    if (!amount) return fail(400, "invalid_amount");
    tx(() => {
      run("UPDATE users SET wallet=wallet+? WHERE id=?", amount, id);
      run("INSERT INTO wallet_tx(user_id,amount,kind,note,created_at) VALUES(?,?,?,?,?)", id, amount, "credit", b.note || "Support credit", now());
      notify(id, "💰 تمت إضافة رصيد لمحفظتك", "💰 Wallet credited", `أُضيف ${amount} إلى محفظتك`, `${amount} was added to your wallet`);
    });
  } else if (b.action === "status") run("UPDATE users SET status=? WHERE id=?", b.status === "suspended" ? "suspended" : "active", id);
  else return fail(400, "invalid_action");
  return ok({ ok: true });
});
