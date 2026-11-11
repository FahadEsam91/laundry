import "server-only";
import { get } from "./db";
import { HttpError, resolvePermissions, type SessionUser } from "./auth";
import { ALL_PERMISSIONS, type Permission } from "./permissions";

export async function roleById(id: number) {
  const r = await get<any>("SELECT * FROM admin_roles WHERE id=?", id);
  if (!r) throw new HttpError(400, "role_not_found");
  return { ...r, perms: resolvePermissions(r.key, r.permissions) as Permission[] };
}

/** Anti-escalation: non-super-admins can only grant permissions they hold themselves. */
export function assertCanGrant(actor: SessionUser, perms: Permission[], roleKey?: string) {
  if (actor.admin_role === "super_admin") return;
  if (roleKey === "super_admin" || perms.some((p) => !actor.permissions.includes(p))) throw new HttpError(403, "cannot_grant_more_than_you_have");
}

export const cleanPerms = (list: unknown): Permission[] =>
  Array.isArray(list) ? [...new Set(list.filter((p): p is Permission => (ALL_PERMISSIONS as string[]).includes(String(p))))] : [];

export async function activeSuperAdmins() {
  return (await get<any>("SELECT COUNT(*) AS c FROM users u JOIN admin_roles r ON r.id=u.admin_role_id WHERE u.role='admin' AND u.status='active' AND r.key='super_admin'"))!.c as number;
}
