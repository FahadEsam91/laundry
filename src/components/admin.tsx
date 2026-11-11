"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, ReceiptText, Store, Bike, Users, Tags, TicketPercent, Settings, Menu, X, Languages, LogOut, ExternalLink, TrendingUp, TrendingDown,
} from "lucide-react";
import { useApp } from "./providers";
import { Logo, cx } from "./ui";
import { api } from "@/lib/client";

export function PanelShell({
  nav,
  title,
  children,
  badge,
}: {
  nav: { href: string; label: string; icon: any; exact?: boolean; count?: number }[];
  title: string;
  children: React.ReactNode;
  badge?: React.ReactNode;
}) {
  const { t, lang, setLang, me, refreshMe } = useApp();
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const logout = async () => {
    await api("/api/auth/logout", { body: {} });
    refreshMe();
    router.push("/login");
  };
  const Side = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between px-5">
        <Link href="/"><Logo /></Link>
        <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="close"><X className="h-5 w-5" /></button>
      </div>
      <div className="px-5 pb-3"><span className="rounded-md bg-brand-50 px-2 py-1 text-[11px] font-bold text-brand-700">{title}</span></div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {nav.map((n) => {
          const on = n.exact ? path === n.href : path.startsWith(n.href);
          return (
            <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className={cx("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition", on ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-ink-100 hover:text-ink-900")}>
              <n.icon className="h-[18px] w-[18px]" />
              <span className="flex-1">{n.label}</span>
              {!!n.count && <span className={cx("rounded-full px-2 text-[11px] font-bold", on ? "bg-white/20" : "bg-red-500 text-white")}>{n.count}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-ink-100 p-3">
        <Link href="/" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-ink-600 hover:bg-ink-100"><ExternalLink className="h-4 w-4" /> {lang === "ar" ? "تطبيق الزبون" : "Customer app"}</Link>
        <button onClick={() => setLang(lang === "ar" ? "en" : "ar")} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-ink-600 hover:bg-ink-100"><Languages className="h-4 w-4" /> {t("switch_lang")}</button>
        <div className="mt-2 flex items-center gap-3 rounded-xl bg-ink-50 p-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">{me?.user?.name?.slice(0, 1)}</span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold">{me?.user?.name}</div>
            <div className="truncate text-[11px] text-ink-500" dir="ltr">{me?.user?.phone}</div>
          </div>
          <button onClick={logout} className="rounded-lg p-1.5 text-ink-500 hover:bg-white hover:text-red-600" aria-label={t("logout")}><LogOut className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  );
  return (
    <div className="min-h-screen bg-ink-50">
      <aside className="fixed inset-y-0 start-0 z-40 hidden w-64 border-e border-ink-100 bg-white lg:block">{Side}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink-950/40" onClick={() => setOpen(false)} />
          <aside className="animate-fade-up absolute inset-y-0 start-0 w-72 bg-white shadow-lift">{Side}</aside>
        </div>
      )}
      <div className="lg:ps-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-ink-100 bg-white/90 px-4 backdrop-blur lg:px-8">
          <button className="rounded-lg p-2 hover:bg-ink-100 lg:hidden" onClick={() => setOpen(true)} aria-label="menu"><Menu className="h-5 w-5" /></button>
          <div className="flex-1 text-sm font-semibold text-ink-500">{nav.find((n) => (n.exact ? path === n.href : path.startsWith(n.href)))?.label}</div>
          {badge}
        </header>
        <main className="mx-auto max-w-[1400px] p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { t } = useApp();
  return (
    <PanelShell
      title={t("dashboard")}
      badge={<LiveBadge />}
      nav={[
        { href: "/admin", label: t("overview"), icon: LayoutDashboard, exact: true },
        { href: "/admin/orders", label: t("orders"), icon: ReceiptText },
        { href: "/admin/partners", label: t("partners"), icon: Store },
        { href: "/admin/drivers", label: t("drivers"), icon: Bike },
        { href: "/admin/customers", label: t("customers"), icon: Users },
        { href: "/admin/catalog", label: t("catalog"), icon: Tags },
        { href: "/admin/promos", label: t("promos"), icon: TicketPercent },
        { href: "/admin/settings", label: t("settings"), icon: Settings },
      ]}
    >
      {children}
    </PanelShell>
  );
}

export function LiveBadge() {
  const { t } = useApp();
  return (
    <span className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
      <span className="relative flex h-2 w-2"><span className="absolute inset-0 animate-ping rounded-full bg-emerald-400" /><span className="relative h-2 w-2 rounded-full bg-emerald-500" /></span>
      {t("live")}
    </span>
  );
}

export function PageHead({ title, sub, actions }: { title: string; sub?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">{title}</h1>
        {sub && <p className="mt-1 text-sm text-ink-500">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Kpi({ label, value, delta, icon: I, invert, hint, accent = "#1A62EC" }: { label: string; value: string; delta?: number; icon: any; invert?: boolean; hint?: string; accent?: string }) {
  const good = delta === undefined ? null : invert ? delta <= 0 : delta >= 0;
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between">
        <span className="text-sm font-semibold text-ink-500">{label}</span>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: `${accent}12`, color: accent }}><I className="h-[18px] w-[18px]" /></span>
      </div>
      <div className="mt-2 text-2xl font-extrabold tracking-tight text-ink-900 tabular">{value}</div>
      <div className="mt-1 flex items-center gap-1.5 text-xs">
        {delta !== undefined && Number.isFinite(delta) && (
          <span className={cx("inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-bold", good ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600")}>
            {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span dir="ltr">{delta >= 0 ? "+" : ""}{delta.toFixed(1)}%</span>
          </span>
        )}
        {hint && <span className="text-ink-400">{hint}</span>}
      </div>
    </div>
  );
}

export function Panel({ title, sub, action, children, className, bodyClass }: { title?: React.ReactNode; sub?: string; action?: React.ReactNode; children: React.ReactNode; className?: string; bodyClass?: string }) {
  return (
    <section className={cx("rounded-2xl border border-ink-100 bg-white shadow-soft", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 px-5 pt-5">
          <div>
            <h2 className="font-bold text-ink-900">{title}</h2>
            {sub && <p className="text-xs text-ink-500">{sub}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={cx("p-5", bodyClass)}>{children}</div>
    </section>
  );
}

export function Table({ head, children, className }: { head: React.ReactNode[]; children: React.ReactNode; className?: string }) {
  return (
    <div className={cx("overflow-x-auto", className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-ink-100 text-xs font-semibold text-ink-500">
            {head.map((h, i) => (
              <th key={i} className="whitespace-nowrap px-4 py-3 text-start font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">{children}</tbody>
      </table>
    </div>
  );
}

export const Td = ({ children, className, ...rest }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cx("whitespace-nowrap px-4 py-3", className)} {...rest}>{children}</td>
);

export function Pager({ page, size, total, onPage }: { page: number; size: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / size));
  return (
    <div className="flex items-center justify-between border-t border-ink-100 px-4 py-3 text-sm text-ink-500">
      <span className="tabular">{Math.min(total, (page - 1) * size + 1)}–{Math.min(total, page * size)} / {total}</span>
      <div className="flex gap-1">
        <button disabled={page <= 1} onClick={() => onPage(page - 1)} className="rounded-lg border border-ink-200 px-3 py-1.5 font-semibold disabled:opacity-40">‹</button>
        <span className="px-2 py-1.5 font-bold text-ink-800">{page} / {pages}</span>
        <button disabled={page >= pages} onClick={() => onPage(page + 1)} className="rounded-lg border border-ink-200 px-3 py-1.5 font-semibold disabled:opacity-40">›</button>
      </div>
    </div>
  );
}
