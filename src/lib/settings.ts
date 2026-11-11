import "server-only";
import { all, run } from "./db";

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
  autopilot_seconds: number;
  support_phone: string;
  city_ar: string;
  city_en: string;
  map_lat: number;
  map_lng: number;
  timezone: string;
};

const NUM = ["service_fee", "express_pct", "vat_pct", "free_delivery_over", "autopilot_seconds", "map_lat", "map_lng"];

export function getSettings(): Settings {
  const rows = all<{ key: string; value: string }>("SELECT key,value FROM settings");
  const o: any = {};
  for (const r of rows) {
    if (NUM.includes(r.key)) o[r.key] = Number(r.value);
    else if (r.key === "autopilot") o[r.key] = r.value === "1";
    else o[r.key] = r.value;
  }
  return o as Settings;
}

export function updateSettings(patch: Partial<Record<keyof Settings, any>>) {
  for (const [k, v] of Object.entries(patch)) {
    const val = typeof v === "boolean" ? (v ? "1" : "0") : String(v);
    run("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", k, val);
  }
  return getSettings();
}
