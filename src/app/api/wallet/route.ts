import { all, get, run, tx, now } from "@/lib/db";
import { handler, ok, body, fail } from "@/lib/api";
import { requireUser } from "@/lib/auth";
export const GET = handler(async () => {
  const u = await requireUser();
  return ok({ balance: (await get<any>("SELECT wallet FROM users WHERE id=?", u.id))!.wallet, points: u.points, transactions: await all("SELECT * FROM wallet_tx WHERE user_id=? ORDER BY id DESC LIMIT 50", u.id) });
});
// Demo top-up (would be a payment-gateway callback in production)
export const POST = handler(async (req: Request) => {
  const u = await requireUser();
  const amount = Math.round(Number((await body(req)).amount));
  if (!(amount > 0 && amount <= 1000000)) return fail(400, "invalid_amount");
  await tx(async () => {
    await run("UPDATE users SET wallet=wallet+? WHERE id=?", amount, u.id);
    await run("INSERT INTO wallet_tx(user_id,amount,kind,note,created_at) VALUES(?,?,?,?,?)", u.id, amount, "topup", "Card top-up", now());
  });
  return ok({ ok: true });
});
