import "server-only";
import webpush from "web-push";
import { all, get, run, now } from "./db";

/**
 * Web Push (works on Android Chrome/Samsung/Firefox, desktop browsers, and iOS 16.4+ when the app
 * is added to the Home Screen). VAPID keys come from env in production, otherwise they are generated
 * once and stored server-side (never sent to clients except the public key).
 */

type Vapid = { publicKey: string; privateKey: string };
const g = globalThis as unknown as { __nuqaVapid?: Vapid };

export async function vapid(): Promise<Vapid> {
  if (g.__nuqaVapid) return g.__nuqaVapid;
  let keys: Vapid;
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    keys = { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  } else {
    const pub = await get<any>("SELECT value FROM settings WHERE key='vapid_public'");
    const priv = await get<any>("SELECT value FROM settings WHERE key='vapid_private'");
    if (pub && priv) keys = { publicKey: pub.value, privateKey: priv.value };
    else {
      keys = webpush.generateVAPIDKeys();
      await run("INSERT INTO settings(key,value) VALUES('vapid_public',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", keys.publicKey);
      await run("INSERT INTO settings(key,value) VALUES('vapid_private',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", keys.privateKey);
    }
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:push@nuqa.app", keys.publicKey, keys.privateKey);
  g.__nuqaVapid = keys;
  return keys;
}

export type PushMessage = {
  title_ar: string;
  title_en: string;
  body_ar?: string | null;
  body_en?: string | null;
  url?: string;
  tag?: string;
};

/** Native apps: deliver through Expo's push service (APNs for iOS, FCM for Android). */
async function sendExpo(ids: number[], msg: PushMessage): Promise<number> {
  const tokens = await all<any>(`SELECT * FROM mobile_push_tokens WHERE user_id IN (${ids.map(() => "?").join(",")})`, ...ids);
  if (!tokens.length) return 0;
  let sent = 0;
  for (let i = 0; i < tokens.length; i += 100) {
    const batch = tokens.slice(i, i + 100);
    const messages = batch.map((t) => ({
      to: t.token,
      title: t.lang === "ar" ? msg.title_ar : msg.title_en,
      body: (t.lang === "ar" ? msg.body_ar : msg.body_en) || "",
      data: { url: msg.url || "/" },
      sound: "default",
      priority: "high",
      channelId: "default",
      ...(msg.tag ? { collapseId: msg.tag, threadId: msg.tag } : {}),
    }));
    try {
      const res = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(process.env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}),
        },
        body: JSON.stringify(messages),
      });
      const json: any = await res.json().catch(() => ({}));
      const tickets: any[] = Array.isArray(json?.data) ? json.data : [];
      for (const [k, tk] of tickets.entries()) {
        if (tk?.status === "ok") {
          sent++;
          await run("UPDATE mobile_push_tokens SET last_success_at=? WHERE id=?", now(), batch[k].id);
        } else if (tk?.details?.error === "DeviceNotRegistered") await run("DELETE FROM mobile_push_tokens WHERE id=?", batch[k].id);
      }
    } catch (e: any) {
      if (process.env.NODE_ENV !== "production") console.warn("[push] expo send failed:", e?.message);
    }
  }
  return sent;
}

/** Send to every device (browsers + native apps) of the given users. Returns number of successful deliveries. */
export async function sendPush(userIds: number[], msg: PushMessage): Promise<number> {
  const ids = [...new Set(userIds)].filter(Boolean);
  if (!ids.length) return 0;
  const [web, native] = await Promise.all([sendWeb(ids, msg), sendExpo(ids, msg)]);
  return web + native;
}

async function sendWeb(ids: number[], msg: PushMessage): Promise<number> {
  const subs = await all<any>(`SELECT * FROM push_subscriptions WHERE user_id IN (${ids.map(() => "?").join(",")})`, ...ids);
  if (!subs.length) return 0;
  await vapid();
  const results = await Promise.all(
    subs.map(async (s) => {
      const ar = s.lang === "ar";
      const payload = JSON.stringify({
        title: ar ? msg.title_ar : msg.title_en,
        body: (ar ? msg.body_ar : msg.body_en) || "",
        url: msg.url || "/",
        tag: msg.tag,
        dir: ar ? "rtl" : "ltr",
        lang: s.lang,
      });
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 3600, urgency: "high" });
        await run("UPDATE push_subscriptions SET last_success_at=?, fail_count=0 WHERE id=?", now(), s.id);
        return 1;
      } catch (e: any) {
        // 404/410 = the browser revoked this subscription → forget it
        if (e?.statusCode === 404 || e?.statusCode === 410) await run("DELETE FROM push_subscriptions WHERE id=?", s.id);
        else {
          await run("UPDATE push_subscriptions SET fail_count=fail_count+1 WHERE id=?", s.id);
          await run("DELETE FROM push_subscriptions WHERE id=? AND fail_count>=8", s.id);
          if (process.env.NODE_ENV !== "production") console.warn("[push] delivery failed:", e?.statusCode || e?.code || e?.message);
        }
        return 0;
      }
    }),
  );
  return results.reduce<number>((a, b) => a + b, 0);
}

/** Queue a push without blocking the caller (and after the current DB transaction finishes). */
export function queuePush(userIds: number[], msg: PushMessage) {
  setImmediate(() => {
    sendPush(userIds, msg).catch(() => {});
  });
}

export const partnerStaff = async (partnerId: number) => (await all<any>("SELECT id FROM users WHERE role='partner' AND partner_id=? AND status='active'", partnerId)).map((u) => u.id);
export const onlineDriverUsers = async () => (await all<any>("SELECT d.user_id id FROM drivers d JOIN users u ON u.id=d.user_id WHERE d.status='online' AND u.status='active'")).map((u) => u.id);
export const driverUser = async (driverId: number) => (await get<any>("SELECT user_id FROM drivers WHERE id=?", driverId))?.user_id as number | undefined;
