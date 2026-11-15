import { useState } from "react";
import { ActivityIndicator, Image, Pressable, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { api } from "./api";
import { useCart, type CartLine } from "./cart";
import { errText, useI18n } from "./i18n";
import { useSource } from "./photos";
import { useToast } from "./toast";
import { C } from "./theme";
import { Btn, Icon, Sheet, Txt } from "./ui";

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

const VIOLET = "#7C3AED";
/** Hand-off from "order by text" to checkout (pickup time, express, notes). */
export let aiHint: null | { partner_id: number; express: boolean; pickup_day: string; pickup_hour: number | null; notes: string } = null;
export const takeAiHint = (partnerId: number) => {
  if (!aiHint || aiHint.partner_id !== partnerId) return null;
  const h = aiHint;
  aiHint = null;
  return h;
};

export function AiBadge() {
  const { t } = useI18n();
  return (
    <LinearGradient colors={[VIOLET, C.brand]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flexDirection: "row", alignItems: "center", gap: 3, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, alignSelf: "flex-start" }}>
      <Icon name="sparkles" size={11} color="#fff" />
      <Txt w="bold" size={10} color="#fff">{t("ai_badge")}</Txt>
    </LinearGradient>
  );
}

const SEV: Record<string, [string, string]> = { light: ["#FFFBEB", "#92400E"], medium: ["#FFF7ED", "#9A3412"], heavy: ["#FEF2F2", "#B91C1C"] };
function Chip({ icon, text, bg, color }: { icon: any; text: string; bg: string; color: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: bg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Icon name={icon} size={11} color={color} />
      <Txt w="bold" size={11} color={color}>{text}</Txt>
    </View>
  );
}

export function InsightCard({ insight: x, photo, action, compact }: { insight: Insight; photo?: string; action?: React.ReactNode; compact?: boolean }) {
  const { t, L, lang } = useI18n();
  const src = useSource();
  if (!x.is_garment) return null;
  const tr = (o: { ar: string; en: string }) => (lang === "ar" ? o.ar : o.en) || o.ar || o.en;
  return (
    <View style={{ flexDirection: "row", gap: 10, borderWidth: 1, borderColor: "#EDE9FE", backgroundColor: "#FAF8FF", borderRadius: 16, padding: compact ? 8 : 10 }}>
      {photo ? <Image source={src(photo)} style={{ width: compact ? 46 : 60, height: compact ? 46 : 60, borderRadius: 12 }} /> : null}
      <View style={{ flex: 1, gap: 6 }}>
        <Txt w="bold" size={14}>{x.quantity > 1 ? `${x.quantity}× ` : ""}{L(x, "garment")}{L(x, "fabric") ? <Txt size={12} color={C.ink500}>  · {L(x, "fabric")}</Txt> : null}</Txt>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
          {x.stains.map((s, i) => <Chip key={`s${i}`} icon="water" text={tr(s)} bg={SEV[s.severity][0]} color={SEV[s.severity][1]} />)}
          {x.warnings.map((w, i) => <Chip key={`w${i}`} icon="warning" text={tr(w)} bg="#FFF1F2" color="#BE123C" />)}
          {!x.stains.length && !x.warnings.length ? <Chip icon="checkmark" text={t("ai_clean")} bg={C.greenSoft} color={C.green} /> : null}
        </View>
        {!compact && L(x, "note") ? <Txt size={12} color={C.ink700}>💡 {L(x, "note")}</Txt> : null}
        {action}
      </View>
    </View>
  );
}

/** Analysis of an order's photos (order screen). */
export function OrderInsights({ photos, insights, compact }: { photos?: string[]; insights?: (Insight | null)[]; compact?: boolean }) {
  const { t } = useI18n();
  const list = (insights || []).map((x, i) => ({ x, photo: photos?.[i] })).filter((r) => r.x && r.x.is_garment) as { x: Insight; photo?: string }[];
  if (!list.length) return null;
  return (
    <View style={{ gap: 8, marginTop: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><AiBadge /><Txt w="bold" size={12} color={VIOLET}>{t("ai_insights")}</Txt></View>
      {list.map((r, i) => <InsightCard key={i} insight={r.x} photo={r.photo} compact={compact} />)}
    </View>
  );
}

/** Checkout: analyse each newly added photo once. */
export function useCheckoutInsights(partnerId?: number) {
  const { lang, money } = useI18n();
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
        toast(errText(e, lang, money), "error");
        break;
      }
    }
  };
  return { map, analyze };
}

export function Analyzing({ photo }: { photo: string }) {
  const { t } = useI18n();
  const src = useSource();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: "#EDE9FE", borderRadius: 16, padding: 8 }}>
      <Image source={src(photo)} style={{ width: 46, height: 46, borderRadius: 12 }} />
      <ActivityIndicator color={VIOLET} />
      <Txt w="bold" size={12} color={VIOLET}>{t("ai_analyzing")}</Txt>
    </View>
  );
}

