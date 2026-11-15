"use client";

import { useState } from "react";
import useSWR from "swr";
import { Building2, Plus, Printer, CheckCircle2, UserPlus, X, Users, Receipt } from "lucide-react";
import { useApp, useCan, useToast } from "@/components/providers";
import { Kpi, NoAccess, PageHead, Panel, Table, Td } from "@/components/admin";
import { Badge, Button, Input, Sheet, Skeleton, Toggle, cx } from "@/components/ui";
import { api, errText } from "@/lib/client";

const EMPTY = { name: "", contact_name: "", phone: "", email: "", address: "", tax_id: "", discount_pct: 10, credit_limit: 0 };
const thisMonth = () => new Date().toISOString().slice(0, 7);

export default function CompaniesPage() {
  const { t, money, num, lang } = useApp();
  const can = useCan();
  const toast = useToast();
  const { data, mutate } = useSWR(can("companies.manage") ? "/api/admin/companies" : null);
  const [form, setForm] = useState<any>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  if (!can("companies.manage")) return <NoAccess />;
  const list: any[] = data?.companies || [];

  const save = async () => {
    setBusy(true);
    try {
      if (form.id) await api(`/api/admin/companies/${form.id}`, { method: "PATCH", body: form });
      else await api("/api/admin/companies", { body: form });
      setForm(null);
      mutate();
      toast(t("saved"));
    } catch (e) {
      toast(errText(e, lang), "error");
    } finally {
      setBusy(false);
    }
  };
  const F = (k: string, label: string, type = "text") => <Input label={label} type={type} value={form?.[k] ?? ""} onChange={(e) => setForm({ ...form, [k]: type === "number" ? Number(e.target.value) : e.target.value })} />;

  return (
    <div className="animate-fade-up">
      <PageHead title={t("companies")} sub={t("companies_sub")} actions={<Button onClick={() => setForm({ ...EMPTY })}><Plus className="h-4 w-4" /> {t("add_company")}</Button>} />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label={t("companies")} value={num(list.filter((c) => c.active).length)} icon={Building2} />
        <Kpi label={t("company_members")} value={num(list.reduce((a, c) => a + Number(c.members), 0))} icon={Users} accent="#7C3AED" />
        <Kpi label={t("month_total")} value={money(list.reduce((a, c) => a + Number(c.month_total), 0))} icon={Receipt} accent="#059669" />
        <Kpi label={t("outstanding")} value={money(list.reduce((a, c) => a + Number(c.outstanding), 0))} icon={Receipt} accent="#D97706" />
      </div>
      <Panel>
        {!data ? <Skeleton className="h-40" /> : (
          <Table head={[t("company_name"), t("company_discount"), t("company_members"), t("month_total"), t("outstanding"), ""]}>
            {list.map((c) => (
              <tr key={c.id} className="cursor-pointer hover:bg-ink-50" onClick={() => setOpen(c.id)}>
                <Td><div className="font-bold">{c.name}</div><div className="text-xs text-ink-500">{c.contact_name} {c.phone && <span dir="ltr">· {c.phone}</span>}</div></Td>
                <Td><Badge tone="blue">{num(c.discount_pct)}%</Badge></Td>
                <Td>{num(Number(c.members))}</Td>
                <Td className="font-semibold">{money(Number(c.month_total))}</Td>
                <Td className={cx("font-semibold", Number(c.outstanding) > 0 && "text-amber-600")}>{money(Number(c.outstanding))}</Td>
                <Td>{c.active ? <Badge tone="green">{t("active")}</Badge> : <Badge tone="gray">{t("inactive")}</Badge>}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>

      <Sheet open={!!form} onClose={() => setForm(null)} wide title={form?.id ? t("edit") : t("add_company")}>
        {form && (
          <div className="grid gap-4 md:grid-cols-2">
            {F("name", t("company_name"))}
            {F("contact_name", t("contact_person"))}
            {F("phone", t("phone"))}
            {F("email", "Email")}
            {F("address", t("address"))}
            {F("tax_id", t("tax_id"))}
            {F("discount_pct", `${t("company_discount")} %`, "number")}
            {F("credit_limit", t("credit_limit"), "number")}
            <div className="flex justify-end gap-2 md:col-span-2">
              <Button variant="outline" onClick={() => setForm(null)}>{t("cancel")}</Button>
              <Button loading={busy} onClick={save}>{t("save")}</Button>
            </div>
          </div>
        )}
      </Sheet>

      {open && <CompanySheet id={open} onClose={() => setOpen(null)} onEdit={(c) => { setOpen(null); setForm(c); }} onChange={() => mutate()} />}
    </div>
  );
}

function CompanySheet({ id, onClose, onEdit, onChange }: { id: number; onClose: () => void; onEdit: (c: any) => void; onChange: () => void }) {
  const { t, money, num, lang, fmtDate, L } = useApp();
  const toast = useToast();
  const [month, setMonth] = useState(thisMonth());
  const { data, mutate } = useSWR(`/api/admin/companies/${id}?month=${month}`);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const c = data?.company;
  const act = async (body: any, done?: (r: any) => void) => {
    setBusy(true);
    try {
      const r = await api(`/api/admin/companies/${id}`, { body });
      mutate();
      onChange();
      done?.(r);
    } catch (e) {
      toast(errText(e, lang), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet open onClose={onClose} wide title={c ? <span className="flex items-center gap-2"><Building2 className="h-5 w-5 text-brand-600" /> {c.name}</span> : "…"}>
      {!data ? <Skeleton className="h-80" /> : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-ink-50 p-3 text-sm">
            <Badge tone="blue">{t("company_discount")} {num(c.discount_pct)}%</Badge>
            {c.credit_limit > 0 && <span className="text-ink-600">{t("credit_limit").split(" (")[0]}: <b>{money(c.credit_limit)}</b></span>}
            <label className="ms-auto flex items-center gap-2 font-semibold">{c.active ? t("active") : t("inactive")}
              <Toggle checked={!!c.active} onChange={async (v) => { await api(`/api/admin/companies/${id}`, { method: "PATCH", body: { active: v } }); mutate(); onChange(); }} />
            </label>
            <Button size="sm" variant="outline" onClick={() => onEdit({ ...c })}>{t("edit")}</Button>
          </div>

          <div>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-bold"><Users className="h-4 w-4" /> {t("company_members")} ({num(data.members.length)})</h4>
            <form className="mb-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); act({ action: "add_member", phone }, () => { setPhone(""); toast(t("saved")); }); }}>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XX XXX XXXX" dir="ltr" className="h-10 flex-1 rounded-xl border border-ink-200 px-3 text-sm outline-none focus:border-brand-500" />
              <Button type="submit" size="sm" loading={busy} disabled={!phone.trim()}><UserPlus className="h-4 w-4" /> {t("add_member")}</Button>
            </form>
            <div className="flex flex-wrap gap-2">
              {data.members.map((m: any) => (
                <span key={m.id} className="flex items-center gap-1.5 rounded-full bg-ink-100 py-1 pe-1 ps-3 text-xs font-semibold">
                  {m.name} <span dir="ltr" className="text-ink-400">{m.phone}</span>
                  <button onClick={() => act({ action: "remove_member", user_id: m.id })} className="rounded-full p-1 hover:bg-ink-200" aria-label="remove"><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h4 className="flex items-center gap-2 text-sm font-bold"><Receipt className="h-4 w-4" /> {t("statement")}</h4>
              <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="h-9 rounded-xl border border-ink-200 px-2 text-sm" />
              <a href={`/print/invoice?company=${id}&month=${month}`} target="_blank" rel="noreferrer" className="ms-auto"><Button size="sm" variant="outline"><Printer className="h-4 w-4" /> {t("print_invoice")}</Button></a>
              <Button size="sm" variant="success" loading={busy} disabled={!data.totals.due} onClick={() => act({ action: "settle", month }, (r) => toast(t("settled_n", { x: String(r.settled) })))}><CheckCircle2 className="h-4 w-4" /> {t("mark_paid")}</Button>
            </div>
            <div className="mb-3 grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-xl bg-ink-50 p-2"><div className="text-xs text-ink-500">{t("orders")}</div><b>{num(data.totals.orders)}</b></div>
              <div className="rounded-xl bg-emerald-50 p-2"><div className="text-xs text-emerald-700">{t("paid")}</div><b>{money(data.totals.paid)}</b></div>
              <div className="rounded-xl bg-amber-50 p-2"><div className="text-xs text-amber-700">{t("outstanding")}</div><b>{money(data.totals.due)}</b></div>
            </div>
            <div className="max-h-72 overflow-y-auto rounded-xl border border-ink-100">
              <Table head={[t("order"), t("customer"), t("partner"), t("total"), ""]}>
                {data.orders.map((o: any) => (
                  <tr key={o.id}>
                    <Td><div className="font-bold text-brand-700">{o.code}</div><div className="text-[11px] text-ink-400">{fmtDate(o.created_at)}</div></Td>
                    <Td>{o.customer_name}</Td>
                    <Td>{L({ name_ar: o.partner_ar, name_en: o.partner_en }, "name")}</Td>
                    <Td className="font-semibold">{money(o.total)}</Td>
                    <Td>{o.payment_status === "paid" ? <Badge tone="green">{t("paid")}</Badge> : <Badge tone="amber">{t("invoiced")}</Badge>}</Td>
                  </tr>
                ))}
              </Table>
            </div>
          </div>
        </div>
      )}
    </Sheet>
  );
}
