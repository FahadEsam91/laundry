import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import useSWR from "swr";
import { api } from "@/api";
import { useI18n, errText } from "@/i18n";
import { useToast } from "@/toast";
import { C, shadow } from "@/theme";
import { Btn, Empty, Header, Icon, Input, Loading, Sheet, Txt } from "@/ui";
import { FadeIn } from "@/motion";

export default function Wardrobe() {
  const { t, lang, num, fmtDate, money } = useI18n();
  const toast = useToast();
  const { data, mutate, isValidating } = useSWR("/api/wardrobe");
  const [edit, setEdit] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const list: any[] = data?.garments || [];
  const total = list.reduce((a, g) => a + g.wash_count, 0);

  return (
    <View style={{ flex: 1, backgroundColor: C.ink50 }}>
      <Header title={t("wardrobe")} />
      {!data ? (
        <Loading />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={isValidating} onRefresh={() => mutate()} />}>
          <LinearGradient colors={[C.brand, "#38BDF8"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 24, padding: 18, gap: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 52, height: 52, borderRadius: 18, backgroundColor: "rgba(255,255,255,.18)", alignItems: "center", justifyContent: "center" }}><Icon name="shirt" size={26} color="#fff" /></View>
              <View>
                <Txt w="bold" size={24} color="#fff">{num(list.length)} {lang === "ar" ? "قطعة" : "items"}</Txt>
                <Txt color="rgba(255,255,255,.85)">{num(total)} {lang === "ar" ? "مرة تنظيف" : "cleanings"}</Txt>
              </View>
            </View>
            <Txt size={12} color="rgba(255,255,255,.85)">{t("wardrobe_sub")}</Txt>
          </LinearGradient>
          {!list.length ? <Empty icon="shirt-outline" title={t("wardrobe")} sub={t("wardrobe_empty")} /> : null}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {list.map((g, i) => (
              <FadeIn key={g.id} delay={Math.min(i, 10) * 50} style={{ width: "47.5%" }}>
                <Pressable onPress={() => setEdit({ id: g.id, name: g.name || "", notes: g.notes || "" })} style={{ backgroundColor: C.white, borderRadius: 20, padding: 14, gap: 6, ...shadow }}>
                  <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: C.brandSoft, alignItems: "center", justifyContent: "center" }}><Txt size={22}>{g.icon}</Txt></View>
                  <Txt w="bold" numberOfLines={1}>{g.name}</Txt>
                  <Txt size={11} color={C.ink400}>{g.tag}</Txt>
                  <Txt size={12} color={C.ink700}>✨ {t("times_cleaned")}: <Txt w="bold" size={12}>{num(g.wash_count)}</Txt></Txt>
                  {g.last_cleaned_at ? <Txt size={12} color={C.ink500}>📅 {fmtDate(g.last_cleaned_at, { day: "numeric", month: "short", year: "numeric" })}</Txt> : null}
                  {g.active_status ? <View style={{ alignSelf: "flex-start", backgroundColor: "#FFFBEB", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}><Txt w="bold" size={11} color={C.amber}>🛵 {t("in_service")}</Txt></View> : null}
                </Pressable>
              </FadeIn>
            ))}
          </View>
        </ScrollView>
      )}
      <Sheet open={!!edit} onClose={() => setEdit(null)} title={t("rename")}>
        {edit ? (
          <View style={{ gap: 12 }}>
            <Input value={edit.name} onChangeText={(v) => setEdit({ ...edit, name: v })} placeholder={t("rename")} />
            <Input value={edit.notes} onChangeText={(v) => setEdit({ ...edit, notes: v })} placeholder={t("care_notes")} multiline style={{ height: 80, textAlignVertical: "top", paddingTop: 12 }} />
            <Btn title={t("save")} loading={busy} onPress={async () => { setBusy(true); try { await api(`/api/wardrobe/${edit.id}`, { method: "PATCH", body: { name: edit.name, notes: edit.notes } }); setEdit(null); mutate(); toast(t("saved")); } catch (e) { toast(errText(e, lang, money), "error"); } setBusy(false); }} />
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}
