import { handler, ok, body } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getSettings, updateSettings } from "@/lib/settings";
const KEYS = ["app_name", "currency_code", "currency_ar", "currency_en", "service_fee", "express_pct", "vat_pct", "free_delivery_over", "autopilot", "autopilot_seconds", "support_phone", "city_ar", "city_en", "map_lat", "map_lng", "timezone"];
export const GET = handler(async () => {
  await requireUser("admin");
  return ok({ settings: getSettings() });
});
export const PATCH = handler(async (req: Request) => {
  await requireUser("admin");
  const b = await body(req);
  const patch: any = {};
  for (const k of KEYS) if (b[k] !== undefined) patch[k] = b[k];
  return ok({ settings: updateSettings(patch) });
});
