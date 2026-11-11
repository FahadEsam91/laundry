import "server-only";
import { headers } from "next/headers";
import { insert, now } from "./db";
import type { SessionUser } from "./auth";

/** Append-only record of staff actions (who did what, to which record, from where). */
export async function audit(u: SessionUser, action: string, entity?: string, entityId?: string | number | null, details?: unknown) {
  let ip = "";
  try {
    const h = await headers();
    ip = (h.get("cf-connecting-ip") || h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0] || "").trim().slice(0, 64);
  } catch {}
  const d = details === undefined ? null : typeof details === "string" ? details : JSON.stringify(details).slice(0, 2000);
  await insert(
    "INSERT INTO audit_log(user_id,user_name,action,entity,entity_id,details,ip,created_at) VALUES(?,?,?,?,?,?,?,?)",
    u.id, u.name, action, entity ?? null, entityId == null ? null : String(entityId), d, ip || null, now(),
  );
}
