import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import useSWR from "swr";
import { useI18n } from "@/i18n";
import { useAuth } from "@/auth";
import { useToast } from "@/toast";
import { PartnerCard } from "@/partner-card";
import { C, shadow } from "@/theme";
import { Icon, ServiceIcon, StatusBadge, Txt } from "@/ui";

const PROMO_COLORS: [string, string][] = [["#1A62EC", "#38BDF8"], ["#7C3AED", "#EC4899"], ["#059669", "#22D3EE"], ["#F59E0B", "#F43F5E"]];

export default function Home() {
  const { t, L, lang, setLang, settings, money } = useI18n();
  const { me, token } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, mutate, isValidating } = useSWR("/api/partners");
  const { data: promos } = useSWR("/api/promos");
  const { data: plans } = useSWR("/api/plans");
  const { data: orders } = useSWR(token ? "/api/orders" : null, { refreshInterval: 8000 });
  const [refreshing, setRefreshing] = useState(false);
  const partners: any[] = data?.partners || [];
  const active = (orders?.orders || []).find((o: any) => !["delivered", "cancelled"].includes(o.status));
  const addr = me?.addresses?.find((a: any) => a.is_default) || me?.addresses?.[0];
  const services: any[] = settings.services || [];
  const fromPrice = Math.min(...((plans?.plans || []).map((p: any) => p.price) as number[]), Infinity);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.white }}
      refreshControl={<RefreshControl refreshing={refreshing || (isValidating && !data)} onRefresh={async () => { setRefreshing(true); await mutate(); setRefreshing(false); }} />}
    >
      <LinearGradient colors={[C.brand, C.brandDark]} style={{ paddingTop: insets.top + 10, paddingHorizontal: 16, paddingBottom: 56 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Pressable onPress={() => router.push(token ? "/addresses" : "/login")} style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,.18)", alignItems: "center", justifyContent: "center" }}><Icon name="location" size={20} color="#fff" /></View>
            <View style={{ flex: 1 }}>
              <Txt size={11} color="rgba(255,255,255,.7)">{t("deliver_to")}</Txt>
              <Txt w="bold" color="#fff" numberOfLines={1}>{addr ? `${t(`label_${addr.label}` as any)} • ${addr.area}` : lang === "ar" ? "اختر موقعك ⌄" : "Choose location ⌄"}</Txt>
            </View>
          </Pressable>
          <Pressable onPress={() => setLang(lang === "ar" ? "en" : "ar")} style={{ height: 40, paddingHorizontal: 12, borderRadius: 20, backgroundColor: "rgba(255,255,255,.18)", alignItems: "center", justifyContent: "center", marginEnd: 6 }}>
            <Txt w="bold" size={12} color="#fff">{lang === "ar" ? "EN" : "ع"}</Txt>
          </Pressable>
          <Pressable onPress={() => router.push(token ? "/notifications" : "/login")} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,.18)", alignItems: "center", justifyContent: "center" }}>
            <Icon name="notifications" size={20} color="#fff" />
            {me?.unread > 0 && <View style={{ position: "absolute", top: 6, end: 6, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: C.gold, alignItems: "center", justifyContent: "center" }}><Txt w="bold" size={10}>{me.unread}</Txt></View>}
          </Pressable>
        </View>
        <Txt w="bold" size={24} color="#fff" style={{ marginTop: 20 }}>
          {me?.user ? (lang === "ar" ? `أهلاً ${me.user.name.split(" ")[0]} 👋` : `Hi ${me.user.name.split(" ")[0]} 👋`) : t("login_title")}
        </Txt>
        <Txt color="rgba(255,255,255,.8)">{lang === "ar" ? "نستلم ونغسل ونكوي ونرجعها لك" : "We collect, clean & deliver"}</Txt>
      </LinearGradient>

      <Pressable onPress={() => router.push("/search")} style={{ marginTop: -28, marginHorizontal: 16, height: 56, borderRadius: 18, backgroundColor: C.white, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, ...shadow, shadowOpacity: 0.14 }}>
        <Icon name="search" size={20} color={C.brand} />
        <Txt color={C.ink400}>{t("search_ph")}</Txt>
      </Pressable>

      {active && (
        <Pressable onPress={() => router.push(`/order/${active.id}`)} style={{ margin: 16, marginBottom: 0, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.brandSoft, borderRadius: 18, padding: 12 }}>
          <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: C.brand, alignItems: "center", justifyContent: "center" }}><Icon name="car-sport" size={22} color="#fff" /></View>
          <View style={{ flex: 1, gap: 4 }}>
            <Txt w="semibold" size={12} color={C.brandDark}>{t("active_order")} • {active.code}</Txt>
            <StatusBadge status={active.status} />
          </View>
          <View style={{ backgroundColor: C.brand, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}><Txt w="bold" size={12} color="#fff">{t("track")}</Txt></View>
        </Pressable>
      )}

      <Txt w="bold" size={18} style={{ marginHorizontal: 16, marginTop: 22, marginBottom: 12 }}>{t("services")}</Txt>
      <View style={{ flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12 }}>
        {services.map((s) => (
          <Pressable key={s.slug} onPress={() => router.push({ pathname: "/search", params: { service: s.slug } })} style={{ width: "33.33%", padding: 4 }}>
            <View style={{ alignItems: "center", backgroundColor: C.white, borderRadius: 18, borderWidth: 1, borderColor: C.ink100, paddingVertical: 14, ...shadow, shadowOpacity: 0.04 }}>
              <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: `${s.color}18`, alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                <ServiceIcon name={s.icon} color={s.color} />
              </View>
              <Txt w="bold" size={12} center numberOfLines={2}>{L(s, "name")}</Txt>
            </View>
          </Pressable>
        ))}
      </View>

      <Pressable onPress={() => router.push("/plus")} style={{ marginHorizontal: 16, marginTop: 20 }}>
        <LinearGradient colors={["#0B0E14", "#19398A"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 24, padding: 18, flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: C.gold, alignItems: "center", justifyContent: "center" }}><Icon name="diamond" size={24} color="#422006" /></View>
          <View style={{ flex: 1 }}>
            <Txt w="bold" size={17} color="#fff">{me?.member ? L(me.member.plan, "name") : t("plus_title")}</Txt>
            <Txt size={12} color="rgba(255,255,255,.7)">{me?.member ? t("your_plan") : Number.isFinite(fromPrice) ? (lang === "ar" ? `توصيل مجاني وخصومات من ${money(fromPrice)} شهرياً` : `Free delivery & discounts from ${money(fromPrice)}/mo`) : t("plus_tagline")}</Txt>
          </View>
          <View style={{ backgroundColor: C.gold, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}><Txt w="bold" size={12} color="#422006">{me?.member ? (lang === "ar" ? "مزاياك" : "Benefits") : t("plus_cta")}</Txt></View>
        </LinearGradient>
      </Pressable>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingVertical: 20 }}>
        {(promos?.promos || []).map((p: any, i: number) => (
          <Pressable key={p.code} onPress={async () => { await Clipboard.setStringAsync(p.code); toast(`${t("copied")}: ${p.code}`, "info"); }}>
            <LinearGradient colors={PROMO_COLORS[i % 4]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 270, height: 130, borderRadius: 24, padding: 18, justifyContent: "space-between" }}>
              <Txt w="bold" size={20} color="#fff" numberOfLines={2}>{L(p, "title")}</Txt>
              <View style={{ alignSelf: "flex-start", borderWidth: 1, borderStyle: "dashed", borderColor: "rgba(255,255,255,.6)", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, flexDirection: "row", gap: 6, alignItems: "center" }}>
                <Icon name="copy-outline" size={12} color="#fff" /><Txt w="bold" size={12} color="#fff">{p.code}</Txt>
              </View>
            </LinearGradient>
          </Pressable>
        ))}
      </ScrollView>

      <Txt w="bold" size={18} style={{ marginHorizontal: 16, marginBottom: 12 }}>{t("featured_laundries")}</Txt>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 8 }}>
        {partners.filter((p) => p.featured).map((p) => <PartnerCard key={p.id} p={p} wide />)}
      </ScrollView>

      <Txt w="bold" size={18} style={{ marginHorizontal: 16, marginTop: 20 }}>{t("all_laundries")}</Txt>
      <Txt size={12} color={C.ink500} style={{ marginHorizontal: 16, marginBottom: 4 }}>{partners.length} {lang === "ar" ? "مغسلة متاحة" : "laundries available"}</Txt>
      {partners.map((p) => <PartnerCard key={p.id} p={p} />)}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}
