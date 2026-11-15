"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Repeat, CalendarClock, Trash2, Pencil, AlertTriangle, MapPin } from "lucide-react";
import { useApp, useToast } from "@/components/providers";
import { TopBar } from "@/components/customer";
import { Button, Empty, PartnerLogo, Sheet, Skeleton, Toggle, cx } from "@/components/ui";
import { SchedulePicker, WEEK, timeLabel } from "@/components/schedule-picker";
import { Reveal } from "@/components/reveal";
import { api, errText } from "@/lib/client";

export default function SchedulesPage() {
  const { t, L, lang, fmtDate } = useApp();
  const toast = useToast();
  const { data, mutate } = useSWR("/api/schedules");
  const [edit, setEdit] = useState<any>(null);
  const [del, setDel] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const list: any[] = data?.schedules || [];

  const patch = async (id: number, body: any) => {
    try {
      await api(`/api/schedules/${id}`, { method: "PATCH", body });
      mutate();
      return true;
    } catch (e) {
      toast(errText(e, lang), "error");
      return false;
    }
  };
  const saveEdit = async () => {
    setBusy(true);
    if (await patch(edit.id, { days: edit.days, time: edit.time })) {
      toast(t("saved"));
      setEdit(null);
    }
    setBusy(false);
  };
  const remove = async () => {
    setBusy(true);
    await api(`/api/schedules/${del.id}`, { method: "DELETE" }).catch(() => {});
    setBusy(false);
    setDel(null);
    mutate();
  };
  const daysText = (days: number[]) => WEEK.filter((d) => days.includes(d)).map((d) => t(`day_${d}` as any)).join("، ");

  return (
    <div className="pb-24 lg:mx-auto lg:max-w-3xl lg:px-8 lg:pb-12">
      <TopBar title={t("schedules")} back="/account" />
      <div className="space-y-3 p-4 lg:px-0">
        {!data && [1, 2].map((i) => <Skeleton key={i} className="h-40" />)}
        {data && !list.length && <Empty icon={<Repeat className="h-9 w-9" />} title={t("schedules")} sub={t("schedules_empty")} action={<Link href="/"><Button>{t("browse")}</Button></Link>} />}
        <Reveal stagger className="space-y-3">
          {list.map((s) => (
            <div key={s.id} className={cx("rounded-3xl border bg-white p-4 shadow-soft transition", s.active ? "border-ink-100" : "border-ink-100 opacity-70")}>
              <div className="flex items-center gap-3">
                <PartnerLogo p={{ color: s.color, color2: s.color2, initials: s.initials, logo_url: s.logo_url }} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold">{L({ name_ar: s.partner_ar, name_en: s.partner_en }, "name")}</div>
                  <div className="flex items-center gap-1 text-xs text-ink-500"><MapPin className="h-3 w-3" />{s.address_area} • {s.items_count} {lang === "ar" ? "قطعة" : "items"}</div>
                </div>
                <Toggle checked={!!s.active} onChange={(v) => patch(s.id, { active: v })} />
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-2xl bg-brand-50 p-3 text-sm">
                <Repeat className="h-4 w-4 shrink-0 text-brand-600" />
                <span className="font-bold text-brand-800">{t("every")} {daysText(s.days)}</span>
                <span className="text-brand-700">• {timeLabel(s.time, lang)}</span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-ink-500">
                <CalendarClock className="h-3.5 w-3.5" />
                {s.active && s.next_run_at ? <>{t("next_pickup")}: <b className="text-ink-800">{fmtDate(s.next_run_at, { weekday: "long", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</b></> : t("schedule_paused")}
              </div>
              {s.last_error && (
                <div className="mt-2 flex items-center gap-1.5 rounded-xl bg-amber-50 p-2 text-xs font-semibold text-amber-800">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {t("schedule_error")}: {errText({ code: s.last_error }, lang)}
                </div>
              )}
              <div className="mt-3 flex justify-end gap-2 border-t border-ink-100 pt-3">
                {s.last_order_id && <Link href={`/orders/${s.last_order_id}`} className="me-auto self-center text-xs font-bold text-brand-600">{lang === "ar" ? "آخر طلب ←" : "Last order →"}</Link>}
                <Button size="sm" variant="outline" onClick={() => setEdit({ id: s.id, days: s.days, time: s.time })}><Pencil className="h-3.5 w-3.5" /> {t("edit")}</Button>
                <Button size="sm" variant="ghost" className="text-red-600" onClick={() => setDel(s)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ))}
        </Reveal>
      </div>

      <Sheet open={!!edit} onClose={() => setEdit(null)} title={t("edit")}>
        {edit && (
          <div className="space-y-5">
            <SchedulePicker days={edit.days} time={edit.time} onChange={(v) => setEdit({ ...edit, ...v })} />
            <Button block loading={busy} onClick={saveEdit}>{t("save")}</Button>
          </div>
        )}
      </Sheet>
      <Sheet open={!!del} onClose={() => setDel(null)} title={t("delete")}>
        {del && (
          <div className="space-y-4">
            <p className="text-sm text-ink-600">{L({ name_ar: del.partner_ar, name_en: del.partner_en }, "name")} • {t("every")} {daysText(del.days)}</p>
            <div className="flex gap-2">
              <Button variant="danger" block loading={busy} onClick={remove}><Trash2 className="h-4 w-4" /> {t("delete")}</Button>
              <Button variant="outline" onClick={() => setDel(null)}>{t("cancel")}</Button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
