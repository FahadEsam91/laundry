"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Wallet, MapPin, Bell, Languages, Headphones, LogOut, ChevronLeft, ChevronRight, Award, Crown, LayoutDashboard, Store, Truck, Heart, ReceiptText, Info, UserRound } from "lucide-react";
import { useApp, useCart } from "@/components/providers";
import { BottomNav } from "@/components/customer";
import { Button, Empty, LogoMark } from "@/components/ui";
import { api } from "@/lib/client";
import { PushCard } from "@/components/push";
import { PlusBadge } from "@/components/plus";

export default function AccountPage() {
  const { t, me, money, num, lang, setLang, fmtDate, settings, refreshMe, dir } = useApp();
  const router = useRouter();
  const cart = useCart();
  const Chevron = dir === "rtl" ? ChevronLeft : ChevronRight;
  const u = me?.user;

  const logout = async () => {
    await api("/api/auth/logout", { body: {} });
    cart.clear();
    refreshMe();
    router.push("/");
  };

  const Row = ({ icon: I, label, href, onClick, right }: any) => {
    const inner = (
      <span className="flex items-center gap-3 px-4 py-3.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink-100 text-ink-700"><I className="h-[18px] w-[18px]" /></span>
        <span className="flex-1 text-sm font-semibold">{label}</span>
        {right}
        <Chevron className="h-4 w-4 text-ink-300" />
      </span>
    );
    return href ? <Link href={href} className="block hover:bg-ink-50">{inner}</Link> : <button onClick={onClick} className="block w-full text-start hover:bg-ink-50">{inner}</button>;
  };

  return (
    <div className="bg-ink-50">
      {u ? (
        <>
          <header className="bg-white px-4 pb-5 pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-2xl font-extrabold text-white">{u.name.slice(0, 1)}</div>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-xl font-extrabold">{u.name}</h1>
                <p className="text-sm text-ink-500" dir="ltr">{u.phone}</p>
                <p className="text-xs text-ink-400">{t("member_since")} {fmtDate(u.created_at, { month: "long", year: "numeric" })}</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              <Link href="/account/wallet" className="rounded-2xl bg-brand-50 p-3">
                <Wallet className="h-5 w-5 text-brand-600" />
                <div className="mt-2 text-sm font-extrabold">{money(u.wallet)}</div>
                <div className="text-[11px] text-ink-500">{t("wallet")}</div>
              </Link>
              <div className="rounded-2xl bg-amber-50 p-3">
                <Award className="h-5 w-5 text-amber-600" />
                <div className="mt-2 text-sm font-extrabold">{num(u.points)}</div>
                <div className="text-[11px] text-ink-500">{t("points")}</div>
              </div>
              <Link href="/orders" className="rounded-2xl bg-emerald-50 p-3">
                <ReceiptText className="h-5 w-5 text-emerald-600" />
                <div className="mt-2 text-sm font-extrabold">{num(me?.stats?.orders || 0)}</div>
                <div className="text-[11px] text-ink-500">{t("orders")}</div>
              </Link>
            </div>
          </header>
          <div className="mt-2 divide-y divide-ink-100 bg-white">
            <Row icon={Crown} label={t("plus_title")} href="/plus" right={me.member ? <PlusBadge /> : <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-extrabold text-amber-950">{t("plus_cta")}</span>} />
            <Row icon={MapPin} label={t("addresses")} href="/account/addresses" right={<span className="text-xs text-ink-400">{me.addresses.length}</span>} />
            <Row icon={Wallet} label={t("wallet")} href="/account/wallet" />
            <Row icon={Bell} label={t("notifications")} href="/notifications" right={me.unread ? <span className="rounded-full bg-red-500 px-2 text-[11px] font-bold text-white">{me.unread}</span> : null} />
            <Row icon={Heart} label={t("favorites")} href="/search" right={<span className="text-xs text-ink-400">{me.favorites.length}</span>} />
          </div>
        </>
      ) : (
        <div className="bg-white">
          <Empty icon={<UserRound className="h-9 w-9" />} title={t("login_title")} sub={t("login_sub")} action={<Link href="/login?next=/account"><Button>{t("verify")}</Button></Link>} />
        </div>
      )}

      {u && (
        <div className="mt-2 bg-white">
          <PushCard />
        </div>
      )}

      <div className="mt-2 divide-y divide-ink-100 bg-white">
        <Row icon={Languages} label={t("language")} onClick={() => setLang(lang === "ar" ? "en" : "ar")} right={<span className="text-xs font-bold text-brand-600">{lang === "ar" ? "العربية" : "English"}</span>} />
        <Row icon={Headphones} label={t("support")} onClick={() => (location.href = `tel:${settings.support_phone}`)} right={<span className="text-xs text-ink-400" dir="ltr">{settings.support_phone}</span>} />
        <Row icon={Info} label={t("about")} onClick={() => {}} right={<span className="text-xs text-ink-400">v1.0</span>} />
      </div>

      <div className="mt-2 bg-white p-4">
        <div className="mb-2 text-xs font-bold uppercase text-ink-400">{t("switch_panel")}</div>
        <div className="grid grid-cols-3 gap-2">
          {[
            ["/admin", t("role_admin"), LayoutDashboard],
            ["/partner", t("role_partner"), Store],
            ["/driver", t("role_driver"), Truck],
          ].map(([href, label, I]: any) => (
            <Link key={href} href={href} className="flex flex-col items-center gap-1.5 rounded-2xl border border-ink-100 p-3 text-center text-[11px] font-bold hover:bg-ink-50">
              <I className="h-5 w-5 text-brand-600" /> {label}
            </Link>
          ))}
        </div>
      </div>

      {u && (
        <div className="p-4">
          <Button variant="danger" block onClick={logout}><LogOut className="h-4 w-4" /> {t("logout")}</Button>
        </div>
      )}
      <div className="flex items-center justify-center gap-2 pb-6 pt-2 text-xs text-ink-400">
        <LogoMark className="h-5 w-5" /> Nuqa © {new Date().getFullYear()}
      </div>
      <BottomNav />
    </div>
  );
}
