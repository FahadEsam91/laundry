import { handler, ok, fail } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { sentLog } from "@/lib/whatsapp";

/** Test mode only (WHATSAPP_MOCK=1): the WhatsApp messages that would have been sent. */
export const GET = handler(async () => {
  if (process.env.WHATSAPP_MOCK !== "1") return fail(404, "not_found");
  await requirePermission("settings.manage");
  return ok({ sent: sentLog });
});
