"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { Check, X, Sparkles, PackageCheck, Truck, Zap, Clock, Bike, Inbox, Banknote, Star, ReceiptText, PackageOpen } from "lucide-react";
import { useApp, useToast } from "@/components/providers";
import { Kpi, PageHead } from "@/components/admin";
import { Button, PartnerLogo, Skeleton, StatusBadge, Toggle, cx } from "@/components/ui";
import { api, errText, timeAgo } from "@/lib/client";

export default function PartnerBoard() {
  const { t, L, money, num, lang } = useApp();
  const toast = useToast();
  const { data, mutate } = useSWR("/api/partner/orders", { refreshInterval: 4000 });
  const [busy, setBusy] = useState<number | null>(null);
  const seen = useRef<Set<number> | null>(null);
  const [fresh, setFresh] = useState<Set<number>>(new Set());

  // highlight orders that arrived since the last poll
  useEffect(() => {
    if (!data) return;
    const ids = new Set<number>(data.active.filter((o: any) => o.status === "pending").map((o: any) => o.id));
    if (seen.current) {
      const newOnes = [...ids].filter((i) => !seen.current!.has(i));
      if (newOnes.length) {
        setFresh(new Set(newOnes));
        toast(lang === "ar" ? `🔔 طلب جديد!` : "🔔 New order!", "info");
      }
    }
    seen.current = ids;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  if (!data) return <Skeleton className="h-[70vh]" />;
  const p = data.partner;
  const act = async (id: number, action: string) => {
    setBusy(id);
    try {
      await api(`/api/partner/orders/${id}`, { body: { action } });
      mutate();
    } catch (e) {
      toast(errText(e, lang), "error");
    } finally {
      setBusy(null);
    }
  };
  const toggleOpen = async (v: boolean) => {
    await api("/api/partner/store", { method: "PATCH", body: { is_open: v } });
    mutate();
  };
  const cols = [
    { key: "new", title: t("incoming"), icon: Inbox, color: "bg-amber-500", statuses: ["pending"] },
    { key: "inbound", title: t("on_the_way_to_you"), icon: Truck, color: "bg-indigo-500", statuses: ["accepted", "driver_assigned", "picked_up"] },
    { key: "work", title: t("in_progress"), icon: Sparkles, color: "bg-sky-500", statuses: ["at_laundry", "processing"] },
    { key: "ready", title: t("ready_col"), icon: PackageCheck, color: "bg-emerald-500", statuses: ["ready", "out_for_delivery"] },
  ];
  const ACTIONS: Record<string, { action: string; label: string; icon: any; variant?: any }[]> = {
    pending: [
      { action: "reject", label: t("reject"), icon: X, variant: "danger" },
      { action: "accept", label: t("accept"), icon: Check, variant: "success" },
    ],
    picked_up: [{ action: "received", label: t("confirm_dropoff_laundry"), icon: PackageOpen }],
    at_laundry: [{ action: "start", label: t("start_cleaning"), icon: Sparkles }],
    processing: [{ action: "ready", label: t("mark_ready"), icon: PackageCheck, variant: "success" }],
  };

  return (
    <div className="animate-fade-up">
      <PageHead
        title={L(p, "name")}
        sub={`${L(p, "area")} • ★ ${num(p.rating, 1)}`}
        actions={
          <label className={cx("flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-bold", p.is_open ? "bg-emerald-50 text-emerald-800" : "bg-ink-100 text-ink-600")}>
            <Toggle checked={!!p.is_open} onChange={toggleOpen} />
            {p.is_open ? t("store_open") : t("store_closed")}
          </label>
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label={t("todays_orders")} value={num(data.today.orders)} icon={ReceiptText} />
        <Kpi label={t("todays_sales")} value={money(data.today.sales)} icon={Banknote} accent="#059669" />
        <Kpi label={`${t("net_earnings")} (30d)`} value={money(data.net)} icon={Banknote} accent="#7C3AED" hint={`-${p.commission}% ${t("commission")}`} />
        <Kpi label={t("avg_rating")} value={`${num(data.month.rating || p.rating, 2)} ★`} icon={Star} accent="#CA8A04" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cols.map((c) => {
          const orders = data.active.filter((o: any) => c.statuses.includes(o.status));
          return (
            <div key={c.key} className="flex min-h-[300px] flex-col rounded-2xl bg-ink-100/70 p-3">
              <div className="mb-3 flex items-center gap-2 px-1">
                <span className={cx("flex h-7 w-7 items-center justify-center rounded-lg text-white", c.color)}><c.icon className="h-4 w-4" /></span>
                <h2 className="flex-1 font-bold">{c.title}</h2>
                <span className="rounded-full bg-white px-2 text-xs font-bold tabular">{orders.length}</span>
              </div>
              <div className="space-y-3">
                {orders.map((o: any) => (
                  <OrderCard key={o.id} o={o} fresh={fresh.has(o.id)} busy={busy === o.id} actions={ACTIONS[o.status] || []} onAct={(a) => act(o.id, a)} />
                ))}
                {!orders.length && <div className="rounded-xl border-2 border-dashed border-ink-200 p-6 text-center text-xs text-ink-400">—</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OrderCard({ o, actions, onAct, busy, fresh }: { o: any; actions: any[]; onAct: (a: string) => void; busy: boolean; fresh: boolean }) {
  const { t, L, money, lang } = useApp();
  const { data } = useSWR(`/api/orders/${o.id}`, { refreshInterval: 0 });
  const items = data?.order?.items || [];
  return (
    <div className={cx("animate-fade-up rounded-2xl bg-white p-4 shadow-soft", fresh && "ring-2 ring-amber-400")}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 whitespace-nowrap font-extrabold">
            {o.code}
            {o.express ? <span className="flex items-center gap-0.5 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700"><Zap className="h-3 w-3" />{t("express")}</span> : null}
          </div>
          <div className="flex items-center gap-1 text-xs text-ink-400"><Clock className="h-3 w-3" />{timeAgo(o.created_at, lang)}</div>
        </div>
        <span className="text-sm font-extrabold tabular">{money(o.subtotal)}</span>
      </div>
      <div className="mt-2 text-sm font-semibold">{o.customer_name}</div>
      <div className="mt-2 space-y-1">
        {items.slice(0, 4).map((i: any) => (
          <div key={i.id} className="flex items-center gap-2 text-xs text-ink-600">
            <span>{i.icon}</span><span className="font-bold">{i.qty}×</span><span className="truncate">{L(i, "name")}</span><span className="ms-auto text-ink-400">{L(i, "service")}</span>
          </div>
        ))}
        {items.length > 4 && <div className="text-xs text-ink-400">+{items.length - 4}</div>}
      </div>
      {data?.order?.notes && <div className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">📝 {data.order.notes}</div>}
      <div className="mt-3 flex items-center justify-between">
        <StatusBadge status={o.status} />
        {o.driver_name && <span className="flex items-center gap-1 text-xs text-ink-500"><Bike className="h-3.5 w-3.5" />{o.driver_name}</span>}
        {["accepted", "ready"].includes(o.status) && !o.driver_name && <span className="text-xs font-semibold text-ink-400">{t("awaiting_rider")}</span>}
      </div>
      {!!actions.length && (
        <div className={cx("mt-3 grid gap-2", actions.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
          {actions.map((a) => (
            <Button key={a.action} size="sm" variant={a.variant || "primary"} loading={busy} onClick={() => onAct(a.action)}>
              <a.icon className="h-4 w-4" /> {a.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
