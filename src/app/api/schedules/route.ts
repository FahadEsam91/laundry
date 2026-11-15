import { handler, ok, body } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { createSchedule, listSchedules, runSchedules } from "@/lib/schedules";

/** The customer's recurring pickups. */
export const GET = handler(async () => {
  const u = await requireUser();
  return ok({ schedules: await listSchedules(u.id) });
});

/** { partner_id, address_id, items:[{product_id,qty}], days:[0-6], time:"HH:MM", express?, payment_method?, notes? } */
export const POST = handler(async (req: Request) => {
  const u = await requireUser();
  const r = await createSchedule(u, await body(req));
  runSchedules().catch(() => {}); // a pickup within the next hours is ordered right away
  return ok(r, 201);
});
