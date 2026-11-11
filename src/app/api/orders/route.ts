import { handler, ok, body } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { autopilotTick, createOrder, listOrders } from "@/lib/orders";

export const GET = handler(async () => {
  const u = await requireUser();
  autopilotTick();
  return ok({ orders: listOrders("o.customer_id=?", [u.id], 100) });
});

export const POST = handler(async (req: Request) => {
  const u = await requireUser();
  const res = createOrder(u, await body(req));
  return ok(res, 201);
});
