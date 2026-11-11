import { handler, ok, fail } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { autopilotTick, orderDTO } from "@/lib/orders";

export const GET = handler(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const u = await requireUser();
  autopilotTick();
  const o = orderDTO(Number((await params).id));
  if (!o) return fail(404, "not_found");
  const allowed =
    u.role === "admin" || o.customer_id === u.id || (u.role === "partner" && o.partner_id === u.partner_id) || (u.role === "driver" && (o.driver?.id === u.driver_id || !o.driver_id));
  if (!allowed) return fail(404, "not_found");
  return ok({ order: o });
});
