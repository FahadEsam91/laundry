import "server-only";
import { all, get, insert, now, run } from "./db";
import { HttpError, can, type SessionUser } from "./auth";

const MAX_BYTES = 3 * 1024 * 1024;
export const MAX_ORDER_PHOTOS = 6;
const DAILY_PRIVATE_UPLOADS = 40;
const TYPES: Record<string, (b: Buffer) => boolean> = {
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png": (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  "image/webp": (b) => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP",
};
const url = (id: number) => `/api/media/${id}`;
const idOf = (u: unknown) => (typeof u === "string" && /^\/api\/media\/\d+$/.test(u) ? Number(u.slice(11)) : null);

/**
 * Store an uploaded image (data URL) and return its path. The file signature must match the declared type.
 * Private images (customers' photos of their items) are only served to the people allowed to see that order.
 */
export async function saveImage(dataUrl: unknown, userId: number, opts: { private?: boolean } = {}) {
  const m = typeof dataUrl === "string" ? dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/) : null;
  if (!m) throw new HttpError(400, "invalid_image");
  const buf = Buffer.from(m[2], "base64");
  if (!buf.length || !TYPES[m[1]](buf)) throw new HttpError(400, "invalid_image");
  if (buf.length > MAX_BYTES) throw new HttpError(413, "image_too_large");
  if (opts.private) {
    const since = new Date(Date.now() - 86400000).toISOString();
    const n = (await get<any>("SELECT COUNT(*) c FROM media WHERE user_id=? AND private=1 AND created_at>=?", userId, since))!.c;
    if (Number(n) >= DAILY_PRIVATE_UPLOADS) throw new HttpError(429, "too_many_photos");
  }
  const id = await insert("INSERT INTO media(mime,data,size,user_id,private,created_at) VALUES(?,?,?,?,?,?)", m[1], m[2], buf.length, userId, opts.private ? 1 : 0, now());
  return url(id);
}

/** Returns the image if this viewer may see it, null if it doesn't exist, false if access is denied. */
export async function loadImage(id: number, viewer: SessionUser | null) {
  const img = await get<{ mime: string; data: string; private: number; user_id: number | null; order_id: number | null }>(
    "SELECT mime,data,private,user_id,order_id FROM media WHERE id=?", id,
  );
  if (!img) return null;
  if (!img.private) return img;
  if (!viewer) return false;
  if (img.user_id === viewer.id || can(viewer, "orders.view")) return img;
  if (img.order_id) {
    const o = await get<any>("SELECT customer_id,partner_id FROM orders WHERE id=?", img.order_id);
    if (o && (o.customer_id === viewer.id || (viewer.role === "partner" && viewer.partner_id === o.partner_id))) return img;
  }
  return false;
}

/** Only accept image paths produced by saveImage (or empty to remove). */
export function imageUrl(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  if (idOf(v)) return v as string;
  throw new HttpError(400, "invalid_image");
}

/** Link a customer's freshly uploaded private photos to their new order. */
export async function attachOrderPhotos(userId: number, orderId: number, photos: unknown) {
  if (photos == null) return;
  if (!Array.isArray(photos) || photos.length > MAX_ORDER_PHOTOS) throw new HttpError(400, "too_many_photos");
  for (const p of photos) {
    const id = idOf(p);
    if (!id) throw new HttpError(400, "invalid_image");
    const { changes } = await run("UPDATE media SET order_id=? WHERE id=? AND user_id=? AND private=1 AND order_id IS NULL", orderId, id, userId);
    if (!changes) throw new HttpError(400, "invalid_image");
  }
}

/** Photo paths per order id. */
export async function orderPhotos(orderIds: number[]): Promise<Record<number, string[]>> {
  const out: Record<number, string[]> = {};
  if (!orderIds.length) return out;
  const rows = await all<{ id: number; order_id: number }>(
    `SELECT id,order_id FROM media WHERE private=1 AND order_id IN (${orderIds.map(() => "?").join(",")}) ORDER BY id`, ...orderIds,
  );
  for (const r of rows) (out[r.order_id] ||= []).push(url(r.id));
  return out;
}
