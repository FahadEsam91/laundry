"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { ReceiptText, RotateCcw, Star } from "lucide-react";
import { useApp, useCart } from "@/components/providers";
import { BottomNav } from "@/components/customer";
import { Button, Empty, PartnerLogo, Segmented, Skeleton, StatusBadge } from "@/components/ui";
import { api } from "@/lib/client";

export default function OrdersPage() {
  const { t, L, money, fmtDate, me } = useApp();
  const router = useRouter();
  const cart = useCart();
  const [tab, setTab] = useState<"current" | "past">("current");
  const { data, isLoading } = useSWR(me?.user ? "/api/orders" : null, { refreshInterval: 5000 });
  const orders: any[] = data?.orders || [];
  const current = orders.filter((o) => !["delivered", "cancelled"].includes(o.status));
  const past = orders.filter((o) => ["delivered", "cancelled"].includes(o.status));
  const list = tab === "current" ? current : past;

  const reorder = async (o: any) => {
    const [{ order }, { partner }] = await Promise.all([api(`/api/orders/${o.id}`), api(`/api/partners/${o.partner_id}`)]);
    cart.replace(partner, order.items.filter((i: any) => i.product_id).map((i: any) => ({ product_id: i.product_id, qty: i.qty, name_ar: i.name_ar, name_en: i.name_en, icon: i.icon, price: i.unit_price, unit: "piece", service_ar: i.service_ar, service_en: i.service_en })));
    router.push("/cart");
  };

  return (
    <div className="lg:mx-auto lg:max-w-5xl lg:px-8 lg:pt-8">
      <header className="sticky top-0 z-30 border-b border-ink-100 bg-white/95 px-4 pb-3 pt-4 backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:px-0 lg:[&>div]:max-w-sm">
        <h1 className="mb-3 text-2xl font-extrabold">{t("my_orders")}</h1>
        <Segmented
          value={tab}
          onChange={setTab}
          className="w-full [&>button]:flex-1"
          options={[
            { value: "current", label: `${t("current_orders")}${current.length ? ` (${current.length})` : ""}` },
            { value: "past", label: t("past_orders") },
          ]}
        />
      </header>
      {!me?.user && me !== undefined && (
        <Empty icon={<ReceiptText className="h-9 w-9" />} title={t("login_title")} sub={t("login_sub")} action={<Link href="/login?next=/orders"><Button>{t("verify")}</Button></Link>} />
      )}
      {isLoading && [1, 2, 3].map((i) => <Skeleton key={i} className="mx-4 my-3 h-28" />)}
      {me?.user && data && !list.length && (
        <Empty icon={<ReceiptText className="h-9 w-9" />} title={t("no_orders")} sub={t("no_orders_sub")} action={<Link href="/"><Button>{t("browse")}</Button></Link>} />
      )}
      <div className="space-y-3 p-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0 lg:px-0">
        {list.map((o) => {
          const p = { color: o.partner_color, color2: o.partner_color2, initials: o.partner_initials };
          return (
            <div key={o.id} className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
              <Link href={`/orders/${o.id}`} className="flex gap-3">
                <PartnerLogo p={p} size={48} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-bold">{L({ name_ar: o.partner_ar, name_en: o.partner_en }, "name")}</span>
                    <span className="shrink-0 text-sm font-extrabold">{money(o.total)}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-ink-500">
                    {o.code} • {o.items_count} {t("items")} • {fmtDate(o.created_at)}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <StatusBadge status={o.status} />
                    {o.express ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">⚡ {t("express")}</span> : null}
                    {o.rating ? <span className="flex items-center gap-0.5 text-xs font-bold text-amber-600"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{o.rating}</span> : null}
                  </div>
                </div>
              </Link>
              {tab === "past" && (
                <div className="mt-3 flex gap-2 border-t border-ink-100 pt-3">
                  <Button size="sm" variant="secondary" className="flex-1" onClick={() => reorder(o)}>
                    <RotateCcw className="h-4 w-4" /> {t("reorder")}
                  </Button>
                  <Link href={`/orders/${o.id}`} className="flex-1">
                    <Button size="sm" variant="outline" block>{t("details")}</Button>
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <BottomNav />
    </div>
  );
}
