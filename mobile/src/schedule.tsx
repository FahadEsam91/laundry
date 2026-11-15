import { Pressable, ScrollView, View } from "react-native";
import { useI18n } from "./i18n";
import { C } from "./theme";
import { Txt } from "./ui";

/** Saturday-first week, as people plan it in Iraq. */
export const WEEK = [6, 0, 1, 2, 3, 4, 5];
export const TIMES = Array.from({ length: 16 }, (_, i) => `${String(7 + i).padStart(2, "0")}:00`);
export function timeLabel(t: string, lang: string) {
  const h = Number(t.slice(0, 2));
  const h12 = ((h + 11) % 12) + 1;
  return lang === "ar" ? `${h12}:00 ${h < 12 ? "ص" : "م"}` : `${h12}:00 ${h < 12 ? "am" : "pm"}`;
}

/** Weekday chips + pickup time for recurring pickups. */
export function SchedulePicker({ days, time, onChange }: { days: number[]; time: string; onChange: (v: { days: number[]; time: string }) => void }) {
  const { t, lang } = useI18n();
  const chip = (on: boolean) => ({ paddingHorizontal: 12, height: 38, borderRadius: 12, borderWidth: 1.5, alignItems: "center" as const, justifyContent: "center" as const, borderColor: on ? C.brand : C.ink200, backgroundColor: on ? C.brand : C.white });
  return (
    <View style={{ gap: 12 }}>
      <View>
        <Txt w="semibold" size={12} color={C.ink500} style={{ marginBottom: 6 }}>{t("repeat_days")}</Txt>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {WEEK.map((d) => {
            const on = days.includes(d);
            return (
              <Pressable key={d} onPress={() => onChange({ days: on ? days.filter((x) => x !== d) : [...days, d], time })} style={chip(on)}>
                <Txt w="bold" size={12} color={on ? "#fff" : C.ink700}>{t(`day_${d}` as any)}</Txt>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View>
        <Txt w="semibold" size={12} color={C.ink500} style={{ marginBottom: 6 }}>{t("repeat_time")}</Txt>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {TIMES.map((x) => (
            <Pressable key={x} onPress={() => onChange({ days, time: x })} style={chip(time === x)}>
              <Txt w="bold" size={12} color={time === x ? "#fff" : C.ink700}>{timeLabel(x, lang)}</Txt>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}
