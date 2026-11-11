import { get } from "@/lib/db";
import { handler, ok, body, fail } from "@/lib/api";
import { setSession } from "@/lib/auth";

const PHONES: Record<string, string> = {
  customer: "+9647700000001",
  admin: "+9647700000000",
  partner: "+9647700000002",
  driver: "+9647700000003",
};

export const POST = handler(async (req: Request) => {
  if (process.env.NUQA_DEMO === "0") return fail(404, "not_found");
  const { role } = await body(req);
  const u = get<any>("SELECT id,role FROM users WHERE phone=?", PHONES[role] || "");
  if (!u) return fail(404, "demo_user_missing");
  await setSession(u.id);
  return ok({ ok: true, role: u.role });
});
