import { all, get } from "@/lib/db";
import { handler, ok } from "@/lib/api";
import { currentUser } from "@/lib/auth";
import { haversineKm } from "@/lib/orders";
import { coverageAt, zoneDTO } from "@/lib/zones";

export const GET = handler(async (req: Request) => {
  const url = new URL(req.url);
  const service = url.searchParams.get("service");
  const q = (url.searchParams.get("q") || "").trim();
  let lat = Number(url.searchParams.get("lat")) || 0;
  let lng = Number(url.searchParams.get("lng")) || 0;
  const u = await currentUser();
  if (!lat && u) {
    const a = await get<any>("SELECT lat,lng FROM addresses WHERE user_id=? ORDER BY is_default DESC LIMIT 1", u.id);
    if (a) ({ lat, lng } = a);
  }
  const where = ["p.status='active'"];
  const params: any[] = [];
  // service zones: with a known location, only laundries that serve its zone are listed
  const cov = lat ? await coverageAt(lat, lng) : null;
  if (cov && cov.status !== "open") {
    if (cov.status !== "ok") return ok({ partners: [], coverage: { status: cov.status, zone: zoneDTO(cov.zone) } });
    where.push("EXISTS(SELECT 1 FROM partner_zones pz WHERE pz.partner_id=p.id AND pz.zone_id=?)");
    params.push(cov.zone.id);
  }
  if (service) {
    where.push("EXISTS(SELECT 1 FROM products x JOIN services s ON s.id=x.service_id WHERE x.partner_id=p.id AND s.slug=? AND x.active=1)");
    params.push(service);
  }
  if (q) {
    where.push("(p.name_ar LIKE ? OR p.name_en LIKE ? OR p.area_ar LIKE ? OR p.area_en LIKE ? OR EXISTS(SELECT 1 FROM products x WHERE x.partner_id=p.id AND (x.name_ar LIKE ? OR x.name_en LIKE ?)))");
    const like = `%${q}%`;
    params.push(like, like, like, like, like, like);
  }
  const rows = await all<any>(
    `SELECT p.id,p.name_ar,p.name_en,p.desc_ar,p.desc_en,p.area_ar,p.area_en,p.lat,p.lng,p.rating,p.rating_count,p.eta_hours,p.express_hours,p.delivery_fee,p.min_order,p.color,p.color2,p.initials,p.logo_url,p.cover_url,p.is_open,p.featured,p.tags,
      (SELECT GROUP_CONCAT(DISTINCT s.slug) FROM products x JOIN services s ON s.id=x.service_id WHERE x.partner_id=p.id AND x.active=1) AS services,
      (SELECT MIN(x.price) FROM products x WHERE x.partner_id=p.id AND x.active=1) AS from_price
     FROM partners p WHERE ${where.join(" AND ")}`,
    ...params,
  );
  for (const r of rows) r.distance_km = lat ? Math.round(haversineKm(lat, lng, r.lat, r.lng) * 10) / 10 : null;
  rows.sort((a, b) => b.is_open - a.is_open || b.featured - a.featured || b.rating - a.rating);
  return ok({ partners: rows, coverage: { status: cov?.status ?? "unknown", zone: zoneDTO(cov?.zone ?? null) } });
});
