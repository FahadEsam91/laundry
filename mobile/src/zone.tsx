import { View } from "react-native";
import useSWR from "swr";
import { useI18n } from "./i18n";
import { Icon, Txt } from "./ui";

/** Whether a location is inside an open service zone (renders nothing while zones aren't set up). */
export function ZoneBadge({ lat, lng, style }: { lat?: number; lng?: number; style?: any }) {
  const { t, L } = useI18n();
  const { data } = useSWR(lat && lng ? `/api/zones/check?lat=${lat.toFixed(5)}&lng=${lng.toFixed(5)}` : null);
  if (!data || data.status === "open") return null;
  const [bg, fg] = data.status === "ok" ? ["#ECFDF5", "#065F46"] : data.status === "paused" ? ["#FFFBEB", "#92400E"] : ["#FEF2F2", "#B91C1C"];
  const text = data.status === "ok" ? t("zone_ok", { x: L(data.zone, "name") }) : data.status === "paused" ? t("zone_paused_short") : t("zone_outside_short");
  return (
    <View style={[{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: bg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 }, style]}>
      <Icon name="location" size={16} color={fg} />
      <Txt w="bold" size={12} color={fg} style={{ flex: 1 }}>{text}</Txt>
    </View>
  );
}
