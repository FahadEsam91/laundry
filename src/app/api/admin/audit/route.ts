import { all, get } from "@/lib/db";
import { handler, ok } from "@/lib/api";
import { requirePermission } from "@/lib/auth";

export const GET = handler(async (req: Request) => {
  await requirePermission("audit.view");
  const sp = new URL(req.url).searchParams;
  const where: string[] = ["1=1"];
  const params: any[] = [];
  if (sp.get("user")) (where.push("user_id=?"), params.push(Number(sp.get("user"))));
  if (sp.get("action")) (where.push("action LIKE ?"), params.push(`${sp.get("action")}%`));
  const q = sp.get("q")?.trim();
  if (q) (where.push("(user_name LIKE ? OR entity_id LIKE ? OR details LIKE ?)"), params.push(`%${q}%`, `%${q}%`, `%${q}%`));
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const size = 30;
  const w = where.join(" AND ");
  const rows = await all(`SELECT * FROM audit_log WHERE ${w} ORDER BY id DESC LIMIT ? OFFSET ?`, ...params, size, (page - 1) * size);
  const total = (await get<any>(`SELECT COUNT(*) AS c FROM audit_log WHERE ${w}`, ...params))!.c;
  const actors = await all("SELECT DISTINCT user_id,user_name FROM audit_log WHERE user_id IS NOT NULL ORDER BY user_name");
  return ok({ rows, total, page, size, actors });
});
