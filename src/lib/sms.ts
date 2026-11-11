import "server-only";
import { DEMO } from "./env";

/**
 * Outbound SMS / WhatsApp.
 *   SMS_PROVIDER=twilio  → TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM (e.g. +1555… or a Messaging Service SID "MG…")
 *                          OTP_CHANNEL=whatsapp sends via WhatsApp (TWILIO_FROM must be a WhatsApp-enabled sender)
 *   SMS_PROVIDER=console → logs the message (development only)
 */
export function smsConfigured() {
  if (process.env.SMS_PROVIDER === "twilio") return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM);
  return process.env.SMS_PROVIDER === "console" || DEMO;
}

export async function sendSms(to: string, body: string) {
  const provider = process.env.SMS_PROVIDER || (DEMO ? "console" : "");
  if (provider === "twilio") {
    const sid = process.env.TWILIO_ACCOUNT_SID!;
    const from = process.env.TWILIO_FROM!;
    const wa = process.env.OTP_CHANNEL === "whatsapp";
    const form = new URLSearchParams({ To: wa ? `whatsapp:${to}` : to, Body: body });
    if (from.startsWith("MG")) form.set("MessagingServiceSid", from);
    else form.set("From", wa && !from.startsWith("whatsapp:") ? `whatsapp:${from}` : from);
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
    });
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      console.error("[sms] twilio error", res.status, err.slice(0, 300));
      throw new Error("sms_failed");
    }
    return;
  }
  if (provider === "console") {
    console.log(`[sms] → ${to.replace(/\d(?=\d{4})/g, "•")}: ${body}`);
    return;
  }
  throw new Error("sms_not_configured");
}
