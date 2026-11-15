import { handler, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { wardrobe } from "@/lib/garments";

/** The customer's garments: every labelled item, how often it was cleaned and where it is now. */
export const GET = handler(async () => {
  const u = await requireUser();
  return ok({ garments: await wardrobe(u.id) });
});
