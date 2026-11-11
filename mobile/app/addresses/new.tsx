import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { api } from "@/api";
import { useAuth } from "@/auth";
import { useI18n, errText } from "@/i18n";
import { useToast } from "@/toast";
import { LiveMap } from "@/map";
import { C } from "@/theme";
import { Btn, Header, Icon, Input, Txt } from "@/ui";

export default function NewAddress() {
  const { t, lang, settings } = useI18n();
  const { refreshMe } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [pos, setPos] = useState<[number, number]>([settings.map_lat || 33.315, settings.map_lng || 44.38]);
  const [label, setLabel] = useState<"home" | "work" | "other">("home");
  const [f, setF] = useState({ area: "", street: "", building: "", notes: "" });
  const [busy, setBusy] = useState(false);

  const locate = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return toast(lang === "ar" ? "يرجى السماح بالوصول للموقع" : "Please allow location access", "error");
    const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setPos([p.coords.latitude, p.coords.longitude]);
    try {
      const [g] = await Location.reverseGeocodeAsync({ latitude: p.coords.latitude, longitude: p.coords.longitude });
      if (g) setF((x) => ({ ...x, area: x.area || g.district || g.subregion || g.city || "", street: x.street || g.street || "" }));
    } catch {}
  };
  useEffect(() => {
    locate().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    if (!f.area.trim()) return toast(`${t("area")} ✱`, "error");
    setBusy(true);
    try {
      await api("/api/addresses", { body: { label, ...f, lat: pos[0], lng: pos[1], is_default: true } });
      refreshMe();
      toast(t("saved"));
      router.back();
    } catch (e) {
      toast(errText(e, lang), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.white }}>
      <Header title={t("add_address")} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
        <View>
          <LiveMap key={pos.join()} pins={[{ id: "pin", lat: pos[0], lng: pos[1], kind: "home" }]} center={pos} height={240} onPick={(a, b) => setPos([a, b])} />
          <Pressable onPress={locate} style={{ position: "absolute", bottom: 12, start: 12, flexDirection: "row", gap: 6, alignItems: "center", backgroundColor: C.white, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }}>
            <Icon name="locate" size={16} color={C.brand} /><Txt w="bold" size={12}>{t("use_my_location")}</Txt>
          </Pressable>
        </View>
        <View style={{ padding: 16, gap: 12 }}>
          <Txt size={12} color={C.ink500}>{t("pin_location")}</Txt>
          <View style={{ flexDirection: "row", backgroundColor: C.ink100, borderRadius: 14, padding: 4 }}>
            {(["home", "work", "other"] as const).map((k) => (
              <Pressable key={k} onPress={() => setLabel(k)} style={{ flex: 1, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: label === k ? C.white : "transparent" }}>
                <Txt w="bold" size={13} color={label === k ? C.ink900 : C.ink500}>{t(`label_${k}`)}</Txt>
              </Pressable>
            ))}
          </View>
          <Input label={t("area")} value={f.area} onChangeText={(v) => setF({ ...f, area: v })} />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}><Input label={t("street")} value={f.street} onChangeText={(v) => setF({ ...f, street: v })} /></View>
            <View style={{ flex: 1 }}><Input label={t("building")} value={f.building} onChangeText={(v) => setF({ ...f, building: v })} /></View>
          </View>
          <Input label={`${t("details")} (${t("optional")})`} value={f.notes} onChangeText={(v) => setF({ ...f, notes: v })} />
          <Btn title={t("save")} size="lg" loading={busy} onPress={save} />
        </View>
      </ScrollView>
    </View>
  );
}
