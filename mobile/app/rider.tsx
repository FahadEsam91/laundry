import { useEffect, useRef, useState } from "react";
import { Linking, Platform, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import useSWR from "swr";
import { api } from "@/api";
import { deleteAccount, useAuth } from "@/auth";
import { useI18n, errText } from "@/i18n";
import { registerForPush } from "@/push";
import { useToast } from "@/toast";
import { LiveMap, type Pin } from "@/map";
import { API_URL } from "@/config";
import { C, shadow } from "@/theme";
import { Btn, Empty, Icon, Loading, PartnerLogo, Row, Sheet, StatusBadge, Txt } from "@/ui";

const STEP: Record<string, { action: string; key: any }> = {
  driver_assigned: { action: "picked_up", key: "confirm_pickup" },
  picked_up: { action: "at_laundry", key: "confirm_dropoff_laundry" },
  ready: { action: "out_for_delivery", key: "confirm_pickup_laundry" },
  out_for_delivery: { action: "delivered", key: "confirm_delivered" },
};

/** Share the rider's position while online (foreground), throttled. */
function useLiveLocation(online: boolean) {
  const last = useRef(0);
  useEffect(() => {
    if (!online || Platform.OS === "web") return;
    let sub: Location.LocationSubscription | null = null;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      sub = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, distanceInterval: 25, timeInterval: 10000 }, (p) => {
        if (Date.now() - last.current < 15000) return;
        last.current = Date.now();
        api("/api/driver/status", { body: { lat: p.coords.latitude, lng: p.coords.longitude } }).catch(() => {});
      });
    })();
    return () => sub?.remove();
  }, [online]);
}

