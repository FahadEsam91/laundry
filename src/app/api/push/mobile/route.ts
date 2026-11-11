import { get, insert, run, now } from "@/lib/db";
import { handler, ok, body, fail } from "@/lib/api";
import { requireUser } from "@/lib/auth";

/** Native app (Expo) push token registration: { token: "ExponentPushToken[…]", platform, app, lang } */
export const POST = handler(async (req: Request) => {
  const u = await requireUser();
  const b = await body(req);
  const token = String(b.token || "");
  if (!/^Expo(nent)?PushToken\[.+\]$/.test(token)) return fail(400, "invalid_token");
  const lang = b.lang === "en" ? "en" : "ar";
  if (await get("SELECT 1 FROM mobile_push_tokens WHERE token=?", token))
    await run("UPDATE mobile_push_tokens SET user_id=?,platform=?,app=?,lang=? WHERE token=?", u.id, String(b.platform || "").slice(0, 10), String(b.app || "").slice(0, 20), lang, token);
  else await insert("INSERT INTO mobile_push_tokens(user_id,token,platform,app,lang,created_at) VALUES(?,?,?,?,?,?)", u.id, token, String(b.platform || "").slice(0, 10), String(b.app || "").slice(0, 20), lang, now());
  return ok({ ok: true });
});

export const DELETE = handler(async (req: Request) => {
  const u = await requireUser();
  const b = await body(req);
  if (b.token) await run("DELETE FROM mobile_push_tokens WHERE token=? AND user_id=?", b.token, u.id);
  return ok({ ok: true });
});
