import { all, get, run, tx, now } from "@/lib/db";
import { handler, ok, body, fail } from "@/lib/api";
import { requireUser } from "@/lib/auth";

export const GET = handler(async () => {
  await requireUser("admin");
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const partners = all(
    `SELECT p.*,
      (SELECT COUNT(*) FROM orders o WHERE o.partner_id=p.id AND o.status!='cancelled' AND o.created_at>=?) orders_30,
      (SELECT COALESCE(SUM(o.total),0) FROM orders o WHERE o.partner_id=p.id AND o.status!='cancelled' AND o.created_at>=?) gmv_30,
      (SELECT COUNT(*) FROM orders o WHERE o.partner_id=p.id AND o.status NOT IN ('delivered','cancelled')) active_orders,
      (SELECT COUNT(*) FROM products x WHERE x.partner_id=p.id) products
     FROM partners p ORDER BY p.status='pending' DESC, gmv_30 DESC`,
    since, since,
  );
  return ok({ partners });
});

const PALETTE = [["#1A62EC", "#56A3FD"], ["#0F766E", "#2DD4BF"], ["#7C3AED", "#C4B5FD"], ["#BE185D", "#F9A8D4"], ["#B45309", "#FBBF24"], ["#15803D", "#86EFAC"]];

export const POST = handler(async (req: Request) => {
  await requireUser("admin");
  const b = await body(req);
  if (!b.name_ar || !b.name_en) return fail(400, "name_required");
  const services: string[] = Array.isArray(b.services) && b.services.length ? b.services : ["wash_iron", "iron"];
  const c = PALETTE[Math.floor(Math.random() * PALETTE.length)];
  const initials = String(b.name_en).split(/\s+/).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
  const id = tx(() => {
    const { id } = run(
      `INSERT INTO partners(name_ar,name_en,desc_ar,desc_en,area_ar,area_en,lat,lng,rating,rating_count,eta_hours,express_hours,delivery_fee,min_order,commission,color,color2,initials,is_open,status,featured,tags,phone,created_at)
       VALUES(?,?,?,?,?,?,?,?,5,0,?,?,?,?,?,?,?,?,1,'active',0,'',?,?)`,
      b.name_ar, b.name_en, b.desc_ar || "", b.desc_en || "", b.area_ar || "", b.area_en || "", Number(b.lat) || 33.315, Number(b.lng) || 44.38,
      Number(b.eta_hours) || 24, Number(b.express_hours) || 6, Number(b.delivery_fee) || 0, Number(b.min_order) || 0, Number(b.commission) || 15, c[0], c[1], initials || "NQ", b.phone || null, now(),
    );
    // seed the price list from the platform's reference catalog (cheapest active offer per item)
    const template = all<any>(
      `SELECT p.service_id,p.name_ar,p.name_en,p.icon,MIN(p.price) price,p.unit,MAX(p.popular) popular FROM products p JOIN services s ON s.id=p.service_id
       WHERE s.slug IN (${services.map(() => "?").join(",")}) GROUP BY p.service_id,p.name_en`,
      ...services,
    );
    for (const t of template) run("INSERT INTO products(partner_id,service_id,name_ar,name_en,icon,price,unit,popular) VALUES(?,?,?,?,?,?,?,?)", id, t.service_id, t.name_ar, t.name_en, t.icon, t.price, t.unit, t.popular);
    return id;
  });
  return ok({ id: get<any>("SELECT id FROM partners WHERE id=?", id)!.id }, 201);
});