export default function Rider() {
  const { t, L, money, num, lang, setLang } = useI18n();
  const { token, ready, signOut } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, mutate, isValidating } = useSWR(token ? "/api/driver/jobs" : null, { refreshInterval: 4000 });
  const [busy, setBusy] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  useLiveLocation(data?.driver?.status === "online");

  useEffect(() => {
    if (ready && !token) router.replace("/login");
  }, [ready, token, router]);
  if (!data) return <Loading />;
  const d = data.driver;
  const online = d.status === "online";
  const cur = data.mine[0];

  const toggle = async () => {
    setBusy("status");
    await api("/api/driver/status", { body: { status: online ? "offline" : "online" } }).catch(() => {});
    if (!online) registerForPush(lang).catch(() => {});
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    await mutate();
    setBusy(null);
  };
  const act = async (id: number, action: string) => {
    setBusy(String(id));
    try {
      await api(`/api/driver/jobs/${id}`, { body: { action } });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (action === "delivered") toast(`✅ ${t("confirm_delivered")}`);
      await mutate();
    } catch (e) {
      toast(errText(e, lang), "error");
    } finally {
      setBusy(null);
    }
  };
  const navigate = (lat: number, lng: number) =>
    Linking.openURL(Platform.select({ ios: `maps://?daddr=${lat},${lng}`, android: `google.navigation:q=${lat},${lng}`, default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}` })!);
  const pins: Pin[] = [];
  if (d.lat) pins.push({ id: "me", lat: d.lat, lng: d.lng, kind: "rider" });
  if (cur) pins.push({ id: "c", lat: cur.address_lat, lng: cur.address_lng, kind: "home" }, { id: "p", lat: cur.p_lat, lng: cur.p_lng, kind: "laundry", color: cur.partner_color });

  const Job = ({ j, action }: { j: any; action?: { action: string; key: any } }) => {
    const pickupLeg = ["accepted", "driver_assigned", "picked_up"].includes(j.status);
    const partnerStop = { icon: "storefront-outline", title: L({ name_ar: j.partner_ar, name_en: j.partner_en }, "name"), sub: L({ area_ar: j.area_ar, area_en: j.area_en }, "area"), phone: j.partner_phone, lat: j.p_lat, lng: j.p_lng };
    const customerStop = { icon: "home-outline", title: j.customer_name, sub: j.address_text, phone: j.customer_phone, lat: j.address_lat, lng: j.address_lng };
    const stops = pickupLeg ? [customerStop, partnerStop] : [partnerStop, customerStop];
    const target = j.status === "driver_assigned" || j.status === "accepted" || j.status === "out_for_delivery" ? customerStop : partnerStop;
    const cash = ["cash", "card_pos"].includes(j.payment_method) && j.payment_status !== "paid" && ["ready", "out_for_delivery"].includes(j.status);
    return (
      <View style={{ backgroundColor: C.white, borderRadius: 22, padding: 16, ...shadow }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <PartnerLogo p={{ color: j.partner_color, color2: j.partner_color, initials: j.partner_initials }} size={34} />
          <View style={{ flex: 1 }}>
            <Txt w="bold">{j.code}{j.express ? "  ⚡" : ""}</Txt>
            <Txt w="bold" size={11} color={C.brand}>{pickupLeg ? t("job_pickup") : t("job_delivery")}</Txt>
          </View>
          <View style={{ alignItems: "flex-end", gap: 2 }}>
            <StatusBadge status={j.status} />
            <Txt size={11} color={C.ink500}>{num(j.distance_km, 1)} {t("km")} • {j.items_count} {t("items")}</Txt>
          </View>
        </View>
        {stops.map((s, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 }}>
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: i === 0 ? C.ink900 : C.brandSoft, alignItems: "center", justifyContent: "center" }}><Icon name={s.icon as any} size={16} color={i === 0 ? "#fff" : C.brand} /></View>
            <View style={{ flex: 1 }}>
              <Txt size={10} w="bold" color={C.ink400}>{i === 0 ? t("from") : t("to")}</Txt>
              <Txt w="bold" numberOfLines={1}>{s.title}</Txt>
              <Txt size={12} color={C.ink500} numberOfLines={1}>{s.sub}</Txt>
            </View>
            {s.phone ? <Pressable onPress={() => Linking.openURL(`tel:${s.phone}`)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.ink100, alignItems: "center", justifyContent: "center" }}><Icon name="call" size={16} color={C.ink900} /></Pressable> : null}
          </View>
        ))}
        {j.notes ? <View style={{ backgroundColor: C.amberSoft, borderRadius: 10, padding: 8, marginTop: 10 }}><Txt size={12} color={C.amber}>📝 {j.notes}</Txt></View> : null}
        {cash ? <View style={{ flexDirection: "row", justifyContent: "space-between", backgroundColor: C.greenSoft, borderRadius: 12, padding: 12, marginTop: 10 }}><Txt w="bold" color="#065F46">{j.payment_method === "card_pos" ? `💳 ${t("collect_card")}` : `💵 ${t("collect_cash")}`}</Txt><Txt w="bold" color="#065F46">{money(j.total)}</Txt></View> : null}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
          {action?.action !== "take" && <Btn title={t("navigate")} variant="outline" icon="navigate-outline" style={{ flex: 1 }} onPress={() => navigate(target.lat, target.lng)} />}
          {action && <Btn title={t(action.key)} variant={action.action === "take" ? "primary" : "success"} style={{ flex: 2 }} loading={busy === String(j.id)} onPress={() => act(j.id, action.action)} />}
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.ink50 }}>
      <ScrollView refreshControl={<RefreshControl refreshing={isValidating && !!data && busy === null} onRefresh={() => mutate()} />} contentContainerStyle={{ paddingBottom: 40 }}>
        <LinearGradient colors={online ? ["#059669", "#0D9488"] : ["#262D3A", "#151A24"]} style={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,.2)", alignItems: "center", justifyContent: "center" }}><Txt w="bold" size={18} color="#fff">{d.name.slice(0, 1)}</Txt></View>
            <View style={{ flex: 1 }}>
              <Txt w="bold" color="#fff">{d.name}</Txt>
              <Txt size={12} color="rgba(255,255,255,.7)">{t("driver_panel")} • ★ {d.rating}</Txt>
            </View>
            <Pressable onPress={() => setMenu(true)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,.18)", alignItems: "center", justifyContent: "center" }}><Icon name="menu" size={20} color="#fff" /></Pressable>
          </View>
          <Pressable onPress={toggle} disabled={busy === "status"} style={{ marginTop: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 20, padding: 16, backgroundColor: online ? "rgba(255,255,255,.16)" : C.white }}>
            <View>
              <Txt w="bold" size={16} color={online ? "#fff" : C.ink900}>{online ? t("you_are_online") : t("you_are_offline")}</Txt>
              <Txt size={12} color={online ? "rgba(255,255,255,.7)" : C.ink500}>{online ? t("go_offline") : t("go_online")}</Txt>
            </View>
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: online ? C.white : C.green, alignItems: "center", justifyContent: "center" }}><Icon name="power" size={26} color={online ? C.green : "#fff"} /></View>
          </Pressable>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
            {[[money(data.stats.earnings), t("earnings_today")], [num(data.stats.legs), t("completed_today")], [num(data.stats.total), t("deliveries")]].map(([v, l]) => (
              <View key={l} style={{ flex: 1, backgroundColor: "rgba(255,255,255,.1)", borderRadius: 14, padding: 10, alignItems: "center" }}>
                <Txt w="bold" color="#fff">{v}</Txt>
                <Txt size={10} color="rgba(255,255,255,.65)">{l}</Txt>
              </View>
            ))}
          </View>
        </LinearGradient>

        {cur && <LiveMap pins={pins} route={[[cur.p_lat, cur.p_lng], [cur.address_lat, cur.address_lng]]} height={220} />}

        <View style={{ padding: 16, gap: 12 }}>
          <Txt w="bold" size={16}>{t("my_jobs")} ({data.mine.length})</Txt>
          {!data.mine.length && <View style={{ borderWidth: 2, borderStyle: "dashed", borderColor: C.ink200, borderRadius: 18, padding: 20 }}><Txt color={C.ink400} center>{t("no_jobs")}</Txt></View>}
          {data.mine.map((j: any) => <Job key={j.id} j={j} action={STEP[j.status]} />)}
          <Txt w="bold" size={16} style={{ marginTop: 8 }}>{t("available_jobs")} ({data.available.length})</Txt>
          {!online ? <View style={{ backgroundColor: C.white, borderRadius: 18, padding: 20 }}><Txt color={C.ink500} center>{t("you_are_offline")} — {t("go_online")}</Txt></View>
            : !data.available.length ? <Empty icon="file-tray-outline" title={t("no_jobs")} />
            : data.available.map((j: any) => <Job key={j.id} j={j} action={{ action: "take", key: "take_job" }} />)}
        </View>
      </ScrollView>

      <Sheet open={menu} onClose={() => setMenu(false)} title={t("account")}>
        <Row icon="language-outline" label={t("language")} onPress={() => setLang(lang === "ar" ? "en" : "ar")} right={<Txt w="bold" size={12} color={C.brand}>{lang === "ar" ? "العربية" : "English"}</Txt>} />
        <Row icon="notifications-outline" label={t("push_driver")} onPress={async () => { const r = await registerForPush(lang); toast(r === "on" ? t("push_on") : t("push_unsupported"), r === "on" ? "success" : "info"); }} />
        <Row icon="shield-checkmark-outline" label={t("privacy")} onPress={() => WebBrowser.openBrowserAsync(`${API_URL}/privacy`)} />
        <Row icon="log-out-outline" label={t("logout")} onPress={async () => { setMenu(false); await signOut(); router.replace("/login"); }} />
        <Row icon="trash-outline" label={t("delete_account")} danger onPress={() => { setMenu(false); setDelOpen(true); }} />
      </Sheet>
      <Sheet open={delOpen} onClose={() => setDelOpen(false)} title={t("delete_account")}>
        <Txt color={C.ink700}>{t("delete_account_d")}</Txt>
        <Btn title={t("delete_forever")} variant="danger" icon="trash" style={{ marginTop: 16 }} onPress={async () => { try { await deleteAccount(); await signOut(); router.replace("/login"); } catch (e) { toast(errText(e, lang), "error"); } setDelOpen(false); }} />
      </Sheet>
    </View>
  );
}
