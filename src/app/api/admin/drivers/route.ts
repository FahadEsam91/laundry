import { all, get, run, tx, now } from "@/lib/db";
import { handler, ok, body, fail } from "@/lib/api";
import { normalizePhone, requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

export const GET = handler(async () => {
  await requireUser("admin");
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  return ok({
    drivers: all(
      `SELECT d.*,u.name,u.phone,u.status user_status,
        (SELECT COUNT(*) FROM orders o WHERE o.driver_id=d.id AND o.status='delivered' AND o.created_at>=?) deliveries_30,
        (SELECT COUNT(*) FROM orders o WHERE o.driver_id=d.id AND o.status IN ('driver_assigned','picked_up','ready','out_for_delivery')) active_jobs
       FROM drivers d JOIN users u ON u.id=d.user_id ORDER BY d.status='online' DESC, deliveries_30 DESC`,
      since,
    ),
  });
});

export const POST = handler(async (req: Request) => {
  await requireUser("admin");
  const b = await body(req);
  if (!b.name || !b.phone) return fail(400, "name_phone_required");
  const phone = normalizePhone(b.phone);
  if (get("SELECT 1 FROM users WHERE phone=?", phone)) return fail(409, "phone_exists");
  const s = getSettings();
  const id = tx(() => {
    const u = run("INSERT INTO users(name,phone,role,created_at) VALUES(?,?,'driver',?)", b.name, phone, now());
    return run("INSERT INTO drivers(user_id,vehicle,plate,status,lat,lng,rating,created_at) VALUES(?,?,?,'offline',?,?,5,?)", u.id, b.vehicle || "motorbike", b.plate || null, s.map_lat, s.map_lng, now()).id;
  });
  return ok({ id }, 201);
});
