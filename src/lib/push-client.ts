"use client";

import { api } from "./client";

export type PushState = "unsupported" | "ios-install" | "denied" | "off" | "on";

const isIOS = () => typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () =>
  typeof window !== "undefined" && (window.matchMedia?.("(display-mode: standalone)").matches || (navigator as any).standalone === true);

export async function registerSW() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch {
    return null;
  }
}

function urlB64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export async function getPushState(): Promise<PushState> {
  if (typeof window === "undefined") return "unsupported";
  // iOS only supports Web Push for apps added to the Home Screen (iOS 16.4+)
  if (isIOS() && !isStandalone()) return "ios-install";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  if (!sub || Notification.permission !== "granted") return "off";
  // make sure the server still knows this device for the signed-in user
  try {
    const r = await api("/api/push/subscribe", { method: "PATCH", body: { endpoint: sub.endpoint } });
    if (!r.registered) await api("/api/push/subscribe", { body: { subscription: sub.toJSON(), lang: document.documentElement.lang } });
  } catch {
    return "off";
  }
  return "on";
}

export async function enablePush(lang: string): Promise<PushState> {
  const state = await getPushState();
  if (state === "unsupported" || state === "ios-install" || state === "denied") return state;
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return perm === "denied" ? "denied" : "off";
  const reg = (await registerSW()) || (await navigator.serviceWorker.ready);
  const { publicKey } = await api("/api/push");
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(publicKey) });
  await api("/api/push/subscribe", { body: { subscription: sub.toJSON(), lang } });
  return "on";
}

export async function disablePush(): Promise<PushState> {
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await api("/api/push/subscribe", { method: "DELETE", body: { endpoint: sub.endpoint } }).catch(() => {});
    await sub.unsubscribe().catch(() => {});
  }
  return "off";
}

/** Keep the push language in sync with the UI language. */
export async function syncPushLang(lang: string) {
  try {
    const reg = await navigator.serviceWorker?.getRegistration("/");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) await api("/api/push/subscribe", { method: "PATCH", body: { endpoint: sub.endpoint, lang } });
  } catch {}
}
