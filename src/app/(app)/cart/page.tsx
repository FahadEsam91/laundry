"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { ShoppingBasket, Zap, Clock, MapPin, Banknote, CreditCard, Wallet, TicketPercent, Check, Plus, Trash2, Truck, ChevronDown, Lock, Crown } from "lucide-react";
import { useApp, useCart, useToast } from "@/components/providers";
import { AddressIcon, AddressSheet, TopBar, ZoneBadge } from "@/components/customer";
import { Button, Empty, Input, PartnerLogo, QtyStepper, Textarea, cx } from "@/components/ui";
import { computeTotals, type Promo } from "@/lib/pricing";
import { api, errText } from "@/lib/client";
import { PhotosPicker } from "@/components/image-upload";

function buildSlots(lang: "ar" | "en") {
  const out: { value: string; day: string; label: string }[] = [];
  const now = new Date();
  for (let d = 0; d < 3; d++) {
    for (let h = 8; h <= 21; h += 2) {
      const s = new Date(now);
      s.setDate(now.getDate() + d);
      s.setHours(h, 0, 0, 0);
      if (s.getTime() < now.getTime() + 60 * 60000) continue;
      const e = new Date(s.getTime() + 2 * 3600000);
      const f = new Intl.DateTimeFormat(lang === "ar" ? "ar-IQ-u-nu-latn" : "en-GB", { hour: "numeric", minute: "2-digit" });
      out.push({ value: s.toISOString(), day: String(d), label: `${f.format(s)} – ${f.format(e)}` });
    }
  }
  return out;
}

