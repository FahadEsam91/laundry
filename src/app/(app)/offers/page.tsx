"use client";

import useSWR from "swr";
import { TicketPercent, Copy, Truck, Percent, Gift } from "lucide-react";
import { useApp, useToast } from "@/components/providers";
import { BottomNav } from "@/components/customer";
import { Skeleton, cx } from "@/components/ui";

export default function OffersPage() {
  const { t, L, money, fmtDate, lang } = useApp();
  const toast = useToast();
  const { data } = useSWR("/api/promos");
  return (
    <div>
      <header className="bg-gradient-to-br from-violet-600 to-brand-600 px-4 pb-8 pt-6 text-white">
        <TicketPercent className="h-8 w-8" />
        <h1 className="mt-3 text-2xl font-extrabold">{t("offers_title")}</h1>
        <p className="text-sm text-white/80">{lang === "ar" ? "انسخ الكود واستخدمه عند إتمام الطلب" : "Copy a code and apply it at checkout"}</p>
      </header>
      <div className="-mt-4 space-y-3 px-4 pb-6">
        {!data && [1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
        {data?.promos?.map((p: any) => {
          const I = p.kind === "delivery" ? Truck : p.kind === "percent" ? Percent : Gift;
          return (
            <div key={p.code} className="relative flex overflow-hidden rounded-2xl bg-white shadow-soft">
              <div className={cx("flex w-24 shrink-0 flex-col items-center justify-center text-white", p.kind === "delivery" ? "bg-emerald-500" : p.kind === "percent" ? "bg-brand-600" : "bg-amber-500")}>
                <I className="h-6 w-6" />
                <span className="mt-1 text-xl font-extrabold" dir="ltr">{p.kind === "percent" ? `${p.value}%` : p.kind === "delivery" ? "0" : money(p.value).split(" ")[0]}</span>
              </div>
              <div className="absolute inset-y-0 start-24 flex flex-col justify-between py-1">
                {[...Array(7)].map((_, i) => <span key={i} className="-ms-1.5 h-3 w-3 rounded-full bg-ink-50" />)}
              </div>
              <div className="min-w-0 flex-1 p-4 ps-5">
                <div className="font-bold">{L(p, "title")}</div>
                <div className="mt-1 text-xs text-ink-500">
                  {p.min_order > 0 && <>{t("min_spend")} {money(p.min_order)} • </>}
                  {p.max_discount && <>{t("max_discount")} {money(p.max_discount)} • </>}
                  {p.expires_at && <>{t("valid_until")} {fmtDate(p.expires_at, { day: "numeric", month: "short" })}</>}
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(p.code);
                    toast(`${t("copied")}: ${p.code}`, "info");
                  }}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border border-dashed border-brand-300 bg-brand-50 px-3 py-1.5 text-sm font-extrabold tracking-wider text-brand-700"
                  dir="ltr"
                >
                  {p.code} <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <BottomNav />
    </div>
  );
}
