import { replyToInbound, verifyZavuSignature, zavuConfigured, type InboundEvent } from "@/lib/zavu";

/**
 * Zavu webhook: set this URL (https://<domain>/api/webhooks/zavu) on the sender with the
 * `message.inbound` event. Each inbound message gets an automatic reply on the same channel.
 */
const seen: Set<string> = ((globalThis as any).__nuqaZavuSeen ||= new Set<string>());
const DAY = 86400000;

export async function POST(req: Request) {
  if (!zavuConfigured()) return new Response("not configured", { status: 404 });
  const raw = await req.text(); // raw bytes: the signature covers them exactly
  if (!verifyZavuSignature(raw, req.headers.get("x-zavu-signature"), process.env.ZAVU_WEBHOOK_SECRET!)) {
    return new Response("invalid signature", { status: 401 });
  }
  let event: InboundEvent;
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("bad json", { status: 400 });
  }
  // Zavu retries anything that isn't a quick 2xx: acknowledge first, then work.
  if (event.type === "message.inbound" && !seen.has(event.id)) {
    seen.add(event.id);
    if (seen.size > 5000) seen.delete(seen.values().next().value!);
    const d = event.data;
    // reactions carry no conversation; a message held for days is too old for an automatic "thanks"
    const stale = d?.heldAt && Date.now() - d.heldAt > DAY;
    if (d?.conversationId && !stale) setTimeout(() => void replyToInbound(event), 0);
  }
  return new Response("OK", { status: 200 });
}