export default function CartPage() {
  const { t, L, money, me, settings, lang, fmtDate, refreshMe } = useApp();
  const cart = useCart();
  const router = useRouter();
  const toast = useToast();
  const [express, setExpress] = useState(false);
  const [day, setDay] = useState("asap");
  const [slot, setSlot] = useState("asap");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<Promo | null>(null);
  const [promoBusy, setPromoBusy] = useState(false);
  const [pay, setPay] = useState<"cash" | "card_pos" | "card" | "wallet">("cash");
  const [addrOpen, setAddrOpen] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [card, setCard] = useState("4242 4242 4242 4242");
  const slots = useMemo(() => buildSlots(lang), [lang]);

  const p = cart.partner;
  const lines = Object.values(cart.lines);
  const addr = me?.addresses?.find((a: any) => a.is_default) || me?.addresses?.[0];
  const member = me?.member;
  const totals = computeTotals(cart.subtotal, p?.delivery_fee || 0, express, settings as any, promo, member?.benefits);
  // membership upsell: what the most popular plan would save on this exact basket
  const { data: plansData } = useSWR(member ? null : "/api/plans");
  const upPlan = (plansData?.plans || []).find((x: any) => x.popular) || plansData?.plans?.[0];
  const upSave = upPlan
    ? totals.total - computeTotals(cart.subtotal, p?.delivery_fee || 0, express, settings as any, promo, { free_delivery: upPlan.free_deliveries !== 0, discount_pct: upPlan.discount_pct, no_service_fee: !!upPlan.no_service_fee, express_discount_pct: upPlan.express_discount_pct }).total
    : 0;
  const wallet = me?.user?.wallet || 0;
  const belowMin = p ? cart.subtotal < p.min_order : false;

  if (!p || !lines.length)
    return (
      <>
        <TopBar title={t("basket")} />
        <Empty icon={<ShoppingBasket className="h-9 w-9" />} title={t("empty_basket")} sub={t("empty_basket_sub")} action={<Link href="/"><Button>{t("browse")}</Button></Link>} />
      </>
    );

  const pickupAt = slot === "asap" ? new Date(Date.now() + 45 * 60000) : new Date(slot);
  const readyAt = new Date(pickupAt.getTime() + (express ? p.express_hours : p.eta_hours) * 3600000);

  const applyPromo = async () => {
    if (!me?.user) return router.push("/login?next=/cart");
    setPromoBusy(true);
    try {
      const r = await api("/api/promos/validate", { body: { code: promoInput, subtotal: cart.subtotal } });
      setPromo(r.promo);
      toast(t("promo_applied"));
    } catch (e) {
      toast(errText(e, lang, money), "error");
    } finally {
      setPromoBusy(false);
    }
  };

  const place = async () => {
    if (!me?.user) return router.push("/login?next=/cart");
    if (!addr) return setAddrOpen(true);
    if (pay === "wallet" && wallet < totals.total) return toast(t("wallet_insufficient"), "error");
    if (settings.photos_required && !photos.length) {
      document.getElementById("item-photos")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return toast(errText({ code: "photos_required" }, lang), "error");
    }
    setPlacing(true);
    try {
      const r = await api("/api/orders", {
        body: {
          partner_id: p.id,
          items: lines.map((l) => ({ product_id: l.product_id, qty: l.qty })),
          express,
          address_id: addr.id,
          pickup_slot: slot,
          notes,
          photos,
          payment_method: pay,
          promo_code: promo?.code || null,
        },
      });
      cart.clear();
      refreshMe();
      router.replace(`/orders/${r.id}?placed=1`);
    } catch (e) {
      toast(errText(e, lang, money), "error");
      setPlacing(false);
    }
  };

  const dayLabel = (d: string) => (d === "0" ? t("today") : d === "1" ? t("tomorrow") : fmtDate(new Date(Date.now() + 2 * 86400000).toISOString(), { weekday: "long" }));

  return (
    <div className="bg-ink-50 pb-32 lg:pb-16">
      <TopBar title={t("checkout")} />

      <div className="lg:mx-auto lg:grid lg:max-w-6xl lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-8 lg:px-8">
      <div className="min-w-0 lg:[&>section]:mt-4 lg:[&>section]:rounded-2xl lg:[&>section]:border lg:[&>section]:border-ink-100 lg:[&>section]:p-6 lg:[&>section]:shadow-soft">
      {/* basket */}
      <section className="bg-white p-4">
        <div className="mb-3 flex items-center gap-3">
          <PartnerLogo p={p} size={40} />
          <div className="flex-1">
            <div className="font-bold">{L(p, "name")}</div>
            <div className="text-xs text-ink-500">{cart.count} {t("items")}</div>
          </div>
          <Link href={`/laundry/${p.id}`} className="flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700">
            <Plus className="h-3.5 w-3.5" /> {t("add_more")}
          </Link>
        </div>
        <div className="divide-y divide-ink-100">
          {lines.map((l) => (
            <div key={l.product_id} className="flex items-center gap-3 py-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink-50 text-2xl">{l.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{L(l, "name")}</div>
                <div className="text-xs text-ink-500">{L(l, "service")} • {money(l.price)}</div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <QtyStepper small qty={l.qty} onChange={(n) => cart.setQty(p, l, n)} />
                <span className="text-xs font-bold">{money(l.price * l.qty)}</span>
              </div>
            </div>
          ))}
        </div>
        {totals.freeDeliveryGap > 0 && (
          <div className="mt-2 rounded-xl bg-emerald-50 p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
              <Truck className="h-4 w-4" /> {t("free_delivery_gap", { x: money(totals.freeDeliveryGap) })}
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-emerald-100">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.min(100, (cart.subtotal / settings.free_delivery_over) * 100)}%` }} />
            </div>
          </div>
        )}
        {belowMin && <div className="mt-2 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">{t("min_order_gap", { x: money(p.min_order) })}</div>}
      </section>

      {member ? (
        totals.subSavings > 0 && (
          <div className="mx-4 mt-2 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-amber-100 to-amber-50 lg:mx-0 lg:mt-4 p-3 text-sm font-bold text-amber-900">
            <Crown className="h-5 w-5 text-amber-600" /> {t("member_savings_line", { x: money(totals.subSavings), p: L(member.plan, "name") })}
          </div>
        )
      ) : (
        upSave > 0 && settings.memberships && (
          <Link href="/plus" className="mx-4 mt-2 flex items-center gap-3 rounded-2xl bg-ink-900 lg:mx-0 lg:mt-4 p-3 text-sm font-semibold text-white">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-amber-950"><Crown className="h-5 w-5" /></span>
            <span className="flex-1">{t("upsell_plus", { x: money(upSave) })}</span>
            <span className="text-xs font-bold text-amber-300">{t("plus_cta")}</span>
          </Link>
        )
      )}

      {/* speed */}
      <section className="mt-2 bg-white p-4">
        <h3 className="mb-3 font-bold">{t("service_speed")}</h3>
        <div className="grid grid-cols-2 gap-2">
          {[
            { v: false, icon: Clock, title: t("standard"), sub: `${p.eta_hours} ${t("hour_short")}`, extra: t("free") },
            { v: true, icon: Zap, title: t("express"), sub: `${p.express_hours} ${t("hour_short")}`, extra: `+${settings.express_pct}%` },
          ].map((o) => (
            <button key={String(o.v)} onClick={() => setExpress(o.v)} className={cx("relative rounded-2xl border-2 p-3 text-start transition", express === o.v ? "border-brand-600 bg-brand-50/50" : "border-ink-100")}>
              <o.icon className={cx("h-5 w-5", o.v ? "text-amber-500" : "text-ink-400")} />
              <div className="mt-2 text-sm font-bold">{o.title}</div>
              <div className="text-xs text-ink-500">{t("ready_in")} {o.sub}</div>
              <span className={cx("absolute end-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-bold", o.v ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700")}>{o.extra}</span>
            </button>
          ))}
        </div>
      </section>

      {/* pickup */}
      <section className="mt-2 bg-white p-4">
        <h3 className="mb-3 font-bold">{t("pickup_time")}</h3>
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {["asap", "0", "1", "2"].map((d) => (
            <button
              key={d}
              onClick={() => {
                setDay(d);
                setSlot(d === "asap" ? "asap" : slots.find((s) => s.day === d)?.value || "asap");
              }}
              className={cx("h-10 shrink-0 rounded-xl border px-4 text-sm font-bold", day === d ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200")}
            >
              {d === "asap" ? (lang === "ar" ? "⚡ الآن" : "⚡ Now") : dayLabel(d)}
            </button>
          ))}
        </div>
        {day === "asap" ? (
          <p className="mt-3 text-sm text-ink-600">{t("asap")}</p>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {slots.filter((s) => s.day === day).map((s) => (
              <button key={s.value} onClick={() => setSlot(s.value)} className={cx("h-10 rounded-xl border text-sm font-semibold", slot === s.value ? "border-brand-600 bg-brand-50 text-brand-700" : "border-ink-200")}>
                {s.label}
              </button>
            ))}
          </div>
        )}
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-ink-50 p-3 text-xs text-ink-600">
          <Truck className="h-4 w-4 text-brand-600" />
          {t("est_delivery")}: <b className="text-ink-900">{fmtDate(readyAt.toISOString(), { weekday: "short", hour: "numeric", minute: "2-digit" })}</b>
        </div>
      </section>

      {/* address */}
      <section className="mt-2 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-bold">{t("address")}</h3>
          {me?.user && <button onClick={() => setAddrOpen(true)} className="text-sm font-semibold text-brand-600">{addr ? t("change") : t("add_address")}</button>}
        </div>
        {addr ? (
          <div className="flex items-center gap-3">
            <AddressIcon label={addr.label} />
            <div className="min-w-0">
              <div className="text-sm font-bold">{t(`label_${addr.label}` as any)}</div>
              <div className="truncate text-xs text-ink-500">{[addr.area, addr.street, addr.building].filter(Boolean).join("، ")}</div>
            </div>
          </div>
        ) : null}
        {addr && <ZoneBadge lat={addr.lat} lng={addr.lng} className="mt-3" />}
        {addr ? null : (
          <button onClick={() => (me?.user ? setAddrOpen(true) : router.push("/login?next=/cart"))} className="flex w-full items-center gap-2 rounded-xl border border-dashed border-ink-300 p-3 text-sm font-semibold text-ink-600">
            <MapPin className="h-4 w-4" /> {t("add_address")}
          </button>
        )}
        <div className="mt-3">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("notes_ph")} className="min-h-[64px]" />
        </div>
        {me?.user && (
          <div id="item-photos" className="mt-4 scroll-mt-24">
            <div className="flex items-center gap-2 text-sm font-bold">
              {settings.photos_required ? t("item_photos_req") : t("item_photos")}
              {settings.photos_required && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">{t("required")}</span>}
            </div>
            <p className="mb-2 mt-0.5 text-xs text-ink-500">{settings.photos_required ? t("item_photos_req_hint") : t("item_photos_hint")}</p>
            <PhotosPicker value={photos} onChange={setPhotos} />
          </div>
        )}
      </section>

      {/* promo */}
      <section className="mt-2 bg-white p-4">
        <h3 className="mb-3 font-bold">{t("promo_code")}</h3>
        {promo ? (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <TicketPercent className="h-5 w-5 text-emerald-600" />
            <div className="flex-1">
              <div className="text-sm font-bold text-emerald-800" dir="ltr">{promo.code}</div>
              <div className="text-xs text-emerald-700">{L(promo, "title")}</div>
            </div>
            <button onClick={() => setPromo(null)} className="text-xs font-bold text-red-600">{t("remove")}</button>
          </div>
        ) : (
          <div className="flex gap-2">
            <div className="flex-1">
              <Input value={promoInput} onChange={(e) => setPromoInput(e.target.value.toUpperCase())} placeholder="WELCOME50" icon={<TicketPercent className="h-4 w-4" />} dir="ltr" />
            </div>
            <Button variant="dark" onClick={applyPromo} loading={promoBusy} disabled={!promoInput}>{t("apply")}</Button>
          </div>
        )}
      </section>

      {/* payment */}
      <section className="mt-2 bg-white p-4">
        <h3 className="mb-3 font-bold">{t("payment")}</h3>
        <div className="space-y-2">
          {[
            { v: "cash" as const, icon: Banknote, label: t("pay_cash"), sub: t("pay_cash_sub"), show: true },
            { v: "card_pos" as const, icon: CreditCard, label: t("pay_card_pos"), sub: t("pay_card_pos_sub"), show: true },
            { v: "card" as const, icon: CreditCard, label: t("pay_card"), sub: "Visa • Mastercard", show: !!settings.online_payments },
            { v: "wallet" as const, icon: Wallet, label: t("pay_wallet"), sub: `${t("balance")}: ${money(wallet)}`, show: wallet > 0 || !!settings.online_payments },
          ].filter((o) => o.show).map((o) => (
            <button key={o.v} onClick={() => setPay(o.v)} className={cx("flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-start transition", pay === o.v ? "border-brand-600 bg-brand-50/40" : "border-ink-100")}>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-100"><o.icon className="h-5 w-5 text-ink-700" /></span>
              <span className="flex-1">
                <span className="block text-sm font-bold">{o.label}</span>
                {o.sub && <span className={cx("block text-xs", o.v === "wallet" && wallet < totals.total ? "text-red-500" : "text-ink-500")}>{o.sub}</span>}
              </span>
              <span className={cx("flex h-5 w-5 items-center justify-center rounded-full border-2", pay === o.v ? "border-brand-600 bg-brand-600" : "border-ink-300")}>{pay === o.v && <Check className="h-3 w-3 text-white" />}</span>
            </button>
          ))}
          {pay === "card" && (
            <div className="rounded-2xl bg-gradient-to-br from-ink-900 to-ink-700 p-4 text-white">
              <div className="mb-3 flex items-center justify-between text-xs text-white/60">
                <span>{t("card_number")}</span>
                <Lock className="h-3.5 w-3.5" />
              </div>
              <input value={card} onChange={(e) => setCard(e.target.value)} dir="ltr" className="w-full bg-transparent text-lg font-bold tracking-widest outline-none" />
              <div className="mt-3 text-[11px] text-white/60">{t("card_note")}</div>
            </div>
          )}
        </div>
      </section>

      </div>

      {/* summary */}
      <div className="lg:sticky lg:top-24">
      <section className="mt-2 bg-white p-4 lg:mt-4 lg:rounded-2xl lg:border lg:border-ink-100 lg:p-6 lg:shadow-soft">
        <h3 className="mb-3 font-bold">{t("summary")}</h3>
        <dl className="space-y-2 text-sm">
          <Row k={t("subtotal")} v={money(totals.subtotal)} />
          <Row k={t("delivery_fee")} v={totals.deliveryFee ? money(totals.deliveryFee) : totals.subFreeDelivery ? `👑 ${t("free")}` : t("free")} green={!totals.deliveryFee} />
          {totals.expressFee > 0 && <Row k={t("express_fee")} v={money(totals.expressFee)} />}
          <Row k={t("service_fee")} v={totals.serviceFee ? money(totals.serviceFee) : t("free")} green={!totals.serviceFee} />
          {totals.memberDiscount > 0 && <Row k={`👑 ${t("member_discount")} (${member.benefits.discount_pct}%)`} v={`- ${money(totals.memberDiscount)}`} green />}
          {totals.discount > 0 && <Row k={t("discount")} v={`- ${money(totals.discount)}`} green />}
          {totals.vat > 0 && <Row k={`${t("vat")} (${settings.vat_pct}%)`} v={money(totals.vat)} />}
          <div className="flex justify-between border-t border-ink-100 pt-3 text-base font-extrabold">
            <dt>{t("total")}</dt>
            <dd>{money(totals.total)}</dd>
          </div>
        </dl>
        <Button block size="lg" loading={placing} disabled={belowMin} onClick={place} className="mt-5 hidden justify-between lg:flex">
          <span>{me?.user ? t("place_order") : t("verify")}</span>
          <span>{money(totals.total)}</span>
        </Button>
        <p className="mt-3 text-[11px] text-ink-400">{t("terms_note")}</p>
      </section>
      </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[460px] border-t border-ink-100 bg-white p-4 pb-safe lg:hidden">
        <Button block size="lg" loading={placing} disabled={belowMin} onClick={place} className="justify-between">
          <span>{me?.user ? t("place_order") : t("verify")}</span>
          <span>{money(totals.total)}</span>
        </Button>
      </div>
      <AddressSheet open={addrOpen} onClose={() => setAddrOpen(false)} />
    </div>
  );
}

function Row({ k, v, green }: { k: string; v: string; green?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-ink-500">{k}</dt>
      <dd className={cx("font-semibold", green && "text-emerald-600")}>{v}</dd>
    </div>
  );
}
