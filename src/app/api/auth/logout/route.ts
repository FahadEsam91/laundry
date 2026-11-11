import { handler, ok } from "@/lib/api";
import { clearSession } from "@/lib/auth";
export const POST = handler(async () => {
  await clearSession();
  return ok({ ok: true });
});
