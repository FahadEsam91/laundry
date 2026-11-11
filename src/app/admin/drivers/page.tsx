"use client";

import { useState } from "react";
import useSWR from "swr";
import { Plus, Star, Bike, Car, Ban, RotateCcw } from "lucide-react";
import { useApp, useToast } from "@/components/providers";
import { Kpi, PageHead, Panel, Table, Td } from "@/components/admin";
import { Badge, Button, Input, Select, Sheet, Skeleton, Toggle } from "@/components/ui";
import { api, errText } from "@/lib/client";

export default function DriversPage() {
  const { t, num, fmtDate, lang } = useApp();
  const toast = useToast();
  const { data, mutate } = useSWR("/api/admin/drivers", { refreshInterval: 8000 });
  const [form, setForm] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const list: any[] = data?.drivers || [];
  const patch = async (id: number, b: any) => {
    await api(`/api/admin/drivers/${id}`, { method: "PATCH", body: b });
    mutate();
  };
  const create = async () => {
    setBusy(true);
    try {
      await api("/api/admin/drivers", { body: form });
      toast(t("saved"));
      setForm(null);
      mutate();
    } catch (e) {
      toast(errText(e, lang), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="animate-fade-up">
      <PageHead title={t("drivers")} actions={<Button onClick={() => setForm({ name: "", phone: "", vehicle: "motorbike", plate: "" })}><Plus className="h-4 w-4" /> {t("add_driver")}</Button>} />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label={t("drivers")} value={num(list.length)} icon={Bike} />
        <Kpi label={t("online")} value={num(list.filter((d) => d.status === "online").length)} icon={Bike} accent="#059669" />
        <Kpi label={t("busy")} value={num(list.filter((d) => d.active_jobs > 0).length)} icon={Bike} accent="#EA580C" />
        <Kpi label={`${t("deliveries")} (30d)`} value={num(list.reduce((a, d) => a + d.deliveries_30, 0))} icon={Bike} accent="#7C3AED" />
      </div>
      <Panel bodyClass="p-0">
        {!data ? <div className="p-4"><Skeleton className="h-64" /></div> : (
          <Table head={[t("name"), t("phone"), t("vehicle"), t("status"), t("online"), t("active_orders"), `${t("deliveries")} (30d)`, t("rating"), t("joined"), ""]}>
            {list.map((d) => (
              <tr key={d.id} className="hover:bg-ink-50">
                <Td>
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 font-bold text-emerald-700">{d.name.slice(0, 1)}</span>
                    <span className="font-bold">{d.name}</span>
                  </div>
                </Td>
                <Td dir="ltr" className="text-ink-500">{d.phone}</Td>
                <Td><span className="flex items-center gap-1.5">{d.vehicle === "car" ? <Car className="h-4 w-4" /> : <Bike className="h-4 w-4" />} {t(d.vehicle)} <span className="text-xs text-ink-400">{d.plate}</span></span></Td>
                <Td>{d.user_status === "suspended" ? <Badge tone="red">{t("suspended")}</Badge> : d.active_jobs > 0 ? <Badge tone="amber">{t("busy")}</Badge> : d.status === "online" ? <Badge tone="green">{t("online")}</Badge> : <Badge>{t("offline")}</Badge>}</Td>
                <Td><Toggle checked={d.status === "online"} disabled={d.user_status === "suspended"} onChange={(v) => patch(d.id, { status: v ? "online" : "offline" })} /></Td>
                <Td className="tabular">{d.active_jobs}</Td>
                <Td className="tabular">{num(d.deliveries_30)}</Td>
                <Td><span className="flex items-center gap-1 font-bold"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{d.rating}</span></Td>
                <Td className="text-xs text-ink-500">{fmtDate(d.created_at, { day: "numeric", month: "short", year: "numeric" })}</Td>
                <Td>
                  {d.user_status === "suspended" ? (
                    <button onClick={() => patch(d.id, { user_status: "active" })} className="rounded-lg p-2 text-ink-400 hover:bg-emerald-50 hover:text-emerald-600" title={t("approve")}><RotateCcw className="h-4 w-4" /></button>
                  ) : (
                    <button onClick={() => patch(d.id, { user_status: "suspended" })} className="rounded-lg p-2 text-ink-400 hover:bg-red-50 hover:text-red-600" title={t("suspend")}><Ban className="h-4 w-4" /></button>
                  )}
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>
      <Sheet open={!!form} onClose={() => setForm(null)} title={t("add_driver")}>
        {form && (
          <div className="space-y-4">
            <Input label={t("name")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label={t("phone")} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr" placeholder="+964 7XX XXX XXXX" />
            <div className="grid grid-cols-2 gap-3">
              <Select label={t("vehicle")} value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value })}>
                <option value="motorbike">{t("motorbike")}</option>
                <option value="car">{t("car")}</option>
              </Select>
              <Input label={t("plate")} value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value })} />
            </div>
            <Button block loading={busy} onClick={create} disabled={!form.name || !form.phone}>{t("save")}</Button>
          </div>
        )}
      </Sheet>
    </div>
  );
}
