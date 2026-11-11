import { get } from "@/lib/db";
import { handler, ok, body, fail } from "@/lib/api";
import { normalizePhone } from "@/lib/auth";
import { OTP_LENGTH, requestOtp } from "@/lib/otp";
import { clientIp } from "@/lib/request";
import { DEMO } from "@/lib/env";

export const POST = handler(async (req: Request) => {
  const { phone, lang } = await body(req);
  const p = normalizePhone(phone);
  if (!/^\+\d{10,15}$/.test(p)) return fail(400, "invalid_phone");
  await requestOtp(p, clientIp(req), lang === "en" ? "en" : "ar");
  const u = await get("SELECT id FROM users WHERE phone=? AND status!='deleted'", p);
  return ok({ ok: true, phone: p, exists: !!u, length: OTP_LENGTH, demo: DEMO });
});
