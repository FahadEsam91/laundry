"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { Bell, ChevronDown, MapPin, Search, Languages, ShieldCheck, Shirt, Truck, Sparkles, PackageCheck, ArrowLeft, ArrowRight, Copy } from "lucide-react";
import { useApp, useToast } from "@/components/providers";
import { AddressSheet, BottomNav, PartnerCard, SectionTitle, useActiveOrders } from "@/components/customer";
import { ServiceIcon, Skeleton, StatusBadge, cx, LogoMark, PartnerLogo } from "@/components/ui";
import { PlusBanner } from "@/components/plus";

const PROMO_STYLES = [
  "from-brand-600 via-brand-500 to-sky-400",
  "from-violet-600 via-fuchsia-500 to-pink-400",
  "from-emerald-600 via-teal-500 to-cyan-400",
  "from-amber-500 via-orange-500 to-rose-500",
];

export default function HomePage() {
  const { t, L, me, services, lang, setLang, money, dir, settings } = useApp();
  const toast = useToast();
  const [addrOpen, setAddrOpen] = useState(false);
  const [sort, setSort] = useState("recommended");
  const [filters, setFilters] = useState<string[]>([]);
  const { data } = useSWR("/api/partners");
  const { data: promoData } = useSWR("/api/promos");
  const active = useActiveOrders();
  const partners: any[] = data?.partners || [];
  const addr = me?.addresses?.find((a: any) => a.is_default) || me?.addresses?.[0];
  const Arrow = dir === "rtl" ? ArrowLeft : ArrowRight;

  let list = partners.filter((p) => {
    if (filters.includes("open") && !p.is_open) return false;
    if (filters.includes("free") && p.delivery_fee > 0) return false;
    if (filters.includes("express") && p.express_hours > 4) return false;
    return true;
  });
  list = [...list].sort((a, b) => {
    if (sort === "rating") return b.rating - a.rating;
    if (sort === "fastest") return a.express_hours - b.express_hours;
    if (sort === "distance") return (a.distance_km ?? 0) - (b.distance_km ?? 0);
    if (sort === "fee") return a.delivery_fee - b.delivery_fee;
    return 0;
  });
  const toggle = (f: string) => setFilters((x) => (x.includes(f) ? x.filter((y) => y !== f) : [...x, f]));

  return (
    <div className="animate-fade-up">
      {/* header */}
      <div className="bg-gradient-to-b from-brand-600 to-brand-700 px-4 pb-16 pt-4 text-white">
        <div className="flex items-center justify-between">
          <button onClick={() => setAddrOpen(true)} className="flex min-w-0 items-center gap-2 text-start">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15">
              <MapPin className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-medium text-white/70">{t("deliver_to")}</span>
              <span className="flex items-center gap-1 truncate text-sm font-bold">
                {addr ? `${t(`label_${addr.label}` as any)} • ${addr.area}` : lang === "ar" ? "اختر موقعك" : "Choose location"}
                <ChevronDown className="h-4 w-4 shrink-0" />
              </span>
            </span>
          </button>
          <div className="flex items-center gap-1">
            <button onClick={() => setLang(lang === "ar" ? "en" : "ar")} className="flex h-10 items-center gap-1 rounded-full bg-white/15 px-3 text-xs font-bold" aria-label="language">
              <Languages className="h-4 w-4" /> {lang === "ar" ? "EN" : "ع"}
            </button>
            <Link href={me?.user ? "/notifications" : "/login"} className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/15" aria-label="notifications">
              <Bell className="h-5 w-5" />
              {me?.unread > 0 && <span className="absolute end-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-extrabold text-ink-900">{me.unread}</span>}
            </Link>
          </div>
        </div>
        <h1 className="mt-5 text-2xl font-extrabold leading-snug">
          {me?.user ? (lang === "ar" ? `أهلاً ${me.user.name.split(" ")[0]} 👋` : `Hi ${me.user.name.split(" ")[0]} 👋`) : t("login_title")}
        </h1>
        <p className="text-sm text-white/75">{lang === "ar" ? "شنو تحتاج اليوم؟ نستلم ونغسل ونكوي ونرجعها لك" : "What do you need today? We collect, clean & deliver"}</p>
      </div>

      {/* search */}
      <div className="-mt-10 px-4">
        <Link href="/search" className="flex h-14 items-center gap-3 rounded-2xl bg-white px-4 text-sm text-ink-400 shadow-lift">
          <Search className="h-5 w-5 text-brand-600" /> {t("search_ph")}
        </Link>
      </div>

      {/* active order */}
      {active[0] && (
        <div className="px-4 pt-4">
          <Link href={`/orders/${active[0].id}`} className="flex items-center gap-3 overflow-hidden rounded-2xl border border-brand-100 bg-brand-50 p-3">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white">
              <span className="absolute inset-0 animate-ping2 rounded-xl bg-brand-500" />
              <Truck className="relative h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-brand-700">{t("active_order")} • {active[0].code}</div>
              <div className="mt-0.5 flex items-center gap-2">
                <StatusBadge status={active[0].status} />
                <span className="truncate text-xs text-ink-500">{L({ name_ar: active[0].partner_ar, name_en: active[0].partner_en }, "name")}</span>
              </div>
            </div>
            <span className="flex items-center gap-1 rounded-full bg-brand-600 px-3 py-1.5 text-xs font-bold text-white">
              {t("track")} <Arrow className="h-3.5 w-3.5" />
            </span>
          </Link>
        </div>
      )}

      {/* services */}
      <section className="pt-6">
        <SectionTitle title={t("services")} />
        <div className="grid grid-cols-3 gap-2.5 px-4">
          {services.map((s) => (
            <Link key={s.slug} href={`/search?service=${s.slug}`} className="group flex flex-col items-center rounded-2xl border border-ink-100 bg-white p-3 text-center shadow-soft transition active:scale-95">
              <span className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl transition group-hover:scale-105" style={{ background: `${s.color}14`, color: s.color }}>
                <ServiceIcon name={s.icon} className="h-6 w-6" />
              </span>
              <span className="text-[13px] font-bold leading-tight text-ink-800">{L(s, "name")}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* promos */}
      <section className="pt-6">
        <div className="no-scrollbar flex snap-x gap-3 overflow-x-auto px-4 pb-1">
          {(promoData?.promos || []).map((p: any, i: number) => (
            <div key={p.code} className={cx("relative h-36 w-[300px] shrink-0 snap-start overflow-hidden rounded-3xl bg-gradient-to-br p-5 text-white", PROMO_STYLES[i % PROMO_STYLES.length])}>
              <svg className="absolute -end-6 -top-6 h-40 w-40 opacity-20" viewBox="0 0 100 100" aria-hidden>
                <circle cx="50" cy="50" r="40" fill="none" stroke="white" strokeWidth="10" />
                <circle cx="50" cy="50" r="16" fill="white" />
              </svg>
              <div className="relative">
                <div className="text-xs font-semibold text-white/80">{p.first_order_only ? (lang === "ar" ? "للزبائن الجدد" : "New customers") : t("nav_offers")}</div>
                <div className="mt-1 text-2xl font-extrabold leading-tight">{L(p, "title")}</div>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(p.code);
                    toast(`${t("copied")}: ${p.code}`, "info");
                  }}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/40 border-dashed bg-white/15 px-3 py-1 text-xs font-bold tracking-wider"
                  dir="ltr"
                >
                  <Copy className="h-3 w-3" /> {p.code}
                </button>
              </div>
            </div>
          ))}
          {!promoData && <Skeleton className="h-36 w-[300px] shrink-0 rounded-3xl" />}
        </div>
      </section>

      {/* membership */}
      <section className="px-4 pt-6">
        <PlusBanner />
      </section>

      {/* featured */}
      <section className="pt-6">
        <SectionTitle title={t("featured_laundries")} href="/search" />
        <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-2">
          {!data && [1, 2].map((i) => <Skeleton key={i} className="h-48 w-[270px] shrink-0" />)}
          {partners.filter((p) => p.featured).map((p) => <PartnerCard key={p.id} p={p} variant="wide" />)}
        </div>
      </section>

      {/* how it works */}
      <section className="px-4 pt-6">
        <div className="rounded-3xl bg-ink-900 p-5 text-white">
          <div className="mb-4 flex items-center gap-2">
            <LogoMark className="h-7 w-7" />
            <h2 className="font-bold">{t("how_it_works")}</h2>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              [Shirt, t("how_1"), t("how_1d")],
              [Truck, t("how_2"), t("how_2d")],
              [Sparkles, t("how_3"), t("how_3d")],
              [PackageCheck, t("how_4"), t("how_4d")],
            ].map(([I, a, b]: any, i) => (
              <div key={i} className="relative">
                <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-brand-300">
                  <I className="h-5 w-5" />
                </div>
                <div className="text-xs font-bold">{a}</div>
                <div className="mt-0.5 text-[10px] leading-tight text-white/55">{b}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white/5 p-3 text-xs text-white/80">
            <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-400" /> {t("guarantee")}
          </div>
        </div>
      </section>

      {/* all */}
      <section className="pt-7">
        <SectionTitle title={t("all_laundries")} sub={`${partners.length} ${lang === "ar" ? "مغسلة متاحة" : "laundries available"}`} />
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-2">
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-9 shrink-0 rounded-full border border-ink-200 bg-white px-3 text-xs font-semibold">
            <option value="recommended">{t("sort_by")}: {t("sort_recommended")}</option>
            <option value="rating">{t("sort_rating")}</option>
            <option value="fastest">{t("sort_fastest")}</option>
            <option value="distance">{t("sort_distance")}</option>
            <option value="fee">{t("sort_cheapest_delivery")}</option>
          </select>
          {[
            ["open", t("filter_open")],
            ["free", t("filter_free_delivery")],
            ["express", t("filter_express")],
          ].map(([k, label]) => (
            <button key={k} onClick={() => toggle(k)} className={cx("h-9 shrink-0 rounded-full border px-3 text-xs font-semibold transition", filters.includes(k) ? "border-brand-600 bg-brand-600 text-white" : "border-ink-200 bg-white text-ink-700")}>
              {label}
            </button>
          ))}
        </div>
        <div className="mt-1">
          {!data && [1, 2, 3].map((i) => <Skeleton key={i} className="mx-4 my-3 h-20" />)}
          {list.map((p) => <PartnerCard key={p.id} p={p} />)}
        </div>
      </section>

      {/* free delivery strip */}
      {settings.free_delivery_over > 0 && <div className="mx-4 mb-4 mt-2 flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">
        <PartnerLogo p={{ color: "#059669", color2: "#34D399", initials: "0" }} size={36} />
        <span>{lang === "ar" ? `توصيل مجاني لكل الطلبات فوق ${money(settings.free_delivery_over)}` : `Free delivery on all orders over ${money(settings.free_delivery_over)}`}</span>
      </div>}

      <AddressSheet open={addrOpen} onClose={() => setAddrOpen(false)} />
      <BottomNav />
    </div>
  );
}
