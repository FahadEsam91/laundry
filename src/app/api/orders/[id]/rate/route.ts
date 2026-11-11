import { handler, ok, body } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { rateOrder } from "@/lib/orders";
export const POST = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const u = await requireUser();
  const { rating, review } = await body(req);
  rateOrder(u, Number((await params).id), Number(rating), review);
  return ok({ ok: true });
});
