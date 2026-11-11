"use client";

import useSWR from "swr";
import { useApp, useToast } from "@/components/providers";
import { PageHead, Panel } from "@/components/admin";
import { Skeleton, Toggle } from "@/components/ui";
import { api } from "@/lib/client";
import { UNIT_LABEL } from "@/lib/constants";

export default function MenuPage() {
  const { t, L, lang, money } = useApp();
  const toast = useToast();
  const { data, mutate } = useSWR("/api/partner/products");
  const update = async (id: number, b: any) => {
    await api(`/api/partner/products/${id}`, { method: "PATCH", body: b });
    mutate();
    toast(t("saved"));
  };
  const groups: Record<string, any[]> = {};
  for (const p of data?.products || []) (groups[lang === "ar" ? p.s_ar : p.s_en] ||= []).push(p);
  return (
    <div className="animate-fade-up max-w-4xl">
      <PageHead title={t("menu")} sub={lang === "ar" ? "عدّل الأسعار وتوفر القطع — تظهر التغييرات للزبائن فوراً" : "Edit prices & availability — changes go live instantly"} />
      {!data && <Skeleton className="h-96" />}
      <div className="space-y-4">
        {Object.entries(groups).map(([g, items]) => (
          <Panel key={g} title={g} bodyClass="p-0">
            <div className="divide-y divide-ink-100">
              {items.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-50 text-xl">{p.icon}</span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{L(p, "name")}</div>
                    <div className="text-xs text-ink-400">{money(p.price)} / {(UNIT_LABEL[p.unit] || UNIT_LABEL.piece)[lang]}</div>
                  </div>
                  <input type="number" step={250} defaultValue={p.price} onBlur={(e) => Number(e.target.value) !== p.price && update(p.id, { price: Number(e.target.value) })} className="h-10 w-28 rounded-xl border border-ink-200 px-3 text-sm font-bold tabular outline-none focus:border-brand-500" />
                  <Toggle checked={!!p.active} onChange={(v) => update(p.id, { active: v })} />
                </div>
              ))}
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
