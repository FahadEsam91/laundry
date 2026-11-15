"use client";

import { useState } from "react";
import useSWR from "swr";
import { QrCode, Printer, Plus } from "lucide-react";
import { useApp, useCan, useToast } from "@/components/providers";
import { NoAccess, PageHead, Panel, Table, Td } from "@/components/admin";
import { Button, Input } from "@/components/ui";
import { api, errText } from "@/lib/client";

export default function LabelsPage() {
  const { t, num, lang } = useApp();
  const can = useCan();
  const toast = useToast();
  const { data, mutate } = useSWR(can("orders.manage") ? "/api/admin/tags" : null);
  const [count, setCount] = useState(48);
  const [busy, setBusy] = useState(false);
  if (!can("orders.manage")) return <NoAccess />;
  const create = async () => {
    setBusy(true);
    try {
      const r = await api<any>("/api/admin/tags", { body: { count } });
      mutate();
      window.open(`/print/labels?batch=${encodeURIComponent(r.batch)}`, "_blank");
    } catch (e) {
      toast(errText(e, lang), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="animate-fade-up max-w-4xl">
      <PageHead title={t("labels")} sub={t("labels_sub")} />
      <Panel title={<span className="flex items-center gap-2"><QrCode className="h-5 w-5 text-brand-600" /> {t("labels_new")}</span>}>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-44"><Input label={t("labels_count")} type="number" min={1} max={500} value={count} onChange={(e) => setCount(Number(e.target.value))} /></div>
          <Button loading={busy} onClick={create}><Plus className="h-4 w-4" /> {t("labels_new")}</Button>
        </div>
        <p className="mt-3 text-xs text-ink-500">{lang === "ar" ? "تُفتح صفحة الطباعة مباشرة: ٤٨ ملصقاً لكل ورقة A4 (ملصقات ٣٨×٢١ مم أو أي ورق ملصقات)." : "The print page opens right away: 48 labels per A4 sheet (38×21 mm labels or any sticker paper)."}</p>
      </Panel>
      <div className="mt-4">
        <Panel title={lang === "ar" ? "الدفعات" : "Batches"}>
          <Table head={[lang === "ar" ? "الدفعة" : "Batch", lang === "ar" ? "الملصقات" : "Labels", t("labels_used"), ""]}>
            {(data?.batches || []).map((b: any) => (
              <tr key={b.batch}>
                <Td><span className="font-semibold" dir="ltr">{b.batch}</span></Td>
                <Td>{num(Number(b.total))}</Td>
                <Td>{num(Number(b.used))} / {num(Number(b.total))}</Td>
                <Td><a href={`/print/labels?batch=${encodeURIComponent(b.batch)}`} target="_blank" rel="noreferrer"><Button size="sm" variant="outline"><Printer className="h-4 w-4" /> {t("labels_print")}</Button></a></Td>
              </tr>
            ))}
          </Table>
        </Panel>
      </div>
    </div>
  );
}
