import "server-only";
import { get, insert, now } from "./db";
import { HttpError } from "./auth";

const MAX_BYTES = 3 * 1024 * 1024;
const TYPES: Record<string, (b: Buffer) => boolean> = {
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png": (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  "image/webp": (b) => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP",
};

/** Store an uploaded image (data URL) and return its public path. The file signature must match the declared type. */
export async function saveImage(dataUrl: unknown, userId: number) {
  const m = typeof dataUrl === "string" ? dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/) : null;
  if (!m) throw new HttpError(400, "invalid_image");
  const buf = Buffer.from(m[2], "base64");
  if (!buf.length || !TYPES[m[1]](buf)) throw new HttpError(400, "invalid_image");
  if (buf.length > MAX_BYTES) throw new HttpError(413, "image_too_large");
  const id = await insert("INSERT INTO media(mime,data,size,user_id,created_at) VALUES(?,?,?,?,?)", m[1], m[2], buf.length, userId, now());
  return `/api/media/${id}`;
}

export async function loadImage(id: number) {
  return await get<{ mime: string; data: string }>("SELECT mime,data FROM media WHERE id=?", id);
}

/** Only accept image paths produced by saveImage (or empty to remove). */
export function imageUrl(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  if (typeof v === "string" && /^\/api\/media\/\d+$/.test(v)) return v;
  throw new HttpError(400, "invalid_image");
}
