import { useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import useSWR from "swr";
import { ORDER_FLOW, STATUS_META } from "@shared/constants";
import { api } from "@/api";
import { useI18n, errText } from "@/i18n";
import { useAuth } from "@/auth";
import { useToast } from "@/toast";
import { LiveMap, type Pin } from "@/map";
import { PhotoGallery } from "@/photos";
import { C, shadow } from "@/theme";
import { Btn, Header, Icon, Input, Loading, PartnerLogo, Sheet, StatusBadge, Txt } from "@/ui";

const STAGES = [
  { icon: "receipt-outline", ar: "تم الطلب", en: "Placed" },
  { icon: "car-outline", ar: "الاستلام", en: "Pickup" },
  { icon: "sparkles-outline", ar: "التنظيف", en: "Cleaning" },
  { icon: "bicycle-outline", ar: "التوصيل", en: "Delivery" },
  { icon: "checkmark-done-outline", ar: "تم", en: "Done" },
] as const;
const stageOf = (s: string) => {
  const i = ORDER_FLOW.indexOf(s as any);
  return i <= 1 ? 0 : i <= 3 ? 1 : i <= 6 ? 2 : i <= 7 ? 3 : 4;
};

export default function OrderScreen() {
  const { id, placed } = useLocalSearchParams<{ id: string; placed?: string }>();
  const { t, L, money, lang, fmtDate, settings } = useI18n();
  const { refreshMe } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [celebrate, setCelebrate] = useState(placed === "1");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);
  const [stars, setStars] = useState(5);
  const [review, setReview] = useState("");
  const [busy, setBusy] = useState(false);
  const { data, mutate } = useSWR(`/api/orders/${id}`, {
    refreshInterval: (d: any) => (d?.order?.tracking ? 2000 : d && ["delivered", "cancelled"].includes(d.order.status) ? 0 : 4000),
  });
  const o = data?.order;
  useEffect(() => {
    if (!celebrate) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const tm = setTimeout(() => setCelebrate(false), 2200);
    return () => clearTimeout(tm);
  }, [celebrate]);
  useEffect(() => {
    if (o?.status === "delivered" && !o.rating) setRateOpen(true);
  }, [o?.status, o?.rating]);

  if (!o) return <Loading />;
  const meta = (STATUS_META as any)[o.status];
  const closed = o.status === "delivered" || o.status === "cancelled";
  const stage = stageOf(o.status);
  const tr = o.tracking;
  const pins: Pin[] = [
    { id: "home", lat: o.address_lat, lng: o.address_lng, kind: "home" },
    { id: "laundry", lat: o.partner.lat, lng: o.partner.lng, kind: "laundry", color: o.partner.color },
    ...(tr ? [{ id: "rider", lat: tr.lat, lng: tr.lng, kind: "rider" as const }] : []),
  ];
  const act = async (fn: () => Promise<any>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast(ok);
      mutate();
      refreshMe();
    } catch (e) {
      toast(errText(e, lang), "error");
    } finally {
      setBusy(false);
      setCancelOpen(false);
      setRateOpen(false);
    }
  };

  if (celebrate)
    return (
      <LinearGradient colors={[C.brand, C.brandDark]} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: 110, height: 110, borderRadius: 55, backgroundColor: "rgba(255,255,255,.2)", alignItems: "center", justifyContent: "center" }}>
          <Icon name="checkmark-circle" size={88} color="#fff" />
        </View>
        <Txt w="bold" size={24} color="#fff" style={{ marginTop: 20 }}>{t("order_placed")}</Txt>
        <Txt color="rgba(255,255,255,.8)">{o.code}</Txt>
      </LinearGradient>
    );

  return (
    <View style={{ flex: 1, backgroundColor: C.ink50 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {!closed ? (
          <View>
            <LiveMap pins={pins} route={tr ? [tr.from, tr.to] : [[o.partner.lat, o.partner.lng], [o.address_lat, o.address_lng]]} height={330} />
            <View style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
              <Header transparent right={<Pressable onPress={() => Linking.openURL(`tel:${settings.support_phone}`)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,.92)", alignItems: "center", justifyContent: "center", ...shadow }}><Icon name="headset" size={20} color={C.ink900} /></Pressable>} />
            </View>
            {tr && (
              <View style={{ position: "absolute", bottom: 36, alignSelf: "center", backgroundColor: C.ink900, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 }}>
                <Txt w="bold" color="#fff">{t("eta")} {tr.eta_min} {t("min")}</Txt>
              </View>
            )}
          </View>
        ) : (
          <Header title={`${t("order")} ${o.code}`} />
        )}

        <View style={{ marginTop: closed ? 12 : -22, marginHorizontal: 16, backgroundColor: C.white, borderRadius: 28, padding: 18, ...shadow, shadowOpacity: 0.12 }}>
          <Txt size={12} w="semibold" color={C.ink400}>{t("order_no")} {o.code}</Txt>
          <Txt w="bold" size={20} style={{ marginTop: 2 }}>{meta?.[lang]}</Txt>
          <Txt color={C.ink500}>{lang === "ar" ? meta?.descAr : meta?.descEn}</Txt>
          {o.status !== "cancelled" && (
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 18 }}>
              <View style={{ position: "absolute", top: 19, left: 24, right: 24, height: 3, backgroundColor: C.ink100 }} />
              {STAGES.map((st, i) => (
                <View key={i} style={{ alignItems: "center", width: 56 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 3, borderColor: "#fff", alignItems: "center", justifyContent: "center", backgroundColor: i <= stage ? C.brand : C.ink100 }}>
                    <Icon name={st.icon as any} size={16} color={i <= stage ? "#fff" : C.ink400} />
                  </View>
                  <Txt w="bold" size={10} color={i <= stage ? C.ink900 : C.ink400} style={{ marginTop: 4 }}>{st[lang]}</Txt>
                </View>
              ))}
            </View>
          )}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
            {[[t("pickup"), o.pickup_slot], [t("est_delivery"), o.delivery_slot]].map(([k, v]) => (
              <View key={k} style={{ flex: 1, backgroundColor: C.ink50, borderRadius: 14, padding: 10 }}>
                <Txt size={11} color={C.ink500}>{k}</Txt>
                <Txt w="bold" size={13}>{fmtDate(v, { weekday: "short", hour: "numeric", minute: "2-digit" })}</Txt>
              </View>
            ))}
          </View>
        </View>

        {o.driver && !closed && (
          <View style={{ marginTop: 12, marginHorizontal: 16, backgroundColor: C.white, borderRadius: 24, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, ...shadow }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: C.greenSoft, alignItems: "center", justifyContent: "center" }}><Txt w="bold" size={18} color={C.green}>{o.driver.name.slice(0, 1)}</Txt></View>
            <View style={{ flex: 1 }}>
              <Txt size={11} color={C.ink500}>{t("your_rider")}</Txt>
              <Txt w="bold">{o.driver.name}</Txt>
              <Txt size={12} color={C.ink500}>★ {o.driver.rating}{o.driver.plate ? ` • ${o.driver.plate}` : ""}</Txt>
            </View>
            <Pressable onPress={() => Linking.openURL(`sms:${o.driver.phone}`)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.ink100, alignItems: "center", justifyContent: "center" }}><Icon name="chatbubble-outline" size={20} color={C.ink900} /></Pressable>
            <Pressable onPress={() => Linking.openURL(`tel:${o.driver.phone}`)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.green, alignItems: "center", justifyContent: "center" }}><Icon name="call" size={20} color="#fff" /></Pressable>
          </View>
        )}

        {o.status === "delivered" && !o.rating && <Btn title={t("rate_order")} variant="secondary" icon="star" style={{ marginHorizontal: 16, marginTop: 12 }} onPress={() => setRateOpen(true)} />}
        {o.rating ? <View style={{ marginHorizontal: 16, marginTop: 12, backgroundColor: C.amberSoft, borderRadius: 18, padding: 14 }}><Txt w="bold" color={C.amber}>{"★".repeat(o.rating)}{"☆".repeat(5 - o.rating)}  {o.review || t("thanks_rating")}</Txt></View> : null}

        <View style={{ marginTop: 12, marginHorizontal: 16, backgroundColor: C.white, borderRadius: 24, padding: 16, ...shadow }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <PartnerLogo p={o.partner} size={42} />
            <View style={{ flex: 1 }}><Txt w="bold">{L(o.partner, "name")}</Txt><Txt size={12} color={C.ink500}>{L(o.partner, "area")}</Txt></View>
            <StatusBadge status={o.status} />
          </View>
          {o.items.map((i: any) => (
            <View key={i.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.ink100 }}>
              <Txt size={20}>{i.icon}</Txt>
              <View style={{ flex: 1 }}><Txt w="semibold">{i.qty}× {L(i, "name")}</Txt><Txt size={12} color={C.ink500}>{L(i, "service")}</Txt></View>
              <Txt w="semibold">{money(i.qty * i.unit_price)}</Txt>
            </View>
          ))}
          <View style={{ borderTopWidth: 1, borderTopColor: C.ink100, paddingTop: 8, gap: 4 }}>
            {[
              [t("subtotal"), money(o.subtotal)],
              [t("delivery_fee"), o.delivery_fee ? money(o.delivery_fee) : t("free")],
              ...(o.express_fee > 0 ? [[t("express_fee"), money(o.express_fee)]] : []),
              [t("service_fee"), o.service_fee ? money(o.service_fee) : t("free")],
              ...(o.member_discount > 0 ? [[`👑 ${t("member_discount")}`, `- ${money(o.member_discount)}`]] : []),
              ...(o.discount > 0 ? [[t("discount"), `- ${money(o.discount)}`]] : []),
            ].map(([k, v]) => (
              <View key={k} style={{ flexDirection: "row", justifyContent: "space-between" }}><Txt color={C.ink500}>{k}</Txt><Txt>{v}</Txt></View>
            ))}
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}><Txt w="bold" size={16}>{t("total")}</Txt><Txt w="bold" size={16}>{money(o.total)}</Txt></View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", backgroundColor: C.ink50, borderRadius: 12, padding: 10, marginTop: 6 }}>
              <Txt w="semibold" size={12}>{t(`pay_${o.payment_method}` as any)}</Txt>
              <Txt w="bold" size={12} color={o.payment_status === "paid" ? C.green : C.amber}>{t(o.payment_status as any)}</Txt>
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 6, marginTop: 10 }}><Icon name="location-outline" size={16} color={C.ink400} /><Txt size={12} color={C.ink700} style={{ flex: 1 }}>{o.address_text}</Txt></View>
          {o.notes ? <View style={{ marginTop: 10, backgroundColor: "#FFFBEB", borderRadius: 12, padding: 10 }}><Txt size={12} color="#78350F">📝 {o.notes}</Txt></View> : null}
          {o.photos?.length ? (
            <View style={{ marginTop: 12 }}>
              <Txt w="bold" size={12} color={C.ink700} style={{ marginBottom: 8 }}>📷 {t("your_photos")}</Txt>
              <PhotoGallery photos={o.photos} size={60} />
            </View>
          ) : null}
        </View>

        <View style={{ marginTop: 12, marginHorizontal: 16, backgroundColor: C.white, borderRadius: 24, padding: 16, ...shadow }}>
          <Txt w="bold" size={16} style={{ marginBottom: 10 }}>{t("timeline")}</Txt>
          {[...o.events].reverse().map((e: any, i: number) => (
            <View key={i} style={{ flexDirection: "row", gap: 10, paddingBottom: 12 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, marginTop: 5, backgroundColor: i === 0 ? C.brand : C.ink300 }} />
              <View><Txt w="semibold">{(STATUS_META as any)[e.status]?.[lang] || e.status}</Txt><Txt size={12} color={C.ink400}>{fmtDate(e.created_at)}</Txt></View>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: "row", gap: 8, marginHorizontal: 16, marginTop: 12 }}>
          <Btn title={t("help")} variant="outline" icon="headset-outline" style={{ flex: 1 }} onPress={() => Linking.openURL(`tel:${settings.support_phone}`)} />
          {["pending", "accepted"].includes(o.status) ? (
            <Btn title={t("cancel_order")} variant="danger" icon="close-circle-outline" style={{ flex: 1 }} onPress={() => setCancelOpen(true)} />
          ) : (
            <Btn title={t("nav_home")} variant="secondary" icon="home-outline" style={{ flex: 1 }} onPress={() => router.replace("/home")} />
          )}
        </View>
      </ScrollView>

      <Sheet open={cancelOpen} onClose={() => setCancelOpen(false)} title={t("cancel_order")}>
        <Txt color={C.ink700}>{t("cancel_confirm")}</Txt>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 18 }}>
          <Btn title={t("no")} variant="outline" style={{ flex: 1 }} onPress={() => setCancelOpen(false)} />
          <Btn title={t("cancel_order")} variant="danger" style={{ flex: 1 }} loading={busy} onPress={() => act(() => api(`/api/orders/${o.id}/cancel`, { body: {} }), (STATUS_META as any).cancelled[lang])} />
        </View>
      </Sheet>
      <Sheet open={rateOpen} onClose={() => setRateOpen(false)} title={t("rate_order")}>
        <View style={{ alignItems: "center" }}>
          <PartnerLogo p={o.partner} size={60} />
          <Txt w="bold" style={{ marginTop: 8 }}>{L(o.partner, "name")}</Txt>
          <Txt size={13} color={C.ink500} center>{t("rate_sub")}</Txt>
          <View style={{ flexDirection: "row", gap: 6, marginVertical: 16 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Pressable key={i} onPress={() => setStars(i)} accessibilityLabel={`${i}`}><Icon name={i <= stars ? "star" : "star-outline"} size={40} color={i <= stars ? "#FBBF24" : C.ink200} /></Pressable>
            ))}
          </View>
        </View>
        <Input value={review} onChangeText={setReview} placeholder={t("review_ph")} />
        <Btn title={t("submit")} size="lg" style={{ marginTop: 14 }} loading={busy} onPress={() => act(() => api(`/api/orders/${o.id}/rate`, { body: { rating: stars, review } }), t("thanks_rating"))} />
      </Sheet>
    </View>
  );
}
