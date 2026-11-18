import { handler, ok, body } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { getSettings, updateSettings } from "@/lib/settings";
import { aiConfigured, whatsappConfigured } from "@/lib/env";
import { zavuWhatsappReady } from "@/lib/zavu";
const KEYS = ["app_name", "currency_code", "currency_ar", "currency_en", "service_fee", "express_pct", "vat_pct", "free_delivery_over", "autopilot", "autopilot_seconds", "online_payments", "memberships", "photos_required", "handover_pin", "proof_photos", "ai_features", "whatsapp_notifications", "support_phone", "city_ar", "city_en", "map_lat", "map_lng", "timezone"];
export const GET = handler(async () => {
  await requirePermission("settings.manage");
  // whether the server has the keys (the admin can't see or change those from here)
  return ok({ settings: await getSettings(), integrations: { ai: aiConfigured(), whatsapp: whatsappConfigured() && (await zavuWhatsappReady()) } });
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
