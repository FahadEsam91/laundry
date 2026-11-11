import { all, get, run, now } from "@/lib/db";
import { handler, ok, fail, body } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { orderDTO, transition } from "@/lib/orders";
import { driverUser, queuePush } from "@/lib/push";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler(async (_req: Request, { params }: Ctx) => {
  await requireUser("admin");
  const o = await orderDTO(Number((await params).id));
  if (!o) return fail(404, "not_found");
  const drivers = await all("SELECT d.id,d.status,d.vehicle,u.name FROM drivers d JOIN users u ON u.id=d.user_id WHERE u.status='active' ORDER BY d.status DESC,u.name");
  const pickupDriver = o.pickup_driver_id ? await get("SELECT u.name FROM drivers d JOIN users u ON u.id=d.user_id WHERE d.id=?", o.pickup_driver_id) : null;
  return ok({ order: o, drivers, pickupDriver });
});

export const POST = handler(async (req: Request, { params }: Ctx) => {
  await requireUser("admin");
  const id = Number((await params).id);
  const b = await body(req);
  if (b.action === "status") await transition(id, b.to, "admin", { force: true, note: b.note });
  else if (b.action === "cancel") await transition(id, "cancelled", "admin", { force: true, note: b.note || "Cancelled by support" });
  else if (b.action === "assign") {
    await run("UPDATE orders SET driver_id=?,updated_at=? WHERE id=?", b.driver_id || null, now(), id);
    const uid = b.driver_id ? await driverUser(Number(b.driver_id)) : undefined;
    const code = (await get<any>("SELECT code FROM orders WHERE id=?", id))?.code;
    if (uid) queuePush([uid], { title_ar: `📍 تم تعيينك على ${code}`, title_en: `📍 You were assigned ${code}`, body_ar: "افتح التطبيق لعرض التفاصيل", body_en: "Open the app for details", url: "/driver", tag: `assign-${id}` });
  }
  else return fail(400, "invalid_action");
  return ok({ ok: true });
});
