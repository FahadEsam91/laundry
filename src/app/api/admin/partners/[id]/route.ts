import { get, run } from "@/lib/db";
import { handler, ok, body, fail } from "@/lib/api";
import { requireUser } from "@/lib/auth";

const FIELDS = ["name_ar", "name_en", "desc_ar", "desc_en", "area_ar", "area_en", "lat", "lng", "eta_hours", "express_hours", "delivery_fee", "min_order", "commission", "is_open", "status", "featured", "tags", "phone"];

export const PATCH = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireUser("admin");
  const id = Number((await params).id);
  if (!get("SELECT 1 FROM partners WHERE id=?", id)) return fail(404, "not_found");
  const b = await body(req);
  for (const k of FIELDS) if (b[k] !== undefined) run(`UPDATE partners SET ${k}=? WHERE id=?`, typeof b[k] === "boolean" ? (b[k] ? 1 : 0) : b[k], id);
  if (b.status === "active") run("UPDATE partners SET is_open=1 WHERE id=? AND is_open=0 AND status='active'", id);
  return ok({ ok: true });
});
