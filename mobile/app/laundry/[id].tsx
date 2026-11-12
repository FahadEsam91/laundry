import { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, View } from "react-native";
import { mediaUrl } from "@/config";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import useSWR from "swr";
import { UNIT_LABEL } from "@shared/constants";
import { useI18n } from "@/i18n";
import { useCart } from "@/cart";
import { C, shadow } from "@/theme";
import { Btn, Header, Icon, Loading, PartnerLogo, Sheet, Stepper, Txt } from "@/ui";

export default function Laundry() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, L, money, num, lang } = useI18n();
  const cart = useCart();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data } = useSWR(`/api/partners/${id}`);
  const [tab, setTab] = useState<number | null>(null);
  const [conflict, setConflict] = useState<{ x: any; qty: number } | null>(null);
  const services: any[] = data?.services || [];
  const products: any[] = data?.products || [];
  const activeTab = tab ?? services[0]?.id;
  const items = useMemo(() => products.filter((x) => x.service_id === activeTab), [products, activeTab]);
  if (!data) return <Loading />;
  const p = data.partner;
  const svcOf = (sid: number) => services.find((s) => s.id === sid);
  const line = (x: any) => ({ product_id: x.id, name_ar: x.name_ar, name_en: x.name_en, icon: x.icon, price: x.price, service_ar: svcOf(x.service_id)?.name_ar || "", service_en: svcOf(x.service_id)?.name_en || "" });
  const qtyOf = (pid: number) => (cart.partner?.id === p.id ? cart.lines[pid]?.qty || 0 : 0);
  const setQty = (x: any, n: number) => {
    Haptics.selectionAsync().catch(() => {});
    if (!cart.setQty(p, line(x), n)) setConflict({ x, qty: n });
  };
  const inCart = cart.partner?.id === p.id && cart.count > 0;

  return (
    <View style={{ flex: 1, backgroundColor: C.white }}>
      <ScrollView stickyHeaderIndices={[2]} contentContainerStyle={{ paddingBottom: 120 }}>
        <LinearGradient colors={[p.color, p.color2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 190 }}>
          <View style={{ position: "absolute", width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(255,255,255,.12)", top: -60, end: -40 }} />
          {p.cover_url ? <Image source={{ uri: mediaUrl(p.cover_url)! }} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} resizeMode="cover" /> : null}
          <Header transparent />
        </LinearGradient>
        <View style={{ marginTop: -40, marginHorizontal: 16, backgroundColor: C.white, borderRadius: 24, padding: 16, ...shadow, shadowOpacity: 0.12 }}>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ marginTop: -40, borderWidth: 4, borderColor: "#fff", borderRadius: 22 }}><PartnerLogo p={p} size={64} /></View>
            <View style={{ flex: 1 }}>
              <Txt w="bold" size={20}>{L(p, "name")}</Txt>
              <Txt size={13} color={C.ink500}>{L(p, "desc")}</Txt>
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
            <View style={{ backgroundColor: C.amberSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}><Txt w="bold" size={12} color={C.amber}>★ {num(p.rating, 1)} ({num(p.rating_count)})</Txt></View>
            <View style={{ backgroundColor: C.ink100, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}><Txt w="semibold" size={12} color={C.ink700}>{L(p, "area")}</Txt></View>
          </View>
          <View style={{ flexDirection: "row", marginTop: 14, backgroundColor: C.ink50, borderRadius: 16, paddingVertical: 10 }}>
            {[
              ["time-outline", `${p.eta_hours} ${t("hour_short")}`, t("ready_in")],
              ["flash-outline", `${p.express_hours} ${t("hour_short")}`, t("express")],
              ["bicycle-outline", p.delivery_fee ? money(p.delivery_fee) : t("free"), `${t("min_order")} ${money(p.min_order)}`],
            ].map(([ic, v, l], i) => (
              <View key={i} style={{ flex: 1, alignItems: "center" }}>
                <Icon name={ic as any} size={16} color={C.ink400} />
                <Txt w="bold" size={13} style={{ marginTop: 2 }}>{v}</Txt>
                <Txt size={10} color={C.ink500}>{l}</Txt>
              </View>
            ))}
          </View>
          {!p.is_open && <View style={{ marginTop: 10, backgroundColor: C.amberSoft, borderRadius: 12, padding: 10 }}><Txt w="semibold" size={12} color={C.amber}>{t("closed_now")}</Txt></View>}
        </View>

        <View style={{ backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.ink100 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10, gap: 6 }}>
            {services.map((s) => (
              <Pressable key={s.id} onPress={() => setTab(s.id)} style={{ height: 36, paddingHorizontal: 14, borderRadius: 999, justifyContent: "center", backgroundColor: activeTab === s.id ? C.ink900 : "transparent" }}>
                <Txt w="bold" size={13} color={activeTab === s.id ? "#fff" : C.ink500}>{L(s, "name")}</Txt>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View>
          <Txt size={12} color={C.ink500} style={{ marginHorizontal: 16, marginTop: 12 }}>{L(svcOf(activeTab), "desc")}</Txt>
          {items.map((x) => {
            const qty = qtyOf(x.id);
            return (
              <View key={x.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 10 }}>
                <View style={{ width: 54, height: 54, borderRadius: 16, backgroundColor: C.ink50, alignItems: "center", justifyContent: "center" }}><Txt size={28}>{x.icon}</Txt></View>
                <View style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: C.ink100, paddingBottom: 10 }}>
                  <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                    <Txt w="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{L(x, "name")}</Txt>
                    {x.popular ? <View style={{ backgroundColor: "#FFF7ED", borderRadius: 6, paddingHorizontal: 5 }}><Txt w="bold" size={10} color="#EA580C">{t("popular")}</Txt></View> : null}
                  </View>
                  <Txt size={13}><Txt w="bold" size={13}>{money(x.price)}</Txt><Txt size={12} color={C.ink400}> / {(UNIT_LABEL[x.unit] || UNIT_LABEL.piece)[lang]}</Txt></Txt>
                </View>
                {qty ? <Stepper qty={qty} onChange={(n) => setQty(x, n)} /> : (
                  <Pressable accessibilityLabel="add" onPress={() => setQty(x, 1)} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: "#BBDBFF", alignItems: "center", justifyContent: "center", backgroundColor: C.white }}>
                    <Icon name="add" size={20} color={C.brand} />
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>
        <View style={{ margin: 16, flexDirection: "row", gap: 8, alignItems: "center", backgroundColor: C.greenSoft, borderRadius: 14, padding: 12 }}>
          <Icon name="shield-checkmark" size={18} color={C.green} />
          <Txt size={12} w="medium" color="#065F46" style={{ flex: 1 }}>{t("guarantee")}</Txt>
        </View>
      </ScrollView>

      {inCart && (
        <View style={{ position: "absolute", left: 16, right: 16, bottom: insets.bottom + 12 }}>
          <Btn title={`${cart.count}  •  ${t("view_basket")}`} right={money(cart.subtotal)} size="lg" onPress={() => router.push("/cart")} />
        </View>
      )}

      <Sheet open={!!conflict} onClose={() => setConflict(null)} title={t("basket")}>
        <Txt color={C.ink700}>{t("basket_other_partner")}</Txt>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 18 }}>
          <Btn title={t("cancel")} variant="outline" style={{ flex: 1 }} onPress={() => setConflict(null)} />
          <Btn title={t("start_new")} style={{ flex: 1 }} onPress={() => { if (conflict) cart.replace(p, [{ ...line(conflict.x), qty: conflict.qty }]); setConflict(null); }} />
        </View>
      </Sheet>
    </View>
  );
}
