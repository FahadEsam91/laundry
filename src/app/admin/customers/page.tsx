"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Search, Wallet, Ban, RotateCcw, ReceiptText } from "lucide-react";
import { useApp, useCan, useToast } from "@/components/providers";
import { PageHead, Pager, Panel, Table, Td } from "@/components/admin";
import { Badge, Button, Input, Sheet, Skeleton } from "@/components/ui";
import { api } from "@/lib/client";

export default function CustomersPage() {
  const { t, money, num, fmtDate } = useApp();
  const toast = useToast();
  const can = useCan();
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [page, setPage] = useState(1);
  const [credit, setCredit] = useState<any>(null);
  const [amount, setAmount] = useState(5000);
  useEffect(() => {
    const id = setTimeout(() => (setDq(q), setPage(1)), 300);
    return () => clearTimeout(id);
  }, [q]);
  const { data, mutate } = useSWR(`/api/admin/customers?page=${page}${dq ? `&q=${encodeURIComponent(dq)}` : ""}`, { keepPreviousData: true });
  const act = async (id: number, b: any) => {
    await api(`/api/admin/customers/${id}`, { body: b });
    mutate();
    toast(t("saved"));
  };
  return (
    <div className="animate-fade-up">
      <PageHead title={t("customers")} sub={`${data?.total ?? "…"} ${t("customers")}`} />
      <Panel bodyClass="p-0">
        <div className="border-b border-ink-100 p-4"><div className="max-w-md"><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`${t("search")}…`} icon={<Search className="h-4 w-4" />} /></div></div>
        {!data ? <div className="p-4"><Skeleton className="h-64" /></div> : (
          <Table head={[t("name"), t("phone"), t("area"), t("orders_count"), t("total_spent"), t("wallet"), t("points"), t("last_order"), t("joined"), ""]}>
            {data.customers.map((c: any) => (
              <tr key={c.id} className="hover:bg-ink-50">
                <Td>
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 font-bold text-brand-700">{c.name.slice(0, 1)}</span>
                    <div><div className="font-bold">{c.name}</div>{c.status === "suspended" && <Badge tone="red">{t("suspended")}</Badge>}</div>
                  </div>
                </Td>
                <Td dir="ltr" className="text-ink-500">{c.phone}</Td>
                <Td>{c.area || "—"}</Td>
                <Td className="tabular">{num(c.orders)}</Td>
                <Td className="font-bold tabular">{money(c.spent)}</Td>
                <Td className="tabular">{money(c.wallet)}</Td>
                <Td className="tabular">{num(c.points)}</Td>
                <Td className="text-xs text-ink-500">{c.last_order ? fmtDate(c.last_order, { day: "numeric", month: "short" }) : "—"}</Td>
                <Td className="text-xs text-ink-500">{fmtDate(c.created_at, { day: "numeric", month: "short", year: "numeric" })}</Td>
                <Td>
                  <div className="flex gap-1">
                    {can("orders.view") && <Link href={`/admin/orders?customer=${c.id}`} className="rounded-lg p-2 text-ink-400 hover:bg-ink-100 hover:text-ink-800" title={t("orders")}><ReceiptText className="h-4 w-4" /></Link>}
                    {can("customers.credit") && <button onClick={() => setCredit(c)} className="rounded-lg p-2 text-ink-400 hover:bg-brand-50 hover:text-brand-700" title={t("wallet_topup_admin")}><Wallet className="h-4 w-4" /></button>}
                    {!can("customers.manage") ? null : c.status === "suspended" ? (
                      <button onClick={() => act(c.id, { action: "status", status: "active" })} className="rounded-lg p-2 text-ink-400 hover:bg-emerald-50 hover:text-emerald-600"><RotateCcw className="h-4 w-4" /></button>
                    ) : (
                      <button onClick={() => act(c.id, { action: "status", status: "suspended" })} className="rounded-lg p-2 text-ink-400 hover:bg-red-50 hover:text-red-600" title={t("suspend")}><Ban className="h-4 w-4" /></button>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        )}
        {data && <Pager page={page} size={data.size} total={data.total} onPage={setPage} />}
      </Panel>
      <Sheet open={!!credit} onClose={() => setCredit(null)} title={`${t("wallet_topup_admin")} • ${credit?.name || ""}`}>
        <Input label={t("amount")} type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} step={1000} />
        <Button block className="mt-4" onClick={async () => { await act(credit.id, { action: "credit", amount }); setCredit(null); }}>{t("confirm")} • {money(amount)}</Button>
      </Sheet>
    </div>
  );
}
