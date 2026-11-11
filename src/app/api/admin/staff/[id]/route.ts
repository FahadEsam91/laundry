import { get, run } from "@/lib/db";
import { handler, ok, body, fail } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { activeSuperAdmins, assertCanGrant, roleById } from "@/lib/staff";

/** Change a staff member's role, name or status (active / suspended). */
export const PATCH = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const me = await requirePermission("staff.manage");
  const id = Number((await params).id);
  const target = await get<any>("SELECT u.*,r.key AS role_key FROM users u LEFT JOIN admin_roles r ON r.id=u.admin_role_id WHERE u.id=? AND u.role='admin'", id);
  if (!target) return fail(404, "not_found");
  const b = await body(req);
  const changesRole = b.role_id !== undefined && Number(b.role_id) !== target.admin_role_id;
  const changesStatus = b.status !== undefined && b.status !== target.status;
  if (id === me.id && (changesRole || changesStatus)) return fail(409, "cannot_change_own_access");
  if (target.role_key === "super_admin" && me.admin_role !== "super_admin") return fail(403, "only_super_admin_can_edit_super_admin");
  const losingSuper = target.role_key === "super_admin" && target.status === "active" && (changesStatus || changesRole);
  if (losingSuper) {
    const newRole = changesRole ? await roleById(Number(b.role_id)) : null;
    if (!(newRole?.key === "super_admin" && !changesStatus) && (await activeSuperAdmins()) <= 1) return fail(409, "last_super_admin");
  }
  const log: Record<string, unknown> = {};
  if (changesRole) {
    const role = await roleById(Number(b.role_id));
    assertCanGrant(me, role.perms, role.key);
    await run("UPDATE users SET admin_role_id=? WHERE id=?", role.id, id);
    log.role = { from: target.role_key, to: role.key };
  }
  if (changesStatus) {
    const st = b.status === "suspended" ? "suspended" : "active";
    await run("UPDATE users SET status=? WHERE id=?", st, id);
    log.status = { from: target.status, to: st };
  }
  if (b.name && String(b.name).trim().length >= 2) {
    await run("UPDATE users SET name=? WHERE id=?", String(b.name).trim().slice(0, 80), id);
    log.name = String(b.name).trim();
  }
  if (Object.keys(log).length) await audit(me, changesStatus ? `staff.${b.status === "suspended" ? "suspend" : "restore"}` : changesRole ? "staff.role_change" : "staff.update", "user", id, { target: target.name, ...log });
  return ok({ ok: true });
});
