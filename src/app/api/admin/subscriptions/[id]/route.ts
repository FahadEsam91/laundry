import { get, run, now } from "@/lib/db";
import { handler, ok, body, fail } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { notify } from "@/lib/orders";

export const POST = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireUser("admin");
  const id = Number((await params).id);
  const s = await get<any>("SELECT * FROM subscriptions WHERE id=?", id);
  if (!s) return fail(404, "not_found");
  const b = await body(req);
  if (b.action === "terminate") {
    await run("UPDATE subscriptions SET status='cancelled',auto_renew=0,cancelled_at=? WHERE id=?", now(), id);
    await notify(s.user_id, "تم إيقاف اشتراكك", "Your membership was cancelled", "تواصل مع الدعم لأي استفسار", "Contact support if you have questions", undefined, "/plus");
  } else if (b.action === "extend") {
    const days = Math.max(1, Math.min(365, Number(b.days) || 7));
    const end = new Date(new Date(s.current_period_end).getTime() + days * 86400000).toISOString();
    await run("UPDATE subscriptions SET current_period_end=? WHERE id=?", end, id);
    await notify(s.user_id, `🎁 أضفنا ${days} يوم لاشتراكك`, `🎁 ${days} free days added`, "هدية من فريق نقاء", "A gift from the Nuqa team", undefined, "/plus");
  } else return fail(400, "invalid_action");
  return ok({ ok: true });
});
