"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Droplets, Loader2, Plus, Sparkles, Wand2, Zap, Clock, Check } from "lucide-react";
import { useApp, useCart, useToast, type CartLine, type CartPartner } from "@/components/providers";
import { Button, Sheet, cx } from "@/components/ui";
import { api, errText } from "@/lib/client";

export type Insight = {
  is_garment: boolean;
  garment_ar: string; garment_en: string;
  fabric_ar: string; fabric_en: string;
  stains: { ar: string; en: string; severity: "light" | "medium" | "heavy" }[];
  warnings: { ar: string; en: string }[];
  product_id: number | null;
  quantity: number;
  note_ar: string; note_en: string;
};

/** Hand-off from the text assistant to checkout (pickup time, express, notes). */
export const AI_HINT_KEY = "nuqa_ai_hint";

export function AiBadge({ className }: { className?: string }) {
  const { t } = useApp();
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-violet-600 to-brand-600 px-2 py-0.5 text-[10px] font-extrabold text-white", className)}>
      <Sparkles className="h-3 w-3" /> {t("ai_badge")}
    </span>
  );
}

const SEV: Record<string, string> = { light: "bg-amber-50 text-amber-800 ring-amber-200", medium: "bg-orange-50 text-orange-800 ring-orange-200", heavy: "bg-red-50 text-red-700 ring-red-200" };

/** What the AI saw in one photo. */
export function InsightCard({ insight: x, photo, action, compact }: { insight: Insight; photo?: string; action?: React.ReactNode; compact?: boolean }) {
  const { t, L, lang } = useApp();
  const tr = (o: { ar: string; en: string }) => (lang === "ar" ? o.ar : o.en) || o.ar || o.en;
  if (!x.is_garment) return null;
  return (
    <div className={cx("flex gap-3 rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/70 to-white", compact ? "p-2" : "p-3")}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {photo && <img src={photo} alt="" className={cx("shrink-0 rounded-xl object-cover", compact ? "h-12 w-12" : "h-16 w-16")} />}
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-extrabold text-ink-900">{x.quantity > 1 ? `${x.quantity}× ` : ""}{L(x, "garment")}</span>
          {L(x, "fabric") && <span className="text-[11px] text-ink-500">· {L(x, "fabric")}</span>}
        </div>
        <div className="flex flex-wrap gap-1">
          {x.stains.map((s, i) => (
            <span key={`s${i}`} className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1", SEV[s.severity])}><Droplets className="h-3 w-3" /> {tr(s)}</span>
          ))}
          {x.warnings.map((w, i) => (
            <span key={`w${i}`} className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700 ring-1 ring-rose-200"><AlertTriangle className="h-3 w-3" /> {tr(w)}</span>
          ))}
          {!x.stains.length && !x.warnings.length && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700"><Check className="h-3 w-3" /> {t("ai_clean")}</span>}
        </div>
        {!compact && L(x, "note") && <p className="text-xs leading-5 text-ink-600">💡 {L(x, "note")}</p>}
        {action}
      </div>
    </div>
  );
}

/** Insights for an order's photos (laundry, admin and customer views). */
export function OrderInsights({ photos, insights, compact }: { photos: string[]; insights?: (Insight | null)[]; compact?: boolean }) {
  const { t } = useApp();
  const list = (insights || []).map((x, i) => ({ x, photo: photos[i] })).filter((r) => r.x && r.x.is_garment) as { x: Insight; photo: string }[];
  if (!list.length) return null;
  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2 text-[11px] font-bold text-violet-700"><AiBadge /> {t("ai_insights")}</div>
      {list.map((r) => <InsightCard key={r.photo} insight={r.x} photo={r.photo} compact={compact} />)}
    </div>
  );
}

type Product = { id: number; name_ar: string; name_en: string; icon: string; price: number; unit: string; service_id: number };

