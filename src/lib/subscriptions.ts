import "server-only";
import { all, get, run, tx, now, insert } from "./db";
import { HttpError, type SessionUser } from "./auth";
import type { Benefits } from "./pricing";
import { notify } from "./orders";

const DAY = 86400000;

export type Plan = {
  id: number;
  slug: string;
  name_ar: string;
  name_en: string;
  price: number;
  interval_days: number;
  free_deliveries: number;
  discount_pct: number;
  no_service_fee: number;
  express_discount_pct: number;
  priority_support: number;
  color: string;
  active: number;
};

export function benefitsFor(plan: Plan, sub: { deliveries_used: number }): Benefits {
  return {
    free_delivery: plan.free_deliveries === -1 || sub.deliveries_used < plan.free_deliveries,
    discount_pct: plan.discount_pct,
    no_service_fee: !!plan.no_service_fee,
    express_discount_pct: plan.express_discount_pct,
  };
}

async function charge(userId: number, method: string, amount: number, note: string) {
  if (method === "wallet") {
    const { changes } = await run("UPDATE users SET wallet=wallet-? WHERE id=? AND wallet>=?", amount, userId, amount);
    if (!changes) return false;
    await run("INSERT INTO wallet_tx(user_id,amount,kind,note,created_at) VALUES(?,?,?,?,?)", userId, -amount, "subscription", note, now());
    return true;
  }
  // card: charge the saved card through the payment gateway here (demo: always succeeds)
  return true;
}

/**
 * Renews or expires subscriptions whose period ended. Runs lazily on reads (per user) and as a
 * throttled global sweep; in production also schedule it as a cron job.
 */
export async function renewDue(userId?: number) {
  const due = await all<any>(
    `SELECT s.*,p.price,p.name_ar,p.name_en,p.interval_days,p.active plan_active FROM subscriptions s JOIN plans p ON p.id=s.plan_id
     WHERE s.status='active' AND s.current_period_end<=? ${userId ? "AND s.user_id=?" : ""}`,
    now(),
    ...(userId ? [userId] : []),
  );
  for (const s of due) {
    await tx(async () => {
      const ts = now();
      if (!s.auto_renew || !s.plan_active) {
        await run("UPDATE subscriptions SET status='expired' WHERE id=?", s.id);
        await notify(s.user_id, "انتهى اشتراكك", "Your membership ended", `انتهى اشتراك ${s.name_ar}. جدد للاستمرار بالتوفير`, `${s.name_en} has ended. Renew to keep saving`, undefined, "/plus");
        return;
      }
      if (!await charge(s.user_id, s.payment_method, s.price, `${s.name_en} renewal`)) {
        await run("UPDATE subscriptions SET status='expired' WHERE id=?", s.id);
        await notify(s.user_id, "تعذر تجديد اشتراكك", "Membership renewal failed", "رصيد المحفظة غير كافٍ. اشحن رصيدك وجدد الاشتراك", "Insufficient wallet balance. Top up and renew", undefined, "/plus");
        return;
      }
      const end = new Date(s.current_period_end).getTime();
      const start = end > Date.now() - s.interval_days * DAY ? end : Date.now();
      const newEnd = start + s.interval_days * DAY;
      await run("UPDATE subscriptions SET current_period_start=?,current_period_end=?,deliveries_used=0 WHERE id=?", new Date(start).toISOString(), new Date(newEnd).toISOString(), s.id);
      await insert(
        "INSERT INTO subscription_payments(subscription_id,user_id,plan_id,amount,kind,period_start,period_end,created_at) VALUES(?,?,?,?,?,?,?,?)",
        s.id, s.user_id, s.plan_id, s.price, "renewal", new Date(start).toISOString(), new Date(newEnd).toISOString(), ts,
      );
      await notify(s.user_id, "تم تجديد اشتراكك ✨", "Membership renewed ✨", `تم تجديد ${s.name_ar} لشهر جديد`, `${s.name_en} renewed for another month`, undefined, "/plus");
    });
  }
}

const g = globalThis as unknown as { __nuqaRenew?: number };
export async function renewSweep() {
  if (g.__nuqaRenew && Date.now() - g.__nuqaRenew < 60000) return;
  g.__nuqaRenew = Date.now();
  await renewDue();
}

