"use client";

import Link from "next/link";
import useSWR from "swr";
import { Check, Crown, ChevronLeft, ChevronRight } from "lucide-react";
import { useApp } from "./providers";
import { cx } from "./ui";

export function planBenefitLines(plan: any, t: (k: any, v?: any) => string) {
  const out: string[] = [];
  if (plan.free_deliveries === -1) out.push(t("benefit_free_delivery_unlimited"));
  else if (plan.free_deliveries > 0) out.push(t("benefit_free_delivery_n", { n: plan.free_deliveries }));
  if (plan.discount_pct > 0) out.push(t("benefit_discount", { n: plan.discount_pct }));
  if (plan.no_service_fee) out.push(t("benefit_no_service_fee"));
  if (plan.express_discount_pct > 0) out.push(t("benefit_express", { n: plan.express_discount_pct }));
  if (plan.priority_support) out.push(t("benefit_priority"));
  return out;
}

export function PlanBenefits({ plan, light, className }: { plan: any; light?: boolean; className?: string }) {
  const { t } = useApp();
  return (
    <ul className={cx("space-y-2", className)}>
      {planBenefitLines(plan, t).map((b) => (
        <li key={b} className="flex items-center gap-2 text-sm">
          <span className={cx("flex h-5 w-5 shrink-0 items-center justify-center rounded-full", light ? "bg-white/25 text-white" : "bg-emerald-50 text-emerald-600")}><Check className="h-3 w-3" /></span>
          <span className={light ? "text-white/90" : "text-ink-700"}>{b}</span>
        </li>
      ))}
    </ul>
  );
}

export function PlusBadge({ className }: { className?: string }) {
  const { L, me } = useApp();
  if (!me?.member) return null;
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-300 to-amber-400 px-2 py-0.5 text-[10px] font-extrabold text-amber-950", className)}>
      <Crown className="h-3 w-3" /> {L(me.member.plan, "name")}
    </span>
  );
}

/** Home-screen promo / status card */
export function PlusBanner() {
  const { t, L, me, money, dir, fmtDate, lang } = useApp();
  const Chev = dir === "rtl" ? ChevronLeft : ChevronRight;
  const m = me?.member;
  const { data } = useSWR("/api/plans");
  const from = Math.min(...((data?.plans || []).map((p: any) => p.price) as number[]), Infinity);
  return (
    <Link href="/plus" className="relative block overflow-hidden rounded-3xl bg-gradient-to-br from-ink-950 via-ink-900 to-brand-900 p-5 text-white">
      <svg className="absolute -end-10 -top-10 h-44 w-44 opacity-25" viewBox="0 0 100 100" aria-hidden>
        <circle cx="50" cy="50" r="46" fill="none" stroke="#FBBF24" strokeWidth="2" />
        <circle cx="50" cy="50" r="30" fill="none" stroke="#FBBF24" strokeWidth="1.5" />
      </svg>
      <div className="relative flex items-center gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 text-amber-950 shadow-lg"><Crown className="h-6 w-6" /></span>
        <div className="min-w-0 flex-1">
          {m ? (
            <>
              <div className="text-xs font-semibold text-amber-300">{t("your_plan")}</div>
              <div className="text-lg font-extrabold">{L(m.plan, "name")}</div>
              <div className="text-xs text-white/60">
                {m.sub.auto_renew ? t("renews_on") : t("ends_on")} {fmtDate(m.sub.current_period_end, { day: "numeric", month: "short" })}
              </div>
            </>
          ) : (
            <>
              <div className="text-lg font-extrabold">{t("plus_title")}</div>
              <div className="text-xs text-white/70">{Number.isFinite(from) ? (lang === "ar" ? `توصيل مجاني + خصومات تبدأ من ${money(from)} شهرياً` : `Free delivery + discounts from ${money(from)}/month`) : t("plus_tagline")}</div>
            </>
          )}
        </div>
        <span className="flex items-center gap-1 rounded-full bg-amber-400 px-3 py-1.5 text-xs font-extrabold text-amber-950">
          {m ? (lang === "ar" ? "مزاياك" : "Benefits") : t("plus_cta")} <Chev className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}
