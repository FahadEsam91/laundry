import { handler, ok, body } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { draftOrder } from "@/lib/ai";

/** Turn a free-text message ("5 قمصان وبدلة باچر الصبح") into a basket for this laundry. */
export const POST = handler(async (req: Request) => {
  const u = await requireUser();
  const b = await body(req);
  return ok({ draft: await draftOrder(b.text, Number(b.partner_id), u.id) });
});
