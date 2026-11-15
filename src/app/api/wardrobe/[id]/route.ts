import { run } from "@/lib/db";
import { handler, ok, body, fail } from "@/lib/api";
import { requireUser } from "@/lib/auth";

/** Rename a garment or add care notes: { name?, notes? } */
export const PATCH = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const u = await requireUser();
  const b = await body(req);
  const id = Number((await params).id);
  const sets: string[] = [], vals: any[] = [];
  if (b.name !== undefined) { sets.push("name=?"); vals.push(String(b.name).trim().slice(0, 60) || null); }
  if (b.notes !== undefined) { sets.push("notes=?"); vals.push(String(b.notes).trim().slice(0, 300) || null); }
  if (!sets.length) return fail(400, "nothing_to_update");
  const { changes } = await run(`UPDATE garments SET ${sets.join(",")} WHERE id=? AND customer_id=?`, ...vals, id, u.id);
  return changes ? ok({ ok: true }) : fail(404, "not_found");
});
