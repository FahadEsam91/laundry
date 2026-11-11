"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import useSWR, { SWRConfig } from "swr";
import { useRouter } from "next/navigation";
import { fetcher } from "@/lib/client";
import { registerSW, syncPushLang } from "@/lib/push-client";
import { translate, pickLang, type Lang, type TKey } from "@/lib/i18n";
import { STATUS_META, type OrderStatus } from "@/lib/constants";

export type Service = { id: number; slug: string; name_ar: string; name_en: string; desc_ar: string; desc_en: string; icon: string; color: string };
export type AppSettings = Record<string, any>;

type Ctx = {
  lang: Lang;
  dir: "rtl" | "ltr";
  setLang: (l: Lang) => void;
  t: (k: TKey, v?: Record<string, string | number>) => string;
  L: (obj: any, field: string) => string;
  money: (n: number, opts?: { sign?: boolean }) => string;
  num: (n: number, d?: number) => string;
  fmtDate: (iso: string, o?: Intl.DateTimeFormatOptions) => string;
  statusLabel: (s: string) => string;
  settings: AppSettings;
  services: Service[];
  me: any;
  refreshMe: () => void;
};

const AppCtx = createContext<Ctx | null>(null);

export function useApp() {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp outside provider");
  return c;
}

export function Providers({ children, lang: initialLang, settings, services }: { children: React.ReactNode; lang: Lang; settings: AppSettings; services: Service[] }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const router = useRouter();
  const { data: me, mutate } = useSWR("/api/me", fetcher, { revalidateOnFocus: true });

  const setLang = useCallback(
    (l: Lang) => {
      document.cookie = `nuqa_lang=${l};path=/;max-age=31536000`;
      document.documentElement.lang = l;
      document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
      setLangState(l);
      syncPushLang(l);
      router.refresh();
    },
    [router],
  );

  useEffect(() => {
    registerSW(); // enables push + "Add to Home Screen" install
  }, []);

  const value = useMemo<Ctx>(() => {
    const nf = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
    const cur = lang === "ar" ? settings.currency_ar : settings.currency_en;
    const locale = lang === "ar" ? "ar-IQ-u-nu-latn" : "en-GB";
    return {
      lang,
      dir: lang === "ar" ? "rtl" : "ltr",
      setLang,
      t: (k, v) => translate(lang, k, v),
      L: (o, f) => pickLang(lang, o, f),
      money: (n, o) => `${o?.sign && n > 0 ? "+" : ""}${nf.format(Math.round(n || 0))} ${cur}`,
      num: (n, d = 0) => new Intl.NumberFormat("en-US", { maximumFractionDigits: d, minimumFractionDigits: d }).format(n || 0),
      fmtDate: (iso, o) => new Intl.DateTimeFormat(locale, o || { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: settings.timezone || undefined }).format(new Date(iso)),
      statusLabel: (s) => (STATUS_META as any)[s]?.[lang] ?? s,
      settings,
      services,
      me,
      refreshMe: () => mutate(),
    };
  }, [lang, settings, services, me, mutate, setLang]);

  return (
    <SWRConfig value={{ fetcher, revalidateOnFocus: false }}>
      <AppCtx.Provider value={value}>
        <CartProvider>
          <ToastProvider>{children}</ToastProvider>
        </CartProvider>
      </AppCtx.Provider>
    </SWRConfig>
  );
}

export const statusTone = (s: string) => (STATUS_META as any)[s as OrderStatus]?.tone || "gray";

// ------------------------------------------------------------------ cart

export type CartPartner = { id: number; name_ar: string; name_en: string; color: string; color2: string; initials: string; delivery_fee: number; min_order: number; eta_hours: number; express_hours: number; is_open: number };
export type CartLine = { product_id: number; qty: number; name_ar: string; name_en: string; icon: string; price: number; unit: string; service_ar: string; service_en: string };
type CartState = { partner: CartPartner | null; lines: Record<number, CartLine> };
type CartCtx = CartState & {
  count: number;
  subtotal: number;
  setQty: (partner: CartPartner, line: Omit<CartLine, "qty">, qty: number) => boolean;
  clear: () => void;
  replace: (partner: CartPartner, lines: CartLine[]) => void;
};
const CartC = createContext<CartCtx | null>(null);
export const useCart = () => useContext(CartC)!;

function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CartState>({ partner: null, lines: {} });
  useEffect(() => {
    try {
      const raw = localStorage.getItem("nuqa_cart");
      if (raw) setState(JSON.parse(raw));
    } catch {}
  }, []);
  const persist = (s: CartState) => {
    setState(s);
    try {
      localStorage.setItem("nuqa_cart", JSON.stringify(s));
    } catch {}
  };
  const lines = Object.values(state.lines);
  const value: CartCtx = {
    ...state,
    count: lines.reduce((a, l) => a + l.qty, 0),
    subtotal: lines.reduce((a, l) => a + l.qty * l.price, 0),
    setQty: (partner, line, qty) => {
      if (state.partner && state.partner.id !== partner.id && lines.length) return false;
      const next = { ...state.lines };
      if (qty <= 0) delete next[line.product_id];
      else next[line.product_id] = { ...line, qty };
      persist({ partner: Object.keys(next).length ? partner : null, lines: next });
      return true;
    },
    clear: () => persist({ partner: null, lines: {} }),
    replace: (partner, ls) => persist({ partner, lines: Object.fromEntries(ls.map((l) => [l.product_id, l])) }),
  };
  return <CartC.Provider value={value}>{children}</CartC.Provider>;
}

// ------------------------------------------------------------------ toasts

type Toast = { id: number; text: string; kind: "success" | "error" | "info" };
const ToastC = createContext<(text: string, kind?: Toast["kind"]) => void>(() => {});
export const useToast = () => useContext(ToastC);

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, kind: Toast["kind"] = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);
  return (
    <ToastC.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-fade-up pointer-events-auto rounded-2xl px-4 py-3 text-sm font-medium shadow-lift ${
              t.kind === "error" ? "bg-red-600 text-white" : t.kind === "info" ? "bg-ink-900 text-white" : "bg-emerald-600 text-white"
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastC.Provider>
  );
}

/** Staff permission check for the dashboard UI (the server enforces the same rules). */
export function useCan() {
  const { me } = useApp();
  const perms: string[] = me?.user?.permissions || [];
  return (p: string) => perms.includes(p);
}

export function usePickLang() {
  return useApp().L;
}
