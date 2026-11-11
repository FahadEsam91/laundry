import { all } from "@/lib/db";
import { handler, ok } from "@/lib/api";
import { getSettings } from "@/lib/settings";
export const GET = handler(async () => {
  const s = await getSettings();
  return ok({ settings: s, services: await all("SELECT * FROM services WHERE active=1 ORDER BY sort") });
});
