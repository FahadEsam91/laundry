import { Image, Pressable, View } from "react-native";
import { mediaUrl } from "./config";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useI18n } from "./i18n";
import { useAuth } from "./auth";
import { C, shadow } from "./theme";
import { Icon, PartnerLogo, Txt } from "./ui";
import { PressScale } from "./motion";

export function PartnerCard({ p, wide }: { p: any; wide?: boolean }) {
  const { L, t, money, num } = useI18n();
  const { me } = useAuth();
  const router = useRouter();
  const memberFree = me?.member?.benefits?.free_delivery;
  const fee = p.delivery_fee === 0 ? t("free") : memberFree ? `👑 ${t("free_with_plus")}` : money(p.delivery_fee);
  const go = () => router.push(`/laundry/${p.id}`);
  if (wide)
    return (
      <PressScale onPress={go} style={{ width: 260, backgroundColor: C.white, borderRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: C.ink100, ...shadow }}>
        <LinearGradient colors={[p.color, p.color2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 96 }}>
          <View style={{ position: "absolute", width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(255,255,255,.14)", top: -40, end: -30 }} />
          {p.cover_url ? <Image source={{ uri: mediaUrl(p.cover_url)! }} style={absFill} resizeMode="cover" /> : null}
          {!p.is_open && <View style={{ ...absFill, backgroundColor: "rgba(11,14,20,.5)", alignItems: "center", justifyContent: "center" }}><Txt w="bold" color="#fff">{t("closed")}</Txt></View>}
        </LinearGradient>
        <View style={{ flexDirection: "row", gap: 10, padding: 12 }}>
          <View style={{ marginTop: -30, borderWidth: 3, borderColor: "#fff", borderRadius: 16 }}><PartnerLogo p={p} size={44} /></View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Txt w="bold" numberOfLines={1} style={{ flex: 1 }}>{L(p, "name")}</Txt>
              <Txt w="bold" size={12}>★ {num(p.rating, 1)}</Txt>
            </View>
            <Txt size={12} color={C.ink500}>{p.express_hours}–{p.eta_hours} {t("hour_short")} • {fee}</Txt>
          </View>
        </View>
      </PressScale>
    );
  return (
    <Pressable onPress={go} style={({ pressed }) => ({ flexDirection: "row", gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: pressed ? C.ink50 : C.white })}>
      <View>
        <PartnerLogo p={p} size={68} />
        {!p.is_open && <View style={{ ...absFill, borderRadius: 20, backgroundColor: "rgba(11,14,20,.55)", alignItems: "center", justifyContent: "center" }}><Txt w="bold" size={11} color="#fff">{t("closed")}</Txt></View>}
      </View>
      <View style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: C.ink100, paddingBottom: 12 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
          <Txt w="bold" numberOfLines={1} style={{ flex: 1 }}>{L(p, "name")}</Txt>
          <View style={{ backgroundColor: C.amberSoft, borderRadius: 999, paddingHorizontal: 6 }}><Txt w="bold" size={12} color={C.amber}>★ {num(p.rating, 1)}</Txt></View>
        </View>
        <Txt size={12} color={C.ink500} numberOfLines={1}>{L(p, "area")}{p.distance_km != null ? ` • ${num(p.distance_km, 1)} ${t("km")}` : ""}</Txt>
        <View style={{ flexDirection: "row", gap: 12, marginTop: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><Icon name="time-outline" size={14} color={C.ink400} /><Txt size={12} color={C.ink700}>{p.eta_hours} {t("hour_short")}</Txt></View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><Icon name="bicycle-outline" size={14} color={C.ink400} /><Txt size={12} w={p.delivery_fee === 0 || memberFree ? "bold" : "regular"} color={p.delivery_fee === 0 || memberFree ? C.green : C.ink700}>{fee}</Txt></View>
        </View>
      </View>
    </Pressable>
  );
}
const absFill = { position: "absolute" as const, top: 0, left: 0, right: 0, bottom: 0 };
