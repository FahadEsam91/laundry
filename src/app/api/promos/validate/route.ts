import { handler, ok, body } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { validatePromo } from "@/lib/orders";
export const POST = handler(async (req: Request) => {
  const u = await requireUser();
  const { code, subtotal } = await body(req);
  return ok({ promo: await validatePromo(String(code || ""), u.id, Number(subtotal) || 0) });
});
