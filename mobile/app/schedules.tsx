import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import useSWR from "swr";
import { api } from "@/api";
import { useI18n, errText } from "@/i18n";
import { useToast } from "@/toast";
import { C, shadow } from "@/theme";
import { Btn, Empty, Header, Icon, Loading, PartnerLogo, Sheet, Txt } from "@/ui";
import { SchedulePicker, WEEK, timeLabel } from "@/schedule";
import { FadeIn } from "@/motion";

export default function Schedules() {
  const { t, L, lang, fmtDate, money } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const { data, mutate, isValidating } = useSWR("/api/schedules");
  const [edit, setEdit] = useState<any>(null);
  const [del, setDel] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const list: any[] = data?.schedules || [];
  const daysText = (days: number[]) => WEEK.filter((d) => days.includes(d)).map((d) => t(`day_${d}` as any)).join("، ");

  const patch = async (id: number, body: any) => {
    try {
      await api(`/api/schedules/${id}`, { method: "PATCH", body });
      mutate();
      return true;
    } catch (e) {
      toast(errText(e, lang, money), "error");
      return false;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.ink50 }}>
      <Header title={t("schedules")} />
      {!data ? (
        <Loading />
      ) : !list.length ? (
        <Empty icon="repeat" title={t("schedules")} sub={t("schedules_empty")} action={<Btn title={t("browse")} onPress={() => router.replace("/home")} />} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={isValidating} onRefresh={() => mutate()} />}>
          {list.map((s, i) => (
            <FadeIn key={s.id} delay={i * 70}>
              <View style={{ backgroundColor: C.white, borderRadius: 22, padding: 14, opacity: s.active ? 1 : 0.7, ...shadow }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <PartnerLogo p={{ color: s.color, color2: s.color2, initials: s.initials, logo_url: s.logo_url }} size={44} />
                  <View style={{ flex: 1 }}>
                    <Txt w="bold" numberOfLines={1}>{L({ name_ar: s.partner_ar, name_en: s.partner_en }, "name")}</Txt>
                    <Txt size={12} color={C.ink500}>{s.address_area} • {s.items_count} {lang === "ar" ? "قطعة" : "items"}</Txt>
                  </View>
                  <Pressable onPress={() => patch(s.id, { active: !s.active })} hitSlop={8} style={{ width: 46, height: 28, borderRadius: 14, padding: 3, backgroundColor: s.active ? C.brand : C.ink200, alignItems: s.active ? "flex-end" : "flex-start" }}>
                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff" }} />
                  </Pressable>
                </View>
                <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.brandSoft, borderRadius: 14, padding: 10 }}>
                  <Icon name="repeat" size={16} color={C.brand} />
                  <Txt w="bold" size={13} color={C.brandDark} style={{ flex: 1 }}>{t("every")} {daysText(s.days)} • {timeLabel(s.time, lang)}</Txt>
                </View>
                <Txt size={12} color={C.ink500} style={{ marginTop: 8 }}>
                  {s.active && s.next_run_at ? `${t("next_pickup")}: ${fmtDate(s.next_run_at, { weekday: "long", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}` : t("schedule_paused")}
                </Txt>
                {s.last_error ? <Txt size={12} color={C.amber} style={{ marginTop: 6 }}>⚠️ {t("schedule_error")}: {errText({ code: s.last_error }, lang, money)}</Txt> : null}
                <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 12, borderTopWidth: 1, borderTopColor: C.ink100, paddingTop: 12 }}>
                  <Btn title={t("edit")} variant="outline" size="sm" icon="create-outline" onPress={() => setEdit({ id: s.id, days: s.days, time: s.time })} />
                  <Btn title={t("delete")} variant="ghost" size="sm" icon="trash-outline" onPress={() => setDel(s)} />
                </View>
              </View>
            </FadeIn>
          ))}
        </ScrollView>
      )}
      <Sheet open={!!edit} onClose={() => setEdit(null)} title={t("edit")}>
        {edit ? (
          <View style={{ gap: 18 }}>
            <SchedulePicker days={edit.days} time={edit.time} onChange={(v) => setEdit({ ...edit, ...v })} />
            <Btn title={t("save")} loading={busy} onPress={async () => { setBusy(true); if (await patch(edit.id, { days: edit.days, time: edit.time })) { toast(t("saved")); setEdit(null); } setBusy(false); }} />
          </View>
        ) : null}
      </Sheet>
      <Sheet open={!!del} onClose={() => setDel(null)} title={t("delete")}>
        {del ? (
          <View style={{ gap: 14 }}>
            <Txt color={C.ink700}>{L({ name_ar: del.partner_ar, name_en: del.partner_en }, "name")} • {t("every")} {daysText(del.days)}</Txt>
            <Btn title={t("delete")} variant="danger" icon="trash" loading={busy} onPress={async () => { setBusy(true); await api(`/api/schedules/${del.id}`, { method: "DELETE" }).catch(() => {}); setBusy(false); setDel(null); mutate(); }} />
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}