/** "Order by text": the customer writes what they have, the assistant fills the basket. */
export function AiOrderSheet({ open, onClose, partner, products, services }: { open: boolean; onClose: () => void; partner: CartPartner; products: Product[]; services: any[] }) {
  const { t, L, lang, money, num } = useApp();
  const cart = useCart();
  const toast = useToast();
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<any>(null);

  const lineOf = (p: Product, qty: number): CartLine => {
    const s = services.find((x) => x.id === p.service_id);
    return { product_id: p.id, qty, name_ar: p.name_ar, name_en: p.name_en, icon: p.icon, price: p.price, unit: p.unit, service_ar: s?.name_ar || "", service_en: s?.name_en || "" };
  };
  const run = async () => {
    setBusy(true);
    setDraft(null);
    try {
      const r = await api<{ draft: any }>("/api/ai/order", { body: { text, partner_id: partner.id } });
      setDraft(r.draft);
    } catch (e) {
      toast(errText(e, lang), "error");
    } finally {
      setBusy(false);
    }
  };
  const add = () => {
    const lines: CartLine[] = draft.items
      .map((i: any) => {
        const p = products.find((x) => x.id === i.product_id);
        return p ? lineOf(p, i.qty) : null;
      })
      .filter(Boolean);
    const same = cart.partner?.id === partner.id;
    const merged = new Map<number, CartLine>(same ? Object.values(cart.lines).map((l) => [l.product_id, l]) : []);
    for (const l of lines) merged.set(l.product_id, { ...l, qty: (merged.get(l.product_id)?.qty || 0) + l.qty });
    cart.replace(partner, [...merged.values()]);
    try {
      sessionStorage.setItem(AI_HINT_KEY, JSON.stringify({ partner_id: partner.id, express: draft.express, pickup_day: draft.pickup_day, pickup_hour: draft.pickup_hour, notes: draft.notes }));
    } catch {}
    onClose();
    setDraft(null);
    setText("");
    router.push("/cart");
  };
  const total = draft ? draft.items.reduce((a: number, i: any) => a + (products.find((p) => p.id === i.product_id)?.price || 0) * i.qty, 0) : 0;
  const dayLabel: Record<string, string> = { today: t("today"), tomorrow: t("tomorrow"), after_tomorrow: lang === "ar" ? "عكب باچر" : "Day after tomorrow" };

  return (
    <Sheet open={open} onClose={onClose} title={<span className="flex items-center gap-2"><Wand2 className="h-5 w-5 text-violet-600" /> {t("ai_order")} <AiBadge /></span>}>
      <p className="mb-3 text-sm text-ink-500">{t("ai_order_sub")}</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        maxLength={600}
        placeholder={t("ai_order_ph")}
        className="w-full resize-none rounded-2xl border border-ink-200 p-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
      />
      <Button block className="mt-3 bg-gradient-to-r from-violet-600 to-brand-600" loading={busy} disabled={text.trim().length < 2} onClick={run}>
        <Sparkles className="h-4 w-4" /> {t("ai_order_go")}
      </Button>
      {busy && (
        <div className="mt-4 space-y-2">
          {[0, 1, 2].map((i) => <div key={i} className="shimmer h-12 rounded-xl bg-ink-100" />)}
        </div>
      )}
      {draft && (
        <div className="mt-4 space-y-3 animate-fade-up">
          {L(draft, "reply") && <div className="rounded-2xl bg-violet-50 p-3 text-sm font-semibold text-violet-900">✨ {L(draft, "reply")}</div>}
          {draft.items.length ? (
            <div className="divide-y divide-ink-100 rounded-2xl border border-ink-100">
              {draft.items.map((i: any) => {
                const p = products.find((x) => x.id === i.product_id);
                if (!p) return null;
                return (
                  <div key={i.product_id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                    <span className="text-xl">{p.icon}</span>
                    <span className="min-w-0 flex-1"><span className="font-bold">{L(p, "name")}</span> <span className="text-xs text-ink-400">{L(services.find((s) => s.id === p.service_id), "name")}</span></span>
                    <span className="font-extrabold text-brand-700">{num(i.qty)}×</span>
                    <span className="w-20 text-end text-xs text-ink-500">{money(p.price * i.qty)}</span>
                  </div>
                );
              })}
              <div className="flex justify-between px-3 py-2.5 text-sm font-extrabold"><span>{t("subtotal")}</span><span>{money(total)}</span></div>
            </div>
          ) : (
            <div className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">{t("ai_order_none")}</div>
          )}
          <div className="flex flex-wrap gap-2 text-xs font-bold">
            {draft.pickup_day && <span className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2.5 py-1"><Clock className="h-3.5 w-3.5" /> {t("ai_pickup_hint")}: {dayLabel[draft.pickup_day]}{draft.pickup_hour != null ? ` · ${String(draft.pickup_hour).padStart(2, "0")}:00` : ""}</span>}
            {draft.express && <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-amber-900"><Zap className="h-3.5 w-3.5" /> {t("ai_express_hint")}</span>}
            {draft.notes && <span className="rounded-full bg-ink-100 px-2.5 py-1">📝 {draft.notes}</span>}
          </div>
          {draft.unmatched?.length > 0 && <p className="text-xs text-ink-500">{t("ai_unmatched")}: {draft.unmatched.join("، ")}</p>}
          {draft.items.length > 0 && <Button block onClick={add}><Plus className="h-4 w-4" /> {t("ai_order_add")}</Button>}
        </div>
      )}
    </Sheet>
  );
}

/** Checkout: analyse each newly added photo and offer to add the suggested item. */
export function useCheckoutInsights(partnerId?: number) {
  const { lang } = useApp();
  const toast = useToast();
  const [map, setMap] = useState<Record<string, Insight | "busy" | "err">>({});
  const analyze = async (photos: string[]) => {
    const todo = photos.filter((p) => !map[p]);
    if (!todo.length) return;
    setMap((m) => ({ ...m, ...Object.fromEntries(todo.map((p) => [p, "busy" as const])) }));
    for (const p of todo) {
      try {
        const r = await api<{ insight: Insight }>("/api/ai/photo", { body: { photo: p, partner_id: partnerId } });
        setMap((m) => ({ ...m, [p]: r.insight }));
      } catch (e) {
        setMap((m) => ({ ...m, [p]: "err" }));
        toast(errText(e, lang), "error");
        break;
      }
    }
  };
  return { map, analyze };
}

export function AnalyzingChip() {
  const { t } = useApp();
  return <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700"><Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("ai_analyzing")}</span>;
}
