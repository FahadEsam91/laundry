import { get, run, now } from "@/lib/db";
import { handler, ok, body, fail } from "@/lib/api";
import { normalizePhone, setSession } from "@/lib/auth";
import { notify } from "@/lib/orders";

export const POST = handler(async (req: Request) => {
  const { phone, code, name } = await body(req);
  const p = normalizePhone(phone);
  if (String(code) !== (process.env.NUQA_OTP || "1234")) return fail(400, "invalid_code");
  let u = get<any>("SELECT id,role,status FROM users WHERE phone=?", p);
  if (!u) {
    if (!name || String(name).trim().length < 2) return ok({ needName: true });
    const { id } = run("INSERT INTO users(name,phone,role,wallet,points,created_at,last_seen) VALUES(?,?,'customer',0,0,?,?)", String(name).trim().slice(0, 80), p, now(), now());
    notify(id, "🎉 أهلاً بك في نقاء", "🎉 Welcome to Nuqa", "استخدم الكود WELCOME50 لخصم 50% على أول طلب", "Use WELCOME50 for 50% off your first order");
    u = { id, role: "customer", status: "active" };
  }
  if (u.status !== "active") return fail(403, "account_suspended");
  await setSession(u.id);
  return ok({ ok: true, role: u.role });
});
