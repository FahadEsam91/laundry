import "server-only";
import { all, get, run } from "./db";
import { HttpError } from "./auth";

export type LatLng = [number, number];
export type Zone = { id: number; name_ar: string; name_en: string; polygon: LatLng[]; color: string; active: number };
export type Coverage =
  | { status: "open"; zone: null } // no zones defined yet: the whole map is served
  | { status: "ok"; zone: Zone }
  | { status: "paused"; zone: Zone } // inside a zone the operator switched off
  | { status: "outside"; zone: null };

/** Ray casting on lat/lng (fine at city scale). */
export function inPolygon([lat, lng]: LatLng, poly: LatLng[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [yi, xi] = poly[i], [yj, xj] = poly[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Validate a drawn polygon: 3–200 points, real coordinates. */
export function parsePolygon(v: unknown): LatLng[] {
  if (!Array.isArray(v) || v.length < 3 || v.length > 200) throw new HttpError(400, "invalid_zone");
  return v.map((p) => {
    const lat = Number(p?.[0]), lng = Number(p?.[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) throw new HttpError(400, "invalid_zone");
    return [Math.round(lat * 1e6) / 1e6, Math.round(lng * 1e6) / 1e6] as LatLng;
  });
}

let cache: { at: number; zones: Zone[] } | null = null;
export function invalidateZones() {
  cache = null;
}

export async function getZones(): Promise<Zone[]> {
  if (cache && Date.now() - cache.at < 5000) return cache.zones;
  const rows = await all<any>("SELECT id,name_ar,name_en,polygon,color,active FROM zones ORDER BY id");
  const zones = rows.map((r) => ({ ...r, polygon: JSON.parse(r.polygon) as LatLng[] }));
  cache = { at: Date.now(), zones };
  return zones;
}

/** Which zone serves a point. Active zones win over paused ones where they overlap. */
export async function coverageAt(lat: number, lng: number): Promise<Coverage> {
  const zones = await getZones();
  if (!zones.length) return { status: "open", zone: null };
  const hits = zones.filter((z) => inPolygon([lat, lng], z.polygon));
  const active = hits.find((z) => z.active);
  if (active) return { status: "ok", zone: active };
  if (hits.length) return { status: "paused", zone: hits[0] };
  return { status: "outside", zone: null };
}

/** Throws a customer-facing error unless an order from this address to this laundry is allowed. */
export async function assertDeliverable(lat: number, lng: number, partnerId: number) {
  const c = await coverageAt(lat, lng);
  if (c.status === "open") return;
  if (c.status === "outside") throw new HttpError(400, "outside_zone");
  if (c.status === "paused") throw new HttpError(400, "zone_paused");
  const serves = await get("SELECT 1 FROM partner_zones WHERE partner_id=? AND zone_id=?", partnerId, c.zone.id);
  if (!serves) throw new HttpError(400, "partner_not_in_zone");
}

/** Replace the zones a laundry serves. */
export async function setPartnerZones(partnerId: number, zoneIds: unknown) {
  if (!Array.isArray(zoneIds)) return;
  const ids = [...new Set(zoneIds.map(Number).filter((n) => Number.isInteger(n) && n > 0))];
  await run("DELETE FROM partner_zones WHERE partner_id=?", partnerId);
  for (const z of ids) if (await get("SELECT 1 FROM zones WHERE id=?", z)) await run("INSERT INTO partner_zones(partner_id,zone_id) VALUES(?,?)", partnerId, z);
}

/** Replace the laundries serving a zone. */
export async function setZonePartners(zoneId: number, partnerIds: unknown) {
  if (!Array.isArray(partnerIds)) return;
  const ids = [...new Set(partnerIds.map(Number).filter((n) => Number.isInteger(n) && n > 0))];
  await run("DELETE FROM partner_zones WHERE zone_id=?", zoneId);
  for (const p of ids) if (await get("SELECT 1 FROM partners WHERE id=?", p)) await run("INSERT INTO partner_zones(partner_id,zone_id) VALUES(?,?)", p, zoneId);
}

/** Public shape for clients. */
export const zoneDTO = (z: Zone | null) => (z ? { id: z.id, name_ar: z.name_ar, name_en: z.name_en, active: !!z.active } : null);
