"use client";

import { useState } from "react";
import useSWR from "swr";
import { ArrowDownLeft, ArrowUpRight, Plus, Wallet } from "lucide-react";
import { useApp, useToast } from "@/components/providers";
import { TopBar } from "@/components/customer";
import { Button, Sheet, cx, LogoMark } from "@/components/ui";
import { api } from "@/lib/client";

export default function WalletPage() {
  const { t, money, fmtDate, refreshMe, lang, settings } = useApp();
  const toast = useToast();
  const { data, mutate } = useSWR("/api/wallet");
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(25000);
  const [busy, setBusy] = useState(false);
  const topup = async () => {
    setBusy(true);
    await api("/api/wallet", { body: { amount } });
    setBusy(false);
    setOpen(false);
    mutate();
    refreshMe();
    toast(`${t("top_up")} ✓`);
  };
  const KIND: Record<string, [string, string]> = { topup: ["شحن رصيد", "Top-up"], payment: ["دفع طلب", "Order payment"], refund: ["استرداد", "Refund"], credit: ["رصيد من الدعم", "Support credit"] };
  return (
    <div>
      <TopBar title={t("wallet")} back="/account" />
      <div className="p-4">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-sky-500 p-6 text-white shadow-glow">
          <LogoMark className="absolute -end-4 -top-4 h-28 w-28 opacity-20" />
          <div className="flex items-center gap-2 text-sm text-white/80"><Wallet className="h-4 w-4" /> {t("balance")}</div>
          <div className="mt-2 text-4xl font-extrabold">{money(data?.balance || 0)}</div>
          <div className="mt-1 text-sm text-white/70">{data?.points || 0} {t("points")}</div>
          {settings.online_payments && <Button variant="dark" className="mt-5 bg-white text-brand-700 hover:bg-white/90" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> {t("top_up")}</Button>}
        </div>
        <h3 className="mb-2 mt-6 font-bold">{t("transactions")}</h3>
        <div className="divide-y divide-ink-100 rounded-2xl border border-ink-100">
          {(data?.transactions || []).map((x: any) => (
            <div key={x.id} className="flex items-center gap-3 p-3">
              <span className={cx("flex h-10 w-10 items-center justify-center rounded-full", x.amount > 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500")}>
                {x.amount > 0 ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
              </span>
              <div className="flex-1">
                <div className="text-sm font-semibold">{KIND[x.kind]?.[lang === "ar" ? 0 : 1] || x.kind}</div>
                <div className="text-xs text-ink-400">{x.note} • {fmtDate(x.created_at)}</div>
              </div>
              <span className={cx("text-sm font-extrabold", x.amount > 0 ? "text-emerald-600" : "text-ink-800")}>{money(x.amount, { sign: true })}</span>
            </div>
          ))}
          {data && !data.transactions.length && <div className="p-6 text-center text-sm text-ink-400">—</div>}
        </div>
      </div>
      <Sheet open={open} onClose={() => setOpen(false)} title={t("top_up")}>
        <div className="grid grid-cols-3 gap-2">
          {[10000, 25000, 50000, 75000, 100000, 200000].map((a) => (
            <button key={a} onClick={() => setAmount(a)} className={cx("h-12 rounded-xl border-2 text-sm font-bold", amount === a ? "border-brand-600 bg-brand-50 text-brand-700" : "border-ink-100")}>
              {money(a)}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-ink-400">{t("card_note")}</p>
        <Button block size="lg" className="mt-4" loading={busy} onClick={topup}>{t("top_up")} • {money(amount)}</Button>
      </Sheet>
    </div>
  );
}
