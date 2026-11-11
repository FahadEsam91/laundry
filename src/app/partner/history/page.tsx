"use client";

import useSWR from "swr";
import { useApp } from "@/components/providers";
import { PageHead, Panel, Table, Td } from "@/components/admin";
import { Skeleton, StatusBadge } from "@/components/ui";

export default function HistoryPage() {
  const { t, money, fmtDate } = useApp();
  const { data } = useSWR("/api/partner/orders");
  return (
    <div className="animate-fade-up">
      <PageHead title={t("history")} />
      <Panel bodyClass="p-0">
        {!data ? <div className="p-4"><Skeleton className="h-64" /></div> : (
          <Table head={[t("order_no"), t("customer"), t("items_label"), t("subtotal"), t("partner_payout"), t("rating"), t("status"), t("date")]}>
            {data.history.map((o: any) => (
              <tr key={o.id} className="hover:bg-ink-50">
                <Td className="font-bold">{o.code}</Td>
                <Td>{o.customer_name}</Td>
                <Td className="tabular">{o.items_count}</Td>
                <Td className="tabular">{money(o.subtotal)}</Td>
                <Td className="font-bold tabular text-emerald-700">{o.status === "cancelled" ? "—" : money(o.subtotal * (1 - o.commission / 100))}</Td>
                <Td>{o.rating ? "★".repeat(o.rating) : "—"}</Td>
                <Td><StatusBadge status={o.status} /></Td>
                <Td className="text-xs text-ink-500">{fmtDate(o.created_at)}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>
    </div>
  );
}
