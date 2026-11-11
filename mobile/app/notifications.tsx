import { useEffect } from "react";
import { FlatList, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import useSWR from "swr";
import { api } from "@/api";
import { useAuth } from "@/auth";
import { useI18n } from "@/i18n";
import { C } from "@/theme";
import { Empty, Header, Txt } from "@/ui";

export default function Notifications() {
  const { t, L, fmtDate } = useI18n();
  const { refreshMe } = useAuth();
  const router = useRouter();
  const { data } = useSWR("/api/notifications");
  useEffect(() => {
    if (data) api("/api/notifications", { body: {} }).then(() => refreshMe()).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!data]);
  return (
    <View style={{ flex: 1, backgroundColor: C.white }}>
      <Header title={t("notifications")} />
      <FlatList
        data={data?.notifications || []}
        keyExtractor={(n: any) => String(n.id)}
        ListEmptyComponent={data ? <Empty icon="notifications-outline" title={t("no_notifications")} /> : undefined}
        renderItem={({ item: n }) => (
          <Pressable onPress={() => { const r = n.order_id ? `/order/${n.order_id}` : null; if (r) router.push(r as any); }}
            style={{ flexDirection: "row", gap: 10, padding: 16, borderBottomWidth: 1, borderBottomColor: C.ink100, backgroundColor: n.read ? C.white : C.brandSoft }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, marginTop: 7, backgroundColor: n.read ? "transparent" : C.brand }} />
            <View style={{ flex: 1 }}>
              <Txt w="bold">{L(n, "title")}</Txt>
              <Txt color={C.ink700}>{L(n, "body")}</Txt>
              <Txt size={12} color={C.ink400} style={{ marginTop: 2 }}>{fmtDate(n.created_at)}</Txt>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}
