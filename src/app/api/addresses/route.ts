import { all, insert, run } from "@/lib/db";
import { handler, ok, body, fail } from "@/lib/api";
import { requireUser } from "@/lib/auth";

export const GET = handler(async () => {
  const u = await requireUser();
  return ok({ addresses: await all("SELECT * FROM addresses WHERE user_id=? ORDER BY is_default DESC,id", u.id) });
});

export const POST = handler(async (req: Request) => {
  const u = await requireUser();
  const b = await body(req);
  if (!b.area || !Number.isFinite(Number(b.lat)) || !Number.isFinite(Number(b.lng))) return fail(400, "invalid_address");
  const count = (await all("SELECT id FROM addresses WHERE user_id=?", u.id)).length;
  const isDefault = b.is_default || count === 0 ? 1 : 0;
  if (isDefault) await run("UPDATE addresses SET is_default=0 WHERE user_id=?", u.id);
  const id = await insert(
    "INSERT INTO addresses(user_id,label,area,street,building,notes,lat,lng,is_default) VALUES(?,?,?,?,?,?,?,?,?)",
    u.id, b.label || "home", String(b.area).slice(0, 80), b.street?.slice(0, 120) || null, b.building?.slice(0, 120) || null, b.notes?.slice(0, 200) || null, Number(b.lat), Number(b.lng), isDefault,
  );
  return ok({ id });
});
