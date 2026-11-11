import { get, run, now } from "@/lib/db";
import { handler, ok, fail, body } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { transition } from "@/lib/orders";
import type { OrderStatus } from "@/lib/constants";

const STEP: Record<string, { from: OrderStatus; to: OrderStatus }> = {
  picked_up: { from: "driver_assigned", to: "picked_up" },
  at_laundry: { from: "picked_up", to: "at_laundry" },
  out_for_delivery: { from: "ready", to: "out_for_delivery" },
  delivered: { from: "out_for_delivery", to: "delivered" },
};

export const POST = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const u = await requireUser("driver");
  const d = await get<any>("SELECT * FROM drivers WHERE user_id=?", u.id);
  if (!d) return fail(403, "no_driver");
  const id = Number((await params).id);
  const o = await get<any>("SELECT * FROM orders WHERE id=?", id);
  if (!o) return fail(404, "not_found");
  const { action } = await body(req);

  if (action === "take") {
    if (o.driver_id) return fail(409, "already_taken");
    if (o.status === "accepted") await transition(id, "driver_assigned", "driver", { driverId: d.id });
    else if (o.status === "ready") await run("UPDATE orders SET driver_id=?,updated_at=? WHERE id=?", d.id, now(), id);
    else return fail(409, "not_available");
    return ok({ ok: true });
  }
  const s = STEP[action];
  if (!s || o.driver_id !== d.id || o.status !== s.from) return fail(409, "invalid_action");
  await transition(id, s.to, "driver");
  return ok({ ok: true });
});
