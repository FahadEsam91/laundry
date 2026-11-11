import { Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { api } from "@/api";
import { useAuth } from "@/auth";
import { useI18n } from "@/i18n";
import { C } from "@/theme";
import { Btn, Header, Icon, Txt } from "@/ui";

export default function Addresses() {
  const { t } = useI18n();
  const { me, refreshMe } = useAuth();
  const router = useRouter();
  const list: any[] = me?.addresses || [];
  return (
    <View style={{ flex: 1, backgroundColor: C.white }}>
      <Header title={t("addresses")} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
        {list.map((a) => (
          <Pressable key={a.id} onPress={async () => { await api(`/api/addresses/${a.id}`, { method: "PATCH", body: { is_default: true } }); refreshMe(); router.back(); }}
            style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 18, borderWidth: 2, borderColor: a.is_default ? C.brand : C.ink100, backgroundColor: a.is_default ? C.brandSoft : C.white }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.ink100, alignItems: "center", justifyContent: "center" }}><Icon name={a.label === "work" ? "briefcase-outline" : a.label === "home" ? "home-outline" : "business-outline"} size={20} color={C.ink700} /></View>
            <View style={{ flex: 1 }}>
              <Txt w="bold">{t(`label_${a.label}` as any)}{a.is_default ? `  •  ${t("default")}` : ""}</Txt>
              <Txt size={12} color={C.ink500} numberOfLines={1}>{[a.area, a.street, a.building].filter(Boolean).join("، ")}</Txt>
            </View>
            <Pressable hitSlop={10} onPress={async () => { await api(`/api/addresses/${a.id}`, { method: "DELETE" }); refreshMe(); }}><Icon name="trash-outline" size={18} color={C.red} /></Pressable>
          </Pressable>
        ))}
        <Btn title={t("add_address")} variant="secondary" icon="add" onPress={() => router.push("/addresses/new")} />
      </ScrollView>
    </View>
  );
}
