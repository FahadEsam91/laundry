"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export type MapMarker = {
  id: string | number;
  lat: number;
  lng: number;
  kind: "home" | "laundry" | "rider" | "order" | "pin";
  label?: string;
  color?: string;
  pulse?: boolean;
  onClick?: () => void;
};

const SVG = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" fill="white"/>',
  laundry: '<rect x="4" y="3" width="16" height="18" rx="3" fill="none" stroke="white" stroke-width="2"/><circle cx="12" cy="13" r="4.2" fill="none" stroke="white" stroke-width="2"/><circle cx="8" cy="6.5" r="1" fill="white"/>',
  rider: '<circle cx="6" cy="17" r="3" fill="none" stroke="white" stroke-width="2"/><circle cx="18" cy="17" r="3" fill="none" stroke="white" stroke-width="2"/><path d="M6 17h5l3-7h3M14 10l-2-4H9" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"/>',
  order: '<circle cx="12" cy="12" r="4" fill="white"/>',
  pin: '<circle cx="12" cy="10" r="3.5" fill="white"/>',
};

function iconHtml(m: MapMarker) {
  const color = m.color || (m.kind === "home" ? "#0B0E14" : m.kind === "laundry" ? "#1A62EC" : m.kind === "rider" ? "#10B981" : "#F59E0B");
  const size = m.kind === "order" ? 22 : 38;
  const pulse = m.pulse ? `<span style="position:absolute;inset:-8px;border-radius:999px;background:${color};opacity:.35;animation:pulse2 1.8s ease-out infinite"></span>` : "";
  return {
    html: `<div style="position:relative;width:${size}px;height:${size}px">${pulse}<div style="position:relative;width:100%;height:100%;border-radius:999px;background:${color};border:3px solid white;box-shadow:0 6px 16px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center"><svg viewBox="0 0 24 24" width="${size * 0.5}" height="${size * 0.5}">${SVG[m.kind]}</svg></div></div>`,
    size,
  };
}

export function MapView({
  markers,
  route,
  center,
  zoom = 13,
  className,
  fit = true,
  onPick,
  interactive = true,
}: {
  markers: MapMarker[];
  route?: [number, number][] | null;
  center?: [number, number];
  zoom?: number;
  className?: string;
  fit?: boolean;
  onPick?: (lat: number, lng: number) => void;
  interactive?: boolean;
}) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
  const LRef = useRef<any>(null);
  const fitted = useRef(false);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;

  useEffect(() => {
    let disposed = false;
    import("leaflet").then((mod) => {
      const L = (mod as any).default || mod;
      if (disposed || !el.current || mapRef.current) return;
      LRef.current = L;
      const map = L.map(el.current, {
        zoomControl: false,
        attributionControl: true,
        dragging: interactive,
        scrollWheelZoom: interactive,
        doubleClickZoom: interactive,
        touchZoom: interactive,
      }).setView(center || [33.315, 44.38], zoom);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        subdomains: "abcd",
        attribution: '&copy; OpenStreetMap &copy; CARTO',
      }).addTo(map);
      if (interactive) L.control.zoom({ position: "bottomright" }).addTo(map);
      map.on("click", (e: any) => pickRef.current?.(e.latlng.lat, e.latlng.lng));
      layerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      draw();
    });
    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const draw = () => {
    const L = LRef.current, map = mapRef.current, layer = layerRef.current;
    if (!L || !map || !layer) return;
    layer.clearLayers();
    if (route && route.length > 1) {
      L.polyline(route, { color: "#1A62EC", weight: 5, opacity: 0.85, dashArray: "1 10", lineCap: "round" }).addTo(layer);
    }
    const pts: [number, number][] = [];
    for (const m of markers) {
      if (!Number.isFinite(m.lat) || !Number.isFinite(m.lng)) continue;
      const { html, size } = iconHtml(m);
      const mk = L.marker([m.lat, m.lng], { icon: L.divIcon({ html, className: "", iconSize: [size, size], iconAnchor: [size / 2, size / 2] }) }).addTo(layer);
      if (m.label) mk.bindTooltip(m.label, { direction: "top", offset: [0, -size / 2] });
      if (m.onClick) mk.on("click", m.onClick);
      pts.push([m.lat, m.lng]);
    }
    if (fit && !fitted.current && pts.length > 1) {
      map.fitBounds(L.latLngBounds(pts).pad(0.25), { animate: false });
      fitted.current = true;
    } else if (fit && !fitted.current && pts.length === 1) {
      map.setView(pts[0], zoom);
      fitted.current = true;
    }
  };

  useEffect(draw);

  return <div ref={el} className={className} style={{ zIndex: 0 }} />;
}
