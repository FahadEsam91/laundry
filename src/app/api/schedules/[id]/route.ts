import { run } from "@/lib/db";
import { handler, ok, body, fail } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { updateSchedule } from "@/lib/schedules";

type Ctx = { params: Promise<{ id: string }> };

/** { active?, days?, time? } */
export const PATCH = handler(async (req: Request, { params }: Ctx) => {
  const u = await requireUser();
  return ok(await updateSchedule(u.id, Number((await params).id), await body(req)));
});

export const DELETE = handler(async (_req: Request, { params }: Ctx) => {
  const u = await requireUser();
  const { changes } = await run("DELETE FROM schedules WHERE id=? AND user_id=?", Number((await params).id), u.id);
  return changes ? ok({ ok: true }) : fail(404, "not_found");
});
