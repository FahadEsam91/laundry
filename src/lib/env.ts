import "server-only";

/** Demo mode: seeded marketplace, one-tap demo logins, fixed OTP 1234. Disable in production with NUQA_DEMO=0. */
export const DEMO = process.env.NUQA_DEMO !== "0";
export const IS_PROD = process.env.NODE_ENV === "production";

export function sessionSecret() {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (!DEMO && IS_PROD) throw new Error("SESSION_SECRET (32+ random characters) is required when NUQA_DEMO=0");
  return s || "nuqa-dev-secret-change-me-in-production-0000";
}

/** AI features need an Anthropic API key (AI_MOCK=1 is for automated tests only). */
export const aiConfigured = () => process.env.AI_MOCK === "1" || !!process.env.ANTHROPIC_API_KEY;

/**
 * WhatsApp order updates go through Twilio: TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN and a WhatsApp-enabled sender in
 * TWILIO_WHATSAPP_FROM (or TWILIO_FROM when OTP_CHANNEL=whatsapp). WHATSAPP_MOCK=1 logs instead (tests only).
 */
export const whatsappSender = () =>
  process.env.TWILIO_WHATSAPP_FROM || (process.env.OTP_CHANNEL === "whatsapp" ? process.env.TWILIO_FROM : "") || "";
export const whatsappConfigured = () =>
  process.env.WHATSAPP_MOCK === "1" || !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && whatsappSender());
