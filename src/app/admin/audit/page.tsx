"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { Search } from "lucide-react";
import { useApp } from "@/components/providers";
import { PageHead, Pager, Panel, Table, Td } from "@/components/admin";
import { Input, Select, Skeleton } from "@/components/ui";

const ACTIONS: Record<string, [string, string]> = {
  order: ["الطلبات", "Orders"], orders: ["تصدير الطلبات", "Order exports"], partner: ["المغاسل", "Laundries"], product: ["الأسعار", "Prices"],
  driver: ["المندوبين", "Riders"], customer: ["الزبائن", "Customers"], service: ["الخدمات", "Services"], promo: ["أكواد الخصم", "Promo codes"],
  plan: ["الباقات", "Plans"], subscription: ["الاشتراكات", "Memberships"], campaign: ["الحملات", "Campaigns"], settings: ["الإعدادات", "Settings"],
  staff: ["الموظفون", "Staff"], role: ["الأدوار", "Roles"],
};
const VERB: Record<string, [string, string]> = {
  status: ["تغيير حالة", "status change"], cancel: ["إلغاء", "cancel"], assign: ["تعيين مندوب", "assign rider"], export: ["تصدير", "export"],
  create: ["إنشاء", "create"], update: ["تعديل", "update"], active: ["تفعيل", "activate"], suspended: ["إيقاف", "suspend"], suspend: ["إيقاف", "suspend"],
  restore: ["إعادة تفعيل", "restore"], credit: ["إضافة رصيد", "wallet credit"], enable: ["تفعيل", "enable"], disable: ["تعطيل", "disable"], delete: ["حذف", "delete"],
  extend: ["تمديد", "extend"], terminate: ["إيقاف فوري", "terminate"], send: ["إرسال", "send"], invite: ["إضافة", "invite"], role_change: ["تغيير الدور", "role change"],
};

export default function AuditPage() {
  const { t, lang, fmtDate } = useApp();
  const [user, setUser] = useState("");
  const [action, setAction] = useState("");
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => {
    const id = setTimeout(() => (setDq(q), setPage(1)), 300);
    return () => clearTimeout(id);
  }, [q]);
  const qs = new URLSearchParams({ page: String(page), ...(user && { user }), ...(action && { action }), ...(dq && { q: dq }) });
  const { data } = useSWR(`/api/admin/audit?${qs}`, { keepPreviousData: true, refreshInterval: 15000 });
  const human = (a: string) => {
    const [g, v] = a.split(".");
    const i = lang === "ar" ? 0 : 1;
    return `${ACTIONS[g]?.[i] || g} · ${VERB[v]?.[i] || v}`;
  };
  const pretty = (d: string | null) => {
    if (!d) return "";
    try {
      const o = JSON.parse(d);
      return Object.entries(o).map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`).join(" · ");
    } catch {
      return d;
    }
  };
  return (
    <div className="animate-fade-up">
      <PageHead title={t("audit_log")} sub={t("audit_sub")} />
      <Panel bodyClass="p-0">
        <div className="flex flex-wrap gap-3 border-b border-ink-100 p-4">
          <div className="min-w-[220px] flex-1"><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`${t("search")}…`} icon={<Search className="h-4 w-4" />} /></div>
          <div className="w-52">
            <Select value={user} onChange={(e) => { setUser(e.target.value); setPage(1); }}>
              <option value="">{t("all_staff")}</option>
              {(data?.actors || []).map((a: any) => <option key={a.user_id} value={a.user_id}>{a.user_name}</option>)}
            </Select>
          </div>
          <div className="w-52">
            <Select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>
              <option value="">{t("all_actions")}</option>
              {Object.entries(ACTIONS).map(([k, v]) => <option key={k} value={`${k}.`}>{v[lang === "ar" ? 0 : 1]}</option>)}
            </Select>
          </div>
        </div>
        {!data ? <div className="p-4"><Skeleton className="h-64" /></div> : (
          <Table head={[t("time"), t("actor"), t("action"), t("target"), t("details"), "IP"]}>
            {data.rows.map((r: any) => (
              <tr key={r.id} className="align-top hover:bg-ink-50">
                <Td className="text-xs text-ink-500">{fmtDate(r.created_at, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", second: "2-digit" })}</Td>
                <Td className="font-semibold">{r.user_name}</Td>
                <Td><span className="rounded-md bg-ink-100 px-2 py-0.5 text-xs font-bold">{human(r.action)}</span></Td>
                <Td className="text-xs">{r.entity}{r.entity_id ? ` #${r.entity_id}` : ""}</Td>
                <Td className="max-w-md whitespace-normal break-words text-xs text-ink-600">{pretty(r.details)}</Td>
                <Td className="text-xs text-ink-400" dir="ltr">{r.ip || "—"}</Td>
              </tr>
            ))}
          </Table>
        )}
        {data && !data.rows.length && <div className="p-10 text-center text-sm text-ink-400">{t("no_results")}</div>}
        {data && <Pager page={page} size={data.size} total={data.total} onPage={setPage} />}
      </Panel>
    </div>
  );
}
