"use client";

import "maplibre-gl/dist/maplibre-gl.css";

/**
 * Free vector basemap from OpenFreeMap (no key, no limits, commercial use allowed), drawn with MapLibre under the
 * Leaflet map so markers, routes and zone shapes keep working unchanged. Labels follow the site language.
 * Override with NEXT_PUBLIC_MAP_STYLE (any MapLibre style URL). Falls back to raster OSM tiles without WebGL.
 */
const STYLE = process.env.NEXT_PUBLIC_MAP_STYLE || "https://tiles.openfreemap.org/styles/liberty";

function webgl() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Show street and place names in the visitor's language (Arabic or English), falling back to the local name. */
function localize(gl: any, lang: "ar" | "en") {
  const field = lang === "ar" ? ["coalesce", ["get", "name:ar"], ["get", "name"]] : ["coalesce", ["get", "name:en"], ["get", "name_en"], ["get", "name:latin"], ["get", "name"]];
  for (const layer of gl.getStyle()?.layers || []) {
    const tf = layer.layout?.["text-field"];
    if (tf && JSON.stringify(tf).includes("name") && JSON.stringify(tf) !== JSON.stringify(field)) gl.setLayoutProperty(layer.id, "text-field", field);
  }
}

export async function addBasemap(L: any, map: any) {
  const lang = document.documentElement.lang === "en" ? "en" : "ar";
  if (webgl()) {
    try {
      // the worker is served from public/vendor (copied at build time); the bundled default path would 404
      const ml: any = await import("maplibre-gl");
      (ml.setWorkerUrl || ml.default?.setWorkerUrl)?.("/vendor/maplibre-gl-worker.mjs");
      const mod: any = await import("@maplibre/maplibre-gl-leaflet");
      const make = mod.maplibreGL || L.maplibreGL;
      const layer = make({ style: STYLE, interactive: false } as any).addTo(map);
      // the style already credits OpenFreeMap, OpenMapTiles and OpenStreetMap; keep the credits line short
      map.attributionControl?.setPrefix(false);
      const gl = layer.getMaplibreMap();
      // apply once the style is fully loaded (and again if it is ever reloaded)
      const apply = () => { try { localize(gl, lang); } catch { /* style not ready yet */ } };
      gl.on("load", apply);
      gl.on("style.load", apply);
      if (gl.isStyleLoaded?.()) apply();
      return;
    } catch {
      /* fall through to raster tiles */
    }
  }
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
  }).addTo(map);
}
