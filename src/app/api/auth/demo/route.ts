import { get } from "@/lib/db";
import { handler, ok, body, fail } from "@/lib/api";
import { makeToken, setSession } from "@/lib/auth";
import { DEMO } from "@/lib/env";

const PHONES: Record<string, string> = {
  customer: "+9647700000001",
  admin: "+9647700000000",
  partner: "+9647700000002",
  driver: "+9647700000003",
  operations: "+9647700000004",
  support: "+9647700000005",
  finance: "+9647700000006",
  marketing: "+9647700000007",
};

/** One-tap demo logins — only exists while NUQA_DEMO is enabled. */
export const POST = handler(async (req: Request) => {
  if (!DEMO) return fail(404, "not_found");
  const { role, client } = await body(req);
  const u = await get<any>("SELECT id,role FROM users WHERE phone=?", PHONES[role] || "");
  if (!u) return fail(404, "demo_user_missing");
  if (client === "mobile") return ok({ ok: true, role: u.role, token: makeToken(u.id) });
  await setSession(u.id);
  return ok({ ok: true, role: u.role });
});
