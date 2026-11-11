import { all } from "@/lib/db";
import { handler, ok } from "@/lib/api";
import { getSettings } from "@/lib/settings";
import { DEMO } from "@/lib/env";

/** Public app configuration (used by the native apps at launch). */
export const GET = handler(async () => {
  const s = await getSettings();
  return ok({ settings: { ...s, demo: DEMO }, services: await all("SELECT * FROM services WHERE active=1 ORDER BY sort") });
});
