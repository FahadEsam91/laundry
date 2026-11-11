import { get, insert, now } from "@/lib/db";
import { handler, ok, body, fail } from "@/lib/api";
import { makeToken, normalizePhone, setSession } from "@/lib/auth";
import { notify } from "@/lib/orders";
import { verifyOtp } from "@/lib/otp";

/**
 * Verify the code and sign in (creating a customer account on first login).
 * Web clients get an httpOnly cookie; native apps send { client: "mobile" } and receive a bearer token.
 */
export const POST = handler(async (req: Request) => {
  const { phone, code, name, client } = await body(req);
  const p = normalizePhone(phone);
  let u = await get<any>("SELECT id,role,status FROM users WHERE phone=?", p);
  // ask for the name *before* burning the code, so the same code can be re-sent with the name
  if (!u && (!name || String(name).trim().length < 2)) {
    await verifyOtp(p, code, false);
    return ok({ needName: true });
  }
  await verifyOtp(p, code);
  if (!u) {
    const id = await insert("INSERT INTO users(name,phone,role,wallet,points,created_at,last_seen) VALUES(?,?,'customer',0,0,?,?)", String(name).trim().slice(0, 80), p, now(), now());
    await notify(id, "🎉 أهلاً بك في نقاء", "🎉 Welcome to Nuqa", "استخدم الكود WELCOME50 لخصم 50% على أول طلب", "Use WELCOME50 for 50% off your first order");
    u = { id, role: "customer", status: "active" };
  }
  if (u.status !== "active") return fail(403, "account_suspended");
  if (client === "mobile") return ok({ ok: true, role: u.role, token: makeToken(u.id) });
  await setSession(u.id);
  return ok({ ok: true, role: u.role });
});
