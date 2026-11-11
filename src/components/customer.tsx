"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";
import {
  Home, ReceiptText, TicketPercent, UserRound, Star, Clock, Bike, MapPin, Check, Plus, Crosshair, Zap, Leaf, Crown, BadgePercent,
  ChevronLeft, ChevronRight, Building2, Briefcase, Search, Bell, Languages, ShoppingBasket,
} from "lucide-react";
import { useApp, useCart, useToast } from "./providers";
import { Button, Input, PartnerCover, PartnerLogo, Segmented, Sheet, cx, Logo } from "./ui";
import { MapView } from "./map-view";
import { api, errText } from "@/lib/client";

// ------------------------------------------------------------- shell

export function CustomerShell({ children, narrow }: { children: React.ReactNode; narrow?: boolean }) {
  // narrow = phone-only experiences (rider app): keep the app column on every screen size
  if (narrow)
    return (
      <div className="min-h-screen bg-ink-50">
        <div className="relative mx-auto min-h-screen max-w-[460px] bg-white shadow-[0_0_60px_rgba(16,24,40,.08)]">{children}</div>
      </div>
    );
  return (
    <div className="min-h-screen bg-ink-50 lg:bg-white">
      <DesktopHeader />
      <div className="relative mx-auto min-h-screen max-w-[460px] bg-white shadow-[0_0_60px_rgba(16,24,40,.08)] lg:min-h-[calc(100vh-4rem)] lg:max-w-none lg:shadow-none">
        {children}
      </div>
      <DesktopFooter />
    </div>
  );
}

