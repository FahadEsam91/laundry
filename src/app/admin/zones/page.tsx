"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import useSWR from "swr";
import { MapPinned, Plus, Pencil, Trash2, Undo2, Eraser, Store, Users, ReceiptText, AlertTriangle, Check, MousePointerClick } from "lucide-react";
import { useApp, useCan, useToast } from "@/components/providers";
import { NoAccess, PageHead } from "@/components/admin";
import { Button, Input, PartnerLogo, Sheet, Skeleton, Toggle, cx } from "@/components/ui";
import { api, errText } from "@/lib/client";
import type { LatLng } from "@/components/zone-map";

const ZoneMap = dynamic(() => import("@/components/zone-map").then((m) => m.ZoneMap), { ssr: false, loading: () => <Skeleton className="h-full w-full" /> });

type Draft = { id?: number; name_ar: string; name_en: string; color: string; active: boolean; polygon: LatLng[]; partner_ids: number[] };

export default function ZonesPage() {
  const { t, L, num, money, lang } = useApp();
  const can = useCan();
  const toast = useToast();
  const { data, mutate } = useSWR(can("zones.manage") ? "/api/admin/zones" : null);
  const [selected, setSelected] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState<any>(null);

  const zones: any[] = data?.zones || [];
  const partners: any[] = data?.partners || [];
  const colors: string[] = data?.colors || ["#1A62EC"];
  const activePartners = partners.filter((p) => p.status === "active");
  const mapZones = useMemo(() => zones.map((z) => ({ id: z.id, name: L(z, "name"), polygon: z.polygon, color: z.color, active: !!z.active })), [zones, L]);
  const mapPartners = useMemo(() => activePartners.map((p) => ({ id: p.id, name: L(p, "name"), lat: p.lat, lng: p.lng, color: p.color })), [activePartners, L]);

  if (!can("zones.manage")) return <NoAccess />;

  const startNew = () => {
    setSelected(null);
    setDraft({ name_ar: "", name_en: "", color: colors[zones.length % colors.length], active: true, polygon: [], partner_ids: [] });
  };
  const startEdit = (z: any) => {
    setSelected(z.id);
    setDraft({ id: z.id, name_ar: z.name_ar, name_en: z.name_en, color: z.color, active: !!z.active, polygon: z.polygon, partner_ids: z.partner_ids });
  };
  // laundries whose location lies inside the drawn shape (suggested for a new zone)
  const insideDraft = (p: any) => !!draft && draft.polygon.length >= 3 && inPolygon([p.lat, p.lng], draft.polygon);

  const save = async () => {
    if (!draft) return;
    if (!draft.name_ar.trim()) return toast(t("zone_name_required"), "error");
    if (draft.polygon.length < 3) return toast(t("zone_points_required"), "error");
    setBusy(true);
    try {
      const body = { ...draft, name_en: draft.name_en.trim() || draft.name_ar.trim() };
      if (draft.id) await api(`/api/admin/zones/${draft.id}`, { method: "PATCH", body });
      else {
        const r = await api<{ id: number }>("/api/admin/zones", { body });
        setSelected(r.id);
      }
      toast(t("saved"));
      setDraft(null);
      mutate();
    } catch (e) {
      toast(errText(e, lang), "error");
    } finally {
      setBusy(false);
    }
  };
  const toggle = async (z: any, active: boolean) => {
    try {
      await api(`/api/admin/zones/${z.id}`, { method: "PATCH", body: { active } });
      toast(active ? t("zone_opened") : t("zone_closed"));
      mutate();
    } catch (e) {
      toast(errText(e, lang), "error");
    }
  };
  const remove = async () => {
    setBusy(true);
    try {
      await api(`/api/admin/zones/${del.id}`, { method: "DELETE" });
      setDel(null);
      setSelected(null);
      mutate();
    } catch (e) {
      toast(errText(e, lang), "error");
    } finally {
      setBusy(false);
    }
  };

  const activeCount = zones.filter((z) => z.active).length;
  const coveredPartners = new Set(zones.filter((z) => z.active).flatMap((z) => z.partner_ids)).size;

  return (
    <div className="animate-fade-up">
      <PageHead
        title={t("zones")}
        sub={t("zones_sub")}
        actions={!draft && <Button onClick={startNew}><Plus className="h-4 w-4" /> {t("add_zone")}</Button>}
      />

      <div className="grid gap-5 lg:grid-cols-[400px_minmax(0,1fr)]">
        {/* side panel */}
        <div className="order-2 space-y-3 lg:order-1">
          {!data ? (
            <Skeleton className="h-72" />
          ) : draft ? (
            <div className="space-y-4 rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
              <div className="flex items-center justify-between">
                <h2 className="font-bold">{draft.id ? t("edit_zone") : t("add_zone")}</h2>
                <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-bold text-ink-600">{num(draft.polygon.length)} {t("points")}</span>
              </div>
              <div className="flex items-start gap-2 rounded-xl bg-brand-50 p-3 text-xs leading-5 text-brand-800">
                <MousePointerClick className="mt-0.5 h-4 w-4 shrink-0" /> {t("zone_draw_hint")}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={!draft.polygon.length} onClick={() => setDraft({ ...draft, polygon: draft.polygon.slice(0, -1) })}><Undo2 className="h-4 w-4" /> {t("undo")}</Button>
                <Button size="sm" variant="outline" disabled={!draft.polygon.length} onClick={() => setDraft({ ...draft, polygon: [] })}><Eraser className="h-4 w-4" /> {t("clear")}</Button>
              </div>
              <Input label={t("name_ar")} value={draft.name_ar} onChange={(e) => setDraft({ ...draft, name_ar: e.target.value })} placeholder="الكرادة" />
              <Input label={t("name_en")} value={draft.name_en} onChange={(e) => setDraft({ ...draft, name_en: e.target.value })} placeholder="Karrada" />
              <div>
                <div className="mb-1.5 text-xs font-semibold text-ink-600">{t("color")}</div>
                <div className="flex flex-wrap gap-2">
                  {colors.map((c) => (
                    <button key={c} onClick={() => setDraft({ ...draft, color: c })} className={cx("flex h-8 w-8 items-center justify-center rounded-full ring-offset-2", draft.color === c && "ring-2 ring-ink-900")} style={{ background: c }} aria-label={c}>
                      {draft.color === c && <Check className="h-4 w-4 text-white" />}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center justify-between rounded-xl bg-ink-50 p-3 text-sm font-semibold">
                {draft.active ? t("zone_open") : t("zone_closed_label")}
                <Toggle checked={draft.active} onChange={(v) => setDraft({ ...draft, active: v })} />
              </label>
              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-ink-600">
                  <span>{t("zone_laundries")} ({num(draft.partner_ids.length)})</span>
                  {draft.polygon.length >= 3 && (
                    <button className="font-bold text-brand-600" onClick={() => setDraft({ ...draft, partner_ids: [...new Set([...draft.partner_ids, ...activePartners.filter(insideDraft).map((p) => p.id)])] })}>
                      {t("add_inside")}
                    </button>
                  )}
                </div>
                <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-ink-100 p-1">
                  {activePartners.map((p) => {
                    const on = draft.partner_ids.includes(p.id);
                    return (
                      <button key={p.id} onClick={() => setDraft({ ...draft, partner_ids: on ? draft.partner_ids.filter((x) => x !== p.id) : [...draft.partner_ids, p.id] })} className={cx("flex w-full items-center gap-2 rounded-lg p-2 text-start text-sm", on ? "bg-brand-50" : "hover:bg-ink-50")}>
                        <PartnerLogo p={p} size={28} className="rounded-lg" />
                        <span className="min-w-0 flex-1 truncate font-semibold">{L(p, "name")}</span>
                        {insideDraft(p) && <span className="rounded-full bg-emerald-50 px-1.5 text-[10px] font-bold text-emerald-700">{t("inside")}</span>}
                        <span className={cx("flex h-5 w-5 items-center justify-center rounded-md border", on ? "border-brand-600 bg-brand-600 text-white" : "border-ink-300")}>{on && <Check className="h-3.5 w-3.5" />}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button block loading={busy} onClick={save}>{t("save")}</Button>
                <Button variant="outline" onClick={() => setDraft(null)}>{t("cancel")}</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                <Stat label={t("zones_active")} value={`${num(activeCount)}/${num(zones.length)}`} />
                <Stat label={t("laundries_covered")} value={`${num(coveredPartners)}/${num(activePartners.length)}`} />
                <Stat label={t("customers_outside")} value={num(data.uncovered_customers)} warn={data.uncovered_customers > 0} />
              </div>
              {!zones.length && (
                <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-6 text-center">
                  <MapPinned className="mx-auto h-10 w-10 text-brand-500" />
                  <div className="mt-3 font-bold">{t("no_zones_title")}</div>
                  <p className="mt-1 text-sm text-ink-500">{t("no_zones_body")}</p>
                  <Button className="mt-4" onClick={startNew}><Plus className="h-4 w-4" /> {t("add_zone")}</Button>
                </div>
              )}
              {zones.map((z) => (
                <div key={z.id} onClick={() => setSelected(z.id)} className={cx("cursor-pointer rounded-2xl border bg-white p-4 shadow-soft transition", selected === z.id ? "border-brand-400 ring-2 ring-brand-100" : "border-ink-100 hover:border-ink-200")}>
                  <div className="flex items-center gap-3">
                    <span className="h-9 w-2 shrink-0 rounded-full" style={{ background: z.active ? z.color : "#94A3B8" }} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-bold">{L(z, "name")}</div>
                      <div className={cx("text-xs font-semibold", z.active ? "text-emerald-600" : "text-ink-400")}>{z.active ? t("zone_open") : t("zone_closed_label")}</div>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}><Toggle checked={!!z.active} onChange={(v) => toggle(z, v)} /></div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <Mini icon={Store} value={num(z.partner_ids.length)} label={t("partners")} warn={!z.partner_ids.length} />
                    <Mini icon={Users} value={num(z.customers)} label={t("customers")} />
                    <Mini icon={ReceiptText} value={num(z.orders_30)} label={`${t("orders")} 30d`} />
                  </div>
                  {!z.partner_ids.length && <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-amber-700"><AlertTriangle className="h-3.5 w-3.5" /> {t("zone_no_laundries")}</div>}
                  {selected === z.id && (
                    <div className="mt-3 flex items-center gap-2 border-t border-ink-100 pt-3" onClick={(e) => e.stopPropagation()}>
                      <span className="flex-1 text-xs text-ink-500">{money(z.gmv_30)} • 30d</span>
                      <Button size="sm" variant="outline" onClick={() => startEdit(z)}><Pencil className="h-3.5 w-3.5" /> {t("edit")}</Button>
                      <Button size="sm" variant="ghost" className="text-red-600" onClick={() => setDel(z)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>

        {/* map */}
        <div className="order-1 lg:order-2">
          <div className="sticky top-4 h-[60vh] overflow-hidden rounded-2xl border border-ink-100 shadow-soft lg:h-[calc(100vh-9rem)]">
            {data && (
              <ZoneMap
                className="h-full w-full"
                zones={mapZones}
                partners={mapPartners}
                selected={selected}
                onSelect={(id) => !draft && setSelected(id)}
                draft={draft ? { id: draft.id, polygon: draft.polygon, color: draft.color } : null}
                onDraft={(polygon) => setDraft((d) => (d ? { ...d, polygon } : d))}
              />
            )}
          </div>
        </div>
      </div>

      <Sheet open={!!del} onClose={() => setDel(null)} title={t("delete_zone")}>
        {del && (
          <div>
            <p className="text-sm text-ink-600">{t("delete_zone_confirm", { x: L(del, "name") })}</p>
            <div className="mt-5 flex gap-2">
              <Button variant="danger" block loading={busy} onClick={remove}><Trash2 className="h-4 w-4" /> {t("delete")}</Button>
              <Button variant="outline" onClick={() => setDel(null)}>{t("cancel")}</Button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={cx("rounded-2xl border bg-white p-3 shadow-soft", warn ? "border-amber-200" : "border-ink-100")}>
      <div className={cx("text-lg font-extrabold tabular", warn && "text-amber-600")}>{value}</div>
      <div className="text-[11px] leading-4 text-ink-500">{label}</div>
    </div>
  );
}

function Mini({ icon: I, value, label, warn }: { icon: any; value: string; label: string; warn?: boolean }) {
  return (
    <div className={cx("rounded-xl p-2", warn ? "bg-amber-50" : "bg-ink-50")}>
      <div className="flex items-center justify-center gap-1 font-extrabold tabular"><I className="h-3.5 w-3.5 text-ink-400" />{value}</div>
      <div className="text-[10px] text-ink-500">{label}</div>
    </div>
  );
}

function inPolygon([lat, lng]: LatLng, poly: LatLng[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [yi, xi] = poly[i], [yj, xj] = poly[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
