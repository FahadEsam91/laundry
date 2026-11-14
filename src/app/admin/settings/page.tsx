"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { Bot, Coins, Globe2, CreditCard, Crown, Camera } from "lucide-react";
import { useApp, useToast } from "@/components/providers";
import { PageHead, Panel } from "@/components/admin";
import { Button, Input, Skeleton, Toggle } from "@/components/ui";
import { api } from "@/lib/client";

export default function SettingsPage() {
  const { t, lang } = useApp();
  const toast = useToast();
  const { data, mutate } = useSWR("/api/admin/settings");
  const [s, setS] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data && !s) setS(data.settings); }, [data, s]);
  if (!s) return <Skeleton className="h-96" />;
  const F = (k: string, label: string, type = "text") => (
    <Input label={label} type={type} value={s[k] ?? ""} onChange={(e) => setS({ ...s, [k]: type === "number" ? Number(e.target.value) : e.target.value })} />
  );
  const save = async () => {
    setBusy(true);
    await api("/api/admin/settings", { method: "PATCH", body: s });
    setBusy(false);
    mutate();
    toast(t("saved"));
    setTimeout(() => location.reload(), 600);
  };
  return (
    <div className="animate-fade-up max-w-4xl">
      <PageHead title={t("settings")} actions={<Button loading={busy} onClick={save}>{t("save")}</Button>} />
      <div className="space-y-4">
        <Panel title={<span className="flex items-center gap-2"><Bot className="h-5 w-5 text-brand-600" /> {t("demo_mode")}</span>} sub={t("demo_mode_d")}>
          <div className="flex flex-wrap items-end gap-6">
            <label className="flex items-center gap-3 text-sm font-semibold"><Toggle checked={!!s.autopilot} onChange={(v) => setS({ ...s, autopilot: v })} /> {s.autopilot ? t("active") : t("inactive")}</label>
            <div className="w-48">{F("autopilot_seconds", t("step_seconds"), "number")}</div>
          </div>
          <p className="mt-3 text-xs text-ink-400">{lang === "ar" ? "يطبق على الطلبات الجديدة فقط. أوقفه لتشغيل المغاسل والمندوبين يدوياً من لوحاتهم." : "Applies to newly placed orders. Turn it off to run orders manually from the laundry & rider apps."}</p>
        </Panel>
        <Panel title={<span className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-amber-600" /> {t("online_payments")}</span>} sub={t("online_payments_d")}>
          <label className="flex items-center gap-3 text-sm font-semibold"><Toggle checked={!!s.online_payments} onChange={(v) => setS({ ...s, online_payments: v })} /> {s.online_payments ? t("active") : t("inactive")}</label>
        </Panel>
        <Panel title={<span className="flex items-center gap-2"><Crown className="h-5 w-5 text-amber-500" /> {t("memberships_setting")}</span>} sub={t("memberships_setting_d")}>
          <label className="flex items-center gap-3 text-sm font-semibold"><Toggle checked={!!s.memberships} onChange={(v) => setS({ ...s, memberships: v })} /> {s.memberships ? t("active") : t("inactive")}</label>
        </Panel>
        <Panel title={<span className="flex items-center gap-2"><Camera className="h-5 w-5 text-brand-600" /> {t("photos_required_setting")}</span>} sub={t("photos_required_setting_d")}>
          <label className="flex items-center gap-3 text-sm font-semibold"><Toggle checked={!!s.photos_required} onChange={(v) => setS({ ...s, photos_required: v })} /> {s.photos_required ? t("active") : t("inactive")}</label>
        </Panel>
        <Panel title={<span className="flex items-center gap-2"><Coins className="h-5 w-5 text-emerald-600" /> {t("fees_taxes")}</span>}>
          <div className="grid gap-4 md:grid-cols-2">
            {F("service_fee", t("service_fee"), "number")}
            {F("free_delivery_over", t("free_delivery_over"), "number")}
            {F("express_pct", t("express_pct"), "number")}
            {F("vat_pct", t("vat_pct"), "number")}
          </div>
        </Panel>
        <Panel title={<span className="flex items-center gap-2"><Globe2 className="h-5 w-5 text-violet-600" /> {t("general")}</span>}>
          <div className="grid gap-4 md:grid-cols-2">
            {F("app_name", "App name")}
            {F("support_phone", t("support_phone"))}
            {F("currency_code", `${t("currency")} (ISO)`)}
            {F("timezone", "Timezone")}
            {F("currency_ar", `${t("currency")} (AR)`)}
            {F("currency_en", `${t("currency")} (EN)`)}
            {F("city_ar", `${t("city")} (AR)`)}
            {F("city_en", `${t("city")} (EN)`)}
            {F("map_lat", "Map lat", "number")}
            {F("map_lng", "Map lng", "number")}
          </div>
        </Panel>
      </div>
    </div>
  );
}
