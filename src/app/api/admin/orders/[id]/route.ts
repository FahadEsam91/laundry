import { all, get, run, now } from "@/lib/db";
import { handler, ok, fail, body } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { orderDTO, transition } from "@/lib/orders";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler(async (_req: Request, { params }: Ctx) => {
  await requireUser("admin");
  const o = orderDTO(Number((await params).id));
  if (!o) return fail(404, "not_found");
  const drivers = all("SELECT d.id,d.status,d.vehicle,u.name FROM drivers d JOIN users u ON u.id=d.user_id WHERE u.status='active' ORDER BY d.status DESC,u.name");
  const pickupDriver = o.pickup_driver_id ? get("SELECT u.name FROM drivers d JOIN users u ON u.id=d.user_id WHERE d.id=?", o.pickup_driver_id) : null;
  return ok({ order: o, drivers, pickupDriver });
});

export const POST = handler(async (req: Request, { params }: Ctx) => {
  await requireUser("admin");
  const id = Number((await params).id);
  const b = await body(req);
  if (b.action === "status") transition(id, b.to, "admin", { force: true, note: b.note });
  else if (b.action === "cancel") transition(id, "cancelled", "admin", { force: true, note: b.note || "Cancelled by support" });
  else if (b.action === "assign") run("UPDATE orders SET driver_id=?,updated_at=? WHERE id=?", b.driver_id || null, now(), id);
  else return fail(400, "invalid_action");
  return ok({ ok: true });
});
