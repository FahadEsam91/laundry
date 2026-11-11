import "server-only";
import crypto from "node:crypto";
import { get, insert, run, now } from "./db";
import { DEMO, sessionSecret } from "./env";
import { HttpError } from "./auth";
import { sendSms } from "./sms";

const TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;
export const OTP_LENGTH = DEMO ? 4 : 6;

const hash = (phone: string, code: string) => crypto.createHmac("sha256", sessionSecret()).update(`${phone}:${code}`).digest("hex");

/**
 * App Store / Google Play reviewers can't receive SMS: REVIEW_LOGINS="+9647000000001:482913,+9647000000002:551208"
 * gives those exact numbers a fixed code (no SMS is sent). Use dedicated, otherwise-unused numbers.
 */
function reviewCode(phone: string) {
  for (const pair of (process.env.REVIEW_LOGINS || "").split(",")) {
    const [p, c] = pair.split(":").map((x) => x?.trim());
    if (p && c && p === phone && /^\d{4,8}$/.test(c)) return c;
  }
  return null;
}

/** Issue a one-time code with per-phone and per-IP rate limits. */
export async function requestOtp(phone: string, ip: string, lang: "ar" | "en") {
  const tenMin = new Date(Date.now() - 10 * 60000).toISOString();
  const hour = new Date(Date.now() - 3600000).toISOString();
  const perPhone = (await get<any>("SELECT COUNT(*) AS c FROM otp_codes WHERE phone=? AND created_at>=?", phone, tenMin))!.c;
  const perIp = (await get<any>("SELECT COUNT(*) AS c FROM otp_codes WHERE ip=? AND created_at>=?", ip, hour))!.c;
  if (perPhone >= 3 || perIp >= 20) throw new HttpError(429, "too_many_requests");

  const review = reviewCode(phone);
  const code = review || (DEMO ? "1234" : String(crypto.randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0"));
  await insert("INSERT INTO otp_codes(phone,code_hash,expires_at,attempts,ip,created_at) VALUES(?,?,?,0,?,?)", phone, hash(phone, code), new Date(Date.now() + TTL_MS).toISOString(), ip, now());
  if (!review && (!DEMO || process.env.SMS_PROVIDER)) {
    const msg = lang === "ar" ? `رمز التحقق الخاص بك في نقاء: ${code}\nلا تشاركه مع أحد.` : `Your Nuqa verification code is ${code}. Do not share it.`;
    try {
      await sendSms(phone, msg);
    } catch (e: any) {
      throw new HttpError(503, e?.message === "sms_not_configured" ? "sms_not_configured" : "sms_failed");
    }
  }
  // housekeeping
  await run("DELETE FROM otp_codes WHERE created_at<?", new Date(Date.now() - 86400000).toISOString());
}

/** Verify the latest unexpired code for this phone; burns it on success, counts failed attempts. */
export async function verifyOtp(phone: string, code: string, consume = true) {
  const row = await get<any>("SELECT * FROM otp_codes WHERE phone=? AND expires_at>? ORDER BY id DESC LIMIT 1", phone, now());
  if (!row) throw new HttpError(400, "code_expired");
  if (row.attempts >= MAX_ATTEMPTS) throw new HttpError(429, "too_many_attempts");
  const ok = crypto.timingSafeEqual(Buffer.from(row.code_hash), Buffer.from(hash(phone, String(code || "").trim())));
  if (!ok) {
    await run("UPDATE otp_codes SET attempts=attempts+1 WHERE id=?", row.id);
    throw new HttpError(400, "invalid_code");
  }
  if (consume) await run("DELETE FROM otp_codes WHERE phone=?", phone);
}
