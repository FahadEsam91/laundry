import { handler, ok, body } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { getSettings, updateSettings } from "@/lib/settings";
const KEYS = ["app_name", "currency_code", "currency_ar", "currency_en", "service_fee", "express_pct", "vat_pct", "free_delivery_over", "autopilot", "autopilot_seconds", "online_payments", "memberships", "support_phone", "city_ar", "city_en", "map_lat", "map_lng", "timezone"];
export const GET = handler(async () => {
  await requirePermission("settings.manage");
  return ok({ settings: await getSettings() });
});
export const PATCH = handler(async (req: Request) => {
  const me = await requirePermission("settings.manage");
  const b = await body(req);
  const patch: any = {};
  for (const k of KEYS) if (b[k] !== undefined) patch[k] = b[k];
  const settings = await updateSettings(patch);
  await audit(me, "settings.update", "settings", null, patch);
  return ok({ settings });
});
