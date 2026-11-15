"use client";

import { useState } from "react";
import useSWR from "swr";
import { Shirt, Sparkles, CalendarCheck, Pencil, Truck } from "lucide-react";
import { useApp, useToast } from "@/components/providers";
import { TopBar } from "@/components/customer";
import { Button, Empty, Input, Sheet, Skeleton, Textarea, cx } from "@/components/ui";
import { Reveal } from "@/components/reveal";
import { api, errText } from "@/lib/client";

export default function WardrobePage() {
  const { t, lang, fmtDate, num } = useApp();
  const toast = useToast();
  const { data, mutate } = useSWR("/api/wardrobe");
  const [edit, setEdit] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const list: any[] = data?.garments || [];
  const total = list.reduce((a, g) => a + g.wash_count, 0);

  const save = async () => {
    setBusy(true);
    try {
      await api(`/api/wardrobe/${edit.id}`, { method: "PATCH", body: { name: edit.name, notes: edit.notes || "" } });
      setEdit(null);
      mutate();
      toast(t("saved"));
    } catch (e) {
      toast(errText(e, lang), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pb-24 lg:mx-auto lg:max-w-5xl lg:px-8 lg:pb-12">
      <TopBar title={t("wardrobe")} back="/account" />
      <div className="px-4 lg:px-0">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 to-sky-500 p-5 text-white">
          <div className="blob -end-10 -top-10 h-40 w-40 bg-white/40" />
          <div className="relative flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15"><Shirt className="h-7 w-7" /></span>
            <div>
              <div className="text-2xl font-extrabold">{num(list.length)} <span className="text-base font-semibold text-white/80">{lang === "ar" ? "قطعة" : "items"}</span></div>
              <div className="text-sm text-white/80">{num(total)} {lang === "ar" ? "مرة تنظيف" : "cleanings"}</div>
            </div>
          </div>
          <p className="relative mt-3 text-xs text-white/80">{t("wardrobe_sub")}</p>
        </div>
      </div>
      <div className="p-4 lg:px-0">
        {!data && <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-40" />)}</div>}
        {data && !list.length && <Empty icon={<Shirt className="h-9 w-9" />} title={t("wardrobe")} sub={t("wardrobe_empty")} />}
        <Reveal stagger className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {list.map((g) => (
            <button key={g.id} onClick={() => setEdit({ id: g.id, name: g.name || "", notes: g.notes || "" })} className="group rounded-3xl border border-ink-100 bg-white p-4 text-start shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
              <div className="flex items-start justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-2xl transition group-hover:scale-110">{g.icon}</span>
                <Pencil className="h-4 w-4 text-ink-300 transition group-hover:text-brand-500" />
              </div>
              <div className="mt-3 truncate font-bold">{g.name}</div>
              <div dir="ltr" className="text-end text-[10px] text-ink-400 rtl:text-start">{g.tag}</div>
              <div className="mt-3 space-y-1 text-xs text-ink-600">
                <div className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-brand-500" /> {t("times_cleaned")}: <b>{num(g.wash_count)}</b></div>
                {g.last_cleaned_at && <div className="flex items-center gap-1.5"><CalendarCheck className="h-3.5 w-3.5 text-emerald-500" /> {fmtDate(g.last_cleaned_at, { day: "numeric", month: "short", year: "numeric" })}</div>}
              </div>
              {g.active_status && <div className={cx("mt-3 flex items-center gap-1.5 rounded-full bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-700")}><Truck className="h-3.5 w-3.5" /> {t("in_service")}</div>}
              {g.notes && <div className="mt-2 line-clamp-2 text-[11px] text-ink-500">📝 {g.notes}</div>}
            </button>
          ))}
        </Reveal>
      </div>
      <Sheet open={!!edit} onClose={() => setEdit(null)} title={t("rename")}>
        {edit && (
          <div className="space-y-4">
            <Input label={t("rename")} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            <Textarea label={t("care_notes")} value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} placeholder={lang === "ar" ? "مثلاً: بدون نشا، كوي على حرارة منخفضة" : "e.g. no starch, low-heat ironing"} />
            <Button block loading={busy} onClick={save}>{t("save")}</Button>
          </div>
        )}
      </Sheet>
    </div>
  );
}
