import { handler, ok, body } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { setAutoRenew, subscribe, subscriptionSummary } from "@/lib/subscriptions";

export const GET = handler(async () => {
  const u = await requireUser();
  return ok(await subscriptionSummary(u.id));
});

/** Subscribe or switch plan: { plan_id, payment_method: 'wallet' | 'card' } */
export const POST = handler(async (req: Request) => {
  const u = await requireUser();
  const b = await body(req);
  return ok(await subscribe(u, Number(b.plan_id), b.payment_method), 201);
});

/** { auto_renew: boolean } — turning it off cancels at period end */
export const PATCH = handler(async (req: Request) => {
  const u = await requireUser();
  await setAutoRenew(u.id, !!(await body(req)).auto_renew);
  return ok({ ok: true });
});
