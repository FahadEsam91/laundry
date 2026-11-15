import { get } from "@/lib/db";
import { handler, ok, fail } from "@/lib/api";
import { can, requireUser } from "@/lib/auth";
import { autopilotTick, orderDTO } from "@/lib/orders";

export const GET = handler(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const u = await requireUser();
  await autopilotTick();
  const o: any = await orderDTO(Number((await params).id));
  if (!o) return fail(404, "not_found");
  const allowed =
    can(u, "orders.view") || o.customer_id === u.id || (u.role === "partner" && o.partner_id === u.partner_id) || (u.role === "driver" && (o.driver?.id === u.driver_id || !o.driver_id));
  if (!allowed) return fail(404, "not_found");
  // only the customer sees their handover code, and only while the order is still open
  if (o.customer_id === u.id && !["delivered", "cancelled"].includes(o.status)) {
    o.delivery_pin = (await get<any>("SELECT delivery_pin FROM orders WHERE id=?", o.id))?.delivery_pin ?? null;
  }
  return ok({ order: o });
});
