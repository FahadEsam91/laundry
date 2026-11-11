import { useEffect, useState } from "react";
import { FlatList, Pressable, ScrollView, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import useSWR from "swr";
import { useI18n } from "@/i18n";
import { PartnerCard } from "@/partner-card";
import { C, F } from "@/theme";
import { Empty, Header, Icon, Loading, ServiceIcon, Txt } from "@/ui";

export default function Search() {
  const { t, L, settings, rtl } = useI18n();
  const params = useLocalSearchParams<{ service?: string }>();
  const [service, setService] = useState(params.service || "");
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setDq(q), 250);
    return () => clearTimeout(id);
  }, [q]);
  const qs = new URLSearchParams({ ...(dq && { q: dq }), ...(service && { service }) }).toString();
  const { data } = useSWR(`/api/partners?${qs}`);
  const services: any[] = settings.services || [];
  const svc = services.find((s) => s.slug === service);
  return (
    <View style={{ flex: 1, backgroundColor: C.white }}>
      <Header title={svc ? L(svc, "name") : t("search")} />
      <View style={{ padding: 16, paddingBottom: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.ink100, borderRadius: 16, height: 48, paddingHorizontal: 14 }}>
          <Icon name="search" size={18} color={C.ink400} />
          <TextInput value={q} onChangeText={setQ} autoFocus={!service} placeholder={t("search_ph")} placeholderTextColor={C.ink400} style={{ flex: 1, fontFamily: F.medium, fontSize: 15, color: C.ink900, textAlign: rtl ? "right" : "left" }} />
          {q ? <Pressable onPress={() => setQ("")}><Icon name="close-circle" size={18} color={C.ink400} /></Pressable> : null}
        </View>
      </View>
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 8 }}>
          {[{ slug: "", name_ar: t("all"), name_en: t("all"), icon: "" }, ...services].map((s: any) => {
            const on = service === s.slug;
            return (
              <Pressable key={s.slug || "all"} onPress={() => setService(s.slug)} style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 38, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: on ? C.ink900 : C.ink200, backgroundColor: on ? C.ink900 : C.white }}>
                {s.icon ? <ServiceIcon name={s.icon} size={16} color={on ? "#fff" : C.ink700} /> : null}
                <Txt w="bold" size={12} color={on ? "#fff" : C.ink700}>{L(s, "name")}</Txt>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      {!data ? <Loading /> : (
        <FlatList
          data={data.partners}
          keyExtractor={(p: any) => String(p.id)}
          renderItem={({ item }) => <PartnerCard p={item} />}
          ListEmptyComponent={<Empty icon="search" title={t("no_results")} />}
        />
      )}
    </View>
  );
}
