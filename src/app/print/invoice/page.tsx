"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/components/providers";
import { LogoMark } from "@/components/ui";

/** Printable monthly invoice for a business account (Admin → Business accounts → Print invoice). */
function Invoice() {
  const q = useSearchParams();
  const { money, fmtDate, settings, lang, L } = useApp();
  const [d, setD] = useState<any>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch(`/api/admin/companies/${q.get("company")}?month=${q.get("month") || ""}`).then(async (r) => (r.ok ? setD(await r.json()) : setError(r.status === 403 || r.status === 401 ? "No access" : "Not found")));
  }, [q]);
  if (error) return <p style={{ padding: 40 }}>{error}</p>;
  if (!d) return <p style={{ padding: 40 }}>…</p>;
  const ar = lang === "ar";
  const c = d.company;
  const monthName = new Intl.DateTimeFormat(ar ? "ar-IQ" : "en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${d.month}-01T00:00:00Z`));
  return (
    <div className="mx-auto max-w-4xl bg-white p-10 text-sm text-ink-900 print:p-0">
      <style>{`@page { size: A4; margin: 14mm; } @media print { .no-print { display: none } body { background: #fff } }`}</style>
      <div className="no-print mb-6 flex justify-end"><button onClick={() => window.print()} className="rounded-xl bg-brand-600 px-5 py-2 font-bold text-white">{ar ? "طباعة / حفظ PDF" : "Print / Save PDF"}</button></div>
      <div className="flex items-start justify-between border-b-2 border-brand-600 pb-5">
        <div className="flex items-center gap-3">
          <LogoMark className="h-12 w-12" />
          <div><div className="text-2xl font-extrabold">{ar ? "نقاء" : "Nuqa"}</div><div className="text-ink-500">{settings.support_phone}</div></div>
        </div>
        <div className="text-end">
          <div className="text-2xl font-extrabold text-brand-700">{ar ? "فاتورة شهرية" : "Monthly invoice"}</div>
          <div className="text-ink-500">{monthName}</div>
          <div className="text-ink-500" dir="ltr">INV-{c.id}-{d.month.replace("-", "")}</div>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-6">
        <div>
          <div className="text-xs font-bold text-ink-500">{ar ? "إلى" : "Bill to"}</div>
          <div className="text-lg font-bold">{c.name}</div>
          {c.contact_name && <div>{c.contact_name}</div>}
          {c.address && <div className="text-ink-600">{c.address}</div>}
          {c.phone && <div dir="ltr" className="text-ink-600">{c.phone}</div>}
          {c.tax_id && <div className="text-ink-600">{ar ? "الرقم الضريبي" : "Tax ID"}: {c.tax_id}</div>}
        </div>
        <div className="rounded-2xl bg-ink-50 p-4">
          <div className="flex justify-between"><span>{ar ? "عدد الطلبات" : "Orders"}</span><b>{d.totals.orders}</b></div>
          <div className="flex justify-between"><span>{ar ? "قبل الخصم" : "Before discount"}</span><b>{money(d.totals.subtotal)}</b></div>
          <div className="flex justify-between text-emerald-700"><span>{ar ? `خصم الشركة (${c.discount_pct}%)` : `Company discount (${c.discount_pct}%)`}</span><b>- {money(d.totals.discount)}</b></div>
          <div className="mt-2 flex justify-between border-t border-ink-200 pt-2 text-base"><span className="font-bold">{ar ? "الإجمالي" : "Total"}</span><b>{money(d.totals.total)}</b></div>
          <div className="flex justify-between text-amber-700"><span>{ar ? "المستحق" : "Amount due"}</span><b>{money(d.totals.due)}</b></div>
        </div>
      </div>
      <table className="mt-6 w-full border-collapse text-xs">
        <thead><tr className="border-b-2 border-ink-200 text-ink-500">
          {[ar ? "الطلب" : "Order", ar ? "التاريخ" : "Date", ar ? "الموظف" : "Staff", ar ? "المغسلة" : "Laundry", ar ? "القطع" : "Items", ar ? "الخصم" : "Discount", ar ? "المبلغ" : "Amount", ar ? "الحالة" : "Status"].map((h) => <th key={h} className="py-2 text-start font-semibold">{h}</th>)}
        </tr></thead>
        <tbody>
          {d.orders.map((o: any) => (
            <tr key={o.id} className="border-b border-ink-100">
              <td className="py-2 font-bold">{o.code}</td>
              <td className="py-2">{fmtDate(o.created_at, { day: "numeric", month: "short" })}</td>
              <td className="py-2">{o.customer_name}</td>
              <td className="py-2">{L({ name_ar: o.partner_ar, name_en: o.partner_en }, "name")}</td>
              <td className="py-2">{o.items_count}</td>
              <td className="py-2">{money(o.company_discount)}</td>
              <td className="py-2 font-semibold">{money(o.total)}</td>
              <td className="py-2">{o.payment_status === "paid" ? (ar ? "مدفوع" : "Paid") : ar ? "مستحق" : "Due"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-8 text-center text-xs text-ink-400">{ar ? "شكراً لثقتكم بنقاء" : "Thank you for choosing Nuqa"}</p>
    </div>
  );
}

export default function PrintInvoice() {
  return <Suspense><Invoice /></Suspense>;
}
