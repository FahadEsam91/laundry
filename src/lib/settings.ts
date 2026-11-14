import "server-only";
import { all, run } from "./db";
import { DEMO } from "./env";

export type Settings = {
  app_name: string;
  currency_code: string;
  currency_ar: string;
  currency_en: string;
  service_fee: number;
  express_pct: number;
  vat_pct: number;
  free_delivery_over: number;
  autopilot: boolean;
  online_payments: boolean;
  /** Nuqa Plus memberships offered to customers (needs a way to pay: online payments or wallet balance). */
  memberships: boolean;
  /** customers must attach at least one photo of their items to place an order */
  photos_required: boolean;
  autopilot_seconds: number;
  support_phone: string;
  city_ar: string;
  city_en: string;
  map_lat: number;
  map_lng: number;
  timezone: string;
};

const NUM = ["service_fee", "express_pct", "vat_pct", "free_delivery_over", "autopilot_seconds", "map_lat", "map_lng"];

let cache: { at: number; v: Settings } | null = null;

export async function getSettings(): Promise<Settings> {
  if (cache && Date.now() - cache.at < 5000) return cache.v;
  const rows = await all<{ key: string; value: string }>("SELECT key,value FROM settings");
  const o: any = {};
  for (const r of rows) {
    if (r.key.startsWith("vapid_")) continue; // server-only secrets
    if (NUM.includes(r.key)) o[r.key] = Number(r.value);
    else if (r.key === "autopilot" || r.key === "online_payments" || r.key === "memberships" || r.key === "photos_required") o[r.key] = r.value === "1";
    else o[r.key] = r.value;
  }
  o.online_payments = !!o.online_payments; // off until a payment gateway is connected
  // Not set yet: on in the demo, off in production until customers have a way to pay for a membership.
  o.memberships = o.memberships === undefined ? DEMO : !!o.memberships;
  o.photos_required = o.photos_required === undefined ? true : !!o.photos_required;
  cache = { at: Date.now(), v: o as Settings };
  return o as Settings;
}

export async function updateSettings(patch: Partial<Record<keyof Settings, any>>) {
  for (const [k, v] of Object.entries(patch)) {
    const val = typeof v === "boolean" ? (v ? "1" : "0") : String(v);
    await run("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", k, val);
  }
  cache = null;
  return await getSettings();
}
