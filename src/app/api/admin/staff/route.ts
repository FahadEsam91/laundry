import { all, get, insert, now } from "@/lib/db";
import { handler, ok, body, fail } from "@/lib/api";
import { normalizePhone, requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { assertCanGrant, roleById } from "@/lib/staff";

export const GET = handler(async () => {
  await requirePermission("staff.manage");
  const staff = await all(
    `SELECT u.id,u.name,u.phone,u.status,u.created_at,u.last_seen,u.admin_role_id,r.key AS role_key,r.name_ar AS role_ar,r.name_en AS role_en,
       (SELECT COUNT(*) FROM audit_log a WHERE a.user_id=u.id) AS actions
     FROM users u LEFT JOIN admin_roles r ON r.id=u.admin_role_id WHERE u.role='admin' AND u.status!='deleted' ORDER BY u.status='active' DESC, u.created_at`,
  );
  return ok({ staff });
});

/** Invite a staff member: they sign in with their phone number (OTP). */
export const POST = handler(async (req: Request) => {
  const me = await requirePermission("staff.manage");
  const b = await body(req);
  const name = String(b.name || "").trim();
  const phone = normalizePhone(b.phone);
  if (name.length < 2 || !/^\+\d{10,15}$/.test(phone)) return fail(400, "invalid_input");
  if (await get("SELECT 1 FROM users WHERE phone=?", phone)) return fail(409, "phone_exists");
  const role = await roleById(Number(b.role_id));
  assertCanGrant(me, role.perms, role.key);
  const id = await insert("INSERT INTO users(name,phone,role,admin_role_id,created_at) VALUES(?,?,'admin',?,?)", name.slice(0, 80), phone, role.id, now());
  await audit(me, "staff.invite", "user", id, { name, phone, role: role.key });
  return ok({ id }, 201);
});
