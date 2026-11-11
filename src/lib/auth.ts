import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
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
};

const COOKIE = "nuqa_session";
const SECRET = process.env.SESSION_SECRET || "nuqa-dev-secret-change-me-in-production";
const MAX_AGE = 60 * 60 * 24 * 30;

const sign = (payload: string) => crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");

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

export async function currentUser(): Promise<SessionUser | null> {
  const uid = readToken((await cookies()).get(COOKIE)?.value);
  if (!uid) return null;
  const u = get<SessionUser>(
    "SELECT u.id,u.name,u.phone,u.role,u.partner_id,u.wallet,u.points,u.created_at,d.id AS driver_id FROM users u LEFT JOIN drivers d ON d.user_id=u.id WHERE u.id=? AND u.status='active'",
    uid,
  );
  if (u) run("UPDATE users SET last_seen=? WHERE id=?", now(), uid);
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
  if (roles.length && !roles.includes(u.role) && u.role !== "admin") throw new HttpError(403, "forbidden");
  return u;
}

/** Normalize phone numbers like 0770..., 770..., +964770... → +964770... */
export function normalizePhone(raw: string) {
  let p = String(raw || "").replace(/[^\d+]/g, "");
  if (p.startsWith("00")) p = "+" + p.slice(2);
  if (p.startsWith("+")) return p;
  if (p.startsWith("0")) p = p.slice(1);
  if (p.startsWith("964")) return "+" + p;
  return "+964" + p;
}
