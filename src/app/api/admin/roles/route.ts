import { all, get, insert, now } from "@/lib/db";
import { handler, ok, body, fail } from "@/lib/api";
import { requirePermission, resolvePermissions } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { assertCanGrant, cleanPerms } from "@/lib/staff";

export const GET = handler(async () => {
  await requirePermission("staff.manage");
  const roles = await all<any>(
    "SELECT r.*,(SELECT COUNT(*) FROM users u WHERE u.admin_role_id=r.id AND u.role='admin' AND u.status!='deleted') AS members FROM admin_roles r ORDER BY r.system DESC, r.id",
  );
  return ok({ roles: roles.map((r) => ({ ...r, perms: resolvePermissions(r.key, r.permissions) })) });
});

/** Create a custom role from a set of permissions. */
export const POST = handler(async (req: Request) => {
  const me = await requirePermission("staff.manage");
  const b = await body(req);
  const perms = cleanPerms(b.perms);
  if (!b.name_ar || !b.name_en) return fail(400, "name_required");
  if (!perms.length) return fail(400, "permissions_required");
  assertCanGrant(me, perms);
  const key = `custom_${String(b.name_en).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 30)}_${Date.now().toString(36)}`;
  if (await get("SELECT 1 FROM admin_roles WHERE name_en=?", b.name_en)) return fail(409, "role_exists");
  const id = await insert(
    "INSERT INTO admin_roles(key,name_ar,name_en,desc_ar,desc_en,permissions,system,created_at) VALUES(?,?,?,?,?,?,0,?)",
    key, String(b.name_ar).slice(0, 60), String(b.name_en).slice(0, 60), b.desc_ar || "", b.desc_en || "", perms.join(","), now(),
  );
  await audit(me, "role.create", "role", id, { name_en: b.name_en, perms });
  return ok({ id }, 201);
});