/** "Order by text" button + sheet for a laundry's menu. */
export function AiOrderButton({ partner, products, services }: { partner: any; products: any[]; services: any[] }) {
  const { t, L, lang, money, num } = useI18n();
  const cart = useCart();
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<any>(null);
  const svc = (id: number) => services.find((s) => s.id === id);

  const run = async () => {
    setBusy(true);
    setDraft(null);
    try {
      setDraft((await api<{ draft: any }>("/api/ai/order", { body: { text, partner_id: partner.id } })).draft);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) {
      toast(errText(e, lang, money), "error");
    } finally {
      setBusy(false);
    }
  };
  const add = () => {
    const merged = new Map<number, CartLine>(cart.partner?.id === partner.id ? Object.values(cart.lines).map((l) => [l.product_id, l]) : []);
    for (const i of draft.items) {
      const x = products.find((p) => p.id === i.product_id);
      if (!x) continue;
      const prev = merged.get(x.id)?.qty || 0;
      merged.set(x.id, { product_id: x.id, qty: prev + i.qty, name_ar: x.name_ar, name_en: x.name_en, icon: x.icon, price: x.price, service_ar: svc(x.service_id)?.name_ar || "", service_en: svc(x.service_id)?.name_en || "" });
    }
    cart.replace(partner, [...merged.values()]);
    aiHint = { partner_id: partner.id, express: draft.express, pickup_day: draft.pickup_day, pickup_hour: draft.pickup_hour, notes: draft.notes };
    setOpen(false);
    setDraft(null);
    setText("");
    router.push("/cart");
  };
  const total = draft ? draft.items.reduce((a: number, i: any) => a + (products.find((p) => p.id === i.product_id)?.price || 0) * i.qty, 0) : 0;
  const dayLabel: Record<string, string> = { today: t("today"), tomorrow: t("tomorrow"), after_tomorrow: lang === "ar" ? "عكب باچر" : "Day after tomorrow" };

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={{ marginHorizontal: 16, marginTop: 14 }}>
        <LinearGradient colors={[VIOLET, C.brand]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 18, padding: 14 }}>
          <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: "rgba(255,255,255,.18)", alignItems: "center", justifyContent: "center" }}><Icon name="sparkles" size={20} color="#fff" /></View>
          <View style={{ flex: 1 }}>
            <Txt w="bold" color="#fff">{t("ai_order")}</Txt>
            <Txt size={12} color="rgba(255,255,255,.85)">{t("ai_order_sub")}</Txt>
          </View>
          <Icon name={lang === "ar" ? "chevron-back" : "chevron-forward"} size={18} color="#fff" />
        </LinearGradient>
      </Pressable>
      <Sheet open={open} onClose={() => setOpen(false)} title={`✨ ${t("ai_order")}`}>
        <View style={{ gap: 12 }}>
          <TextInput
            value={text}
            onChangeText={setText}
            multiline
            maxLength={600}
            placeholder={t("ai_order_ph")}
            placeholderTextColor={C.ink400}
            style={{ minHeight: 90, borderRadius: 16, borderWidth: 1, borderColor: C.ink200, padding: 12, textAlignVertical: "top", textAlign: lang === "ar" ? "right" : "left", color: C.ink900, fontSize: 15 }}
          />
          <Btn title={t("ai_order_go")} icon="sparkles" loading={busy} disabled={text.trim().length < 2} onPress={run} />
          {draft ? (
            <View style={{ gap: 10 }}>
              {L(draft, "reply") ? <View style={{ backgroundColor: "#F5F3FF", borderRadius: 14, padding: 12 }}><Txt w="semibold" color="#4C1D95">✨ {L(draft, "reply")}</Txt></View> : null}
              {draft.items.length ? (
                <View style={{ borderWidth: 1, borderColor: C.ink100, borderRadius: 16 }}>
                  {draft.items.map((i: any) => {
                    const x = products.find((p) => p.id === i.product_id);
                    if (!x) return null;
                    return (
                      <View key={i.product_id} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.ink100 }}>
                        <Txt size={20}>{x.icon}</Txt>
                        <View style={{ flex: 1 }}><Txt w="bold" size={13}>{L(x, "name")}</Txt><Txt size={11} color={C.ink400}>{L(svc(x.service_id), "name")}</Txt></View>
                        <Txt w="bold" color={C.brand}>{num(i.qty)}×</Txt>
                        <Txt size={12} color={C.ink500}>{money(x.price * i.qty)}</Txt>
                      </View>
                    );
                  })}
                  <View style={{ flexDirection: "row", justifyContent: "space-between", padding: 12 }}><Txt w="bold">{t("subtotal")}</Txt><Txt w="bold">{money(total)}</Txt></View>
                </View>
              ) : (
                <View style={{ backgroundColor: C.amberSoft, borderRadius: 14, padding: 12 }}><Txt size={13} color={C.amber}>{t("ai_order_none")}</Txt></View>
              )}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {draft.pickup_day ? <Chip icon="time-outline" text={`${t("ai_pickup_hint")}: ${dayLabel[draft.pickup_day]}${draft.pickup_hour != null ? ` · ${String(draft.pickup_hour).padStart(2, "0")}:00` : ""}`} bg={C.ink100} color={C.ink700} /> : null}
                {draft.express ? <Chip icon="flash" text={t("ai_express_hint")} bg={C.amberSoft} color={C.amber} /> : null}
                {draft.notes ? <Chip icon="document-text-outline" text={draft.notes} bg={C.ink100} color={C.ink700} /> : null}
              </View>
              {draft.unmatched?.length ? <Txt size={12} color={C.ink500}>{t("ai_unmatched")}: {draft.unmatched.join("، ")}</Txt> : null}
              {draft.items.length ? <Btn title={t("ai_order_add")} icon="basket-outline" onPress={add} /> : null}
            </View>
          ) : null}
        </View>
      </Sheet>
    </>
  );
}
