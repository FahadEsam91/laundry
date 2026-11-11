import { get } from "@/lib/db";
import { handler, ok, fail, body } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { transition } from "@/lib/orders";

export const POST = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const u = await requireUser();
  const id = Number((await params).id);
  const o = get<any>("SELECT customer_id FROM orders WHERE id=?", id);
  if (!o || o.customer_id !== u.id) return fail(404, "not_found");
  const { reason } = await body(req);
  transition(id, "cancelled", "customer", { note: reason || "Customer request" });
  return ok({ ok: true });
});
