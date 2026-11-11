import { get } from "@/lib/db";
import { handler, ok, body, fail } from "@/lib/api";
import { normalizePhone } from "@/lib/auth";

// Production: send the code via SMS/WhatsApp provider (Twilio, Vonage, Unifonic…) and store a hashed code with TTL.
export const POST = handler(async (req: Request) => {
  const { phone } = await body(req);
  const p = normalizePhone(phone);
  if (p.replace(/\D/g, "").length < 10) return fail(400, "invalid_phone");
  const u = get("SELECT id FROM users WHERE phone=?", p);
  return ok({ ok: true, phone: p, exists: !!u, demo_code: process.env.NUQA_DEMO === "0" ? undefined : "1234" });
});
