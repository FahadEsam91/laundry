"use client";

import { use, useMemo, useRef, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Heart, Star, Clock, Zap, Bike, Info, Search, ShoppingBasket, MapPin, Phone, CalendarClock, ShieldCheck, Share2 } from "lucide-react";
import { useApp, useCart, useToast, type CartPartner } from "@/components/providers";
import { TopBar, PartnerTags } from "@/components/customer";
import { Button, PartnerCover, PartnerLogo, QtyStepper, Sheet, Skeleton, Stars, cx } from "@/components/ui";
import { api } from "@/lib/client";
import { UNIT_LABEL } from "@/lib/constants";

export default function LaundryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, L, money, num, me, refreshMe, lang, fmtDate } = useApp();
  const toast = useToast();
  const cart = useCart();
  const { data } = useSWR(`/api/partners/${id}`);
  const [tab, setTab] = useState<string>("");
  const [q, setQ] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);
  const [conflict, setConflict] = useState<null | { line: any; qty: number }>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const p = data?.partner;
  const products: any[] = data?.products || [];
  const services: any[] = data?.services || [];
  const isFav = me?.favorites?.includes(Number(id));

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? products.filter((x) => x.name_ar.includes(s) || x.name_en.toLowerCase().includes(s)) : products;
  }, [q, products]);
  const popular = products.filter((x) => x.popular).slice(0, 8);

  if (!p)
    return (
      <div>
        <Skeleton className="h-52 rounded-none" />
        <div className="space-y-3 p-4">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      </div>
    );

  const cp: CartPartner = { id: p.id, name_ar: p.name_ar, name_en: p.name_en, color: p.color, color2: p.color2, initials: p.initials, delivery_fee: p.delivery_fee, min_order: p.min_order, eta_hours: p.eta_hours, express_hours: p.express_hours, is_open: p.is_open };
  const svcOf = (sid: number) => services.find((s) => s.id === sid);
  const lineOf = (x: any) => ({ product_id: x.id, name_ar: x.name_ar, name_en: x.name_en, icon: x.icon, price: x.price, unit: x.unit, service_ar: svcOf(x.service_id)?.name_ar || "", service_en: svcOf(x.service_id)?.name_en || "" });
  const qtyOf = (pid: number) => (cart.partner?.id === p.id ? cart.lines[pid]?.qty || 0 : 0);
  const setQty = (x: any, qty: number) => {
    const ok = cart.setQty(cp, lineOf(x), qty);
    if (!ok) setConflict({ line: x, qty });
  };
  const toggleFav = async () => {
    if (!me?.user) return toast(t("login_sub"), "info");
    const r = await api("/api/favorites", { body: { partner_id: p.id } });
    refreshMe();
    toast(r.favorite ? "❤️" : "💔", "info");
  };
  const jump = (sid: string) => {
    setTab(sid);
    const el = sectionRefs.current[sid];
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 112, behavior: "smooth" });
  };
  const inCart = cart.partner?.id === p.id && cart.count > 0;

  return (
    <div className="pb-28">
      <div className="relative">
        <PartnerCover p={p} className="h-52" />
        <div className="absolute inset-x-0 top-0">
          <TopBar
            transparent
            right={
              <div className="flex gap-2">
                <button
                  onClick={() => navigator.share?.({ title: L(p, "name"), url: location.href }).catch(() => {})}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-soft"
                  aria-label="share"
                >
                  <Share2 className="h-5 w-5" />
                </button>
                <button onClick={toggleFav} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-soft" aria-label="favourite">
                  <Heart className={cx("h-5 w-5", isFav && "fill-red-500 text-red-500")} />
                </button>
              </div>
            }
          />
        </div>
      </div>

      <div className="relative -mt-10 px-4">
        <div className="rounded-3xl bg-white p-4 shadow-lift">
          <div className="flex gap-3">
            <PartnerLogo p={p} size={64} className="-mt-10 ring-4 ring-white" />
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-extrabold">{L(p, "name")}</h1>
              <p className="mt-0.5 text-sm text-ink-500">{L(p, "desc")}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button onClick={() => setInfoOpen(true)} className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {num(p.rating, 1)} <span className="font-medium opacity-70">({num(p.rating_count)} {t("reviews")})</span>
            </button>
            <PartnerTags tags={p.tags} max={3} />
            <button onClick={() => setInfoOpen(true)} className="ms-auto flex items-center gap-1 text-xs font-semibold text-brand-600">
              <Info className="h-4 w-4" /> {t("info")}
            </button>
          </div>
          <div className="mt-4 grid grid-cols-3 divide-x divide-ink-100 rounded-2xl bg-ink-50 py-3 text-center rtl:divide-x-reverse">
            <div>
              <Clock className="mx-auto h-4 w-4 text-ink-400" />
              <div className="mt-1 text-sm font-bold">{p.eta_hours} {t("hour_short")}</div>
              <div className="text-[10px] text-ink-500">{t("ready_in")}</div>
            </div>
            <div>
              <Zap className="mx-auto h-4 w-4 text-amber-500" />
              <div className="mt-1 text-sm font-bold">{p.express_hours} {t("hour_short")}</div>
              <div className="text-[10px] text-ink-500">{t("express")}</div>
            </div>
            <div>
              <Bike className="mx-auto h-4 w-4 text-ink-400" />
              <div className={cx("mt-1 text-sm font-bold", p.delivery_fee === 0 && "text-emerald-600")}>{p.delivery_fee ? money(p.delivery_fee) : t("free")}</div>
              <div className="text-[10px] text-ink-500">{t("min_order")} {money(p.min_order)}</div>
            </div>
          </div>
          {!p.is_open && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">
              <CalendarClock className="h-4 w-4" /> {t("closed_now")}
            </div>
          )}
        </div>
      </div>

      {/* sticky tabs */}
      <div className="sticky top-0 z-20 mt-4 border-b border-ink-100 bg-white/95 backdrop-blur">
        <div className="px-4 pt-3">
          <label className="flex h-10 items-center gap-2 rounded-xl bg-ink-100 px-3">
            <Search className="h-4 w-4 text-ink-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search_items")} className="h-full flex-1 bg-transparent text-sm outline-none" />
          </label>
        </div>
        <div className="no-scrollbar flex gap-1 overflow-x-auto px-3 py-2">
          {services.map((s) => (
            <button key={s.id} onClick={() => jump(String(s.id))} className={cx("h-9 shrink-0 rounded-full px-3.5 text-sm font-bold transition", tab === String(s.id) ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-ink-100")}>
              {L(s, "name")}
            </button>
          ))}
        </div>
      </div>

      {/* popular */}
      {!q && popular.length > 0 && (
        <section className="pt-5">
          <h2 className="mb-3 px-4 text-lg font-bold">🔥 {t("popular")}</h2>
          <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1">
            {popular.map((x) => {
              const qty = qtyOf(x.id);
              return (
                <div key={x.id} className="w-36 shrink-0 rounded-2xl border border-ink-100 bg-white p-3 shadow-soft">
                  <div className="flex h-20 items-center justify-center rounded-xl text-4xl" style={{ background: `${p.color}10` }}>
                    {x.icon}
                  </div>
                  <div className="mt-2 line-clamp-1 text-sm font-bold">{L(x, "name")}</div>
                  <div className="line-clamp-1 text-[11px] text-ink-500">{L(svcOf(x.service_id), "name")}</div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm font-extrabold text-ink-900">{money(x.price)}</span>
                  </div>
                  <div className="mt-2">
                    {qty ? (
                      <QtyStepper small qty={qty} onChange={(n) => setQty(x, n)} />
                    ) : (
                      <button onClick={() => setQty(x, 1)} className="h-8 w-full rounded-full bg-brand-50 text-sm font-bold text-brand-700">
                        + {t("add_to_basket")}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* sections */}
      {services.map((s) => {
        const items = filtered.filter((x) => x.service_id === s.id);
        if (!items.length) return null;
        return (
          <section key={s.id} ref={(el) => { sectionRefs.current[String(s.id)] = el; }} className="pt-6">
            <div className="mb-1 px-4">
              <h2 className="text-lg font-bold">{L(s, "name")}</h2>
              <p className="text-xs text-ink-500">{L(s, "desc")}</p>
            </div>
            {items.map((x) => {
              const qty = qtyOf(x.id);
              const unit = UNIT_LABEL[x.unit] || UNIT_LABEL.piece;
              return (
                <div key={x.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-ink-50 text-3xl">{x.icon}</div>
                  <div className="min-w-0 flex-1 border-b border-ink-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold">{L(x, "name")}</span>
                      {x.popular ? <span className="rounded bg-orange-50 px-1.5 text-[10px] font-bold text-orange-600">{t("popular")}</span> : null}
                    </div>
                    <div className="mt-0.5 text-sm">
                      <span className="font-bold text-ink-900">{money(x.price)}</span>
                      <span className="text-xs text-ink-400"> / {unit[lang]}</span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {qty ? (
                      <QtyStepper qty={qty} onChange={(n) => setQty(x, n)} />
                    ) : (
                      <button onClick={() => setQty(x, 1)} className="flex h-9 w-9 items-center justify-center rounded-full border border-brand-200 bg-white text-xl font-bold text-brand-600 shadow-sm active:scale-90" aria-label="add">
                        +
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        );
      })}

      {/* reviews */}
      {!!data?.reviews?.length && !q && (
        <section className="px-4 pt-8">
          <h2 className="mb-3 text-lg font-bold">{t("rating")}</h2>
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4">
            {data.reviews.map((r: any, i: number) => (
              <div key={i} className="w-64 shrink-0 rounded-2xl bg-ink-50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">{r.name.split(" ")[0]}</span>
                  <Stars value={r.rating} size={12} />
                </div>
                <p className="mt-2 text-sm text-ink-600">{r.review}</p>
                <p className="mt-2 text-[11px] text-ink-400">{fmtDate(r.created_at, { day: "numeric", month: "short" })}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mx-4 mt-8 flex items-center gap-2 rounded-2xl bg-emerald-50 p-3 text-xs font-medium text-emerald-800">
        <ShieldCheck className="h-5 w-5 shrink-0" /> {t("guarantee")}
      </div>

      {/* basket bar */}
      {inCart && (
        <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[460px] p-4 pb-safe">
          <Link href="/cart" className="animate-fade-up flex h-14 items-center gap-3 rounded-2xl bg-brand-600 px-4 text-white shadow-glow">
            <span className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-white/20 px-2 text-sm font-extrabold">{cart.count}</span>
            <span className="flex-1 text-sm font-bold">{t("view_basket")}</span>
            <span className="text-sm font-extrabold">{money(cart.subtotal)}</span>
          </Link>
        </div>
      )}

      <Sheet open={!!conflict} onClose={() => setConflict(null)} title={<span className="flex items-center gap-2"><ShoppingBasket className="h-5 w-5" /> {t("basket")}</span>}>
        <p className="text-sm text-ink-600">{t("basket_other_partner")}</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => setConflict(null)}>{t("cancel")}</Button>
          <Button
            onClick={() => {
              if (!conflict) return;
              cart.replace(cp, [{ ...lineOf(conflict.line), qty: conflict.qty }]);
              setConflict(null);
            }}
          >
            {t("start_new")}
          </Button>
        </div>
      </Sheet>

      <Sheet open={infoOpen} onClose={() => setInfoOpen(false)} title={t("laundry_info")}>
        <div className="space-y-4 text-sm">
          <div className="flex items-start gap-3"><MapPin className="mt-0.5 h-5 w-5 text-ink-400" /><div><div className="font-bold">{t("address")}</div><div className="text-ink-500">{L(p, "area")}</div></div></div>
          <div className="flex items-start gap-3"><Clock className="mt-0.5 h-5 w-5 text-ink-400" /><div><div className="font-bold">{t("working_hours")}</div><div className="text-ink-500">{t("hours_value")}</div></div></div>
          {p.phone && <div className="flex items-start gap-3"><Phone className="mt-0.5 h-5 w-5 text-ink-400" /><div><div className="font-bold">{t("phone")}</div><div className="text-ink-500" dir="ltr">{p.phone}</div></div></div>}
          <div className="flex items-start gap-3"><Star className="mt-0.5 h-5 w-5 text-amber-400" /><div><div className="font-bold">{num(p.rating, 1)} / 5</div><div className="text-ink-500">{num(p.rating_count)} {t("reviews")}</div></div></div>
        </div>
      </Sheet>
    </div>
  );
}
