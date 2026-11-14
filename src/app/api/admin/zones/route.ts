import { all, insert, now } from "@/lib/db";
import { handler, ok, body, fail } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { getZones, inPolygon, invalidateZones, parsePolygon, setZonePartners } from "@/lib/zones";

const COLORS = ["#1A62EC", "#059669", "#7C3AED", "#EA580C", "#DB2777", "#0891B2", "#CA8A04", "#4F46E5"];

/** Zones with the laundries serving them and how many customers / orders fall inside. */
export const GET = handler(async () => {
  await requirePermission("zones.manage");
  invalidateZones();
  const zones = await getZones();
  const links = await all<{ partner_id: number; zone_id: number }>("SELECT partner_id,zone_id FROM partner_zones");
  const addresses = await all<{ user_id: number; lat: number; lng: number }>("SELECT a.user_id,a.lat,a.lng FROM addresses a JOIN users u ON u.id=a.user_id WHERE u.status!='deleted'");
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const orders = await all<{ address_lat: number; address_lng: number; total: number }>("SELECT address_lat,address_lng,total FROM orders WHERE created_at>=? AND status!='cancelled'", since);
  const partners = await all("SELECT id,name_ar,name_en,lat,lng,status,color,color2,initials,logo_url FROM partners ORDER BY name_en");
  const out = zones.map((z) => {
    const inside = (lat: number, lng: number) => inPolygon([lat, lng], z.polygon);
    const ord = orders.filter((o) => inside(o.address_lat, o.address_lng));
    return {
      ...z,
      partner_ids: links.filter((l) => l.zone_id === z.id).map((l) => l.partner_id),
      customers: new Set(addresses.filter((a) => inside(a.lat, a.lng)).map((a) => a.user_id)).size,
      orders_30: ord.length,
      gmv_30: ord.reduce((s, o) => s + Number(o.total), 0),
    };
  });
  const uncovered = new Set(addresses.filter((a) => !zones.some((z) => z.active && inPolygon([a.lat, a.lng], z.polygon))).map((a) => a.user_id)).size;
  return ok({ zones: out, partners, uncovered_customers: zones.length ? uncovered : 0, colors: COLORS });
});

export const POST = handler(async (req: Request) => {
  const me = await requirePermission("zones.manage");
  const b = await body(req);
  const name_ar = String(b.name_ar || "").trim().slice(0, 60), name_en = String(b.name_en || b.name_ar || "").trim().slice(0, 60);
  if (!name_ar) return fail(400, "name_required");
  const polygon = parsePolygon(b.polygon);
  const color = COLORS.includes(b.color) ? b.color : COLORS[(await getZones()).length % COLORS.length];
  const ts = now();
  const id = await insert("INSERT INTO zones(name_ar,name_en,polygon,color,active,created_at,updated_at) VALUES(?,?,?,?,?,?,?)", name_ar, name_en, JSON.stringify(polygon), color, b.active === false ? 0 : 1, ts, ts);
  // laundries located inside the new zone serve it by default
  const partnerIds = Array.isArray(b.partner_ids)
    ? b.partner_ids
    : (await all<any>("SELECT id,lat,lng FROM partners")).filter((p) => inPolygon([p.lat, p.lng], polygon)).map((p) => p.id);
  await setZonePartners(id, partnerIds);
  invalidateZones();
  await audit(me, "zone.create", "zone", id, { name_ar, name_en, points: polygon.length, partners: partnerIds.length });
  return ok({ id }, 201);
});
