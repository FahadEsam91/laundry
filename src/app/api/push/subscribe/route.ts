import { get, run, now, insert } from "@/lib/db";
import { handler, ok, body, fail } from "@/lib/api";
import { requireUser } from "@/lib/auth";

export const POST = handler(async (req: Request) => {
  const u = await requireUser();
  const b = await body(req);
  const endpoint = String(b?.subscription?.endpoint || "");
  const keys = b?.subscription?.keys || {};
  if (!/^https:\/\//.test(endpoint) || !keys.p256dh || !keys.auth) return fail(400, "invalid_subscription");
  const lang = b.lang === "en" ? "en" : "ar";
  const ua = String(req.headers.get("user-agent") || "").slice(0, 200);
  if (await get("SELECT 1 FROM push_subscriptions WHERE endpoint=?", endpoint))
    await run("UPDATE push_subscriptions SET user_id=?,p256dh=?,auth=?,lang=?,user_agent=?,fail_count=0 WHERE endpoint=?", u.id, keys.p256dh, keys.auth, lang, ua, endpoint);
  else await insert("INSERT INTO push_subscriptions(user_id,endpoint,p256dh,auth,lang,user_agent,created_at) VALUES(?,?,?,?,?,?,?)", u.id, endpoint, keys.p256dh, keys.auth, lang, ua, now());
  return ok({ ok: true });
});

export const DELETE = handler(async (req: Request) => {
  const u = await requireUser();
  const b = await body(req);
  if (b.endpoint) await run("DELETE FROM push_subscriptions WHERE endpoint=? AND user_id=?", b.endpoint, u.id);
  return ok({ ok: true });
});

/** Language switch / state check for the current device */
export const PATCH = handler(async (req: Request) => {
  const u = await requireUser();
  const b = await body(req);
  if (b.endpoint && b.lang) await run("UPDATE push_subscriptions SET lang=? WHERE endpoint=? AND user_id=?", b.lang === "en" ? "en" : "ar", b.endpoint, u.id);
  const registered = b.endpoint ? !!await get("SELECT 1 FROM push_subscriptions WHERE endpoint=? AND user_id=?", b.endpoint, u.id) : false;
  return ok({ registered });
});
