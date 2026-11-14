"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Bell, ChevronDown, MapPin, Search, Languages, ShieldCheck, Shirt, Truck, Sparkles, PackageCheck, ArrowLeft, ArrowRight, Copy, WashingMachine, Zap } from "lucide-react";
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

/** Desktop-only hero: greeting, big search and trust stats with a product illustration. */
function DesktopHero() {
  const { t, lang, me, num } = useApp();
  const router = useRouter();
  const [q, setQ] = useState("");
  const { data } = useSWR("/api/partners");
  const count = data?.partners?.length || 0;
  return (
    <section className="relative hidden overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-sky-500 text-white lg:block">
      <svg className="absolute inset-0 h-full w-full opacity-[.08]" aria-hidden>
        <defs><pattern id="hero-dots" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="2" fill="white" /></pattern></defs>
        <rect width="100%" height="100%" fill="url(#hero-dots)" />
      </svg>
      <div className="relative mx-auto grid max-w-7xl grid-cols-2 items-center gap-12 px-8 py-16">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold backdrop-blur">
            <Sparkles className="h-4 w-4" /> {me?.user ? (lang === "ar" ? `أهلاً ${me.user.name.split(" ")[0]} 👋` : `Hi ${me.user.name.split(" ")[0]} 👋`) : t("tagline")}
          </div>
          <h1 className="text-5xl font-extrabold leading-[1.15]">{lang === "ar" ? "ملابسك نظيفة ومكوية… بدون ما تطلع من البيت" : "Fresh, pressed clothes — without leaving home"}</h1>
          <p className="mt-4 max-w-xl text-lg text-white/80">{lang === "ar" ? "نستلم من باب بيتك، نغسل ونكوي عند أفضل المغاسل، ونرجعها لك مرتبة — مع تتبع مباشر لكل خطوة." : "We collect from your door, clean at the best local laundries and bring everything back — with live tracking at every step."}</p>
          <form onSubmit={(e) => { e.preventDefault(); router.push(q.trim() ? `/search?q=${encodeURIComponent(q.trim())}` : "/search"); }} className="mt-8 flex max-w-xl items-center gap-2 rounded-2xl bg-white p-2 shadow-lift">
            <Search className="ms-3 h-5 w-5 shrink-0 text-brand-600" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search_ph")} className="h-12 min-w-0 flex-1 bg-transparent text-base text-ink-900 outline-none placeholder:text-ink-400" />
            <button className="h-12 rounded-xl bg-ink-900 px-6 text-sm font-bold text-white hover:bg-ink-800">{t("search")}</button>
          </form>
          <div className="mt-8 flex gap-8">
            {[
              [count ? num(count) : "—", lang === "ar" ? "مغسلة شريكة" : "partner laundries"],
              ["45", lang === "ar" ? "دقيقة للاستلام" : "min pickup"],
              ["4.8 ★", lang === "ar" ? "تقييم الزبائن" : "customer rating"],
            ].map(([a, b]) => (
              <div key={b}>
                <div className="text-3xl font-extrabold">{a}</div>
                <div className="text-sm text-white/70">{b}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative mx-auto h-[380px] w-full max-w-md" aria-hidden>
          <div className="absolute inset-8 rounded-full bg-white/10" />
          <div className="absolute inset-20 rounded-full bg-white/10" />
          <div className="absolute left-1/2 top-1/2 flex h-40 w-40 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[2.5rem] bg-white text-brand-600 shadow-2xl">
            <WashingMachine className="h-20 w-20" strokeWidth={1.4} />
          </div>
          <div className="absolute start-0 top-10 flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-ink-900 shadow-lift">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-600"><Zap className="h-4 w-4" /></span>
            {lang === "ar" ? "مستعجل خلال 3 ساعات" : "Express in 3 hours"}
          </div>
          <div className="absolute end-0 top-1/2 flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-ink-900 shadow-lift">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600"><Truck className="h-4 w-4" /></span>
            {lang === "ar" ? "استلام خلال 45 دقيقة" : "Pickup in 45 min"}
          </div>
          <div className="absolute bottom-8 start-10 flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-ink-900 shadow-lift">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100 text-violet-600"><ShieldCheck className="h-4 w-4" /></span>
            {lang === "ar" ? "ضمان إعادة التنظيف" : "Re-clean guarantee"}
          </div>
        </div>
      </div>
    </section>
  );
}

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
      <DesktopHero />
      <div className="bg-gradient-to-b from-brand-600 to-brand-700 px-4 pb-16 pt-4 text-white lg:hidden">
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
      <div className="-mt-10 px-4 lg:hidden">
        <Link href="/search" className="flex h-14 items-center gap-3 rounded-2xl bg-white px-4 text-sm text-ink-400 shadow-lift">
          <Search className="h-5 w-5 text-brand-600" /> {t("search_ph")}
        </Link>
      </div>

      <div className="lg:mx-auto lg:max-w-7xl lg:px-8">
      {/* active order */}
      {active[0] && (
        <div className="px-4 pt-4 lg:px-0 lg:pt-8">
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
      <section className="pt-6 lg:pt-10">
        <SectionTitle title={t("services")} />
        <div className="grid grid-cols-3 gap-2.5 px-4 lg:grid-cols-9 lg:gap-4 lg:px-0">
          {services.map((s) => (
            <Link key={s.slug} href={`/search?service=${s.slug}`} className="group flex flex-col items-center rounded-2xl border border-ink-100 bg-white p-3 text-center shadow-soft transition active:scale-95 lg:py-5 lg:hover:-translate-y-0.5 lg:hover:border-brand-200 lg:hover:shadow-lift">
              <span className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl transition group-hover:scale-105" style={{ background: `${s.color}14`, color: s.color }}>
                <ServiceIcon name={s.icon} className="h-6 w-6" />
              </span>
              <span className="text-[13px] font-bold leading-tight text-ink-800">{L(s, "name")}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* promos */}
      <section className="pt-6 lg:pt-10">
        <div className="no-scrollbar flex snap-x gap-3 overflow-x-auto px-4 pb-1 lg:grid lg:grid-cols-4 lg:gap-5 lg:overflow-visible lg:px-0">
          {(promoData?.promos || []).map((p: any, i: number) => (
            <div key={p.code} className={cx("relative h-36 w-[300px] shrink-0 snap-start lg:h-44 lg:w-auto overflow-hidden rounded-3xl bg-gradient-to-br p-5 text-white", PROMO_STYLES[i % PROMO_STYLES.length])}>
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
      <section className="px-4 pt-6 lg:px-0 lg:pt-10">
        {settings.memberships && <PlusBanner />}
      </section>

      {data && partners.length === 0 && (
        <section className="px-4 pt-6 lg:px-0 lg:pt-12">
          {["outside", "paused"].includes(data.coverage?.status) ? (
            <div className="rounded-3xl bg-gradient-to-br from-ink-900 to-brand-900 p-6 text-center text-white lg:p-10">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10"><MapPin className="h-7 w-7" /></span>
              <h3 className="mt-4 text-lg font-extrabold lg:text-2xl">{data.coverage.status === "paused" ? t("zone_paused_title") : t("outside_zone_title")}</h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-white/70">{data.coverage.status === "paused" ? t("zone_paused_body") : t("outside_zone_body")}</p>
              <Link href="/account/addresses" className="mt-5 inline-flex rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-ink-900">{t("change_address")}</Link>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-ink-200 bg-white p-8 text-center text-sm font-semibold text-ink-500">{t("no_laundries_yet")}</div>
          )}
        </section>
      )}

      {/* featured */}
      {(!data || partners.some((p) => p.featured)) && <section className="pt-6 lg:pt-12">
        <SectionTitle title={t("featured_laundries")} href="/search" />
        <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-2 lg:grid lg:grid-cols-4 lg:gap-5 lg:overflow-visible lg:px-0">
          {!data && [1, 2].map((i) => <Skeleton key={i} className="h-48 w-[270px] shrink-0" />)}
          {partners.filter((p) => p.featured).map((p) => <PartnerCard key={p.id} p={p} variant="wide" />)}
        </div>
      </section>}

      {/* how it works */}
      <section className="px-4 pt-6 lg:px-0 lg:pt-12">
        <div className="rounded-3xl bg-ink-900 p-5 text-white lg:p-10">
          <div className="mb-4 flex items-center gap-2">
            <LogoMark className="h-7 w-7" />
            <h2 className="font-bold">{t("how_it_works")}</h2>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center lg:gap-8">
            {[
              [Shirt, t("how_1"), t("how_1d")],
              [Truck, t("how_2"), t("how_2d")],
              [Sparkles, t("how_3"), t("how_3d")],
              [PackageCheck, t("how_4"), t("how_4d")],
            ].map(([I, a, b]: any, i) => (
              <div key={i} className="relative">
                <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-brand-300 lg:h-16 lg:w-16">
                  <I className="h-5 w-5" />
                </div>
                <div className="text-xs font-bold lg:text-lg">{a}</div>
                <div className="mt-0.5 text-[10px] leading-tight text-white/55 lg:text-sm">{b}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white/5 p-3 text-xs text-white/80">
            <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-400" /> {t("guarantee")}
          </div>
        </div>
      </section>

      {/* all */}
      {partners.length > 0 && (
      <section className="pt-7 lg:pt-12">
        <SectionTitle title={t("all_laundries")} sub={`${partners.length} ${lang === "ar" ? "مغسلة متاحة" : "laundries available"}`} />
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-2 lg:px-0">
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
        <div className="mt-1 lg:hidden">
          {!data && [1, 2, 3].map((i) => <Skeleton key={i} className="mx-4 my-3 h-20" />)}
          {list.map((p) => <PartnerCard key={p.id} p={p} />)}
        </div>
        <div className="mt-4 hidden grid-cols-3 gap-5 lg:grid xl:grid-cols-4">
          {!data && [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-56" />)}
          {list.map((p) => <PartnerCard key={p.id} p={p} variant="grid" />)}
        </div>
      </section>
      )}

      {/* free delivery strip */}
      {settings.free_delivery_over > 0 && <div className="mx-4 mb-4 mt-2 flex items-center lg:mx-0 lg:mt-10 gap-3 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">
        <PartnerLogo p={{ color: "#059669", color2: "#34D399", initials: "0" }} size={36} />
        <span>{lang === "ar" ? `توصيل مجاني لكل الطلبات فوق ${money(settings.free_delivery_over)}` : `Free delivery on all orders over ${money(settings.free_delivery_over)}`}</span>
      </div>}

      </div>
      <AddressSheet open={addrOpen} onClose={() => setAddrOpen(false)} />
      <BottomNav />
    </div>
  );
}
