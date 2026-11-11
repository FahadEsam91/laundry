"use client";

import { useState } from "react";
import useSWR from "swr";
import { Plus, Star, Pencil, CheckCircle2, Ban, Tags, MapPin } from "lucide-react";
import { useApp, useToast } from "@/components/providers";
import { PageHead, Panel, Table, Td } from "@/components/admin";
import { Badge, Button, Input, PartnerLogo, Sheet, Skeleton, Toggle, cx } from "@/components/ui";
import { MapView } from "@/components/map-view";
import { api, errText } from "@/lib/client";

const EMPTY = { name_ar: "", name_en: "", area_ar: "", area_en: "", desc_ar: "", desc_en: "", phone: "", delivery_fee: 2000, min_order: 5000, commission: 15, eta_hours: 24, express_hours: 6, lat: 33.315, lng: 44.38, tags: "", services: ["wash_iron", "iron"] as string[] };

export default function PartnersPage() {
  const { t, L, money, num, services, lang } = useApp();
  const toast = useToast();
  const { data, mutate } = useSWR("/api/admin/partners");
  const [edit, setEdit] = useState<any>(null);
  const [prices, setPrices] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const list: any[] = data?.partners || [];

  const patch = async (id: number, b: any) => {
    await api(`/api/admin/partners/${id}`, { method: "PATCH", body: b });
    mutate();
  };
  const save = async () => {
    setBusy(true);
    try {
      if (edit.id) {
        const { id, services: _s, ...rest } = edit;
        const allowed = ["name_ar", "name_en", "area_ar", "area_en", "desc_ar", "desc_en", "phone", "delivery_fee", "min_order", "commission", "eta_hours", "express_hours", "lat", "lng", "tags"];
        await api(`/api/admin/partners/${id}`, { method: "PATCH", body: Object.fromEntries(Object.entries(rest).filter(([k]) => allowed.includes(k))) });
      } else await api("/api/admin/partners", { body: edit });
      toast(t("saved"));
      setEdit(null);
      mutate();
    } catch (e) {
      toast(errText(e, lang), "error");
    } finally {
      setBusy(false);
    }
  };
  const F = (k: string, label: string, type = "text") => (
    <Input label={label} type={type} value={edit?.[k] ?? ""} onChange={(e) => setEdit({ ...edit, [k]: type === "number" ? Number(e.target.value) : e.target.value })} />
  );

  return (
    <div className="animate-fade-up">
      <PageHead title={t("partners")} sub={`${list.length} ${t("partners")}`} actions={<Button onClick={() => setEdit({ ...EMPTY })}><Plus className="h-4 w-4" /> {t("add_partner")}</Button>} />
      <Panel bodyClass="p-0">
        {!data ? <div className="p-4"><Skeleton className="h-64" /></div> : (
          <Table head={[t("partner"), t("status"), t("open"), t("rating"), `${t("orders")} (30d)`, `${t("gmv")} (30d)`, t("active_orders"), t("commission"), t("delivery_fee"), ""]}>
            {list.map((p) => (
              <tr key={p.id} className="hover:bg-ink-50">
                <Td>
                  <div className="flex items-center gap-3">
                    <PartnerLogo p={p} size={40} className="rounded-xl" />
                    <div>
                      <div className="font-bold">{L(p, "name")}</div>
                      <div className="flex items-center gap-1 text-xs text-ink-500"><MapPin className="h-3 w-3" />{L(p, "area")}</div>
                    </div>
                  </div>
                </Td>
                <Td>
                  {p.status === "active" ? <Badge tone="green">{t("active")}</Badge> : p.status === "pending" ? <Badge tone="amber">{t("pending_approval")}</Badge> : <Badge tone="red">{t("suspended")}</Badge>}
                </Td>
                <Td><Toggle checked={!!p.is_open} disabled={p.status !== "active"} onChange={(v) => patch(p.id, { is_open: v })} /></Td>
                <Td><span className="flex items-center gap-1 font-bold"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{num(p.rating, 1)}</span><span className="text-xs text-ink-400">{num(p.rating_count)}</span></Td>
                <Td className="tabular">{num(p.orders_30)}</Td>
                <Td className="font-bold tabular">{money(p.gmv_30)}</Td>
                <Td className="tabular">{p.active_orders}</Td>
                <Td className="tabular">{p.commission}%</Td>
                <Td className="tabular">{p.delivery_fee ? money(p.delivery_fee) : t("free")}</Td>
                <Td>
                  <div className="flex items-center gap-1">
                    {p.status !== "active" ? (
                      <Button size="sm" variant="success" onClick={() => patch(p.id, { status: "active" })}><CheckCircle2 className="h-4 w-4" /> {t("approve")}</Button>
                    ) : (
                      <button onClick={() => patch(p.id, { status: "suspended", is_open: false })} className="rounded-lg p-2 text-ink-400 hover:bg-red-50 hover:text-red-600" title={t("suspend")}><Ban className="h-4 w-4" /></button>
                    )}
                    <button onClick={() => setPrices(p)} className="rounded-lg p-2 text-ink-400 hover:bg-ink-100 hover:text-ink-800" title={t("menu")}><Tags className="h-4 w-4" /></button>
                    <button onClick={() => setEdit({ ...p })} className="rounded-lg p-2 text-ink-400 hover:bg-ink-100 hover:text-ink-800" title={t("edit")}><Pencil className="h-4 w-4" /></button>
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>

      <Sheet open={!!edit} onClose={() => setEdit(null)} wide title={edit?.id ? `${t("edit")} • ${L(edit, "name")}` : t("add_partner")}>
        {edit && (
          <div className="grid gap-4 md:grid-cols-2">
            {F("name_ar", t("name_ar"))}
            {F("name_en", t("name_en"))}
            {F("area_ar", `${t("area")} (AR)`)}
            {F("area_en", `${t("area")} (EN)`)}
            {F("desc_ar", `${t("details")} (AR)`)}
            {F("desc_en", `${t("details")} (EN)`)}
            {F("phone", t("phone"))}
            {F("commission", `${t("commission")} %`, "number")}
            {F("delivery_fee", t("delivery_fee"), "number")}
            {F("min_order", t("min_order"), "number")}
            {F("eta_hours", `${t("standard")} (${t("hours")})`, "number")}
            {F("express_hours", `${t("express")} (${t("hours")})`, "number")}
            {!edit.id && (
              <div className="md:col-span-2">
                <div className="mb-2 text-xs font-semibold text-ink-600">{t("services")}</div>
                <div className="flex flex-wrap gap-2">
                  {services.map((s) => {
                    const on = edit.services.includes(s.slug);
                    return (
                      <button key={s.slug} onClick={() => setEdit({ ...edit, services: on ? edit.services.filter((x: string) => x !== s.slug) : [...edit.services, s.slug] })} className={cx("rounded-full border px-3 py-1.5 text-xs font-bold", on ? "border-brand-600 bg-brand-600 text-white" : "border-ink-200")}>
                        {L(s, "name")}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="md:col-span-2">
              <div className="mb-2 text-xs font-semibold text-ink-600">{t("pin_location")}</div>
              <MapView key={`${edit.id}-${edit.lat}-${edit.lng}`} className="h-56 w-full overflow-hidden rounded-xl" center={[edit.lat, edit.lng]} zoom={13} fit={false} markers={[{ id: "x", lat: edit.lat, lng: edit.lng, kind: "laundry" }]} onPick={(lat, lng) => setEdit({ ...edit, lat, lng })} />
            </div>
            <div className="md:col-span-2 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEdit(null)}>{t("cancel")}</Button>
              <Button loading={busy} onClick={save}>{t("save")}</Button>
            </div>
          </div>
        )}
      </Sheet>
      <PriceEditor partner={prices} onClose={() => setPrices(null)} />
    </div>
  );
}

function PriceEditor({ partner, onClose }: { partner: any; onClose: () => void }) {
  const { t, L, lang } = useApp();
  const toast = useToast();
  const { data, mutate } = useSWR(partner ? `/api/admin/partners/${partner.id}/products` : null);
  const update = async (id: number, b: any) => {
    await api(`/api/partner/products/${id}`, { method: "PATCH", body: b });
    mutate();
    toast(t("saved"));
  };
  const groups: Record<string, any[]> = {};
  for (const p of data?.products || []) (groups[lang === "ar" ? p.s_ar : p.s_en] ||= []).push(p);
  return (
    <Sheet open={!!partner} onClose={onClose} wide title={partner ? `${t("menu")} • ${L(partner, "name")}` : ""}>
      {!data ? <Skeleton className="h-64" /> : Object.entries(groups).map(([g, items]) => (
        <div key={g} className="mb-5">
          <h4 className="mb-2 text-sm font-bold text-ink-500">{g}</h4>
          <div className="divide-y divide-ink-100 rounded-xl border border-ink-100">
            {items.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-3 py-2">
                <span className="text-xl">{p.icon}</span>
                <span className="flex-1 text-sm font-semibold">{L(p, "name")}</span>
                <input type="number" defaultValue={p.price} onBlur={(e) => Number(e.target.value) !== p.price && update(p.id, { price: Number(e.target.value) })} className="h-9 w-28 rounded-lg border border-ink-200 px-2 text-sm font-bold tabular" step={250} />
                <Toggle checked={!!p.active} onChange={(v) => update(p.id, { active: v })} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </Sheet>
  );
}
