"use client";

import { useState } from "react";
import useSWR from "swr";
import { Plus, Trash2 } from "lucide-react";
import { useApp, useToast } from "@/components/providers";
import { PageHead, Panel, Table, Td } from "@/components/admin";
import { Badge, Button, Input, Select, Sheet, Skeleton, Toggle } from "@/components/ui";
import { api, errText } from "@/lib/client";

export default function PromosPage() {
  const { t, L, money, num, fmtDate, lang } = useApp();
  const toast = useToast();
  const { data, mutate } = useSWR("/api/admin/promos");
  const [form, setForm] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const patch = async (id: number, b: any) => {
    await api(`/api/admin/promos/${id}`, { method: "PATCH", body: b });
    mutate();
  };
  const create = async () => {
    setBusy(true);
    try {
      await api("/api/admin/promos", { body: { ...form, expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null } });
      setForm(null);
      mutate();
      toast(t("saved"));
    } catch (e) {
      toast(errText(e, lang), "error");
    } finally {
      setBusy(false);
    }
  };
  const valueLabel = (p: any) => (p.kind === "percent" ? `${p.value}%` : p.kind === "delivery" ? t("free_delivery_kind") : money(p.value));
  return (
    <div className="animate-fade-up">
      <PageHead title={t("promos")} actions={<Button onClick={() => setForm({ code: "", kind: "percent", value: 10, min_order: 0, max_discount: "", usage_limit: "", first_order_only: false, title_ar: "", title_en: "", expires_at: "" })}><Plus className="h-4 w-4" /> {t("add_promo")}</Button>} />
      <Panel bodyClass="p-0">
        {!data ? <div className="p-4"><Skeleton className="h-48" /></div> : (
          <Table head={[t("promo_code"), t("kind"), t("value"), t("min_order"), t("usage"), t("discount"), t("expires"), t("active"), ""]}>
            {data.promos.map((p: any) => {
              const expired = p.expires_at && new Date(p.expires_at) < new Date();
              return (
                <tr key={p.id} className="hover:bg-ink-50">
                  <Td><div className="font-extrabold tracking-wider" dir="ltr">{p.code}</div><div className="text-xs text-ink-500">{L(p, "title")}</div></Td>
                  <Td>{t(p.kind === "delivery" ? "free_delivery_kind" : p.kind)}{p.first_order_only ? <Badge tone="violet" className="ms-1">1st</Badge> : null}</Td>
                  <Td className="font-bold">{valueLabel(p)}{p.max_discount ? <span className="text-xs font-normal text-ink-400"> ≤ {money(p.max_discount)}</span> : null}</Td>
                  <Td className="tabular">{money(p.min_order)}</Td>
                  <Td className="tabular">{num(p.used)}{p.usage_limit ? ` / ${num(p.usage_limit)}` : ""}</Td>
                  <Td className="tabular">{money(p.total_discount)}</Td>
                  <Td className="text-xs">{p.expires_at ? <span className={expired ? "text-red-600" : "text-ink-500"}>{fmtDate(p.expires_at, { day: "numeric", month: "short", year: "numeric" })}</span> : "—"}</Td>
                  <Td><Toggle checked={!!p.active} onChange={(v) => patch(p.id, { active: v })} /></Td>
                  <Td><button onClick={async () => { await api(`/api/admin/promos/${p.id}`, { method: "DELETE" }); mutate(); }} className="rounded-lg p-2 text-ink-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></Td>
                </tr>
              );
            })}
          </Table>
        )}
      </Panel>
      <Sheet open={!!form} onClose={() => setForm(null)} title={t("add_promo")}>
        {form && (
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Input label={t("promo_code")} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} dir="ltr" placeholder="RAMADAN25" /></div>
            <Select label={t("kind")} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
              <option value="percent">{t("percent")}</option>
              <option value="fixed">{t("fixed")}</option>
              <option value="delivery">{t("free_delivery_kind")}</option>
            </Select>
            <Input label={t("value")} type="number" value={form.value} disabled={form.kind === "delivery"} onChange={(e) => setForm({ ...form, value: e.target.value })} />
            <Input label={t("min_order")} type="number" value={form.min_order} onChange={(e) => setForm({ ...form, min_order: e.target.value })} />
            <Input label={t("max_discount")} type="number" value={form.max_discount} onChange={(e) => setForm({ ...form, max_discount: e.target.value })} />
            <Input label={t("usage_limit")} type="number" value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} />
            <Input label={t("expires")} type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
            <Input label={t("title_ar")} value={form.title_ar} onChange={(e) => setForm({ ...form, title_ar: e.target.value })} />
            <Input label={t("title_en")} value={form.title_en} onChange={(e) => setForm({ ...form, title_en: e.target.value })} />
            <label className="col-span-2 flex items-center justify-between rounded-xl bg-ink-50 p-3 text-sm font-semibold">{t("first_order_only")}<Toggle checked={form.first_order_only} onChange={(v) => setForm({ ...form, first_order_only: v })} /></label>
            <div className="col-span-2"><Button block loading={busy} onClick={create} disabled={form.code.length < 3}>{t("save")}</Button></div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
