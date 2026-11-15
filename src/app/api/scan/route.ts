import { handler, ok, body } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { scanTag, type Stage } from "@/lib/garments";

/** Riders scan at pickup ("collect"), laundries on arrival ("receive") and when packed ("ready"). */
export const POST = handler(async (req: Request) => {
  const u = await requireUser();
  const b = await body(req);
  return ok(await scanTag(u, Number(b.order_id), b.code, b.stage as Stage, b.product_id ? Number(b.product_id) : undefined, b.name));
});
