import { get } from "@/lib/db";
import { handler, ok, fail, body } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { transition } from "@/lib/orders";
import type { OrderStatus } from "@/lib/constants";

const ACTIONS: Record<string, { from: OrderStatus; to: OrderStatus }> = {
  accept: { from: "pending", to: "accepted" },
  reject: { from: "pending", to: "cancelled" },
  received: { from: "picked_up", to: "at_laundry" },
  start: { from: "at_laundry", to: "processing" },
  ready: { from: "processing", to: "ready" },
};

export const POST = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const u = await requireUser("partner");
  const id = Number((await params).id);
  const o = get<any>("SELECT partner_id,status FROM orders WHERE id=?", id);
  if (!o || (u.role !== "admin" && o.partner_id !== u.partner_id)) return fail(404, "not_found");
  const { action, note } = await body(req);
  const a = ACTIONS[action];
  if (!a || o.status !== a.from) return fail(409, "invalid_action");
  transition(id, a.to, "partner", { note, force: a.to === "cancelled" });
  return ok({ ok: true });
});
