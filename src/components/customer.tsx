"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";
import {
  Home, ReceiptText, TicketPercent, UserRound, Star, Clock, Bike, MapPin, Check, Plus, Crosshair, Zap, Leaf, Crown, BadgePercent,
  ChevronLeft, ChevronRight, Building2, Briefcase, LayoutDashboard, Store, Truck,
} from "lucide-react";
import { useApp, useCart, useToast } from "./providers";
import { Button, Input, PartnerCover, PartnerLogo, Segmented, Sheet, cx, Logo } from "./ui";
import { MapView } from "./map-view";
import { api, errText } from "@/lib/client";

// ------------------------------------------------------------- shell

export function CustomerShell({ children }: { children: React.ReactNode }) {
  const { t, lang } = useApp();
  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_600px_at_80%_-10%,#D9EBFF_0%,transparent_60%),radial-gradient(900px_500px_at_-10%_110%,#E0F2FE_0%,transparent_60%)] bg-ink-50">
      {/* desktop showcase panel */}
      <aside className="fixed inset-y-0 start-0 hidden w-[calc(50%-230px)] flex-col justify-between p-10 xl:flex">
        <Logo />
        <div className="max-w-md">
          <h1 className="text-4xl font-extrabold leading-tight text-ink-900">{lang === "ar" ? "ملابسك نظيفة… بدون ما تطلع من البيت" : "Fresh clothes, without leaving home"}</h1>
          <p className="mt-4 text-lg text-ink-500">{t("tagline")}</p>
          <div className="mt-8 grid grid-cols-3 gap-3 text-center">
            {[
              ["+9", lang === "ar" ? "مغاسل شريكة" : "partner laundries"],
              ["45", lang === "ar" ? "دقيقة للاستلام" : "min pickup"],
              ["4.8★", lang === "ar" ? "تقييم الزبائن" : "customer rating"],
            ].map(([a, b]) => (
              <div key={b} className="rounded-2xl bg-white/70 p-4 shadow-soft backdrop-blur">
                <div className="text-2xl font-extrabold text-brand-700" dir="ltr">{a}</div>
                <div className="mt-1 text-xs text-ink-500">{b}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="text-xs text-ink-400">© {new Date().getFullYear()} Nuqa</div>
      </aside>
      <aside className="fixed inset-y-0 end-0 hidden w-[calc(50%-230px)] flex-col items-end justify-center gap-3 p-10 xl:flex">
        <div className="w-64 rounded-3xl bg-white/80 p-5 shadow-soft backdrop-blur">
          <div className="mb-3 text-sm font-bold text-ink-800">{t("switch_panel")}</div>
          {[
            ["/admin", t("role_admin"), LayoutDashboard],
            ["/partner", t("role_partner"), Store],
            ["/driver", t("role_driver"), Truck],
          ].map(([href, label, I]: any) => (
            <Link key={href} href={href} className="mb-1.5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-700 hover:bg-brand-50 hover:text-brand-700">
              <I className="h-4 w-4" /> {label}
            </Link>
          ))}
        </div>
      </aside>

      <div className="relative mx-auto min-h-screen max-w-[460px] bg-white shadow-[0_0_60px_rgba(16,24,40,.08)]">{children}</div>
    </div>
  );
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
      <div className="h-20" />
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[460px] border-t border-ink-100 bg-white/95 backdrop-blur">
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
    <header className={cx("sticky top-0 z-30 flex h-14 items-center gap-2 px-3", transparent ? "" : "border-b border-ink-100 bg-white/95 backdrop-blur")}>
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
    <div className="mb-3 flex items-end justify-between px-4">
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

export function PartnerCard({ p, variant = "row" }: { p: any; variant?: "row" | "wide" }) {
  const { L, t, money, num } = useApp();
  const fee = p.delivery_fee === 0 ? t("free") : money(p.delivery_fee);
  if (variant === "wide")
    return (
      <Link href={`/laundry/${p.id}`} className="block w-[270px] shrink-0 overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft transition active:scale-[.99]">
        <PartnerCover p={p} className="h-28">
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
          <span className={cx("flex items-center gap-1", p.delivery_fee === 0 && "font-semibold text-emerald-600")}><Bike className="h-3.5 w-3.5 text-ink-400" />{fee}</span>
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
