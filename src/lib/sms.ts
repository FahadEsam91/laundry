import "server-only";
import { randomUUID } from "node:crypto";
import { DEMO } from "./env";
import { OTP_TEMPLATE, zavuClient, zavuTemplateId } from "./zavu";

/**
 * Outbound SMS / WhatsApp (login codes).
 *   SMS_PROVIDER=zavu    → ZAVUDEV_API_KEY (optional ZAVU_SENDER_ID). Codes go by WhatsApp with the approved
 *                          "nuqa_login_code" template, falling back to SMS when WhatsApp can't deliver.
 *                          Also chosen when ZAVUDEV_API_KEY is set and SMS_PROVIDER is empty or an unfinished Twilio setup.
 *   SMS_PROVIDER=twilio  → TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM (e.g. +1555… or a Messaging Service SID "MG…")
 *                          OTP_CHANNEL=whatsapp sends via WhatsApp (TWILIO_FROM must be a WhatsApp-enabled sender)
 *   SMS_PROVIDER=console → logs the message (development only)
 */
const twilioReady = () => !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM);
const provider = () => {
  const p = process.env.SMS_PROVIDER;
  // an explicit SMS_PROVIDER wins (console stays console); otherwise a Zavu key beats an incomplete Twilio setup
  if (p === "zavu" || (process.env.ZAVUDEV_API_KEY && (!p || (p === "twilio" && !twilioReady())))) return "zavu";
  return p || (DEMO ? "console" : "");
};

export function smsConfigured() {
  if (provider() === "zavu") return !!process.env.ZAVUDEV_API_KEY;
  if (process.env.SMS_PROVIDER === "twilio") return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM);
  return process.env.SMS_PROVIDER === "console" || DEMO;
}

/** Send a login code. With Zavu it uses the WhatsApp authentication template (copy-code button). */
export async function sendOtp(to: string, code: string, text: string) {
  if (provider() !== "zavu") return sendSms(to, text);
  if (!process.env.ZAVUDEV_API_KEY) throw new Error("sms_not_configured");
  const templateId = await zavuTemplateId(OTP_TEMPLATE, process.env.ZAVU_OTP_TEMPLATE_ID);
  const sender = process.env.ZAVU_SENDER_ID ? { "Zavu-Sender": process.env.ZAVU_SENDER_ID } : {};
  try {
    await zavuClient().messages.send({
      to,
      idempotencyKey: randomUUID(), // the SDK's own retries never send two codes
      ...(templateId
        ? {
            channel: "whatsapp" as const,
            fallbackEnabled: true, // no WhatsApp on this number → SMS
            messageType: "template" as const,
            content: { templateId, templateVariables: { "1": code }, templateButtonVariables: { "0": code } },
          }
        : // template not approved yet: let Zavu pick the channel; a failed WhatsApp text falls back to SMS
          { channel: "auto" as const, text }),
      ...sender,
    });
  } catch (e: any) {
    console.error("[sms] zavu error", e?.status ?? "", String(e?.message || e).slice(0, 300));
    throw new Error("sms_failed");
  }
}

export async function sendSms(to: string, body: string) {
  const p = provider();
  if (p === "zavu") {
    try {
      await zavuClient().messages.send({ to, channel: "auto", text: body, idempotencyKey: randomUUID(), ...(process.env.ZAVU_SENDER_ID ? { "Zavu-Sender": process.env.ZAVU_SENDER_ID } : {}) });
      return;
    } catch (e: any) {
      console.error("[sms] zavu error", e?.status ?? "", String(e?.message || e).slice(0, 300));
      throw new Error("sms_failed");
    }
  }
  if (p === "twilio") {
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
  if (p === "console") {
    console.log(`[sms] → ${to.replace(/\d(?=\d{4})/g, "•")}: ${body}`);
    return;
  }
  throw new Error("sms_not_configured");
}
