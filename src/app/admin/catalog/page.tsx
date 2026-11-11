"use client";

import { useState } from "react";
import useSWR from "swr";
import { Pencil } from "lucide-react";
import { useApp, useToast } from "@/components/providers";
import { PageHead } from "@/components/admin";
import { Button, Input, ServiceIcon, Sheet, Skeleton, Toggle } from "@/components/ui";
import { api } from "@/lib/client";

export default function CatalogPage() {
  const { t, L, money, num, lang } = useApp();
  const toast = useToast();
  const { data, mutate } = useSWR("/api/admin/services");
  const [edit, setEdit] = useState<any>(null);
  const patch = async (id: number, b: any) => {
    await api(`/api/admin/services/${id}`, { method: "PATCH", body: b });
    mutate();
    toast(t("saved"));
  };
  return (
    <div className="animate-fade-up">
      <PageHead title={t("catalog")} sub={lang === "ar" ? "الخدمات المتاحة على المنصة. أسعار القطع يحددها كل شريك من لوحة المغاسل." : "Platform services. Item prices are set per laundry from the Laundries page."} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {!data && [...Array(6)].map((_, i) => <Skeleton key={i} className="h-44" />)}
        {data?.services?.map((s: any) => (
          <div key={s.id} className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: `${s.color}14`, color: s.color }}><ServiceIcon name={s.icon} className="h-6 w-6" /></span>
              <div className="min-w-0 flex-1">
                <div className="font-bold">{L(s, "name")}</div>
                <div className="text-xs text-ink-500">{L(s, "desc")}</div>
              </div>
              <Toggle checked={!!s.active} onChange={(v) => patch(s.id, { active: v })} />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-ink-50 p-3 text-center">
              <div><div className="text-sm font-extrabold tabular">{s.partners}</div><div className="text-[10px] text-ink-500">{t("partners")}</div></div>
              <div><div className="text-sm font-extrabold tabular">{money(s.avg_price || 0)}</div><div className="text-[10px] text-ink-500">{lang === "ar" ? "متوسط السعر" : "Avg price"}</div></div>
              <div><div className="text-sm font-extrabold tabular">{new Intl.NumberFormat("en", { notation: "compact" }).format(s.sales_30)}</div><div className="text-[10px] text-ink-500">{t("gmv")} 30d</div></div>
            </div>
            <Button size="sm" variant="ghost" className="mt-3" onClick={() => setEdit({ ...s })}><Pencil className="h-4 w-4" /> {t("edit")}</Button>
          </div>
        ))}
      </div>
      <Sheet open={!!edit} onClose={() => setEdit(null)} title={t("edit")}>
        {edit && (
          <div className="space-y-3">
            {["name_ar", "name_en", "desc_ar", "desc_en"].map((k) => (
              <Input key={k} label={k} value={edit[k] || ""} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} />
            ))}
            <Input label="color" type="color" value={edit.color} onChange={(e) => setEdit({ ...edit, color: e.target.value })} className="p-1" />
            <Button block onClick={async () => { const { id, name_ar, name_en, desc_ar, desc_en, color } = edit; await patch(id, { name_ar, name_en, desc_ar, desc_en, color }); setEdit(null); }}>{t("save")}</Button>
          </div>
        )}
      </Sheet>
    </div>
  );
}