export async function activeSubscription(userId: number): Promise<{ sub: any; plan: Plan; benefits: Benefits } | null> {
  await renewDue(userId);
  const sub = await get<any>("SELECT * FROM subscriptions WHERE user_id=? AND status='active' ORDER BY id DESC LIMIT 1", userId);
  if (!sub) return null;
  const plan = (await get<Plan>("SELECT * FROM plans WHERE id=?", sub.plan_id))!;
  return { sub, plan, benefits: benefitsFor(plan, sub) };
}

export async function subscriptionSummary(userId: number) {
  const a = await activeSubscription(userId);
  const payments = await all("SELECT sp.*,p.name_ar,p.name_en FROM subscription_payments sp JOIN plans p ON p.id=sp.plan_id WHERE sp.user_id=? ORDER BY sp.id DESC LIMIT 24", userId);
  const totalSaved = (await get<any>("SELECT COALESCE(SUM(sub_savings),0) s FROM orders WHERE customer_id=? AND status!='cancelled'", userId))!.s;
  if (!a) return { subscription: null, plan: null, benefits: null, payments, totalSaved, periodSaved: 0, periodOrders: 0 };
  const period = (await get<any>(
    "SELECT COALESCE(SUM(sub_savings),0) s, COUNT(*) c FROM orders WHERE customer_id=? AND subscription_id=? AND status!='cancelled' AND created_at>=?",
    userId, a.sub.id, a.sub.current_period_start,
  ))!;
  return { subscription: a.sub, plan: a.plan, benefits: a.benefits, payments, totalSaved, periodSaved: period.s, periodOrders: period.c };
}

export async function subscribe(user: SessionUser, planId: number, method: "wallet" | "card") {
  const plan = await get<Plan>("SELECT * FROM plans WHERE id=? AND active=1", planId);
  if (!plan) throw new HttpError(400, "plan_unavailable");
  if (!["wallet", "card"].includes(method)) throw new HttpError(400, "invalid_payment");
  const current = await activeSubscription(user.id);
  if (current && current.plan.id === plan.id) throw new HttpError(409, "already_subscribed");
  return await tx(async () => {
    if (!await charge(user.id, method, plan.price, plan.name_en)) throw new HttpError(400, "wallet_insufficient");
    const ts = now();
    if (current) await run("UPDATE subscriptions SET status='cancelled',auto_renew=0,cancelled_at=? WHERE id=?", ts, current.sub.id); // plan switch
    const end = new Date(Date.now() + plan.interval_days * DAY).toISOString();
    const id = await insert(
      "INSERT INTO subscriptions(user_id,plan_id,status,auto_renew,payment_method,current_period_start,current_period_end,deliveries_used,started_at,created_at) VALUES(?,?,'active',1,?,?,?,0,?,?)",
      user.id, plan.id, method, ts, end, ts, ts,
    );
    await insert("INSERT INTO subscription_payments(subscription_id,user_id,plan_id,amount,kind,period_start,period_end,created_at) VALUES(?,?,?,?,?,?,?,?)", id, user.id, plan.id, plan.price, current ? "switch" : "new", ts, end, ts);
    await notify(user.id, `🎉 مرحباً بك في ${plan.name_ar}`, `🎉 Welcome to ${plan.name_en}`, "مزايا اشتراكك مفعلة على طلبك القادم", "Your member benefits apply from your next order", undefined, "/plus");
    return { id };
  });
}

export async function setAutoRenew(userId: number, on: boolean) {
  const a = await activeSubscription(userId);
  if (!a) throw new HttpError(404, "no_subscription");
  await run("UPDATE subscriptions SET auto_renew=?,cancelled_at=? WHERE id=?", on ? 1 : 0, on ? null : now(), a.sub.id);
}

/** Called when an order that used a counted free delivery is cancelled. */
export async function refundFreeDelivery(subscriptionId: number) {
  await run("UPDATE subscriptions SET deliveries_used=CASE WHEN deliveries_used>0 THEN deliveries_used-1 ELSE 0 END WHERE id=?", subscriptionId);
}
