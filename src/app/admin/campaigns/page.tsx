"use client";

import { useState } from "react";
import useSWR from "swr";
import { Megaphone, Send, Smartphone, Users, BellRing } from "lucide-react";
import { useApp, useToast } from "@/components/providers";
import { Kpi, PageHead, Panel, Table, Td } from "@/components/admin";
import { Button, Input, LogoMark, Select, Skeleton, Textarea, cx } from "@/components/ui";
import { PushCard } from "@/components/push";
import { api, errText, timeAgo } from "@/lib/client";

const AUDS = ["all", "members", "non_members", "inactive", "drivers", "partners"] as const;
const LINKS = ["/", "/plus", "/offers", "/orders", "/driver", "/partner"];

export default function CampaignsPage() {
  const { t, num, lang } = useApp();
  const toast = useToast();
  const { data, mutate } = useSWR("/api/admin/broadcast");
  const [f, setF] = useState({ audience: "all", title_ar: "", title_en: "", body_ar: "", body_en: "", url: "/offers" });
  const [busy, setBusy] = useState(false);
  const [previewLang, setPreviewLang] = useState<"ar" | "en">(lang);
  const aud = data?.audiences?.[f.audience];
  const devices = (data?.devices || []).reduce((a: number, d: any) => a + d.c, 0);
  const pushUsers = (data?.devices || []).reduce((a: number, d: any) => a + d.users, 0);

  const send = async () => {
    setBusy(true);
    try {
      const r = await api("/api/admin/broadcast", { body: f });
      toast(t("campaign_sent", { n: num(r.recipients) }));
      setF({ ...f, title_ar: "", title_en: "", body_ar: "", body_en: "" });
      mutate();
    } catch (e) {
      toast(errText(e, lang), "error");
    } finally {
      setBusy(false);
    }
  };
  const audLabel = (a: string) => t(`aud_${a}` as any);
  const pt = previewLang === "ar" ? f.title_ar : f.title_en;
  const pb = previewLang === "ar" ? f.body_ar : f.body_en;

  return (
    <div className="animate-fade-up">
      <PageHead title={t("campaigns")} sub={lang === "ar" ? "أرسل إشعارات فورية لهواتف الزبائن والمندوبين والمغاسل" : "Send instant notifications to customers', riders' and laundries' phones"} />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label={t("push_devices")} value={num(devices)} icon={Smartphone} />
        <Kpi label={lang === "ar" ? "مستخدمون مفعّلون" : "Users with push"} value={num(pushUsers)} icon={BellRing} accent="#059669" />
        <Kpi label={t("aud_all")} value={num(data?.audiences?.all?.users || 0)} icon={Users} accent="#7C3AED" />
        <Kpi label={lang === "ar" ? "حملات مرسلة" : "Campaigns sent"} value={num(data?.history?.length || 0)} icon={Megaphone} accent="#EA580C" />
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <Panel className="xl:col-span-3" title={t("new_campaign")}>
          {!data ? <Skeleton className="h-80" /> : (
            <div className="space-y-4">
              <div>
                <div className="mb-1.5 text-xs font-semibold text-ink-600">{t("audience")}</div>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  {AUDS.map((a) => (
                    <button key={a} onClick={() => setF({ ...f, audience: a, url: a === "drivers" ? "/driver" : a === "partners" ? "/partner" : f.url })} className={cx("rounded-xl border-2 p-3 text-start transition", f.audience === a ? "border-brand-600 bg-brand-50/50" : "border-ink-100 hover:bg-ink-50")}>
                      <div className="text-sm font-bold">{audLabel(a)}</div>
                      <div className="text-xs text-ink-500">{num(data.audiences[a].users)} • <BellRing className="inline h-3 w-3" /> {num(data.audiences[a].push)}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Input label={t("title_ar")} value={f.title_ar} onChange={(e) => setF({ ...f, title_ar: e.target.value })} dir="rtl" maxLength={60} placeholder="🎉 عرض نهاية الأسبوع" />
                <Input label={t("title_en")} value={f.title_en} onChange={(e) => setF({ ...f, title_en: e.target.value })} dir="ltr" maxLength={60} placeholder="🎉 Weekend deal" />
                <Textarea label={t("body_ar")} value={f.body_ar} onChange={(e) => setF({ ...f, body_ar: e.target.value })} dir="rtl" maxLength={160} placeholder="خصم 20% على كل الخدمات بكود NUQA20" />
                <Textarea label={t("body_en")} value={f.body_en} onChange={(e) => setF({ ...f, body_en: e.target.value })} dir="ltr" maxLength={160} placeholder="20% off everything with NUQA20" />
              </div>
              <Select label={t("link")} value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })}>
                {LINKS.map((l) => <option key={l} value={l}>{l}</option>)}
              </Select>
              <div className="flex items-center justify-between gap-3 rounded-xl bg-ink-50 p-3 text-sm">
                <span>{t("recipients")}: <b>{num(aud?.users || 0)}</b> • {t("push_devices")}: <b>{num(aud?.push || 0)}</b></span>
                <Button loading={busy} onClick={send} disabled={!f.title_ar || !f.title_en}><Send className="h-4 w-4" /> {t("send")}</Button>
              </div>
              <p className="text-xs text-ink-400">{lang === "ar" ? "يصل الإشعار لكل المستخدمين داخل التطبيق، وكإشعار على الهاتف لمن فعّل الإشعارات." : "Everyone gets it in their in-app inbox; users with push enabled also get it on their phone."}</p>
            </div>
          )}
        </Panel>

        <div className="space-y-4 xl:col-span-2">
          <Panel title={t("preview")} action={<div className="flex gap-1 text-xs">{(["ar", "en"] as const).map((l) => <button key={l} onClick={() => setPreviewLang(l)} className={cx("rounded-md px-2 py-1 font-bold", previewLang === l ? "bg-ink-900 text-white" : "bg-ink-100")}>{l.toUpperCase()}</button>)}</div>}>
            <div className="rounded-[2rem] bg-gradient-to-b from-sky-200 via-indigo-200 to-violet-300 p-4">
              <div className="mb-6 text-center text-3xl font-light text-white drop-shadow" dir="ltr">9:41</div>
              <div className="rounded-2xl bg-white/80 p-3 shadow-lg backdrop-blur" dir={previewLang === "ar" ? "rtl" : "ltr"}>
                <div className="flex items-center gap-2 text-[11px] text-ink-500">
                  <LogoMark className="h-4 w-4" /> <span className="font-semibold uppercase">Nuqa</span> <span className="ms-auto">{previewLang === "ar" ? "الآن" : "now"}</span>
                </div>
                <div className="mt-1 text-sm font-bold text-ink-900">{pt || (previewLang === "ar" ? "عنوان الإشعار" : "Notification title")}</div>
                <div className="text-sm text-ink-700">{pb || (previewLang === "ar" ? "نص الإشعار يظهر هنا" : "Your message appears here")}</div>
              </div>
            </div>
          </Panel>
          <Panel title={lang === "ar" ? "هذا الجهاز" : "This device"} bodyClass="p-1"><PushCard /></Panel>
        </div>
      </div>

      <Panel className="mt-4" title={lang === "ar" ? "الحملات السابقة" : "Past campaigns"} bodyClass="p-0">
        <Table head={[lang === "ar" ? "العنوان" : "Title", t("audience"), t("recipients"), t("delivered_push"), t("link"), t("date")]}>
          {(data?.history || []).map((b: any) => (
            <tr key={b.id}>
              <Td><div className="font-bold">{lang === "ar" ? b.title_ar : b.title_en}</div><div className="max-w-xs truncate text-xs text-ink-500">{lang === "ar" ? b.body_ar : b.body_en}</div></Td>
              <Td>{audLabel(b.audience)}</Td>
              <Td className="tabular">{num(b.recipients)}</Td>
              <Td className="tabular">{num(b.push_sent)}</Td>
              <Td className="text-xs" dir="ltr">{b.url}</Td>
              <Td className="text-xs text-ink-500">{timeAgo(b.created_at, lang)}</Td>
            </tr>
          ))}
        </Table>
        {data && !data.history.length && <div className="p-8 text-center text-sm text-ink-400">—</div>}
      </Panel>
    </div>
  );
}
