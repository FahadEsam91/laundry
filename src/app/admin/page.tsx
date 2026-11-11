"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Banknote, ReceiptText, ShoppingCart, Users, Percent, Star, Activity, Coins } from "lucide-react";
import { useApp } from "@/components/providers";
import { Kpi, PageHead, Panel, Table, Td } from "@/components/admin";
import { PartnerLogo, Segmented, Skeleton, StatusBadge } from "@/components/ui";
import { MapView, type MapMarker } from "@/components/map-view";
import { ORDER_FLOW } from "@/lib/constants";

const BRAND = "#1A62EC";
const PAY_COLORS: Record<string, string> = { cash: "#2a78d6", card: "#eb6834", wallet: "#1baf7a", card_pos: "#eda100" };

function ChartTip({ active, payload, label, fmt, lf }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-ink-100 bg-white px-3 py-2 text-xs shadow-lift">
      <div className="mb-1 font-semibold text-ink-500">{lf ? lf(label) : label}</div>
      <div className="font-extrabold text-ink-900">{fmt(payload[0].value)}</div>
    </div>
  );
}

export default function Overview() {
  const { t, L, money, num, fmtDate, lang, statusLabel } = useApp();
  const [days, setDays] = useState("30");
  const [metric, setMetric] = useState<"gmv" | "orders">("gmv");
  const { data } = useSWR(`/api/admin/overview?days=${days}`, { refreshInterval: 10000 });
  const k = data?.kpis;
  const compact = (n: number) => new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
  const dateLabel = (d: string) => fmtDate(d + "T12:00:00", { day: "numeric", month: "short" });

  const markers: MapMarker[] = data
    ? [
        ...data.partners.map((p: any) => ({ id: `p${p.id}`, lat: p.lat, lng: p.lng, kind: "laundry" as const, color: p.color, label: L(p, "name") })),
        ...data.drivers.map((d: any) => ({ id: `d${d.id}`, lat: d.lat, lng: d.lng, kind: "rider" as const, label: d.name })),
        ...data.live.map((o: any) => ({ id: `o${o.id}`, lat: o.lat, lng: o.lng, kind: "order" as const, pulse: true, label: `${o.code} • ${o.customer_name}` })),
      ]
    : [];
  const statusMap: Record<string, number> = Object.fromEntries((data?.statusCounts || []).map((s: any) => [s.status, s.c]));
  const liveStatuses = ORDER_FLOW.filter((s) => s !== "delivered");
  const maxLive = Math.max(1, ...liveStatuses.map((s) => statusMap[s] || 0));
  const svcMax = Math.max(1, ...(data?.byService || []).map((s: any) => s.sales));
  const payTotal = (data?.payment || []).reduce((a: number, p: any) => a + p.count, 0) || 1;

  return (
    <div className="animate-fade-up">
      <PageHead
        title={t("overview")}
        sub={lang === "ar" ? "أداء المنصة لحظة بلحظة" : "Platform performance in real time"}
        actions={
          <Segmented
            value={days}
            onChange={setDays}
            options={[
              { value: "7", label: t("last_7") },
              { value: "30", label: t("last_30") },
              { value: "90", label: t("last_90") },
            ]}
          />
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {!k ? (
          [...Array(8)].map((_, i) => <Skeleton key={i} className="h-[122px]" />)
        ) : (
          <>
            <Kpi label={t("gmv")} value={money(k.gmv.value)} delta={k.gmv.delta} icon={Banknote} hint={t("vs_prev")} />
            <Kpi label={t("commission_rev")} value={money(k.revenue.value)} delta={k.revenue.delta} icon={Coins} accent="#059669" />
            <Kpi label={t("total_orders")} value={num(k.orders.value)} delta={k.orders.delta} icon={ReceiptText} accent="#7C3AED" />
            <Kpi label={t("avg_order")} value={money(k.aov.value)} delta={k.aov.delta} icon={ShoppingCart} accent="#EA580C" />
            <Kpi label={t("new_customers")} value={num(k.customers.value)} delta={k.customers.delta} icon={Users} accent="#0891B2" />
            <Kpi label={t("active_orders")} value={num(k.active.value)} icon={Activity} accent="#DC2626" hint={t("live")} />
            <Kpi label={t("cancel_rate")} value={`${num(k.cancelRate.value, 1)}%`} icon={Percent} accent="#64748B" hint={`${k.cancelRate.delta >= 0 ? "+" : ""}${num(k.cancelRate.delta, 1)} pt`} />
            <Kpi label={t("avg_rating")} value={`${num(k.rating.value, 2)} ★`} icon={Star} accent="#CA8A04" hint={`${k.rating.delta >= 0 ? "+" : ""}${num(k.rating.delta, 2)}`} />
          </>
        )}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title={t("revenue_trend")}
          sub={metric === "gmv" ? t("gmv") : t("total_orders")}
          action={<Segmented value={metric} onChange={setMetric} options={[{ value: "gmv", label: t("gmv") }, { value: "orders", label: t("orders") }]} />}
        >
          <div className="h-72" dir="ltr">
            {data ? (
              <ResponsiveContainer>
                {metric === "gmv" ? (
                  <AreaChart data={data.series} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gmvFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={BRAND} stopOpacity={0.22} />
                        <stop offset="100%" stopColor={BRAND} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#EEF0F4" />
                    <XAxis dataKey="date" tickFormatter={dateLabel} tick={{ fontSize: 11, fill: "#6F7A8C" }} axisLine={false} tickLine={false} minTickGap={24} />
                    <YAxis tickFormatter={compact} tick={{ fontSize: 11, fill: "#6F7A8C" }} axisLine={false} tickLine={false} width={44} />
                    <Tooltip content={<ChartTip fmt={money} lf={dateLabel} />} cursor={{ stroke: "#C2C8D3", strokeDasharray: "4 4" }} />
                    <Area type="monotone" dataKey="gmv" stroke={BRAND} strokeWidth={2} fill="url(#gmvFill)" activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }} />
                  </AreaChart>
                ) : (
                  <BarChart data={data.series} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#EEF0F4" />
                    <XAxis dataKey="date" tickFormatter={dateLabel} tick={{ fontSize: 11, fill: "#6F7A8C" }} axisLine={false} tickLine={false} minTickGap={24} />
                    <YAxis tick={{ fontSize: 11, fill: "#6F7A8C" }} axisLine={false} tickLine={false} width={32} allowDecimals={false} />
                    <Tooltip content={<ChartTip fmt={(v: number) => `${num(v)} ${t("orders")}`} lf={dateLabel} />} cursor={{ fill: "#F7F8FA" }} />
                    <Bar dataKey="orders" fill={BRAND} radius={[4, 4, 0, 0]} maxBarSize={18} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            ) : (
              <Skeleton className="h-full" />
            )}
          </div>
        </Panel>

        <Panel title={t("orders_by_status")} sub={t("active_orders")} action={<Link href="/admin/orders?status=active" className="text-xs font-bold text-brand-600">{t("view_all")}</Link>}>
          <div className="space-y-2.5">
            {liveStatuses.map((s) => (
              <Link key={s} href={`/admin/orders?status=${s}`} className="group flex items-center gap-3">
                <div className="w-40 shrink-0"><StatusBadge status={s} /></div>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100">
                  <div className="h-full rounded-full bg-brand-600 transition-all group-hover:bg-brand-700" style={{ width: `${((statusMap[s] || 0) / maxLive) * 100}%` }} />
                </div>
                <span className="w-6 text-end text-sm font-bold tabular">{statusMap[s] || 0}</span>
              </Link>
            ))}
            <div className="flex justify-between border-t border-ink-100 pt-3 text-xs text-ink-500">
              <span>{statusLabel("delivered")}: <b className="text-ink-800">{num(statusMap.delivered || 0)}</b></span>
              <span>{statusLabel("cancelled")}: <b className="text-ink-800">{num(statusMap.cancelled || 0)}</b></span>
            </div>
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel title={t("revenue_by_service")}>
          <div className="space-y-3">
            {(data?.byService || []).map((s: any) => (
              <div key={s.slug}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-semibold">{L(s, "name")}</span>
                  <span className="font-bold tabular">{money(s.sales)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-ink-100">
                  <div className="h-full rounded-full bg-brand-600" style={{ width: `${(s.sales / svcMax) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title={t("hourly_orders")}>
          <div className="h-56" dir="ltr">
            {data && (
              <ResponsiveContainer>
                <BarChart data={data.hourly} margin={{ left: -16, right: 4, top: 8, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#EEF0F4" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#6F7A8C" }} axisLine={false} tickLine={false} interval={2} tickFormatter={(h) => `${h}:00`} />
                  <YAxis tick={{ fontSize: 10, fill: "#6F7A8C" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTip fmt={(v: number) => `${num(v)} ${t("orders")}`} lf={(h: number) => `${h}:00`} />} cursor={{ fill: "#F7F8FA" }} />
                  <Bar dataKey="orders" fill={BRAND} radius={[4, 4, 0, 0]} maxBarSize={14} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Panel>

        <Panel title={t("payment_mix")}>
          <div className="flex h-4 gap-0.5 overflow-hidden rounded-full">
            {(data?.payment || []).map((p: any) => (
              <div key={p.method} title={`${t(`pay_${p.method}` as any)}: ${p.count}`} style={{ width: `${(p.count / payTotal) * 100}%`, background: PAY_COLORS[p.method] }} />
            ))}
          </div>
          <div className="mt-5 space-y-3">
            {(data?.payment || []).map((p: any) => (
              <div key={p.method} className="flex items-center gap-3 text-sm">
                <span className="h-3 w-3 rounded-sm" style={{ background: PAY_COLORS[p.method] }} />
                <span className="flex-1 font-semibold">{t(`pay_${p.method}` as any)}</span>
                <span className="text-ink-500 tabular">{num(p.count)}</span>
                <span className="w-12 text-end font-bold tabular">{num((p.count / payTotal) * 100, 0)}%</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-5">
        <Panel className="xl:col-span-3" title={t("live_map")} sub={`${data?.live?.length || 0} ${t("active_orders")} • ${data?.drivers?.length || 0} ${t("online")}`} bodyClass="p-3">
          {data ? <MapView className="h-[420px] w-full overflow-hidden rounded-xl" markers={markers} zoom={12} /> : <Skeleton className="h-[420px]" />}
          <div className="flex flex-wrap gap-4 px-2 pt-3 text-xs text-ink-500">
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-[#1A62EC]" /> {t("partners")}</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-[#10B981]" /> {t("drivers")}</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-[#F59E0B]" /> {t("active_orders")}</span>
          </div>
        </Panel>
        <Panel className="xl:col-span-2" title={t("top_partners")} bodyClass="p-0 pb-2">
          <Table head={[t("partner"), t("orders"), t("gmv")]}>
            {(data?.topPartners || []).map((p: any) => (
              <tr key={p.id} className="hover:bg-ink-50">
                <Td>
                  <div className="flex items-center gap-3">
                    <PartnerLogo p={p} size={34} className="rounded-xl" />
                    <div>
                      <div className="font-bold">{L(p, "name")}</div>
                      <div className="text-xs text-ink-500">★ {num(p.rating, 1)}</div>
                    </div>
                  </div>
                </Td>
                <Td className="tabular">{num(p.orders)}</Td>
                <Td className="font-bold tabular">{money(p.gmv)}</Td>
              </tr>
            ))}
          </Table>
        </Panel>
      </div>

      <Panel className="mt-4" title={t("recent_orders")} action={<Link href="/admin/orders" className="text-xs font-bold text-brand-600">{t("view_all")}</Link>} bodyClass="p-0 pb-2">
        <Table head={[t("order_no"), t("customer"), t("partner"), t("status"), t("total"), t("date")]}>
          {(data?.recent || []).map((o: any) => (
            <tr key={o.id} className="hover:bg-ink-50">
              <Td><Link href={`/admin/orders?open=${o.id}`} className="font-bold text-brand-700">{o.code}</Link></Td>
              <Td>{o.customer_name}</Td>
              <Td>{L({ name_ar: o.partner_ar, name_en: o.partner_en }, "name")}</Td>
              <Td><StatusBadge status={o.status} /></Td>
              <Td className="font-bold tabular">{money(o.total)}</Td>
              <Td className="text-ink-500">{fmtDate(o.created_at)}</Td>
            </tr>
          ))}
        </Table>
      </Panel>
    </div>
  );
}

