import { get, run } from "@/lib/db";
import { handler, ok, body, fail } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { assertCanGrant, cleanPerms } from "@/lib/staff";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler(async (req: Request, { params }: Ctx) => {
  const me = await requirePermission("staff.manage");
  const id = Number((await params).id);
  const r = await get<any>("SELECT * FROM admin_roles WHERE id=?", id);
  if (!r) return fail(404, "not_found");
  if (r.system) return fail(409, "system_role_locked");
  const b = await body(req);
  const perms = b.perms !== undefined ? cleanPerms(b.perms) : null;
  if (perms) {
    if (!perms.length) return fail(400, "permissions_required");
    assertCanGrant(me, perms);
    await run("UPDATE admin_roles SET permissions=? WHERE id=?", perms.join(","), id);
  }
  for (const k of ["name_ar", "name_en", "desc_ar", "desc_en"]) if (b[k] !== undefined) await run(`UPDATE admin_roles SET ${k}=? WHERE id=?`, String(b[k]).slice(0, 120), id);
  await audit(me, "role.update", "role", id, { name_en: b.name_en ?? r.name_en, perms: perms ?? undefined });
  return ok({ ok: true });
});

export const DELETE = handler(async (_req: Request, { params }: Ctx) => {
  const me = await requirePermission("staff.manage");
  const id = Number((await params).id);
  const r = await get<any>("SELECT * FROM admin_roles WHERE id=?", id);
  if (!r) return fail(404, "not_found");
  if (r.system) return fail(409, "system_role_locked");
  if ((await get<any>("SELECT COUNT(*) AS c FROM users WHERE admin_role_id=? AND status!='deleted'", id))!.c > 0) return fail(409, "role_in_use");
  await run("DELETE FROM admin_roles WHERE id=?", id);
  await audit(me, "role.delete", "role", id, { name_en: r.name_en });
  return ok({ ok: true });
});
