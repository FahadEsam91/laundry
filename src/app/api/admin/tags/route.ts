import { all } from "@/lib/db";
import { handler, ok, body } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { createBatch } from "@/lib/garments";

/** Label batches (for printing). ?batch=… returns that batch's codes. */
export const GET = handler(async (req: Request) => {
  await requirePermission("orders.manage");
  const batch = new URL(req.url).searchParams.get("batch");
  if (batch) return ok({ codes: (await all<any>("SELECT code, garment_id FROM tags WHERE batch=? ORDER BY code", batch)) });
  const batches = await all<any>("SELECT batch, COUNT(*) total, COUNT(garment_id) used, MIN(created_at) created_at FROM tags GROUP BY batch ORDER BY MIN(created_at) DESC LIMIT 50");
  return ok({ batches });
});

/** { count } → a new batch of unique label codes. */
export const POST = handler(async (req: Request) => {
  const me = await requirePermission("orders.manage");
  const r = await createBatch(Number((await body(req)).count));
  await audit(me, "tags.create", "tags", r.batch, { count: r.codes.length });
  return ok(r, 201);
});
