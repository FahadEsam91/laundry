import { run } from "@/lib/db";
import { handler, ok, body, fail } from "@/lib/api";
import { requireUser } from "@/lib/auth";
export const PATCH = handler(async (req: Request) => {
  const u = await requireUser("partner");
  if (!u.partner_id) return fail(403, "no_partner");
  const b = await body(req);
  if (b.is_open !== undefined) await run("UPDATE partners SET is_open=? WHERE id=?", b.is_open ? 1 : 0, u.partner_id);
  for (const k of ["eta_hours", "express_hours", "min_order"]) if (b[k] !== undefined) await run(`UPDATE partners SET ${k}=? WHERE id=?`, Number(b[k]), u.partner_id);
  return ok({ ok: true });
});
