import { all, get } from "@/lib/db";
import { handler, ok, fail } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { autopilotTick, haversineKm } from "@/lib/orders";

const JOB_SQL = `SELECT o.id,o.code,o.status,o.total,o.payment_method,o.payment_status,o.items_count,o.express,o.address_text,o.address_lat,o.address_lng,o.notes,o.delivery_fee,o.status_at,
  p.name_ar partner_ar,p.name_en partner_en,p.area_ar,p.area_en,p.lat p_lat,p.lng p_lng,p.color partner_color,p.initials partner_initials,p.phone partner_phone,
  u.name customer_name,u.phone customer_phone
  FROM orders o JOIN partners p ON p.id=o.partner_id JOIN users u ON u.id=o.customer_id`;

export const GET = handler(async () => {
  const u = await requireUser("driver");
  const driver = await get<any>("SELECT d.*,u.name,u.phone FROM drivers d JOIN users u ON u.id=d.user_id WHERE d.user_id=?", u.id);
  if (!driver) return fail(403, "no_driver");
  await autopilotTick();
  const mine = await all<any>(`${JOB_SQL} WHERE o.driver_id=? AND o.status IN ('driver_assigned','picked_up','ready','out_for_delivery') ORDER BY o.status_at`, driver.id);
  const available =
    driver.status === "online"
      ? await all<any>(`${JOB_SQL} WHERE o.driver_id IS NULL AND o.status IN ('accepted','ready') AND o.auto=0 ORDER BY o.status_at LIMIT 20`)
      : [];
  for (const j of [...mine, ...available]) j.distance_km = Math.round(haversineKm(driver.lat ?? j.p_lat, driver.lng ?? j.p_lng, j.status === "accepted" || j.status === "driver_assigned" ? j.address_lat : j.p_lat, j.status === "accepted" || j.status === "driver_assigned" ? j.address_lng : j.p_lng) * 10) / 10;
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const deliveries = (await get<any>("SELECT COUNT(*) c FROM orders WHERE driver_id=? AND status='delivered' AND status_at>=?", driver.id, since.toISOString()))!.c;
  const pickups = (await get<any>("SELECT COUNT(*) c FROM orders WHERE pickup_driver_id=? AND updated_at>=?", driver.id, since.toISOString()))!.c;
  const total = (await get<any>("SELECT COUNT(*) c FROM orders WHERE driver_id=? AND status='delivered'", driver.id))!.c;
  return ok({ driver, mine, available, stats: { deliveries, pickups, legs: deliveries + pickups, earnings: (deliveries + pickups) * 2000, total } });
});
