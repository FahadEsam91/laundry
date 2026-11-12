"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Power, Banknote, PackageCheck, MapPin, Phone, Navigation, Store, Home, ArrowDown, Zap, LogOut, Languages, Inbox } from "lucide-react";
import { useApp, useToast } from "@/components/providers";
import { Button, Empty, PartnerLogo, Skeleton, StatusBadge, cx } from "@/components/ui";
import { MapView, type MapMarker } from "@/components/map-view";
import { api, errText } from "@/lib/client";
import { PushHeaderButton } from "@/components/push";

const STEP: Record<string, { action: string; key: any }> = {
  driver_assigned: { action: "picked_up", key: "confirm_pickup" },
  picked_up: { action: "at_laundry", key: "confirm_dropoff_laundry" },
  ready: { action: "out_for_delivery", key: "confirm_pickup_laundry" },
  out_for_delivery: { action: "delivered", key: "confirm_delivered" },
};

export default function DriverApp() {
  const { t, L, money, num, lang, setLang, refreshMe } = useApp();
  const toast = useToast();
  const router = useRouter();
  const { data, mutate } = useSWR("/api/driver/jobs", { refreshInterval: 4000 });
  const [busy, setBusy] = useState<string | null>(null);

  if (!data) return <div className="space-y-3 p-4"><Skeleton className="h-40" /><Skeleton className="h-64" /></div>;
  const d = data.driver;
  const online = d.status === "online";
  const cur = data.mine[0];

  const toggle = async () => {
    setBusy("status");
    await api("/api/driver/status", { body: { status: online ? "offline" : "online" } });
    await mutate();
    setBusy(null);
  };
  const act = async (id: number, action: string) => {
    setBusy(`${id}`);
    try {
      await api(`/api/driver/jobs/${id}`, { body: { action } });
      if (action === "delivered") toast("✅ " + t("confirm_delivered"));
      await mutate();
    } catch (e) {
      toast(errText(e, lang), "error");
    } finally {
      setBusy(null);
    }
  };
  const logout = async () => {
    await api("/api/auth/logout", { body: {} });
    refreshMe();
    router.push("/login");
  };
  // leg: going to customer (pickup / delivery) or to laundry
  const toCustomer = (j: any) => ["accepted", "driver_assigned", "out_for_delivery"].includes(j.status);
  const markers: MapMarker[] = [];
  if (d.lat) markers.push({ id: "me", lat: d.lat, lng: d.lng, kind: "rider", pulse: true });
  if (cur) {
    markers.push({ id: "c", lat: cur.address_lat, lng: cur.address_lng, kind: "home" });
    markers.push({ id: "p", lat: cur.p_lat, lng: cur.p_lng, kind: "laundry", color: cur.partner_color });
  }
  const mapsUrl = (j: any) => {
    const [la, ln] = toCustomer(j) && j.status !== "out_for_delivery" ? [j.address_lat, j.address_lng] : j.status === "out_for_delivery" ? [j.address_lat, j.address_lng] : [j.p_lat, j.p_lng];
    return `https://www.google.com/maps/dir/?api=1&destination=${la},${ln}`;
  };

  return (
    <div className="min-h-screen bg-ink-50 pb-10">
      <header className={cx("px-4 pb-6 pt-4 text-white transition-colors", online ? "bg-gradient-to-br from-emerald-600 to-teal-600" : "bg-gradient-to-br from-ink-800 to-ink-900")}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-lg font-extrabold">{d.name.slice(0, 1)}</span>
            <div>
              <div className="font-bold">{d.name}</div>
              <div className="text-xs text-white/70">{t("driver_panel")} • ★ {d.rating}</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <PushHeaderButton dark label={t("push_driver")} />
            <button onClick={() => setLang(lang === "ar" ? "en" : "ar")} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15" aria-label="lang"><Languages className="h-4 w-4" /></button>
            <button onClick={logout} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15" aria-label="logout"><LogOut className="h-4 w-4" /></button>
          </div>
        </div>
        <button onClick={toggle} disabled={busy === "status"} className={cx("mt-5 flex w-full items-center justify-between rounded-2xl p-4 text-start transition", online ? "bg-white/15" : "bg-white text-ink-900")}>
          <span>
            <span className="block text-base font-extrabold">{online ? t("you_are_online") : t("you_are_offline")}</span>
            <span className={cx("text-xs", online ? "text-white/70" : "text-ink-500")}>{online ? t("go_offline") : t("go_online")}</span>
          </span>
          <span className={cx("flex h-12 w-12 items-center justify-center rounded-full", online ? "bg-white text-emerald-600" : "bg-emerald-600 text-white")}><Power className="h-6 w-6" /></span>
        </button>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-white/10 p-3"><Banknote className="mx-auto h-4 w-4 opacity-80" /><div className="mt-1 text-sm font-extrabold">{money(data.stats.earnings)}</div><div className="text-[10px] text-white/60">{t("earnings_today")}</div></div>
          <div className="rounded-xl bg-white/10 p-3"><PackageCheck className="mx-auto h-4 w-4 opacity-80" /><div className="mt-1 text-sm font-extrabold">{num(data.stats.legs)}</div><div className="text-[10px] text-white/60">{t("completed_today")}</div></div>
          <div className="rounded-xl bg-white/10 p-3"><Navigation className="mx-auto h-4 w-4 opacity-80" /><div className="mt-1 text-sm font-extrabold">{num(data.stats.total)}</div><div className="text-[10px] text-white/60">{t("deliveries")}</div></div>
        </div>
      </header>

      {cur && <MapView className="h-56 w-full" markers={markers} route={[[cur.p_lat, cur.p_lng], [cur.address_lat, cur.address_lng]]} />}

      <section className="px-4 pt-5">
        <h2 className="mb-3 font-bold">{t("my_jobs")} <span className="text-ink-400">({data.mine.length})</span></h2>
        {!data.mine.length && <div className="rounded-2xl border-2 border-dashed border-ink-200 p-6 text-center text-sm text-ink-400">{t("no_jobs")}</div>}
        <div className="space-y-3">
          {data.mine.map((j: any) => <JobCard key={j.id} j={j} busy={busy === `${j.id}`} action={STEP[j.status]} onAct={(a) => act(j.id, a)} mapsUrl={mapsUrl(j)} />)}
        </div>
      </section>

      <section className="px-4 pt-6">
        <h2 className="mb-3 font-bold">{t("available_jobs")} <span className="text-ink-400">({data.available.length})</span></h2>
        {!online ? (
          <div className="rounded-2xl bg-white p-6 text-center text-sm text-ink-500">{t("you_are_offline")} — {t("go_online")}</div>
        ) : !data.available.length ? (
          <Empty icon={<Inbox className="h-8 w-8" />} title={t("no_jobs")} />
        ) : (
          <div className="space-y-3">
            {data.available.map((j: any) => <JobCard key={j.id} j={j} busy={busy === `${j.id}`} action={{ action: "take", key: "take_job" }} onAct={(a) => act(j.id, a)} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function JobCard({ j, action, onAct, busy, mapsUrl }: { j: any; action?: { action: string; key: any }; onAct: (a: string) => void; busy: boolean; mapsUrl?: string }) {
  const { t, L, money, num } = useApp();
  const isPickupLeg = ["accepted", "driver_assigned", "picked_up"].includes(j.status);
  const stops = isPickupLeg
    ? [{ icon: Home, title: j.customer_name, sub: j.address_text, phone: j.customer_phone }, { icon: Store, title: L({ name_ar: j.partner_ar, name_en: j.partner_en }, "name"), sub: L({ area_ar: j.area_ar, area_en: j.area_en }, "area"), phone: j.partner_phone }]
    : [{ icon: Store, title: L({ name_ar: j.partner_ar, name_en: j.partner_en }, "name"), sub: L({ area_ar: j.area_ar, area_en: j.area_en }, "area"), phone: j.partner_phone }, { icon: Home, title: j.customer_name, sub: j.address_text, phone: j.customer_phone }];
  const collectCash = ["cash", "card_pos"].includes(j.payment_method) && j.payment_status !== "paid" && ["ready", "out_for_delivery"].includes(j.status);
  return (
    <div className="rounded-2xl bg-white p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PartnerLogo p={{ color: j.partner_color, color2: j.partner_color, initials: j.partner_initials, logo_url: j.partner_logo }} size={32} className="rounded-lg" />
          <div>
            <div className="text-sm font-extrabold">{j.code} {j.express ? <Zap className="inline h-3.5 w-3.5 fill-amber-400 text-amber-500" /> : null}</div>
            <div className="text-[11px] font-bold text-brand-700">{isPickupLeg ? t("job_pickup") : t("job_delivery")}</div>
          </div>
        </div>
        <div className="text-end">
          <StatusBadge status={j.status} />
          <div className="mt-1 text-xs text-ink-500">{num(j.distance_km, 1)} {t("km")} • {j.items_count} {t("items")}</div>
        </div>
      </div>
      <div className="mt-4 space-y-1">
        {stops.map((s, i) => (
          <div key={i}>
            <div className="flex items-start gap-3">
              <span className={cx("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", i === 0 ? "bg-ink-900 text-white" : "bg-brand-50 text-brand-700")}><s.icon className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold uppercase text-ink-400">{i === 0 ? t("from") : t("to")}</div>
                <div className="truncate text-sm font-bold">{s.title}</div>
                <div className="truncate text-xs text-ink-500">{s.sub}</div>
              </div>
              {s.phone && <a href={`tel:${s.phone}`} className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-100" aria-label="call"><Phone className="h-4 w-4" /></a>}
            </div>
            {i === 0 && <ArrowDown className="ms-2 my-0.5 h-4 w-4 text-ink-300" />}
          </div>
        ))}
      </div>
      {j.notes && <div className="mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">📝 {j.notes}</div>}
      {collectCash && <div className="mt-3 flex items-center justify-between rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800"><span>{j.payment_method === "card_pos" ? `💳 ${t("collect_card")}` : `💵 ${t("collect_cash")}`}</span><span>{money(j.total)}</span></div>}
      <div className="mt-4 flex gap-2">
        {mapsUrl && <a href={mapsUrl} target="_blank" rel="noreferrer" className="flex-1"><Button variant="outline" block><MapPin className="h-4 w-4" /> {t("navigate")}</Button></a>}
        {action && <Button className="flex-[2]" variant={action.action === "take" ? "primary" : "success"} loading={busy} onClick={() => onAct(action.action)}>{t(action.key)}</Button>}
      </div>
    </div>
  );
}
