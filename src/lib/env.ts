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