/** Desktop-only top navigation (phones use the bottom tab bar). */
function DesktopHeader() {
  const { t, lang, setLang, me } = useApp();
  const { count, subtotal } = useCart();
  const { money } = useApp();
  const path = usePathname();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [addrOpen, setAddrOpen] = useState(false);
  const addr = me?.addresses?.find((a: any) => a.is_default) || me?.addresses?.[0];
  const links = [
    { href: "/", label: t("nav_home") },
    { href: "/orders", label: t("nav_orders") },
    { href: "/plus", label: t("plus_title") },
    { href: "/offers", label: t("nav_offers") },
  ];
  return (
    <header className="sticky top-0 z-40 hidden border-b border-ink-100 bg-white/95 backdrop-blur lg:block">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-5 px-8">
        <Link href="/" className="shrink-0"><Logo /></Link>
        <button onClick={() => setAddrOpen(true)} className="flex min-w-0 max-w-[220px] shrink-0 items-center gap-2 rounded-xl px-2 py-1.5 text-start hover:bg-ink-50">
          <MapPin className="h-5 w-5 shrink-0 text-brand-600" />
          <span className="min-w-0">
            <span className="block text-[11px] text-ink-400">{t("deliver_to")}</span>
            <span className="block truncate text-sm font-bold">{addr ? `${t(`label_${addr.label}` as any)} • ${addr.area}` : lang === "ar" ? "اختر موقعك" : "Choose location"}</span>
          </span>
        </button>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            router.push(q.trim() ? `/search?q=${encodeURIComponent(q.trim())}` : "/search");
          }}
          className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl bg-ink-100 px-4 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-500/30"
        >
          <Search className="h-4 w-4 shrink-0 text-ink-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search_ph")} className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none" />
        </form>
        <nav className="flex shrink-0 items-center gap-1">
          {links.map((l) => {
            const on = l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link key={l.href} href={l.href} className={cx("rounded-lg px-3 py-2 text-sm font-semibold transition", on ? "bg-brand-50 text-brand-700" : "text-ink-600 hover:bg-ink-50 hover:text-ink-900")}>
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex shrink-0 items-center gap-1">
          <button onClick={() => setLang(lang === "ar" ? "en" : "ar")} className="flex h-10 items-center gap-1 rounded-xl px-3 text-sm font-bold text-ink-600 hover:bg-ink-50" aria-label="language">
            <Languages className="h-4 w-4" /> {lang === "ar" ? "EN" : "ع"}
          </button>
          <Link href={me?.user ? "/notifications" : "/login"} className="relative flex h-10 w-10 items-center justify-center rounded-xl text-ink-600 hover:bg-ink-50" aria-label={t("notifications")}>
            <Bell className="h-5 w-5" />
            {me?.unread > 0 && <span className="absolute end-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{me.unread}</span>}
          </Link>
          <Link href="/cart" className={cx("flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-bold transition", count ? "bg-brand-600 text-white shadow-glow hover:bg-brand-700" : "text-ink-600 hover:bg-ink-50")} aria-label={t("basket")}>
            <ShoppingBasket className="h-5 w-5" />
            {count ? <span>{count} • {money(subtotal)}</span> : null}
          </Link>
          {me?.user ? (
            <Link href="/account" className="ms-1 flex items-center gap-2 rounded-xl py-1 pe-3 ps-1 hover:bg-ink-50">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">{me.user.name.slice(0, 1)}</span>
              <span className="max-w-[110px] truncate text-sm font-semibold">{me.user.name.split(" ")[0]}</span>
            </Link>
          ) : (
            <Link href="/login" className="ms-1"><Button size="sm">{t("verify")}</Button></Link>
          )}
        </div>
      </div>
      <AddressSheet open={addrOpen} onClose={() => setAddrOpen(false)} />
    </header>
  );
}

function DesktopFooter() {
  const { t, lang, settings } = useApp();
  return (
    <footer className="mt-16 hidden bg-ink-950 text-white lg:block">
      <div className="mx-auto grid max-w-7xl grid-cols-4 gap-10 px-8 py-12">
        <div>
          <Logo light />
          <p className="mt-3 text-sm leading-6 text-white/60">{t("tagline")}</p>
        </div>
        <div>
          <div className="mb-3 text-sm font-bold">{t("app_name")}</div>
          <div className="space-y-2 text-sm text-white/60">
            <Link href="/plus" className="block hover:text-white">{t("plus_title")}</Link>
            <Link href="/offers" className="block hover:text-white">{t("nav_offers")}</Link>
            <Link href="/orders" className="block hover:text-white">{t("nav_orders")}</Link>
          </div>
        </div>
        <div>
          <div className="mb-3 text-sm font-bold">{lang === "ar" ? "للشركاء" : "For partners"}</div>
          <div className="space-y-2 text-sm text-white/60">
            <Link href="/partner" className="block hover:text-white">{t("role_partner")}</Link>
            <Link href="/driver" className="block hover:text-white">{t("role_driver")}</Link>
            <Link href="/admin" className="block hover:text-white">{t("role_admin")}</Link>
          </div>
        </div>
        <div>
          <div className="mb-3 text-sm font-bold">{t("support")}</div>
          <div className="space-y-2 text-sm text-white/60">
            <a href={`tel:${settings.support_phone}`} className="block hover:text-white" dir="ltr">{settings.support_phone}</a>
            <Link href="/privacy" className="block hover:text-white">{t("privacy")}</Link>
            <Link href="/terms" className="block hover:text-white">{t("terms")}</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-white/40">© {new Date().getFullYear()} {t("app_name")}</div>
    </footer>
  );
}

/** Centered page container used on desktop (no-op on phones). */
export function Page({ children, className, size = "7xl" }: { children: React.ReactNode; className?: string; size?: "3xl" | "5xl" | "7xl" }) {
  return <div className={cx("lg:mx-auto lg:px-8", size === "3xl" ? "lg:max-w-3xl" : size === "5xl" ? "lg:max-w-5xl" : "lg:max-w-7xl", className)}>{children}</div>;
}

export function BottomNav() {
  const { t } = useApp();
  const path = usePathname();
  const { count } = useCart();
  const items = [
    { href: "/", label: t("nav_home"), icon: Home },
    { href: "/orders", label: t("nav_orders"), icon: ReceiptText },
    { href: "/offers", label: t("nav_offers"), icon: TicketPercent },
    { href: "/account", label: t("nav_account"), icon: UserRound },
  ];
  return (
    <>
      <div className="h-20 lg:hidden" />
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[460px] border-t lg:hidden border-ink-100 bg-white/95 backdrop-blur">
        <div className="grid grid-cols-4">
          {items.map((it) => {
            const on = it.href === "/" ? path === "/" : path.startsWith(it.href);
            return (
              <Link key={it.href} href={it.href} className={cx("relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold", on ? "text-brand-600" : "text-ink-400")}>
                {on && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-brand-600" />}
                <it.icon className={cx("h-[22px] w-[22px]", on && "stroke-[2.4]")} />
                {it.label}
                {it.href === "/orders" && count > 0 && <span className="sr-only">{count}</span>}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

export function TopBar({ title, back = true, right, transparent }: { title?: React.ReactNode; back?: boolean | string; right?: React.ReactNode; transparent?: boolean }) {
  const router = useRouter();
  const { dir } = useApp();
  const Chevron = dir === "rtl" ? ChevronRight : ChevronLeft;
  return (
    <header className={cx("sticky top-0 z-30 flex h-14 items-center gap-2 px-3", transparent ? "lg:top-16" : "border-b border-ink-100 bg-white/95 backdrop-blur lg:static lg:mx-auto lg:h-auto lg:max-w-7xl lg:border-0 lg:bg-transparent lg:px-8 lg:pb-2 lg:pt-8 lg:[&>div]:text-2xl lg:[&>div]:font-extrabold")}>
      {back && (
        <button
          onClick={() => (typeof back === "string" ? router.push(back) : window.history.length > 1 ? router.back() : router.push("/"))}
          className={cx("flex h-10 w-10 items-center justify-center rounded-full", transparent ? "bg-white/90 shadow-soft" : "hover:bg-ink-100")}
          aria-label="back"
        >
          <Chevron className="h-5 w-5" />
        </button>
      )}
      <div className="min-w-0 flex-1 truncate text-base font-bold">{title}</div>
      {right}
    </header>
  );
}

export function SectionTitle({ title, href, sub }: { title: string; href?: string; sub?: string }) {
  const { t } = useApp();
  return (
    <div className="mb-3 flex items-end justify-between px-4 lg:mb-5 lg:px-0 lg:[&_h2]:text-2xl">
      <div>
        <h2 className="text-lg font-bold text-ink-900">{title}</h2>
        {sub && <p className="text-xs text-ink-500">{sub}</p>}
      </div>
      {href && (
        <Link href={href} className="text-sm font-semibold text-brand-600">
          {t("view_all")}
        </Link>
      )}
    </div>
  );
}

// ------------------------------------------------------------- partner cards

const TAG_ICON: Record<string, any> = { top: Crown, express: Zap, eco: Leaf, deal: BadgePercent, premium: Star, free_delivery: Bike };

export function PartnerTags({ tags, max = 2 }: { tags: string; max?: number }) {
  const { t } = useApp();
  const list = (tags || "").split(",").filter(Boolean).slice(0, max);
  return (
    <>
      {list.map((tg) => {
        const I = TAG_ICON[tg] || Star;
        return (
          <span key={tg} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700">
            <I className="h-3 w-3" /> {t(`tag_${tg}` as any)}
          </span>
        );
      })}
    </>
  );
}

export function PartnerCard({ p, variant = "row" }: { p: any; variant?: "row" | "wide" | "grid" }) {
  const { L, t, money, num, me } = useApp();
  const fee = p.delivery_fee === 0 ? t("free") : me?.member?.benefits?.free_delivery ? `👑 ${t("free_with_plus")}` : money(p.delivery_fee);
  if (variant === "wide" || variant === "grid")
    return (
      <Link href={`/laundry/${p.id}`} className={cx("block shrink-0 overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lift", variant === "grid" ? "w-full" : "w-[270px] lg:w-auto", " rounded-2xl border border-ink-100 bg-white shadow-soft active:scale-[.99]")}>
        <PartnerCover p={p} className={variant === "grid" ? "h-36" : "h-28"}>
          <div className="absolute bottom-2 start-2 flex gap-1">
            <PartnerTags tags={p.tags} />
          </div>
          {!p.is_open && <div className="absolute inset-0 flex items-center justify-center bg-ink-950/50 text-sm font-bold text-white">{t("closed")}</div>}
        </PartnerCover>
        <div className="flex gap-3 p-3">
          <PartnerLogo p={p} size={44} className="-mt-8 ring-4 ring-white" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="truncate font-bold">{L(p, "name")}</h3>
              <span className="flex shrink-0 items-center gap-0.5 text-xs font-bold">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {num(p.rating, 1)}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-ink-500">
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{p.express_hours}–{p.eta_hours} {t("hour_short")}</span>
              <span>•</span>
              <span className="flex items-center gap-1"><Bike className="h-3.5 w-3.5" />{fee}</span>
            </div>
          </div>
        </div>
      </Link>
    );
  return (
    <Link href={`/laundry/${p.id}`} className="flex gap-3 px-4 py-3 transition hover:bg-ink-50 active:bg-ink-100">
      <div className="relative">
        <PartnerLogo p={p} size={72} />
        {!p.is_open && <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-ink-950/55 text-[11px] font-bold text-white">{t("closed")}</div>}
      </div>
      <div className="min-w-0 flex-1 border-b border-ink-100 pb-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate font-bold text-ink-900">{L(p, "name")}</h3>
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-xs font-bold text-amber-700">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            {num(p.rating, 1)}
            <span className="font-medium text-amber-600/70">({p.rating_count > 999 ? "1k+" : p.rating_count})</span>
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs text-ink-500">
          {L(p, "area")}
          {p.distance_km != null && <> • {num(p.distance_km, 1)} {t("km")}</>}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-600">
          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-ink-400" />{t("ready_in")} {p.eta_hours} {t("hour_short")}</span>
          <span className={cx("flex items-center gap-1", (p.delivery_fee === 0 || me?.member?.benefits?.free_delivery) && "font-semibold text-emerald-600")}><Bike className="h-3.5 w-3.5 text-ink-400" />{fee}</span>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1">
          <PartnerTags tags={p.tags} max={3} />
        </div>
      </div>
    </Link>
  );
}

// ------------------------------------------------------------- addresses

export function AddressSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, me, refreshMe } = useApp();
  const [adding, setAdding] = useState(false);
  const router = useRouter();
  const addresses: any[] = me?.addresses || [];
  useEffect(() => {
    if (open) setAdding(!addresses.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  if (!me?.user)
    return (
      <Sheet open={open} onClose={onClose} title={t("deliver_to")}>
        <p className="mb-4 text-sm text-ink-500">{t("login_sub")}</p>
        <Button block onClick={() => router.push("/login")}>{t("verify")}</Button>
      </Sheet>
    );
  const choose = async (id: number) => {
    await api(`/api/addresses/${id}`, { method: "PATCH", body: { is_default: true } });
    refreshMe();
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title={adding ? t("add_address") : t("deliver_to")}>
      {adding ? (
        <AddressForm
          onDone={() => {
            refreshMe();
            setAdding(false);
            onClose();
          }}
        />
      ) : (
        <div className="space-y-2">
          {addresses.map((a) => (
            <button key={a.id} onClick={() => choose(a.id)} className={cx("flex w-full items-center gap-3 rounded-2xl border p-3 text-start transition", a.is_default ? "border-brand-500 bg-brand-50/60" : "border-ink-100 hover:bg-ink-50")}>
              <AddressIcon label={a.label} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold">{t(`label_${a.label}` as any)}</div>
                <div className="truncate text-xs text-ink-500">{[a.area, a.street, a.building].filter(Boolean).join("، ")}</div>
              </div>
              {a.is_default ? <Check className="h-5 w-5 text-brand-600" /> : null}
            </button>
          ))}
          <Button variant="secondary" block onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> {t("add_address")}
          </Button>
        </div>
      )}
    </Sheet>
  );
}

export function AddressIcon({ label }: { label: string }) {
  const I = label === "work" ? Briefcase : label === "home" ? Home : Building2;
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink-100 text-ink-700">
      <I className="h-5 w-5" />
    </span>
  );
}

export function AddressForm({ onDone }: { onDone: () => void }) {
  const { t, settings, lang } = useApp();
  const toast = useToast();
  const [label, setLabel] = useState<"home" | "work" | "other">("home");
  const [pos, setPos] = useState<[number, number]>([settings.map_lat, settings.map_lng]);
  const [f, setF] = useState({ area: "", street: "", building: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const locate = () =>
    navigator.geolocation?.getCurrentPosition(
      (p) => setPos([p.coords.latitude, p.coords.longitude]),
      () => toast(lang === "ar" ? "تعذر تحديد موقعك" : "Couldn't get your location", "error"),
    );
  const save = async () => {
    if (!f.area.trim()) return toast(t("area") + " ✱", "error");
    setBusy(true);
    try {
      await api("/api/addresses", { body: { label, ...f, lat: pos[0], lng: pos[1], is_default: true } });
      toast(t("saved"));
      onDone();
    } catch (e) {
      toast(errText(e, lang), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl">
        <MapView key={pos.join()} className="h-48 w-full" center={pos} zoom={15} fit={false} markers={[{ id: "pin", lat: pos[0], lng: pos[1], kind: "home", pulse: true }]} onPick={(la, ln) => setPos([la, ln])} />
        <button onClick={locate} className="absolute bottom-3 start-3 z-[500] flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold shadow-lift">
          <Crosshair className="h-4 w-4 text-brand-600" /> {t("use_my_location")}
        </button>
        <div className="pointer-events-none absolute top-3 start-3 z-[500] rounded-full bg-ink-900/80 px-3 py-1 text-[11px] font-semibold text-white">
          <MapPin className="me-1 inline h-3 w-3" /> {t("pin_location")}
        </div>
      </div>
      <Segmented
        value={label}
        onChange={setLabel}
        className="w-full [&>button]:flex-1"
        options={[
          { value: "home", label: t("label_home") },
          { value: "work", label: t("label_work") },
          { value: "other", label: t("label_other") },
        ]}
      />
      <Input label={t("area")} value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })} placeholder={lang === "ar" ? "مثال: المنصور" : "e.g. Al-Mansour"} />
      <div className="grid grid-cols-2 gap-3">
        <Input label={t("street")} value={f.street} onChange={(e) => setF({ ...f, street: e.target.value })} />
        <Input label={t("building")} value={f.building} onChange={(e) => setF({ ...f, building: e.target.value })} />
      </div>
      <Input label={`${t("details")} (${t("optional")})`} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
      <Button block size="lg" loading={busy} onClick={save}>
        {t("save")}
      </Button>
    </div>
  );
}

export function useActiveOrders() {
  const { me } = useApp();
  const { data } = useSWR(me?.user ? "/api/orders" : null, { refreshInterval: 5000 });
  const orders: any[] = data?.orders || [];
  return orders.filter((o) => !["delivered", "cancelled"].includes(o.status));
}
