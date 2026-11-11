import "server-only";
import crypto from "node:crypto";
import { cookies, headers } from "next/headers";
import { sessionSecret } from "./env";
import { ALL_PERMISSIONS, SYSTEM_ROLES, type Permission } from "./permissions";
import { get, run, now } from "./db";

export type Role = "customer" | "admin" | "partner" | "driver";
export type SessionUser = {
  id: number;
  name: string;
  phone: string;
  role: Role;
  partner_id: number | null;
  wallet: number;
  points: number;
  created_at: string;
  driver_id?: number | null;
  admin_role_id?: number | null;
  admin_role?: string | null;
  permissions: Permission[];
};

/** Resolve a staff member's permissions: super_admin = everything; system roles from code; custom roles from DB. */
export function resolvePermissions(roleKey?: string | null, stored?: string | null): Permission[] {
  if (!roleKey) return [];
  if (roleKey === "super_admin") return [...ALL_PERMISSIONS];
  const sys = SYSTEM_ROLES.find((r) => r.key === roleKey);
  if (sys) return sys.perms === "*" ? [...ALL_PERMISSIONS] : [...sys.perms];
  return String(stored || "").split(",").filter((p): p is Permission => (ALL_PERMISSIONS as string[]).includes(p));
}

const COOKIE = "nuqa_session";
const MAX_AGE = 60 * 60 * 24 * 30;

const sign = (payload: string) => crypto.createHmac("sha256", sessionSecret()).update(payload).digest("base64url");

export function makeToken(uid: number) {
  const payload = Buffer.from(JSON.stringify({ uid, exp: Date.now() + MAX_AGE * 1000 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function readToken(token?: string): number | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const { uid, exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    return exp > Date.now() ? Number(uid) : null;
  } catch {
    return null;
  }
}

export async function setSession(uid: number) {
  (await cookies()).set(COOKIE, makeToken(uid), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "1",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

const lastSeen = new Set<number>();

export async function currentUser(): Promise<SessionUser | null> {
  // native apps send "Authorization: Bearer <token>"; browsers use the httpOnly cookie
  const bearer = (await headers()).get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  const uid = readToken(bearer || (await cookies()).get(COOKIE)?.value);
  if (!uid) return null;
  const u = await get<any>(
    `SELECT u.id,u.name,u.phone,u.role,u.partner_id,u.wallet,u.points,u.created_at,u.admin_role_id,d.id AS driver_id,
            r.key AS admin_role, r.permissions AS role_permissions
     FROM users u LEFT JOIN drivers d ON d.user_id=u.id LEFT JOIN admin_roles r ON r.id=u.admin_role_id
     WHERE u.id=? AND u.status='active'`,
    uid,
  );
  if (u) {
    u.permissions = u.role === "admin" ? resolvePermissions(u.admin_role || "super_admin", u.role_permissions) : [];
    delete u.role_permissions;
  }
  // throttle last_seen writes to once a minute per user
  if (u && !lastSeen.has(uid)) {
    lastSeen.add(uid);
    (setTimeout(() => lastSeen.delete(uid), 60000) as any).unref?.();
    await run("UPDATE users SET last_seen=? WHERE id=?", now(), uid);
  }
  return u || null;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function requireUser(...roles: Role[]): Promise<SessionUser> {
  const u = await currentUser();
  if (!u) throw new HttpError(401, "unauthorized");
  // only super admins may act inside partner / rider APIs on others' behalf
  if (roles.length && !roles.includes(u.role) && !(u.role === "admin" && u.admin_role === "super_admin")) throw new HttpError(403, "forbidden");
  return u;
}

/** Staff guard: must be an admin user holding every listed permission. */
export async function requirePermission(...perms: Permission[]): Promise<SessionUser> {
  const u = await currentUser();
  if (!u) throw new HttpError(401, "unauthorized");
  if (u.role !== "admin" || !perms.every((p) => u.permissions.includes(p))) throw new HttpError(403, "forbidden");
  return u;
}

export const can = (u: SessionUser | null | undefined, p: Permission) => !!u && u.role === "admin" && u.permissions.includes(p);

/** Normalize phone numbers like 0770..., 770..., +964770... → +964770... */
export function normalizePhone(raw: string) {
  let p = String(raw || "").replace(/[^\d+]/g, "");
  if (p.startsWith("00")) p = "+" + p.slice(2);
  if (p.startsWith("+")) return p;
  if (p.startsWith("0")) p = p.slice(1);
  if (p.startsWith("964")) return "+" + p;
  return "+964" + p;
}
