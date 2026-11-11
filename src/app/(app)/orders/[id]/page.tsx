"use client";

import { Suspense, use, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { Phone, MessageCircle, Star, Bike, Car, CheckCircle2, ReceiptText, Truck, Sparkles, PackageCheck, Home as HomeIcon, Headphones, XCircle, MapPin, CalendarClock, Clock } from "lucide-react";
import { useApp, useToast } from "@/components/providers";
import { TopBar } from "@/components/customer";
import { Button, PartnerLogo, Sheet, Skeleton, StatusBadge, Textarea, cx } from "@/components/ui";
import { MapView, type MapMarker } from "@/components/map-view";
import { STATUS_META, ORDER_FLOW } from "@/lib/constants";
import { api, errText } from "@/lib/client";
import { PushPrompt } from "@/components/push";

const MACRO = [
  { key: "placed", icon: ReceiptText, ar: "تم الطلب", en: "Placed", upto: "accepted" },
  { key: "pickup", icon: Truck, ar: "الاستلام", en: "Pickup", upto: "picked_up" },
  { key: "clean", icon: Sparkles, ar: "التنظيف", en: "Cleaning", upto: "ready" },
  { key: "deliver", icon: Bike, ar: "التوصيل", en: "Delivery", upto: "out_for_delivery" },
  { key: "done", icon: PackageCheck, ar: "تم", en: "Done", upto: "delivered" },
];

function macroIndex(status: string) {
  const i = ORDER_FLOW.indexOf(status as any);
  if (i <= 1) return 0;
  if (i <= 3) return 1;
  if (i <= 6) return 2;
  if (i <= 7) return 3;
  return 4;
}

function Inner({ id }: { id: string }) {
  const { t, L, money, fmtDate, lang, settings, refreshMe } = useApp();
  const toast = useToast();
  const sp = useSearchParams();
  const [celebrate, setCelebrate] = useState(sp.get("placed") === "1");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [busy, setBusy] = useState(false);
  const { data, mutate } = useSWR(`/api/orders/${id}`, { refreshInterval: (d: any) => (d?.order?.tracking ? 1500 : d && ["delivered", "cancelled"].includes(d.order.status) ? 0 : 3000) });
  const o = data?.order;

  useEffect(() => {
    if (!celebrate) return;
    const tm = setTimeout(() => setCelebrate(false), 2600);
    return () => clearTimeout(tm);
  }, [celebrate]);
  useEffect(() => {
    if (o?.status === "delivered" && !o.rating) {
      const tm = setTimeout(() => setRateOpen(true), 900);
      return () => clearTimeout(tm);
    }
  }, [o?.status, o?.rating]);

  if (!o)
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-64" />
        <Skeleton className="h-24" />
        <Skeleton className="h-40" />
      </div>
    );

  const meta = STATUS_META[o.status as keyof typeof STATUS_META];
  const closed = o.status === "delivered" || o.status === "cancelled";
  const mi = macroIndex(o.status);
  const tr = o.tracking;
  const markers: MapMarker[] = [
    { id: "home", lat: o.address_lat, lng: o.address_lng, kind: "home", label: t("label_home") },
    { id: "laundry", lat: o.partner.lat, lng: o.partner.lng, kind: "laundry", color: o.partner.color, label: L(o.partner, "name") },
  ];
  if (tr) markers.push({ id: "rider", lat: tr.lat, lng: tr.lng, kind: "rider", pulse: true, label: o.driver?.name });
  const VehicleIcon = o.driver?.vehicle === "car" ? Car : Bike;

  const cancel = async () => {
    setBusy(true);
    try {
      await api(`/api/orders/${o.id}/cancel`, { body: {} });
      toast(STATUS_META.cancelled[lang]);
      setCancelOpen(false);
      mutate();
      refreshMe();
    } catch (e) {
      toast(errText(e, lang), "error");
    } finally {
      setBusy(false);
    }
  };
  const rate = async () => {
    setBusy(true);
    try {
      await api(`/api/orders/${o.id}/rate`, { body: { rating, review } });
      toast(t("thanks_rating"));
      setRateOpen(false);
      mutate();
    } catch (e) {
      toast(errText(e, lang), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-ink-50 pb-10">
      {celebrate && (
        <div className="fixed inset-0 z-[90] mx-auto flex max-w-[460px] flex-col items-center justify-center bg-brand-600 text-white">
          <div className="relative">
            <span className="absolute inset-0 animate-ping2 rounded-full bg-white/40" />
            <CheckCircle2 className="relative h-24 w-24" />
          </div>
          <h2 className="mt-6 text-2xl font-extrabold">{t("order_placed")}</h2>
          <p className="mt-1 text-white/80">{o.code}</p>
          {[...Array(14)].map((_, i) => (
            <span key={i} className="absolute bottom-0 h-4 w-4 animate-bubble rounded-full bg-white/40" style={{ left: `${(i * 7.3) % 100}%`, animationDelay: `${(i % 5) * 0.35}s` }} />
          ))}
        </div>
      )}

      {!closed ? (
        <div className="relative">
          <MapView className="h-[44vh] min-h-[280px] w-full" markers={markers} route={tr ? [tr.from, tr.to] : [[o.partner.lat, o.partner.lng], [o.address_lat, o.address_lng]]} />
          <div className="absolute inset-x-0 top-0 z-[500]">
            <TopBar transparent back="/orders" right={<a href={`tel:${settings.support_phone}`} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-soft"><Headphones className="h-5 w-5" /></a>} />
          </div>
          {tr && (
            <div className="absolute bottom-10 start-1/2 z-[500] -translate-x-1/2 rounded-full bg-ink-900 px-4 py-2 text-sm font-bold text-white shadow-lift rtl:translate-x-1/2">
              {t("eta")} {tr.eta_min} {t("min")}
            </div>
          )}
        </div>
      ) : (
        <TopBar title={`${t("order")} ${o.code}`} back="/orders" />
      )}

      <div className={cx("relative space-y-3 px-4", !closed && "-mt-6")}>
        {/* status card */}
        <div className="rounded-3xl bg-white p-5 shadow-lift">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-ink-400">{t("order_no")} {o.code}</div>
              <h1 className="mt-1 text-xl font-extrabold leading-snug">{meta[lang]}</h1>
              <p className="mt-1 text-sm text-ink-500">{lang === "ar" ? meta.descAr : meta.descEn}</p>
            </div>
            {o.status === "processing" ? (
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sky-50">
                <div className="h-9 w-9 animate-drum rounded-full border-4 border-sky-300 border-t-sky-600" />
              </div>
            ) : o.status === "cancelled" ? (
              <XCircle className="h-12 w-12 shrink-0 text-red-500" />
            ) : o.status === "delivered" ? (
              <CheckCircle2 className="h-12 w-12 shrink-0 text-emerald-500" />
            ) : null}
          </div>

          {o.status !== "cancelled" && (
            <div className="mt-5">
              <div className="relative flex justify-between">
                <div className="absolute inset-x-5 top-5 h-1 rounded-full bg-ink-100" />
                <div
                  className="absolute top-5 h-1 rounded-full bg-brand-600 transition-all duration-700 ltr:left-5 rtl:right-5"
                  style={{ width: `calc((100% - 2.5rem) * ${mi / (MACRO.length - 1)})` }}
                />
                {MACRO.map((m, i) => (
                  <div key={m.key} className="relative z-10 flex w-14 flex-col items-center">
                    <span className={cx("flex h-10 w-10 items-center justify-center rounded-full border-4 border-white transition", i <= mi ? "bg-brand-600 text-white shadow-glow" : "bg-ink-100 text-ink-400", i === mi && !closed && "ring-4 ring-brand-100")}>
                      <m.icon className="h-4 w-4" />
                    </span>
                    <span className={cx("mt-1.5 text-center text-[10px] font-bold", i <= mi ? "text-ink-800" : "text-ink-400")}>{m[lang]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl bg-ink-50 p-3">
              <div className="flex items-center gap-1 text-ink-500"><CalendarClock className="h-3.5 w-3.5" /> {t("pickup")}</div>
              <div className="mt-1 font-bold">{fmtDate(o.pickup_slot, { weekday: "short", hour: "numeric", minute: "2-digit" })}</div>
            </div>
            <div className="rounded-xl bg-ink-50 p-3">
              <div className="flex items-center gap-1 text-ink-500"><Clock className="h-3.5 w-3.5" /> {t("est_delivery")}</div>
              <div className="mt-1 font-bold">{fmtDate(o.delivery_slot, { weekday: "short", hour: "numeric", minute: "2-digit" })}</div>
            </div>
          </div>
        </div>

        {!closed && <PushPrompt />}

        {/* rider */}
        {o.driver && !closed && (
          <div className="flex items-center gap-3 rounded-3xl bg-white p-4 shadow-soft">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-lg font-extrabold text-emerald-700">
              {o.driver.name.slice(0, 1)}
              <span className="absolute -bottom-1 -end-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white ring-2 ring-white"><VehicleIcon className="h-3.5 w-3.5" /></span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs text-ink-500">{t("your_rider")}</div>
              <div className="font-bold">{o.driver.name}</div>
              <div className="flex items-center gap-2 text-xs text-ink-500">
                <span className="flex items-center gap-0.5"><Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {o.driver.rating}</span>
                {o.driver.plate && <span dir="ltr">• {o.driver.plate}</span>}
              </div>
            </div>
            <a href={`sms:${o.driver.phone}`} className="flex h-11 w-11 items-center justify-center rounded-full bg-ink-100" aria-label={t("chat")}><MessageCircle className="h-5 w-5" /></a>
            <a href={`tel:${o.driver.phone}`} className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600 text-white" aria-label={t("call")}><Phone className="h-5 w-5" /></a>
          </div>
        )}

        {/* rated */}
        {o.rating ? (
          <div className="flex items-center gap-3 rounded-3xl bg-amber-50 p-4">
            <div className="flex">{[1, 2, 3, 4, 5].map((i) => <Star key={i} className={cx("h-5 w-5", i <= o.rating ? "fill-amber-400 text-amber-400" : "text-amber-200")} />)}</div>
            <p className="flex-1 truncate text-sm text-amber-900">{o.review || t("thanks_rating")}</p>
          </div>
        ) : o.status === "delivered" ? (
          <Button block size="lg" variant="secondary" onClick={() => setRateOpen(true)}><Star className="h-5 w-5" /> {t("rate_order")}</Button>
        ) : null}

        {/* details */}
        <div className="rounded-3xl bg-white p-4 shadow-soft">
          <div className="mb-3 flex items-center gap-3">
            <PartnerLogo p={o.partner} size={44} />
            <div className="flex-1">
              <div className="font-bold">{L(o.partner, "name")}</div>
              <div className="text-xs text-ink-500">{L(o.partner, "area")}</div>
            </div>
            <StatusBadge status={o.status} />
          </div>
          <div className="divide-y divide-ink-100 border-t border-ink-100">
            {o.items.map((i: any) => (
              <div key={i.id} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="text-xl">{i.icon}</span>
                <span className="flex-1">
                  <span className="font-semibold">{i.qty}× {L(i, "name")}</span>
                  <span className="block text-xs text-ink-500">{L(i, "service")}</span>
                </span>
                <span className="font-semibold">{money(i.qty * i.unit_price)}</span>
              </div>
            ))}
          </div>
          <dl className="mt-2 space-y-1.5 border-t border-ink-100 pt-3 text-sm">
            <div className="flex justify-between"><dt className="text-ink-500">{t("subtotal")}</dt><dd>{money(o.subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-500">{t("delivery_fee")}</dt><dd>{o.delivery_fee ? money(o.delivery_fee) : t("free")}</dd></div>
            {o.express_fee > 0 && <div className="flex justify-between"><dt className="text-ink-500">{t("express_fee")}</dt><dd>{money(o.express_fee)}</dd></div>}
            <div className="flex justify-between"><dt className="text-ink-500">{t("service_fee")}</dt><dd>{money(o.service_fee)}</dd></div>
            {o.member_discount > 0 && <div className="flex justify-between text-emerald-600"><dt>👑 {t("member_discount")}</dt><dd>- {money(o.member_discount)}</dd></div>}
            {o.discount > 0 && <div className="flex justify-between text-emerald-600"><dt>{t("discount")} {o.promo_code && <span dir="ltr">({o.promo_code})</span>}</dt><dd>- {money(o.discount)}</dd></div>}
            {o.vat > 0 && <div className="flex justify-between"><dt className="text-ink-500">{t("vat")}</dt><dd>{money(o.vat)}</dd></div>}
            <div className="flex justify-between pt-1 text-base font-extrabold"><dt>{t("total")}</dt><dd>{money(o.total)}</dd></div>
          </dl>
          {o.sub_savings > 0 && <div className="mt-3 rounded-xl bg-amber-50 p-3 text-center text-xs font-bold text-amber-800">👑 {t("member_savings_line", { x: money(o.sub_savings), p: t("plus_title") })}</div>}
          <div className="mt-3 flex items-center justify-between rounded-xl bg-ink-50 p-3 text-xs">
            <span className="font-semibold">{t(`pay_${o.payment_method}` as any)}</span>
            <span className={cx("rounded-full px-2 py-0.5 font-bold", o.payment_status === "paid" ? "bg-emerald-100 text-emerald-700" : o.payment_status === "refunded" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700")}>{t(o.payment_status as any)}</span>
          </div>
          <div className="mt-3 flex items-start gap-2 text-xs text-ink-600">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" /> {o.address_text}
          </div>
          {o.notes && <div className="mt-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">📝 {o.notes}</div>}
        </div>

        {/* timeline */}
        <div className="rounded-3xl bg-white p-4 shadow-soft">
          <h3 className="mb-3 font-bold">{t("timeline")}</h3>
          <ol className="relative space-y-4 border-s-2 border-ink-100 ps-5">
            {[...o.events].reverse().map((e: any, i: number) => (
              <li key={i} className="relative">
                <span className={cx("absolute -start-[27px] top-1 h-3 w-3 rounded-full ring-4 ring-white", i === 0 ? "bg-brand-600" : "bg-ink-300")} />
                <div className="text-sm font-semibold">{STATUS_META[e.status as keyof typeof STATUS_META]?.[lang] || e.status}</div>
                <div className="text-xs text-ink-400">{fmtDate(e.created_at)}</div>
              </li>
            ))}
          </ol>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <a href={`tel:${settings.support_phone}`}><Button variant="outline" block><Headphones className="h-4 w-4" /> {t("help")}</Button></a>
          {["pending", "accepted"].includes(o.status) ? (
            <Button variant="danger" block onClick={() => setCancelOpen(true)}><XCircle className="h-4 w-4" /> {t("cancel_order")}</Button>
          ) : (
            <a href="/"><Button variant="secondary" block><HomeIcon className="h-4 w-4" /> {t("nav_home")}</Button></a>
          )}
        </div>
      </div>

      <Sheet open={cancelOpen} onClose={() => setCancelOpen(false)} title={t("cancel_order")}>
        <p className="text-sm text-ink-600">{t("cancel_confirm")}</p>
        {o.payment_status === "paid" && <p className="mt-2 rounded-xl bg-blue-50 p-3 text-xs text-blue-800">{lang === "ar" ? "سيتم إرجاع المبلغ إلى محفظتك فوراً" : "The amount will be refunded to your wallet instantly"}</p>}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => setCancelOpen(false)}>{t("no")}</Button>
          <Button variant="danger" loading={busy} onClick={cancel}>{t("yes")}, {t("cancel_order")}</Button>
        </div>
      </Sheet>

      <Sheet open={rateOpen} onClose={() => setRateOpen(false)} title={t("rate_order")}>
        <div className="text-center">
          <PartnerLogo p={o.partner} size={64} className="mx-auto" />
          <p className="mt-3 font-bold">{L(o.partner, "name")}</p>
          <p className="text-sm text-ink-500">{t("rate_sub")}</p>
          <div className="my-5 flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <button key={i} onClick={() => setRating(i)} aria-label={`${i}`}>
                <Star className={cx("h-10 w-10 transition active:scale-90", i <= rating ? "fill-amber-400 text-amber-400" : "text-ink-200")} />
              </button>
            ))}
          </div>
        </div>
        <Textarea value={review} onChange={(e) => setReview(e.target.value)} placeholder={t("review_ph")} />
        <Button block size="lg" className="mt-4" loading={busy} onClick={rate}>{t("submit")}</Button>
      </Sheet>
    </div>
  );
}

export default function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense>
      <Inner id={id} />
    </Suspense>
  );
}
