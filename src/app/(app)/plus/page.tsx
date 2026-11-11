"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Crown, Check, Wallet, CreditCard, Sparkles, PiggyBank, Truck, CalendarClock, ChevronDown } from "lucide-react";
import { useApp, useToast } from "@/components/providers";
import { TopBar } from "@/components/customer";
import { PlanBenefits } from "@/components/plus";
import { Button, Sheet, Skeleton, Toggle, cx } from "@/components/ui";
import { api, errText } from "@/lib/client";

export default function PlusPage() {
  const { t, L, money, me, lang, fmtDate, refreshMe } = useApp();
  const toast = useToast();
  const router = useRouter();
  const { data: plansData } = useSWR("/api/plans");
  const { data: sum, mutate } = useSWR(me?.user ? "/api/subscription" : null);
  const plans: any[] = plansData?.plans || [];
  const sub = sum?.subscription;
  const cur = sum?.plan;
  const [sel, setSel] = useState<number | null>(null);
  const [pay, setPay] = useState<"card" | "wallet">("card");
  const [busy, setBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [faq, setFaq] = useState<number | null>(0);

  useEffect(() => {
    if (sel === null && plans.length) setSel(cur?.id ?? (plans.find((p) => p.popular) || plans[0]).id);
  }, [plans, cur, sel]);

  const plan = plans.find((p) => p.id === sel);
  const isCurrent = !!cur && plan?.id === cur.id;
  const wallet = me?.user?.wallet || 0;

  const subscribe = async () => {
    if (!me?.user) return router.push("/login?next=/plus");
    if (!plan) return;
    setBusy(true);
    try {
      await api("/api/subscription", { body: { plan_id: plan.id, payment_method: pay } });
      toast(`🎉 ${L(plan, "name")}`);
      mutate();
      refreshMe();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      toast(errText(e, lang, money), "error");
    } finally {
      setBusy(false);
    }
  };
  const setRenew = async (on: boolean) => {
    await api("/api/subscription", { method: "PATCH", body: { auto_renew: on } });
    setCancelOpen(false);
    mutate();
    refreshMe();
    toast(t("saved"));
  };

  const left = cur ? (cur.free_deliveries === -1 ? t("unlimited") : String(Math.max(0, cur.free_deliveries - sub.deliveries_used))) : "";

  return (
    <div className="bg-ink-50 pb-32">
      <div className="bg-gradient-to-b from-ink-950 via-ink-900 to-brand-900 text-white">
        <TopBar transparent back="/" />
        <div className="px-5 pb-10 pt-2 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-300 to-amber-500 text-amber-950 shadow-xl"><Crown className="h-8 w-8" /></span>
          <h1 className="mt-4 text-3xl font-extrabold">{t("plus_title")}</h1>
          <p className="mt-1 text-sm text-white/70">{t("plus_tagline")}</p>
        </div>
      </div>

      {/* membership status */}
      {!sum && me?.user && <div className="-mt-6 px-4"><Skeleton className="h-40" /></div>}
      {sub && cur && (
        <div className="-mt-6 px-4">
          <div className="rounded-3xl bg-white p-5 shadow-lift">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-ink-400">{t("your_plan")}</div>
                <div className="flex items-center gap-2 text-xl font-extrabold"><Crown className="h-5 w-5 text-amber-500" />{L(cur, "name")}</div>
              </div>
              <span className={cx("rounded-full px-3 py-1 text-xs font-bold", sub.auto_renew ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>
                {sub.auto_renew ? t("active") : t("cancelling")}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-emerald-50 p-3">
                <PiggyBank className="mx-auto h-5 w-5 text-emerald-600" />
                <div className="mt-1 text-sm font-extrabold">{money(sum.periodSaved)}</div>
                <div className="text-[10px] text-ink-500">{t("saved_this_period")}</div>
              </div>
              <div className="rounded-2xl bg-brand-50 p-3">
                <Truck className="mx-auto h-5 w-5 text-brand-600" />
                <div className="mt-1 text-sm font-extrabold">{left}</div>
                <div className="text-[10px] text-ink-500">{t("free_deliveries_left")}</div>
              </div>
              <div className="rounded-2xl bg-amber-50 p-3">
                <CalendarClock className="mx-auto h-5 w-5 text-amber-600" />
                <div className="mt-1 text-sm font-extrabold">{fmtDate(sub.current_period_end, { day: "numeric", month: "short" })}</div>
                <div className="text-[10px] text-ink-500">{sub.auto_renew ? t("renews_on") : t("ends_on")}</div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between rounded-2xl bg-ink-50 p-3">
              <div>
                <div className="text-sm font-bold">{t("auto_renew")}</div>
                <div className="text-xs text-ink-500">{money(cur.price)} {t("per_month")} • {t(`pay_${sub.payment_method}` as any)}</div>
              </div>
              <Toggle checked={!!sub.auto_renew} onChange={(v) => (v ? setRenew(true) : setCancelOpen(true))} />
            </div>
            {sum.totalSaved > 0 && <p className="mt-3 text-center text-xs text-ink-500">{t("saved_total")}: <b className="text-emerald-600">{money(sum.totalSaved)}</b></p>}
          </div>
        </div>
      )}

      {/* plans */}
      <section className={cx("px-4", sub ? "pt-6" : "-mt-6")}>
        {sub && <h2 className="mb-3 text-lg font-bold">{t("choose_plan")}</h2>}
        {!plansData && <Skeleton className="h-64" />}
        <div className="space-y-3">
          {plans.map((p) => {
            const on = sel === p.id;
            return (
              <button key={p.id} onClick={() => setSel(p.id)} className={cx("relative w-full overflow-hidden rounded-3xl border-2 bg-white p-5 text-start shadow-soft transition", on ? "border-brand-600" : "border-transparent")}>
                {p.popular ? <span className="absolute end-0 top-0 rounded-es-2xl bg-amber-400 px-3 py-1 text-[10px] font-extrabold text-amber-950">{t("most_popular")}</span> : null}
                <div className="flex items-start gap-3">
                  <span className={cx("mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2", on ? "border-brand-600 bg-brand-600" : "border-ink-300")}>{on && <Check className="h-3.5 w-3.5 text-white" />}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-extrabold" style={{ color: p.color }}>{L(p, "name")}</span>
                      {cur?.id === p.id && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">{t("current")}</span>}
                    </div>
                    <div className="mt-0.5 text-sm text-ink-500">{L(p, "desc")}</div>
                    <div className="mt-3"><span className="text-2xl font-extrabold">{money(p.price)}</span> <span className="text-sm text-ink-400">{t("per_month")}</span></div>
                    <PlanBenefits plan={p} className="mt-3" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* payment */}
      {plan && !isCurrent && (
        <section className="px-4 pt-6">
          <h2 className="mb-3 text-lg font-bold">{t("payment")}</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { v: "card" as const, icon: CreditCard, label: t("pay_card"), sub: "Visa • Mastercard" },
              { v: "wallet" as const, icon: Wallet, label: t("pay_wallet"), sub: `${t("balance")}: ${money(wallet)}` },
            ].map((o) => (
              <button key={o.v} onClick={() => setPay(o.v)} className={cx("rounded-2xl border-2 bg-white p-3 text-start", pay === o.v ? "border-brand-600" : "border-transparent")}>
                <o.icon className="h-5 w-5 text-ink-600" />
                <div className="mt-2 text-sm font-bold">{o.label}</div>
                <div className={cx("text-xs", o.v === "wallet" && wallet < plan.price ? "text-red-500" : "text-ink-500")}>{o.sub}</div>
              </button>
            ))}
          </div>
          {pay === "card" && <p className="mt-2 text-xs text-ink-400">{t("card_note")}</p>}
        </section>
      )}

      {/* FAQ */}
      <section className="px-4 pt-8">
        <h2 className="mb-3 text-lg font-bold">{t("plus_faq_title")}</h2>
        <div className="divide-y divide-ink-100 rounded-2xl bg-white">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <button onClick={() => setFaq(faq === i ? null : i)} className="flex w-full items-center justify-between p-4 text-start text-sm font-bold">
                {t(`faq${i}q` as any)}
                <ChevronDown className={cx("h-4 w-4 text-ink-400 transition", faq === i && "rotate-180")} />
              </button>
              {faq === i && <p className="px-4 pb-4 text-sm text-ink-600">{t(`faq${i}a` as any)}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* billing history */}
      {!!sum?.payments?.length && (
        <section className="px-4 pt-8">
          <h2 className="mb-3 text-lg font-bold">{t("billing_history")}</h2>
          <div className="divide-y divide-ink-100 rounded-2xl bg-white">
            {sum.payments.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between p-4 text-sm">
                <div>
                  <div className="font-semibold">{L(p, "name")}</div>
                  <div className="text-xs text-ink-400">{fmtDate(p.period_start, { day: "numeric", month: "short" })} – {fmtDate(p.period_end, { day: "numeric", month: "short", year: "numeric" })}</div>
                </div>
                <span className="font-bold">{money(p.amount)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {plan && !isCurrent && (
        <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[460px] border-t border-ink-100 bg-white p-4 pb-safe">
          <Button block size="lg" loading={busy} onClick={subscribe} className="justify-between">
            <span className="flex items-center gap-2"><Sparkles className="h-5 w-5" />{cur ? t("switch_plan") : t("subscribe_to", { x: L(plan, "name") })}</span>
            <span>{money(plan.price)}</span>
          </Button>
        </div>
      )}

      <Sheet open={cancelOpen} onClose={() => setCancelOpen(false)} title={t("cancel_membership")}>
        <p className="text-sm text-ink-600">{t("cancel_membership_note")}</p>
        {sub && <p className="mt-2 text-sm font-bold">{t("ends_on")} {fmtDate(sub.current_period_end, { day: "numeric", month: "long" })}</p>}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => setCancelOpen(false)}>{t("no")}</Button>
          <Button variant="danger" onClick={() => setRenew(false)}>{t("cancel_membership")}</Button>
        </div>
      </Sheet>
    </div>
  );
}
