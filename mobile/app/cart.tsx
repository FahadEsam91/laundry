import { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useSWR from "swr";
import { computeTotals, type Promo } from "@shared/pricing";
import { api } from "@/api";
import { useAuth } from "@/auth";
import { useCart } from "@/cart";
import { useI18n, errText } from "@/i18n";
import { useToast } from "@/toast";
import { C } from "@/theme";
import { Btn, Choice, Empty, Header, Icon, Input, PartnerLogo, Section, Stepper, Txt } from "@/ui";

function slots(lang: string) {
  const out: { value: string; day: number; label: string }[] = [];
  const now = new Date();
  const f = new Intl.DateTimeFormat(lang === "ar" ? "ar-IQ-u-nu-latn" : "en-GB", { hour: "numeric", minute: "2-digit" });
  for (let d = 0; d < 3; d++)
    for (let h = 8; h <= 21; h += 2) {
      const s = new Date(now);
      s.setDate(now.getDate() + d);
      s.setHours(h, 0, 0, 0);
      if (s.getTime() < now.getTime() + 3600000) continue;
      out.push({ value: s.toISOString(), day: d, label: `${f.format(s)} – ${f.format(new Date(s.getTime() + 7200000))}` });
    }
  return out;
}

export default function Cart() {
  const { t, L, money, lang, settings, fmtDate } = useI18n();
  const { me, token, refreshMe } = useAuth();
  const cart = useCart();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [express, setExpress] = useState(false);
  const [day, setDay] = useState<number | "now">("now");
  const [slot, setSlot] = useState("asap");
  const [notes, setNotes] = useState("");
  const [promoText, setPromoText] = useState("");
  const [promo, setPromo] = useState<Promo | null>(null);
  const [pay, setPay] = useState<"cash" | "card_pos" | "card" | "wallet">("cash");
  const [busy, setBusy] = useState<string | null>(null);
  const allSlots = useMemo(() => slots(lang), [lang]);
  const { data: plans } = useSWR(me?.member ? null : "/api/plans");

  const p = cart.partner;
  const lines = Object.values(cart.lines);
  if (!p || !lines.length)
    return (
      <View style={{ flex: 1, backgroundColor: C.white }}>
        <Header title={t("basket")} />
        <Empty icon="basket-outline" title={t("empty_basket")} sub={t("empty_basket_sub")} action={<Btn title={t("browse")} onPress={() => router.replace("/home")} />} />
      </View>
    );

  const member = me?.member;
  const s = { service_fee: settings.service_fee ?? 500, express_pct: settings.express_pct ?? 50, vat_pct: settings.vat_pct ?? 0, free_delivery_over: settings.free_delivery_over ?? 0 };
  const totals = computeTotals(cart.subtotal, p.delivery_fee, express, s, promo, member?.benefits);
  const up = (plans?.plans || []).find((x: any) => x.popular);
  const upSave = up ? totals.total - computeTotals(cart.subtotal, p.delivery_fee, express, s, promo, { free_delivery: up.free_deliveries !== 0, discount_pct: up.discount_pct, no_service_fee: !!up.no_service_fee, express_discount_pct: up.express_discount_pct }).total : 0;
  const addr = me?.addresses?.find((a: any) => a.is_default) || me?.addresses?.[0];
  const wallet = me?.user?.wallet || 0;
  const belowMin = cart.subtotal < p.min_order;
  const pickup = slot === "asap" ? new Date(Date.now() + 45 * 60000) : new Date(slot);
  const ready = new Date(pickup.getTime() + (express ? p.express_hours : p.eta_hours) * 3600000);

  const applyPromo = async () => {
    if (!token) return router.push({ pathname: "/login", params: { next: "/cart" } });
    setBusy("promo");
    try {
      setPromo((await api("/api/promos/validate", { body: { code: promoText, subtotal: cart.subtotal } })).promo);
      toast(t("promo_applied"));
    } catch (e) {
      toast(errText(e, lang, money), "error");
    } finally {
      setBusy(null);
    }
  };
  const place = async () => {
    if (!token) return router.push({ pathname: "/login", params: { next: "/cart" } });
    if (!addr) return router.push("/addresses/new");
    setBusy("place");
    try {
      const r = await api("/api/orders", { body: { partner_id: p.id, items: lines.map((l) => ({ product_id: l.product_id, qty: l.qty })), express, address_id: addr.id, pickup_slot: slot, notes, payment_method: pay, promo_code: promo?.code || null } });
      cart.clear();
      refreshMe();
      router.replace({ pathname: "/order/[id]", params: { id: String(r.id), placed: "1" } });
    } catch (e) {
      toast(errText(e, lang, money), "error");
      setBusy(null);
    }
  };
  const Line = ({ k, v, green }: { k: string; v: string; green?: boolean }) => (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
      <Txt color={C.ink500}>{k}</Txt>
      <Txt w="semibold" color={green ? C.green : C.ink900}>{v}</Txt>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.ink50 }}>
      <Header title={t("checkout")} />
      <ScrollView contentContainerStyle={{ paddingBottom: 130 }} keyboardShouldPersistTaps="handled">
        <Section>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <PartnerLogo p={p} size={40} />
            <View style={{ flex: 1 }}><Txt w="bold">{L(p, "name")}</Txt><Txt size={12} color={C.ink500}>{cart.count} {t("items")}</Txt></View>
            <Pressable onPress={() => router.push(`/laundry/${p.id}`)} style={{ backgroundColor: C.brandSoft, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}><Txt w="bold" size={12} color={C.brandDark}>+ {t("add_more")}</Txt></Pressable>
          </View>
          {lines.map((l) => (
            <View key={l.product_id} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.ink100 }}>
              <Txt size={24}>{l.icon}</Txt>
              <View style={{ flex: 1 }}>
                <Txt w="semibold" numberOfLines={1}>{L(l, "name")}</Txt>
                <Txt size={12} color={C.ink500}>{L(l, "service")} • {money(l.price)}</Txt>
              </View>
              <View style={{ alignItems: "flex-end", gap: 4 }}>
                <Stepper small qty={l.qty} onChange={(n) => cart.setQty(p, l, n)} />
                <Txt w="bold" size={12}>{money(l.qty * l.price)}</Txt>
              </View>
            </View>
          ))}
          {belowMin && <View style={{ backgroundColor: C.amberSoft, borderRadius: 12, padding: 10, marginTop: 6 }}><Txt w="semibold" size={12} color={C.amber}>{t("min_order_gap", { x: money(p.min_order) })}</Txt></View>}
          {totals.freeDeliveryGap > 0 && <View style={{ backgroundColor: C.greenSoft, borderRadius: 12, padding: 10, marginTop: 6 }}><Txt w="semibold" size={12} color="#065F46">{t("free_delivery_gap", { x: money(totals.freeDeliveryGap) })}</Txt></View>}
        </Section>

        {member ? (
          totals.subSavings > 0 && <View style={{ margin: 16, marginBottom: 0, backgroundColor: "#FEF3C7", borderRadius: 16, padding: 12, flexDirection: "row", gap: 8, alignItems: "center" }}><Icon name="diamond" size={18} color="#B45309" /><Txt w="bold" size={13} color="#78350F" style={{ flex: 1 }}>{t("member_savings_line", { x: money(totals.subSavings), p: L(member.plan, "name") })}</Txt></View>
        ) : upSave > 0 ? (
          <Pressable onPress={() => router.push("/plus")} style={{ margin: 16, marginBottom: 0, backgroundColor: C.ink900, borderRadius: 16, padding: 12, flexDirection: "row", gap: 10, alignItems: "center" }}>
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: C.gold, alignItems: "center", justifyContent: "center" }}><Icon name="diamond" size={18} color="#422006" /></View>
            <Txt w="semibold" size={13} color="#fff" style={{ flex: 1 }}>{t("upsell_plus", { x: money(upSave) })}</Txt>
          </Pressable>
        ) : null}

        <Section title={t("service_speed")}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[false, true].map((v) => (
              <Choice key={String(v)} selected={express === v} onPress={() => setExpress(v)} style={{ flex: 1 }}>
                <Icon name={v ? "flash" : "time-outline"} size={20} color={v ? "#F59E0B" : C.ink400} />
                <Txt w="bold" style={{ marginTop: 6 }}>{v ? t("express") : t("standard")}</Txt>
                <Txt size={12} color={C.ink500}>{t("ready_in")} {v ? p.express_hours : p.eta_hours} {t("hour_short")}{v ? `  +${s.express_pct}%` : ""}</Txt>
              </Choice>
            ))}
          </View>
        </Section>

        <Section title={t("pickup_time")}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {(["now", 0, 1, 2] as const).map((d) => (
              <Pressable key={String(d)} onPress={() => { setDay(d); setSlot(d === "now" ? "asap" : allSlots.find((x) => x.day === d)?.value || "asap"); }} style={{ height: 40, paddingHorizontal: 16, borderRadius: 12, justifyContent: "center", borderWidth: 1, borderColor: day === d ? C.ink900 : C.ink200, backgroundColor: day === d ? C.ink900 : C.white }}>
                <Txt w="bold" size={13} color={day === d ? "#fff" : C.ink700}>{d === "now" ? (lang === "ar" ? "⚡ الآن" : "⚡ Now") : d === 0 ? t("today") : d === 1 ? t("tomorrow") : fmtDate(new Date(Date.now() + 2 * 86400000).toISOString(), { weekday: "long" })}</Txt>
              </Pressable>
            ))}
          </ScrollView>
          {day === "now" ? <Txt color={C.ink500} style={{ marginTop: 10 }}>{t("asap")}</Txt> : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              {allSlots.filter((x) => x.day === day).map((x) => (
                <Pressable key={x.value} onPress={() => setSlot(x.value)} style={{ width: "48%", height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: slot === x.value ? C.brand : C.ink200, backgroundColor: slot === x.value ? C.brandSoft : C.white }}>
                  <Txt w="semibold" size={13} color={slot === x.value ? C.brandDark : C.ink700}>{x.label}</Txt>
                </Pressable>
              ))}
            </View>
          )}
          <View style={{ marginTop: 10, backgroundColor: C.ink50, borderRadius: 12, padding: 10, flexDirection: "row", gap: 6, alignItems: "center" }}>
            <Icon name="car-outline" size={16} color={C.brand} />
            <Txt size={12} color={C.ink700}>{t("est_delivery")}: <Txt w="bold" size={12}>{fmtDate(ready.toISOString(), { weekday: "short", hour: "numeric", minute: "2-digit" })}</Txt></Txt>
          </View>
        </Section>

        <Section title={t("address")}>
          {addr ? (
            <Pressable onPress={() => router.push("/addresses")} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.ink100, alignItems: "center", justifyContent: "center" }}><Icon name={addr.label === "work" ? "briefcase-outline" : "home-outline"} size={20} color={C.ink700} /></View>
              <View style={{ flex: 1 }}><Txt w="bold">{t(`label_${addr.label}` as any)}</Txt><Txt size={12} color={C.ink500} numberOfLines={1}>{[addr.area, addr.street, addr.building].filter(Boolean).join("، ")}</Txt></View>
              <Txt w="semibold" color={C.brand}>{t("change")}</Txt>
            </Pressable>
          ) : (
            <Btn title={t("add_address")} variant="outline" icon="location-outline" onPress={() => (token ? router.push("/addresses/new") : router.push({ pathname: "/login", params: { next: "/cart" } }))} />
          )}
          <View style={{ marginTop: 12 }}><Input value={notes} onChangeText={setNotes} placeholder={t("notes_ph")} multiline style={{ height: 70, textAlignVertical: "top", paddingTop: 12 }} /></View>
        </Section>

        <Section title={t("promo_code")}>
          {promo ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.greenSoft, borderRadius: 14, padding: 12 }}>
              <Icon name="pricetag" size={18} color={C.green} />
              <View style={{ flex: 1 }}><Txt w="bold" color="#065F46">{promo.code}</Txt><Txt size={12} color="#047857">{L(promo, "title")}</Txt></View>
              <Pressable onPress={() => setPromo(null)}><Txt w="bold" size={12} color={C.red}>{t("remove")}</Txt></Pressable>
            </View>
          ) : (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}><Input value={promoText} onChangeText={(v) => setPromoText(v.toUpperCase())} placeholder="WELCOME50" autoCapitalize="characters" icon="pricetag-outline" /></View>
              <Btn title={t("apply")} variant="dark" loading={busy === "promo"} disabled={!promoText} onPress={applyPromo} />
            </View>
          )}
        </Section>

        <Section title={t("payment")}>
          {([
            ["cash", "cash-outline", t("pay_cash"), t("pay_cash_sub"), true],
            ["card_pos", "card-outline", t("pay_card_pos"), t("pay_card_pos_sub"), true],
            ["card", "card-outline", t("pay_card"), "Visa • Mastercard", !!settings.online_payments],
            ["wallet", "wallet-outline", t("pay_wallet"), `${t("balance")}: ${money(wallet)}`, wallet > 0 || !!settings.online_payments],
          ] as const).filter((o) => o[4]).map(([v, ic, label, sub]) => (
            <Choice key={v} selected={pay === v} onPress={() => setPay(v)} style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.ink100, alignItems: "center", justifyContent: "center" }}><Icon name={ic} size={20} color={C.ink700} /></View>
              <View style={{ flex: 1 }}><Txt w="bold">{label}</Txt>{sub ? <Txt size={12} color={v === "wallet" && wallet < totals.total ? C.red : C.ink500}>{sub}</Txt> : null}</View>
              <Icon name={pay === v ? "radio-button-on" : "radio-button-off"} size={22} color={pay === v ? C.brand : C.ink300} />
            </Choice>
          ))}
          {pay === "card" && <Txt size={11} color={C.ink400}>{t("card_note")}</Txt>}
        </Section>

        <Section title={t("summary")}>
          <Line k={t("subtotal")} v={money(totals.subtotal)} />
          <Line k={t("delivery_fee")} v={totals.deliveryFee ? money(totals.deliveryFee) : t("free")} green={!totals.deliveryFee} />
          {totals.expressFee > 0 && <Line k={t("express_fee")} v={money(totals.expressFee)} />}
          <Line k={t("service_fee")} v={totals.serviceFee ? money(totals.serviceFee) : t("free")} green={!totals.serviceFee} />
          {totals.memberDiscount > 0 && <Line k={`👑 ${t("member_discount")}`} v={`- ${money(totals.memberDiscount)}`} green />}
          {totals.discount > 0 && <Line k={t("discount")} v={`- ${money(totals.discount)}`} green />}
          {totals.vat > 0 && <Line k={t("vat")} v={money(totals.vat)} />}
          <View style={{ flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: C.ink100, paddingTop: 10, marginTop: 6 }}>
            <Txt w="bold" size={17}>{t("total")}</Txt>
            <Txt w="bold" size={17}>{money(totals.total)}</Txt>
          </View>
        </Section>
      </ScrollView>
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.ink100, padding: 16, paddingBottom: insets.bottom + 12 }}>
        <Btn title={token ? t("place_order") : t("verify")} right={money(totals.total)} size="lg" loading={busy === "place"} disabled={belowMin || (pay === "wallet" && wallet < totals.total)} onPress={place} />
      </View>
    </View>
  );
}
