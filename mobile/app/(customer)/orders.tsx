import { useState } from "react";
import { FlatList, Pressable, RefreshControl, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useSWR from "swr";
import { api } from "@/api";
import { useAuth } from "@/auth";
import { useCart } from "@/cart";
import { useI18n } from "@/i18n";
import { C, shadow } from "@/theme";
import { Btn, Empty, PartnerLogo, StatusBadge, Txt } from "@/ui";

export default function Orders() {
  const { t, L, money, fmtDate } = useI18n();
  const { token } = useAuth();
  const cart = useCart();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<"current" | "past">("current");
  const { data, mutate, isValidating } = useSWR(token ? "/api/orders" : null, { refreshInterval: 6000 });
  const all: any[] = data?.orders || [];
  const current = all.filter((o) => !["delivered", "cancelled"].includes(o.status));
  const list = tab === "current" ? current : all.filter((o) => ["delivered", "cancelled"].includes(o.status));
  const reorder = async (o: any) => {
    const [{ order }, { partner }] = await Promise.all([api(`/api/orders/${o.id}`), api(`/api/partners/${o.partner_id}`)]);
    cart.replace(partner, order.items.filter((i: any) => i.product_id).map((i: any) => ({ product_id: i.product_id, qty: i.qty, name_ar: i.name_ar, name_en: i.name_en, icon: i.icon, price: i.unit_price, service_ar: i.service_ar, service_en: i.service_en })));
    router.push("/cart");
  };
  return (
    <View style={{ flex: 1, backgroundColor: C.ink50 }}>
      <View style={{ backgroundColor: C.white, paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.ink100 }}>
        <Txt w="bold" size={26}>{t("my_orders")}</Txt>
        <View style={{ flexDirection: "row", backgroundColor: C.ink100, borderRadius: 14, padding: 4, marginTop: 12 }}>
          {(["current", "past"] as const).map((k) => (
            <Pressable key={k} onPress={() => setTab(k)} style={{ flex: 1, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: tab === k ? C.white : "transparent" }}>
              <Txt w="bold" size={13} color={tab === k ? C.ink900 : C.ink500}>{k === "current" ? `${t("current_orders")}${current.length ? ` (${current.length})` : ""}` : t("past_orders")}</Txt>
            </Pressable>
          ))}
        </View>
      </View>
      {!token ? (
        <Empty icon="receipt-outline" title={t("login_title")} sub={t("login_sub")} action={<Btn title={t("verify")} onPress={() => router.push("/login")} />} />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(o) => String(o.id)}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          refreshControl={<RefreshControl refreshing={isValidating && !!data} onRefresh={() => mutate()} />}
          ListEmptyComponent={data ? <Empty icon="receipt-outline" title={t("no_orders")} sub={t("no_orders_sub")} action={<Btn title={t("browse")} onPress={() => router.push("/home")} />} /> : undefined}
          renderItem={({ item: o }) => (
            <Pressable onPress={() => router.push(`/order/${o.id}`)} style={{ backgroundColor: C.white, borderRadius: 20, padding: 14, ...shadow }}>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <PartnerLogo p={{ color: o.partner_color, color2: o.partner_color2, initials: o.partner_initials }} size={48} />
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Txt w="bold" numberOfLines={1} style={{ flex: 1 }}>{L({ name_ar: o.partner_ar, name_en: o.partner_en }, "name")}</Txt>
                    <Txt w="bold">{money(o.total)}</Txt>
                  </View>
                  <Txt size={12} color={C.ink500}>{o.code} • {o.items_count} {t("items")} • {fmtDate(o.created_at)}</Txt>
                  <StatusBadge status={o.status} />
                </View>
              </View>
              {tab === "past" && <Btn title={t("reorder")} variant="secondary" size="sm" icon="refresh" style={{ marginTop: 12 }} onPress={() => reorder(o)} />}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
