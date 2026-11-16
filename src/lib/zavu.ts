import "server-only";
import crypto from "node:crypto";
import Zavudev, { APIError } from "@zavudev/sdk";

/**
 * Zavu (multi-channel messaging): reply to an inbound message on the channel it came in on.
 *
 *   ZAVUDEV_API_KEY       zv_live_… / zv_test_… (dashboard.zavu.dev → Developers → API Keys)
 *   ZAVU_WEBHOOK_SECRET   whsec_… shown once when the sender's webhook is created
 */
export const zavuConfigured = () => !!(process.env.ZAVUDEV_API_KEY && process.env.ZAVU_WEBHOOK_SECRET);

let client: Zavudev | null = null;
const zavu = () => (client ||= new Zavudev({ apiKey: process.env.ZAVUDEV_API_KEY }));

/**
 * X-Zavu-Signature: t=<unix seconds>[,v1=<hex>][,v2=<hex>]
 * v2 = HMAC_SHA256(secret, "{t}.{body}") (current), v1 = HMAC_SHA256(secret, body) (older senders).
 * Must be checked against the raw body, before any JSON parsing.
 */
export function verifyZavuSignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const parts: Record<string, string> = {};
  for (const piece of header.split(",")) {
    const i = piece.indexOf("=");
    if (i > 0) parts[piece.slice(0, i).trim()] = piece.slice(i + 1).trim();
  }
  const t = Number(parts.t);
  if (!Number.isFinite(t)) return false;
  const age = Math.floor(Date.now() / 1000) - t;
  if (age > 300 || age < -60) return false; // replayed or badly skewed
  const received = parts.v2 ?? parts.v1;
  if (!received) return false;
  const expected = crypto.createHmac("sha256", secret).update(parts.v2 ? `${t}.${rawBody}` : rawBody).digest("hex");
  if (expected.length !== received.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

export type InboundEvent = {
  id: string;
  type: string;
  senderId: string;
  data: {
    messageId: string;
    conversationId?: string;
    channel: "sms" | "whatsapp" | "telegram" | "email" | "instagram" | "messenger" | "voice";
    from: string;
    text?: string;
    messageType?: string;
    heldAt?: number;
    telegramChatId?: string;
    instagramSenderId?: string;
    messengerSenderId?: string;
  };
};

/** Where the reply goes: the contact's address, which differs per channel. */
export function replyAddress(d: InboundEvent["data"]): string | undefined {
  if (d.channel === "telegram") return d.telegramChatId;
  if (d.channel === "instagram") return d.instagramSenderId;
  if (d.channel === "messenger") return d.messengerSenderId;
  return d.from; // sms, whatsapp, email (WhatsApp may be a BSUID: pass it back as-is)
}

const REPLY_TEXT =
  "شكراً لتواصلك مع نقاء 💧 استلمنا رسالتك وراح نرد عليك قريباً.\nThanks for contacting Nuqa — we got your message and will reply shortly.";

/**
 * Answer an inbound message from the same sender, on the same channel.
 * The idempotency key is derived from the inbound message, so a retried webhook never sends twice.
 */
export async function replyToInbound(event: InboundEvent, text = REPLY_TEXT) {
  const d = event.data;
  const to = replyAddress(d);
  if (!to || d.channel === "voice") return null; // calls are answered by a voice agent, not a text reply
  try {
    return await zavu().messages.send({
      to,
      channel: d.channel, // explicit channel: no silent fallback to another channel
      text,
      ...(d.channel === "email" ? { subject: "Re: Nuqa" } : {}),
      // quote the customer's message where the channel supports it (WhatsApp, Telegram)
      ...(d.channel === "whatsapp" || d.channel === "telegram" ? { content: { replyToMessageId: d.messageId } } : {}),
      idempotencyKey: `reply-${d.messageId}`,
      "Zavu-Sender": event.senderId,
    });
  } catch (e) {
    if (e instanceof APIError) console.error("[zavu] reply failed", e.status, e.message);
    else console.error("[zavu] reply failed", (e as Error)?.message);
    return null;
  }
}
