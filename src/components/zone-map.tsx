"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export type LatLng = [number, number];
export type MapZone = { id: number; name: string; polygon: LatLng[]; color: string; active: boolean };
export type MapPartner = { id: number; name: string; lat: number; lng: number; color: string };

const TILES = process.env.NEXT_PUBLIC_MAP_TILES || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTR = process.env.NEXT_PUBLIC_MAP_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';

/**
 * Service-zone map. Shows every zone; while `draft` is set the map is in drawing mode:
 * click to add a corner, drag a corner to move it, click a corner to remove it.
 */
export function ZoneMap({
  zones,
  partners = [],
  selected,
  onSelect,
  draft,
  onDraft,
  className,
  center = [33.315, 44.38],
}: {
  zones: MapZone[];
  partners?: MapPartner[];
  selected?: number | null;
  onSelect?: (id: number) => void;
  draft?: { id?: number; polygon: LatLng[]; color: string } | null;
  onDraft?: (polygon: LatLng[]) => void;
  className?: string;
  center?: LatLng;
}) {
  const el = useRef<HTMLDivElement>(null);
  const L = useRef<any>(null);
  const map = useRef<any>(null);
  const layer = useRef<any>(null);
  const ready = useRef(false);
  const props = useRef({ draft, onDraft, onSelect });
  props.current = { draft, onDraft, onSelect };
  const fitted = useRef<string>("");

  // create the map once
  useEffect(() => {
    let disposed = false;
    import("leaflet").then((mod) => {
      const Lf = (mod as any).default || mod;
      if (disposed || !el.current || map.current) return;
      L.current = Lf;
      const m = Lf.map(el.current, { zoomControl: false, doubleClickZoom: false }).setView(center, 12);
      Lf.tileLayer(TILES, { maxZoom: 19, attribution: ATTR }).addTo(m);
      Lf.control.zoom({ position: "bottomright" }).addTo(m);
      m.on("click", (e: any) => {
        const d = props.current.draft;
        if (d && props.current.onDraft) props.current.onDraft([...d.polygon, [round(e.latlng.lat), round(e.latlng.lng)]]);
      });
      layer.current = Lf.layerGroup().addTo(m);
      map.current = m;
      ready.current = true;
      draw();
    });
    return () => {
      disposed = true;
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zones, partners, selected, draft]);

  function draw() {
    const Lf = L.current, m = map.current, g = layer.current;
    if (!Lf || !m || !g) return;
    g.clearLayers();
    m.getContainer().style.cursor = draft ? "crosshair" : "";

    for (const z of zones) {
      if (draft?.id === z.id) continue;
      const on = selected === z.id;
      const poly = Lf.polygon(z.polygon, {
        color: z.active ? z.color : "#94A3B8",
        weight: on ? 4 : 2,
        dashArray: z.active ? undefined : "6 6",
        fillColor: z.active ? z.color : "#94A3B8",
        fillOpacity: draft ? 0.06 : on ? 0.28 : 0.16,
        interactive: !draft,
      }).addTo(g);
      poly.bindTooltip(`<b>${esc(z.name)}</b>`, { permanent: true, direction: "center", className: "zone-label" });
      poly.on("click", () => props.current.onSelect?.(z.id));
    }

    for (const p of partners) {
      Lf.circleMarker([p.lat, p.lng], { radius: 6, color: "#fff", weight: 2, fillColor: p.color, fillOpacity: 1, interactive: true })
        .bindTooltip(esc(p.name), { direction: "top", offset: [0, -6] })
        .addTo(g);
    }

    if (draft) {
      const pts = draft.polygon;
      if (pts.length >= 3) Lf.polygon(pts, { color: draft.color, weight: 3, fillColor: draft.color, fillOpacity: 0.22, interactive: false }).addTo(g);
      else if (pts.length === 2) Lf.polyline(pts, { color: draft.color, weight: 3, interactive: false }).addTo(g);
      pts.forEach((pt, i) => {
        const icon = Lf.divIcon({
          className: "",
          html: `<div style="width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:999px;background:#fff;border:3px solid ${draft.color};box-shadow:0 2px 6px rgba(0,0,0,.3);cursor:move"></div>`,
          iconSize: [0, 0],
        });
        const mk = Lf.marker(pt, { icon, draggable: true, autoPan: true }).addTo(g);
        mk.on("dragend", (e: any) => {
          const ll = e.target.getLatLng();
          const next = [...props.current.draft!.polygon];
          next[i] = [round(ll.lat), round(ll.lng)];
          props.current.onDraft?.(next);
        });
        mk.on("click", () => props.current.onDraft?.(props.current.draft!.polygon.filter((_, j) => j !== i)));
      });
    }

    // fit the view: to the zone being edited / selected, otherwise to everything (once per change of focus)
    const focus = draft?.polygon.length ? null : selected ? zones.find((z) => z.id === selected)?.polygon : null;
    const key = focus ? `z${selected}` : draft ? `draft${draft.id ?? "new"}` : `all${zones.length}`;
    if (fitted.current !== key) {
      const all: LatLng[] = focus || (draft ? [] : [...zones.flatMap((z) => z.polygon), ...partners.map((p) => [p.lat, p.lng] as LatLng)]);
      if (all.length) m.fitBounds(Lf.latLngBounds(all), { padding: [40, 40], maxZoom: 15 });
      fitted.current = key;
    }
  }

  return <div ref={el} className={className} />;
}

const round = (n: number) => Math.round(n * 1e6) / 1e6;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
