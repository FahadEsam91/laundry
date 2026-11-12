"use client";

import { forwardRef, useEffect } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import {
  Shirt, Wind, Sparkles, WashingMachine, Footprints, BedDouble, Layers, Blinds, Scissors, Star, X, Loader2, Package,
  type LucideIcon,
} from "lucide-react";
import { TONE_CLASSES } from "@/lib/constants";
import { statusTone, useApp } from "./providers";

export const cx = clsx;

// ------------------------------------------------------------- icons
const SERVICE_ICONS: Record<string, LucideIcon> = {
  shirt: Shirt, wind: Wind, sparkles: Sparkles, "washing-machine": WashingMachine, footprints: Footprints,
  "bed-double": BedDouble, layers: Layers, blinds: Blinds, scissors: Scissors,
};
export function ServiceIcon({ name, className }: { name: string; className?: string }) {
  const I = SERVICE_ICONS[name] || Package;
  return <I className={className} />;
}

// ------------------------------------------------------------- button
type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline" | "success" | "dark";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  block?: boolean;
};
export const Button = forwardRef<HTMLButtonElement, BtnProps>(function Button(
  { variant = "primary", size = "md", loading, block, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cx(
        "inline-flex select-none items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" && "h-9 px-3 text-sm",
        size === "md" && "h-11 px-4 text-sm",
        size === "lg" && "h-14 px-6 text-base",
        block && "w-full",
        variant === "primary" && "bg-brand-600 text-white shadow-glow hover:bg-brand-700",
        variant === "secondary" && "bg-brand-50 text-brand-700 hover:bg-brand-100",
        variant === "ghost" && "text-ink-700 hover:bg-ink-100",
        variant === "outline" && "border border-ink-200 bg-white text-ink-800 hover:bg-ink-50",
        variant === "danger" && "bg-red-50 text-red-600 hover:bg-red-100",
        variant === "success" && "bg-emerald-600 text-white hover:bg-emerald-700",
        variant === "dark" && "bg-ink-900 text-white hover:bg-ink-800",
        className,
      )}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
});

// ------------------------------------------------------------- inputs
export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string; icon?: React.ReactNode }>(
  function Input({ label, hint, icon, className, ...rest }, ref) {
    return (
      <label className="block">
        {label && <span className="mb-1.5 block text-xs font-semibold text-ink-600">{label}</span>}
        <span className="relative block">
          {icon && <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-ink-400">{icon}</span>}
          <input
            ref={ref}
            className={cx(
              "h-11 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10",
              icon && "ps-10",
              className,
            )}
            {...rest}
          />
        </span>
        {hint && <span className="mt-1 block text-xs text-ink-500">{hint}</span>}
      </label>
    );
  },
);

export function Select({ label, className, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-xs font-semibold text-ink-600">{label}</span>}
      <select
        className={cx("h-11 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-900 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10", className)}
        {...rest}
      >
        {children}
      </select>
    </label>
  );
}

export function Textarea({ label, className, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-xs font-semibold text-ink-600">{label}</span>}
      <textarea
        className={cx("min-h-[84px] w-full rounded-xl border border-ink-200 bg-white p-3 text-sm outline-none placeholder:text-ink-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10", className)}
        {...rest}
      />
    </label>
  );
}

export function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx("relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50", checked ? "bg-brand-600" : "bg-ink-300")}
    >
      <span className={cx("inline-block h-5 w-5 rounded-full bg-white shadow transition", checked ? "translate-x-[22px] rtl:-translate-x-[22px]" : "translate-x-0.5 rtl:-translate-x-0.5")} />
    </button>
  );
}

// ------------------------------------------------------------- surfaces
export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx("rounded-2xl border border-ink-100 bg-white shadow-soft", className)} {...rest}>
      {children}
    </div>
  );
}

export function Badge({ tone = "gray", className, children }: { tone?: string; className?: string; children: React.ReactNode }) {
  return <span className={cx("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset", TONE_CLASSES[tone] || TONE_CLASSES.gray, className)}>{children}</span>;
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const { statusLabel } = useApp();
  return (
    <Badge tone={statusTone(status)} className={className}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {statusLabel(status)}
    </Badge>
  );
}

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} style={{ width: size, height: size }} className={i <= Math.round(value) ? "fill-amber-400 text-amber-400" : "fill-ink-200 text-ink-200"} />
      ))}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cx("h-5 w-5 animate-spin text-brand-600", className)} />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-xl bg-ink-100", className)} />;
}

