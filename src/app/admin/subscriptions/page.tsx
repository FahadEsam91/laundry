"use client";

import { useState } from "react";
import useSWR from "swr";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Crown, Repeat, Banknote, UserPlus, TrendingDown, Percent, PiggyBank, ShoppingCart, Plus, Pencil, Gift, Ban } from "lucide-react";
import { useApp, useToast } from "@/components/providers";
import { Kpi, PageHead, Pager, Panel, Table, Td } from "@/components/admin";
import { PlanBenefits } from "@/components/plus";
import { Badge, Button, Input, Sheet, Skeleton, Toggle, cx } from "@/components/ui";
import { api, errText } from "@/lib/client";

const BRAND = "#1A62EC";
const EMPTY = { name_ar: "", name_en: "", desc_ar: "", desc_en: "", price: 9900, interval_days: 30, free_deliveries: -1, discount_pct: 10, express_discount_pct: 0, no_service_fee: true, priority_support: false, color: "#1A62EC" };

export default function SubscriptionsAdmin() {
  const { t, L, money, num, fmtDate, lang } = useApp();
  const toast = useToast();
  const [status, setStatus] = useState("active");
  const [page, setPage] = useState(1);
  const [edit, setEdit] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const { data, mutate } = useSWR(`/api/admin/subscriptions?status=${status}&page=${page}`, { keepPreviousData: true, refreshInterval: 15000 });
  const k = data?.kpis;
  const dateLabel = (d: string) => fmtDate(d + "T12:00:00", { day: "numeric", month: "short" });

  const patchPlan = async (id: number, b: any) => {
    await api(`/api/admin/plans/${id}`, { method: "PATCH", body: b });
    mutate();
  };
  const savePlan = async () => {
    setBusy(true);
    try {
      const { id, subscribers, cancelling, slug, created_at, active, popular, sort, ...rest } = edit;
      if (id) await api(`/api/admin/plans/${id}`, { method: "PATCH", body: rest });
      else await api("/api/admin/plans", { body: rest });
      toast(t("saved"));
      setEdit(null);
      mutate();
    } catch (e) {
      toast(errText(e, lang), "error");
    } finally {
      setBusy(false);
    }
  };
  const act = async (id: number, b: any) => {
    await api(`/api/admin/subscriptions/${id}`, { body: b });
    toast(t("saved"));
    mutate();
  };
  const F = (key: string, label: string, type = "number") => (
    <Input label={label} type={type} value={edit?.[key] ?? ""} onChange={(e) => setEdit({ ...edit, [key]: type === "number" ? Number(e.target.value) : e.target.value })} />
  );
  const tabs = [
    ["active", t("active")],
    ["cancelling", t("cancelling")],
    ["expired", t("expired")],
    ["cancelled", lang === "ar" ? "موقوف" : "Terminated"],
    ["all", t("all")],
  ];

  return (
    <div className="animate-fade-up">
      <PageHead title={t("subscriptions")} sub={t("plus_tagline")} actions={<Button onClick={() => setEdit({ ...EMPTY })}><Plus className="h-4 w-4" /> {t("add_plan")}</Button>} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {!k ? [...Array(8)].map((_, i) => <Skeleton key={i} className="h-[122px]" />) : (
          <>
            <Kpi label={t("members")} value={num(k.active)} icon={Crown} accent="#CA8A04" hint={`${num(k.penetration, 1)}% ${lang === "ar" ? "من الزبائن" : "of customers"}`} />
            <Kpi label={t("mrr")} value={money(k.mrr)} icon={Repeat} hint={`${t("arr")}: ${money(k.arr)}`} />
            <Kpi label={t("subscription_revenue")} value={money(k.revenue30)} icon={Banknote} accent="#059669" />
            <Kpi label={t("new_members")} value={num(k.new30)} icon={UserPlus} accent="#7C3AED" />
            <Kpi label={t("churn")} value={`${num(k.churnRate, 1)}%`} icon={TrendingDown} accent="#DC2626" hint={`${num(k.churned30)} ${lang === "ar" ? "خلال 30 يوم" : "in 30 days"}`} />
            <Kpi label={t("member_aov")} value={money(k.memberAov)} icon={ShoppingCart} accent="#0891B2" hint={`${t("non_member_aov")}: ${money(k.otherAov)}`} />
            <Kpi label={t("member_savings_given")} value={money(k.savings30)} icon={PiggyBank} accent="#EA580C" />
            <Kpi label={t("penetration")} value={`${num(k.penetration, 1)}%`} icon={Percent} accent="#64748B" />
          </>
        )}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-5">
        <Panel className="xl:col-span-2" title={t("member_growth")}>
          <div className="h-64" dir="ltr">
            {data ? (
              <ResponsiveContainer>
                <AreaChart data={data.series} margin={{ left: -12, right: 8, top: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="memFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={BRAND} stopOpacity={0.22} />
                      <stop offset="100%" stopColor={BRAND} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#EEF0F4" />
                  <XAxis dataKey="date" tickFormatter={dateLabel} tick={{ fontSize: 11, fill: "#6F7A8C" }} axisLine={false} tickLine={false} minTickGap={28} />
                  <YAxis tick={{ fontSize: 11, fill: "#6F7A8C" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    cursor={{ stroke: "#C2C8D3", strokeDasharray: "4 4" }}
                    content={({ active, payload, label }: any) =>
                      active && payload?.length ? (
                        <div className="rounded-xl border border-ink-100 bg-white px-3 py-2 text-xs shadow-lift">
                          <div className="font-semibold text-ink-500">{dateLabel(label)}</div>
                          <div className="font-extrabold">{num(payload[0].value)} {t("members")}</div>
                        </div>
                      ) : null
                    }
                  />
                  <Area type="monotone" dataKey="members" stroke={BRAND} strokeWidth={2} fill="url(#memFill)" activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <Skeleton className="h-full" />}
          </div>
        </Panel>

        <div className="grid gap-4 md:grid-cols-3 xl:col-span-3">
          {(data?.plans || []).map((p: any) => (
            <div key={p.id} className={cx("flex flex-col rounded-2xl border bg-white p-5 shadow-soft", p.active ? "border-ink-100" : "border-dashed border-ink-300 opacity-70")}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-extrabold" style={{ color: p.color }}>{L(p, "name")}</div>
                  <div className="text-xl font-extrabold">{money(p.price)}<span className="text-xs font-medium text-ink-400"> / {p.interval_days}d</span></div>
                </div>
                {p.popular ? <Badge tone="amber">{t("most_popular")}</Badge> : null}
              </div>
              <div className="mt-3 space-y-1.5 rounded-xl bg-ink-50 p-3 text-sm">
                <div className="flex items-center justify-between gap-2"><span className="text-xs text-ink-500">{t("subscribers")}</span><span className="font-extrabold tabular">{p.subscribers}</span></div>
                <div className="flex items-center justify-between gap-2"><span className="text-xs text-ink-500">{t("mrr")}</span><span className="whitespace-nowrap font-extrabold tabular">{money((p.subscribers - p.cancelling) * p.price)}</span></div>
              </div>
              <PlanBenefits plan={p} className="mt-3 flex-1 [&_li]:text-xs" />
              <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3">
                <label className="flex items-center gap-2 text-xs font-semibold"><Toggle checked={!!p.active} onChange={(v) => patchPlan(p.id, { active: v })} /> {p.active ? t("active") : t("inactive")}</label>
                <div className="flex">
                  {!p.popular && <button onClick={() => patchPlan(p.id, { popular: true })} className="rounded-lg p-2 text-ink-400 hover:bg-amber-50 hover:text-amber-600" title={t("most_popular")}><Crown className="h-4 w-4" /></button>}
                  <button onClick={() => setEdit({ ...p, no_service_fee: !!p.no_service_fee, priority_support: !!p.priority_support })} className="rounded-lg p-2 text-ink-400 hover:bg-ink-100 hover:text-ink-800" title={t("edit")}><Pencil className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Panel className="mt-4" title={t("subscribers")} bodyClass="p-0">
        <div className="no-scrollbar flex gap-1 overflow-x-auto border-b border-ink-100 px-4 pb-3">
          {tabs.map(([v, label]) => (
            <button key={v} onClick={() => { setStatus(v); setPage(1); }} className={cx("shrink-0 rounded-xl px-3.5 py-2 text-sm font-semibold", status === v ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-ink-100")}>{label}</button>
          ))}
        </div>
        {!data ? <div className="p-4"><Skeleton className="h-64" /></div> : (
          <Table head={[t("customer"), t("plans"), t("status"), t("auto_renew"), t("payment"), lang === "ar" ? "الفترة الحالية" : "Current period", t("paid_total"), t("saved_label"), t("joined"), ""]}>
            {data.subscribers.map((s: any) => {
              const live = s.status === "active";
              return (
                <tr key={s.id} className="hover:bg-ink-50">
                  <Td><div className="font-bold">{s.name}</div><div className="text-xs text-ink-400" dir="ltr">{s.phone}</div></Td>
                  <Td><span className="font-bold" style={{ color: s.color }}>{L({ name_ar: s.plan_ar, name_en: s.plan_en }, "name")}</span></Td>
                  <Td>{live ? (s.auto_renew ? <Badge tone="green">{t("active")}</Badge> : <Badge tone="amber">{t("cancelling")}</Badge>) : s.status === "expired" ? <Badge>{t("expired")}</Badge> : <Badge tone="red">{lang === "ar" ? "موقوف" : "Terminated"}</Badge>}</Td>
                  <Td>{s.auto_renew ? "✓" : "—"}</Td>
                  <Td className="text-xs">{t(`pay_${s.payment_method}` as any)}</Td>
                  <Td className="text-xs text-ink-500">{fmtDate(s.current_period_start, { day: "numeric", month: "short" })} – {fmtDate(s.current_period_end, { day: "numeric", month: "short" })}</Td>
                  <Td className="font-bold tabular">{money(s.paid)}</Td>
                  <Td className="tabular text-emerald-700">{money(s.saved)}</Td>
                  <Td className="text-xs text-ink-500">{fmtDate(s.started_at, { day: "numeric", month: "short", year: "numeric" })}</Td>
                  <Td>
                    {live && (
                      <div className="flex">
                        <button onClick={() => act(s.id, { action: "extend", days: 7 })} className="rounded-lg p-2 text-ink-400 hover:bg-emerald-50 hover:text-emerald-600" title={t("extend_7")}><Gift className="h-4 w-4" /></button>
                        <button onClick={() => act(s.id, { action: "terminate" })} className="rounded-lg p-2 text-ink-400 hover:bg-red-50 hover:text-red-600" title={t("terminate")}><Ban className="h-4 w-4" /></button>
                      </div>
                    )}
                  </Td>
                </tr>
              );
            })}
          </Table>
        )}
        {data && !data.subscribers.length && <div className="p-10 text-center text-sm text-ink-400">{t("no_results")}</div>}
        {data && <Pager page={page} size={data.size} total={data.total} onPage={setPage} />}
      </Panel>

      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? `${t("edit")} • ${L(edit, "name")}` : t("add_plan")}>
        {edit && (
          <div className="grid grid-cols-2 gap-3">
            {F("name_ar", t("name_ar"), "text")}
            {F("name_en", t("name_en"), "text")}
            <div className="col-span-2">{F("desc_ar", `${t("details")} (AR)`, "text")}</div>
            <div className="col-span-2">{F("desc_en", `${t("details")} (EN)`, "text")}</div>
            {F("price", t("price"))}
            {F("interval_days", t("interval_days"))}
            {F("free_deliveries", t("free_deliveries_field"))}
            {F("discount_pct", t("discount_pct_field"))}
            {F("express_discount_pct", t("express_discount_field"))}
            {F("color", "Color", "color")}
            <label className="flex items-center justify-between rounded-xl bg-ink-50 p-3 text-sm font-semibold">{t("benefit_no_service_fee")}<Toggle checked={!!edit.no_service_fee} onChange={(v) => setEdit({ ...edit, no_service_fee: v })} /></label>
            <label className="flex items-center justify-between rounded-xl bg-ink-50 p-3 text-sm font-semibold">{t("benefit_priority")}<Toggle checked={!!edit.priority_support} onChange={(v) => setEdit({ ...edit, priority_support: v })} /></label>
            <div className="col-span-2 rounded-xl border border-ink-100 p-3"><PlanBenefits plan={edit} /></div>
            <div className="col-span-2"><Button block loading={busy} onClick={savePlan} disabled={!edit.name_ar || !edit.name_en || !(edit.price > 0)}>{t("save")}</Button></div>
            {edit.id && <p className="col-span-2 text-xs text-ink-400">{lang === "ar" ? "تغيير السعر يطبق على التجديدات القادمة." : "Price changes apply from the next renewal."}</p>}
          </div>
        )}
      </Sheet>
    </div>
  );
}
