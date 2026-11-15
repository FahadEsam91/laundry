import { handler, ok, body } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { analyzeUpload } from "@/lib/ai";

/** Analyse one of the customer's own item photos (garment, stains, care warnings, matching price-list item). */
export const POST = handler(async (req: Request) => {
  const u = await requireUser();
  const b = await body(req);
  const partnerId = Number(b.partner_id) || null;
  return ok({ insight: await analyzeUpload(b.photo, partnerId, u.id) });
});
