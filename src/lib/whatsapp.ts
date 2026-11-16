import "server-only";
import { randomUUID } from "node:crypto";
import { get } from "./db";
import { getSettings } from "./settings";
import { whatsappSender } from "./env";
import { zavuClient, zavuOrderTemplateId } from "./zavu";

/**
 * Order updates by WhatsApp, only to customers who switched it on in their account.
 *
 * Zavu (used when ZAVUDEV_API_KEY is set):
 *   ZAVUDEV_API_KEY=zv_live_…                  — the project's API key
 *   ZAVU_SENDER_ID=snd_…                       — optional: the sender with WhatsApp (default: the project's default sender)
 *   Template "nuqa_order_update" ({{1}} title, {{2}} message, {{3}} link), created and submitted with
 *   scripts/zavu-whatsapp-template.mjs, is used automatically once Meta approves it (or ZAVU_WHATSAPP_TEMPLATE_ID=tpl_…).
 *   Until then messages go as free text, which WhatsApp only delivers within 24 hours of the customer's last message.
 *
 * Twilio (fallback when there is no Zavu key):
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN      — same as for SMS
 *   TWILIO_WHATSAPP_FROM=+9647…                — a WhatsApp-enabled sender (or TWILIO_FROM with OTP_CHANNEL=whatsapp)
 *   TWILIO_WHATSAPP_TEMPLATE_SID=HX…           — optional, recommended: an approved template with {{1}} = title,
 *                                                {{2}} = message, {{3}} = link. WhatsApp only delivers free text to people
 *                                                who messaged you in the last 24 hours; templates reach everyone.
 *   WHATSAPP_MOCK=1                            — log instead of sending (automated tests only)
 */
/** Messages "sent" in mock mode (shared across route bundles), for the automated tests. */
export const sentLog: { to: string; text: string }[] = ((globalThis as any).__nuqaWaLog ||= []);

export async function sendWhatsApp(to: string, title: string, text: string, link: string) {
  if (process.env.WHATSAPP_MOCK === "1") {
    sentLog.push({ to, text: `${title}\n${text}\n${link}` });
    if (sentLog.length > 50) sentLog.shift();
    console.log(`[whatsapp] → ${to.replace(/\d(?=\d{4})/g, "•")}: ${title}`);
    return;
  }
  if (process.env.ZAVUDEV_API_KEY) return sendViaZavu(to, title, text, link);
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const from = whatsappSender();
  const form = new URLSearchParams({ To: `whatsapp:${to}` });
  if (from.startsWith("MG")) form.set("MessagingServiceSid", from);
  else form.set("From", from.startsWith("whatsapp:") ? from : `whatsapp:${from}`);
  const tpl = process.env.TWILIO_WHATSAPP_TEMPLATE_SID;
  if (tpl) {
    form.set("ContentSid", tpl);
    form.set("ContentVariables", JSON.stringify({ 1: title, 2: text, 3: link }));
  } else form.set("Body", `*${title}*\n${text}\n${link}`);
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });
  if (!res.ok) console.error("[whatsapp] twilio error", res.status, (await res.text().catch(() => "")).slice(0, 300));
}

// WhatsApp refuses template variables with line breaks, tabs or 5+ spaces in a row
const flat = (v: string) => v.replace(/[\r\n\t]+/g, " · ").replace(/ {2,}/g, " ").trim() || "—";

async function sendViaZavu(to: string, title: string, text: string, link: string) {
  const sender = process.env.ZAVU_SENDER_ID ? { "Zavu-Sender": process.env.ZAVU_SENDER_ID } : {};
  const templateId = await zavuOrderTemplateId();
  try {
    await zavuClient().messages.send({
      to,
      channel: "whatsapp",
      fallbackEnabled: false, // never turn a WhatsApp update into a paid SMS
      idempotencyKey: randomUUID(), // the SDK's own retries never send twice
      ...(templateId
        ? { messageType: "template" as const, content: { templateId, templateVariables: { "1": flat(title), "2": flat(text), "3": flat(link) } } }
        : { text: `*${title}*\n${text}${link ? `\n${link}` : ""}` }),
      ...sender,
    });
  } catch (e: any) {
    console.error("[whatsapp] zavu error", e?.status ?? "", String(e?.message || e).slice(0, 300));
  }
}

/** Called for every in-app notification about an order; sends it by WhatsApp when the customer opted in. Never throws. */
export function queueWhatsApp(userId: number, titleAr: string, bodyAr: string, path: string) {
  setTimeout(async () => {
    try {
      if (!(await getSettings()).whatsapp) return;
      const u = await get<any>("SELECT phone,role,whatsapp_opt_in FROM users WHERE id=? AND status='active'", userId);
      if (!u || u.role !== "customer" || !u.whatsapp_opt_in || !/^\+\d{8,15}$/.test(u.phone)) return;
      const origin = process.env.DOMAIN ? `https://${process.env.DOMAIN}` : "";
      await sendWhatsApp(u.phone, titleAr, bodyAr, `${origin}${path}`);
    } catch (e) {
      console.error("[whatsapp]", (e as Error)?.message);
    }
  }, 0);
}