export function Empty({ icon, title, sub, action }: { icon?: React.ReactNode; title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-brand-50 text-brand-600">{icon}</div>
      <h3 className="text-base font-bold text-ink-900">{title}</h3>
      {sub && <p className="mt-1 max-w-xs text-sm text-ink-500">{sub}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PartnerLogo({ p, size = 48, className }: { p: { color: string; color2: string; initials: string; logo_url?: string | null }; size?: number; className?: string }) {
  if (p.logo_url)
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={p.logo_url} alt="" width={size} height={size} loading="lazy" className={cx("relative shrink-0 rounded-2xl bg-white object-cover shadow-sm", className)} style={{ width: size, height: size }} />
    );
  return (
    <div
      className={cx("relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl font-extrabold tracking-tight text-white shadow-sm", className)}
      style={{ width: size, height: size, fontSize: size * 0.34, background: `linear-gradient(135deg, ${p.color}, ${p.color2})` }}
    >
      <svg className="absolute inset-0 h-full w-full opacity-25" viewBox="0 0 40 40" aria-hidden>
        <circle cx="34" cy="6" r="9" fill="white" />
        <circle cx="4" cy="36" r="6" fill="white" />
      </svg>
      <span className="relative" dir="ltr">{p.initials}</span>
    </div>
  );
}

export function PartnerCover({ p, className, children }: { p: { color: string; color2: string; cover_url?: string | null }; className?: string; children?: React.ReactNode }) {
  if (p.cover_url)
    return (
      <div className={cx("relative overflow-hidden bg-ink-100", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.cover_url} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/10" />
        {children}
      </div>
    );
  return (
    <div className={cx("relative overflow-hidden", className)} style={{ background: `linear-gradient(120deg, ${p.color} 0%, ${p.color2} 100%)` }}>
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 400 200" aria-hidden>
        <g fill="white" opacity=".14">
          <circle cx="340" cy="40" r="60" />
          <circle cx="60" cy="190" r="70" />
          <circle cx="250" cy="150" r="22" />
          <circle cx="120" cy="40" r="12" />
          <circle cx="300" cy="120" r="8" />
        </g>
        <g fill="none" stroke="white" strokeOpacity=".18" strokeWidth="2">
          <circle cx="340" cy="40" r="80" />
          <circle cx="60" cy="190" r="92" />
        </g>
      </svg>
      {children}
    </div>
  );
}

// ------------------------------------------------------------- modal / sheet
export function Sheet({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title?: React.ReactNode; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", k);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
  if (!open || typeof document === "undefined") return null;
  // Portal to <body>: an animated (transformed) page wrapper would otherwise become the containing block of this
  // fixed overlay, so in Safari the dialog was centred inside the tall page, off-screen, leaving only a blurred page.
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-ink-950/50 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className={cx(
          "animate-slide-up relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-lift sm:animate-fade-up sm:rounded-3xl",
          wide ? "sm:max-w-3xl" : "sm:max-w-lg",
        )}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ink-100 bg-white/95 px-5 py-4 backdrop-blur">
          <h3 className="text-base font-bold text-ink-900">{title}</h3>
          <button onClick={onClose} className="rounded-full p-1.5 text-ink-500 hover:bg-ink-100" aria-label="close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function QtyStepper({ qty, onChange, small }: { qty: number; onChange: (q: number) => void; small?: boolean }) {
  const s = small ? "h-7 w-7 text-base" : "h-9 w-9 text-lg";
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-brand-50 p-0.5">
      <button className={cx(s, "flex items-center justify-center rounded-full bg-white font-bold text-brand-700 shadow-sm active:scale-90")} onClick={() => onChange(qty - 1)} aria-label="minus">
        −
      </button>
      <span className={cx("min-w-[1.75rem] text-center font-bold text-brand-800", small ? "text-sm" : "text-base")}>{qty}</span>
      <button className={cx(s, "flex items-center justify-center rounded-full bg-brand-600 font-bold text-white shadow-sm active:scale-90")} onClick={() => onChange(qty + 1)} aria-label="plus">
        +
      </button>
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: React.ReactNode }[]; className?: string }) {
  return (
    <div className={cx("inline-flex rounded-xl bg-ink-100 p-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cx("rounded-lg px-3 py-1.5 text-sm font-semibold transition", value === o.value ? "bg-white text-ink-900 shadow-sm" : "text-ink-500 hover:text-ink-800")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  const { lang } = useApp();
  return (
    <span className={cx("inline-flex items-center gap-2", className)}>
      <LogoMark className="h-8 w-8" />
      <span className={cx("text-xl font-extrabold tracking-tight", light ? "text-white" : "text-ink-900")}>{lang === "ar" ? "نقاء" : "Nuqa"}</span>
    </span>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <defs>
        <linearGradient id="nq-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#56A3FD" />
          <stop offset="1" stopColor="#144DD8" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill="url(#nq-g)" />
      <path d="M24 9c-5.5 7.2-9.5 12.6-9.5 17.6a9.5 9.5 0 0 0 19 0C33.5 21.6 29.5 16.2 24 9Z" fill="white" />
      <path d="M19.5 27.5a4.5 4.5 0 0 0 4.5 4.5" stroke="#1A62EC" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <circle cx="36" cy="12" r="3" fill="white" opacity=".8" />
      <circle cx="40" cy="19" r="1.6" fill="white" opacity=".6" />
    </svg>
  );
}
