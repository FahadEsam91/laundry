"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { Download, Search, Phone, MapPin, XCircle, ChevronsRight, UserCheck, Zap } from "lucide-react";
import { useApp, useCan, useToast } from "@/components/providers";
import { PageHead, Pager, Panel, Table, Td } from "@/components/admin";
import { Button, Input, PartnerLogo, Select, Sheet, Skeleton, StatusBadge, cx } from "@/components/ui";
import { PhotoGallery } from "@/components/image-upload";
import { MapView } from "@/components/map-view";
import { NEXT_STATUS, ORDER_FLOW, STATUS_META } from "@/lib/constants";
import { api, errText } from "@/lib/client";

function OrdersInner() {
  const { t, L, money, fmtDate, statusLabel, lang } = useApp();
  const can = useCan();
  const sp = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState(sp.get("status") || "");
  const [partner, setPartner] = useState("");
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<number | null>(Number(sp.get("open")) || null);
  useEffect(() => {
    const id = setTimeout(() => (setDq(q), setPage(1)), 300);
    return () => clearTimeout(id);
  }, [q]);
  const qs = new URLSearchParams({ page: String(page), ...(status && { status }), ...(partner && { partner }), ...(dq && { q: dq }), ...(sp.get("customer") && { customer: sp.get("customer")! }) });
  const { data, mutate } = useSWR(`/api/admin/orders?${qs}`, { refreshInterval: 6000, keepPreviousData: true });
  const { data: pData } = useSWR("/api/admin/partners");
  const counts: Record<string, number> = Object.fromEntries((data?.counts || []).map((c: any) => [c.status, c.c]));
  const activeCount = ORDER_FLOW.filter((s) => s !== "delivered").reduce((a, s) => a + (counts[s] || 0), 0);
  const tabs = [
    { v: "", label: t("all"), n: Object.values(counts).reduce((a, b) => a + b, 0) },
    { v: "active", label: t("active_orders"), n: activeCount },
    { v: "pending", label: statusLabel("pending"), n: counts.pending || 0 },
    { v: "processing", label: statusLabel("processing"), n: counts.processing || 0 },
    { v: "out_for_delivery", label: statusLabel("out_for_delivery"), n: counts.out_for_delivery || 0 },
    { v: "delivered", label: statusLabel("delivered"), n: counts.delivered || 0 },
    { v: "cancelled", label: statusLabel("cancelled"), n: counts.cancelled || 0 },
  ];

  return (
    <div className="animate-fade-up">
      <PageHead
        title={t("orders")}
        sub={`${data?.total ?? "…"} ${t("orders")}`}
        actions={
          can("orders.export") ? (
            <a href={`/api/admin/orders?${qs}&format=csv`}>
              <Button variant="outline"><Download className="h-4 w-4" /> {t("export_csv")}</Button>
            </a>
          ) : undefined
        }
      />
      <div className="no-scrollbar mb-4 flex gap-1 overflow-x-auto">
        {tabs.map((tb) => (
          <button key={tb.v} onClick={() => { setStatus(tb.v); setPage(1); router.replace(tb.v ? `/admin/orders?status=${tb.v}` : "/admin/orders"); }} className={cx("flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition", status === tb.v ? "bg-ink-900 text-white" : "bg-white text-ink-600 hover:bg-ink-100")}>
            {tb.label}
            <span className={cx("rounded-md px-1.5 text-[11px] tabular", status === tb.v ? "bg-white/20" : "bg-ink-100")}>{tb.n}</span>
          </button>
        ))}
      </div>
      <Panel bodyClass="p-0">
        <div className="flex flex-wrap gap-3 border-b border-ink-100 p-4">
          <div className="min-w-[240px] flex-1"><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search_orders")} icon={<Search className="h-4 w-4" />} /></div>
          <div className="w-56">
            <Select value={partner} onChange={(e) => { setPartner(e.target.value); setPage(1); }}>
              <option value="">{t("all_partners")}</option>
              {(pData?.partners || []).map((p: any) => <option key={p.id} value={p.id}>{L(p, "name")}</option>)}
            </Select>
          </div>
        </div>
        {!data ? (
          <div className="space-y-2 p-4">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : (
          <Table head={[t("order_no"), t("customer"), t("partner"), t("driver"), t("items_label"), t("total"), t("payment"), t("status"), t("date")]}>
            {data.orders.map((o: any) => (
              <tr key={o.id} onClick={() => setOpenId(o.id)} className="cursor-pointer hover:bg-brand-50/40">
                <Td>
                  <span className="font-bold text-brand-700">{o.code}</span>
                  {Number(o.photos_count) > 0 && <span className="ms-1.5 rounded-full bg-ink-100 px-1.5 py-0.5 text-[10px] font-bold text-ink-600" title={t("customer_photos")}>📷 {o.photos_count}</span>}
                  {o.express ? <Zap className="ms-1 inline h-3.5 w-3.5 fill-amber-400 text-amber-500" /> : null}
                </Td>
                <Td><div className="font-semibold">{o.customer_name}</div><div className="text-xs text-ink-400" dir="ltr">{o.customer_phone}</div></Td>
                <Td>{L({ name_ar: o.partner_ar, name_en: o.partner_en }, "name")}</Td>
                <Td className={o.driver_name ? "" : "text-ink-300"}>{o.driver_name || "—"}</Td>
                <Td className="tabular">{o.items_count}</Td>
                <Td className="font-bold tabular">{money(o.total)}</Td>
                <Td><span className="text-xs">{t(`pay_${o.payment_method}` as any)}</span> <span className={cx("ms-1 text-[10px] font-bold", o.payment_status === "paid" ? "text-emerald-600" : o.payment_status === "refunded" ? "text-blue-600" : "text-amber-600")}>• {t(o.payment_status)}</span></Td>
                <Td><StatusBadge status={o.status} /></Td>
                <Td className="text-xs text-ink-500">{fmtDate(o.created_at)}</Td>
              </tr>
            ))}
          </Table>
        )}
        {data && !data.orders.length && <div className="p-10 text-center text-sm text-ink-400">{t("no_results")}</div>}
        {data && <Pager page={page} size={data.size} total={data.total} onPage={setPage} />}
      </Panel>
      <OrderDrawer id={openId} onClose={() => setOpenId(null)} onChanged={() => mutate()} />
    </div>
  );
}

function OrderDrawer({ id, onClose, onChanged }: { id: number | null; onClose: () => void; onChanged: () => void }) {
  const { t, L, money, fmtDate, statusLabel, lang } = useApp();
  const can = useCan();
  const toast = useToast();
  const { data, mutate } = useSWR(id ? `/api/admin/orders/${id}` : null, { refreshInterval: 4000 });
  const [busy, setBusy] = useState(false);
  const o = data?.order;
  const act = async (b: any) => {
    setBusy(true);
    try {
      await api(`/api/admin/orders/${id}`, { body: b });
      toast(t("saved"));
      mutate();
      onChanged();
    } catch (e) {
      toast(errText(e, lang), "error");
    } finally {
      setBusy(false);
    }
  };
  const next = o ? NEXT_STATUS[o.status as keyof typeof NEXT_STATUS] : undefined;
  return (
    <Sheet open={!!id} onClose={onClose} wide title={o ? <span className="flex items-center gap-3">{o.code} <StatusBadge status={o.status} /></span> : "…"}>
      {!o ? (
        <Skeleton className="h-96" />
      ) : (
        <div className="grid gap-5 md:grid-cols-5">
          <div className="space-y-4 md:col-span-3">
            <MapView className="h-56 w-full overflow-hidden rounded-2xl" markers={[
              { id: "h", lat: o.address_lat, lng: o.address_lng, kind: "home" },
              { id: "p", lat: o.partner.lat, lng: o.partner.lng, kind: "laundry", color: o.partner.color },
              ...(o.tracking ? [{ id: "r", lat: o.tracking.lat, lng: o.tracking.lng, kind: "rider" as const, pulse: true }] : []),
            ]} />
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-ink-50 p-3">
                <div className="text-xs text-ink-500">{t("customer")}</div>
                <div className="font-bold">{o.customer.name}</div>
                <a href={`tel:${o.customer.phone}`} className="flex items-center gap-1 text-xs text-brand-600" dir="ltr"><Phone className="h-3 w-3" />{o.customer.phone}</a>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-ink-50 p-3">
                <PartnerLogo p={o.partner} size={36} />
                <div className="min-w-0">
                  <div className="text-xs text-ink-500">{t("partner")}</div>
                  <div className="truncate font-bold">{L(o.partner, "name")}</div>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2 text-sm text-ink-600"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" /> {o.address_text}</div>
            {o.notes && <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">📝 {o.notes}</div>}
            {o.photos?.length > 0 && (
              <div>
                <div className="mb-2 text-xs font-bold text-ink-600">📷 {t("customer_photos")} ({o.photos.length})</div>
                <PhotoGallery photos={o.photos} size={84} />
              </div>
            )}
            <div className="rounded-2xl border border-ink-100">
              {o.items.map((i: any) => (
                <div key={i.id} className="flex items-center gap-3 border-b border-ink-100 px-4 py-2.5 text-sm last:border-0">
                  <span className="text-lg">{i.icon}</span>
                  <span className="flex-1"><b>{i.qty}×</b> {L(i, "name")} <span className="text-xs text-ink-400">• {L(i, "service")}</span></span>
                  <span className="font-semibold tabular">{money(i.qty * i.unit_price)}</span>
                </div>
              ))}
              <div className="space-y-1 bg-ink-50 px-4 py-3 text-sm">
                <div className="flex justify-between"><span className="text-ink-500">{t("subtotal")}</span><span>{money(o.subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-ink-500">{t("delivery_fee")} + {t("service_fee")}</span><span>{money(o.delivery_fee + o.service_fee)}</span></div>
                {o.express_fee > 0 && <div className="flex justify-between"><span className="text-ink-500">{t("express_fee")}</span><span>{money(o.express_fee)}</span></div>}
                {o.discount > 0 && <div className="flex justify-between text-emerald-600"><span>{t("discount")} ({o.promo_code})</span><span>-{money(o.discount)}</span></div>}
                <div className="flex justify-between pt-1 font-extrabold"><span>{t("total")}</span><span>{money(o.total)}</span></div>
                <div className="flex justify-between text-xs text-ink-500"><span>{t(`pay_${o.payment_method}` as any)}</span><span>{t(o.payment_status)}</span></div>
              </div>
            </div>
            {o.rating && <div className="rounded-xl bg-amber-50 p-3 text-sm">{"★".repeat(o.rating)}{"☆".repeat(5 - o.rating)} {o.review}</div>}
          </div>

          <div className="space-y-4 md:col-span-2">
            {!["delivered", "cancelled"].includes(o.status) && (can("orders.manage") || can("orders.cancel")) && (
              <div className="space-y-2 rounded-2xl border border-ink-100 p-4">
                {can("orders.manage") && <>
                {next && (
                  <Button block loading={busy} onClick={() => act({ action: "status", to: next })}>
                    <ChevronsRight className="h-4 w-4" /> {statusLabel(next)}
                  </Button>
                )}
                <Select label={t("set_status")} value={o.status} onChange={(e) => act({ action: "status", to: e.target.value })}>
                  {ORDER_FLOW.map((s) => <option key={s} value={s}>{STATUS_META[s][lang]}</option>)}
                </Select>
                <Select label={t("assign_driver")} value={o.driver_id || ""} onChange={(e) => act({ action: "assign", driver_id: Number(e.target.value) || null })}>
                  <option value="">{t("unassigned")}</option>
                  {data.drivers.map((d: any) => <option key={d.id} value={d.id}>{d.name} {d.status === "online" ? "🟢" : "⚪"}</option>)}
                </Select>
                </>}
                {can("orders.cancel") && <Button variant="danger" block loading={busy} onClick={() => act({ action: "cancel" })}><XCircle className="h-4 w-4" /> {t("cancel_order")}{o.payment_status === "paid" ? ` + ${t("refund")}` : ""}</Button>}
              </div>
            )}
            {o.driver && (
              <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-3 text-sm">
                <UserCheck className="h-5 w-5 text-emerald-600" />
                <div><div className="text-xs text-emerald-700">{t("driver")}</div><div className="font-bold">{o.driver.name}</div></div>
              </div>
            )}
            {data.pickupDriver && <div className="text-xs text-ink-500">{t("pickup")}: <b>{data.pickupDriver.name}</b></div>}
            <div>
              <h4 className="mb-3 text-sm font-bold">{t("timeline")}</h4>
              <ol className="relative space-y-3 border-s-2 border-ink-100 ps-4">
                {o.events.map((e: any, i: number) => (
                  <li key={i} className="relative text-sm">
                    <span className="absolute -start-[23px] top-1.5 h-2.5 w-2.5 rounded-full bg-brand-600 ring-4 ring-white" />
                    <div className="font-semibold">{statusLabel(e.status)}</div>
                    <div className="text-xs text-ink-400">{fmtDate(e.created_at)} • {e.actor}{e.note ? ` • ${e.note}` : ""}</div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}
    </Sheet>
  );
}

export default function OrdersPage() {
  return (
    <Suspense>
      <OrdersInner />
    </Suspense>
  );
}
