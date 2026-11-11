import { all, get, run, tx, now } from "@/lib/db";
import { handler, ok, body, fail } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { sendPush } from "@/lib/push";

const AUDIENCE: Record<string, string> = {
  all: "SELECT id FROM users WHERE role='customer' AND status='active'",
  members: "SELECT DISTINCT user_id id FROM subscriptions WHERE status='active'",
  non_members: "SELECT id FROM users WHERE role='customer' AND status='active' AND id NOT IN (SELECT user_id FROM subscriptions WHERE status='active')",
  inactive: "SELECT id FROM users u WHERE role='customer' AND status='active' AND NOT EXISTS(SELECT 1 FROM orders o WHERE o.customer_id=u.id AND o.created_at>=?)",
  drivers: "SELECT user_id id FROM drivers",
  partners: "SELECT id FROM users WHERE role='partner'",
};

const ids = (aud: string) => all<any>(AUDIENCE[aud], ...(aud === "inactive" ? [new Date(Date.now() - 30 * 86400000).toISOString()] : [])).map((r) => r.id);

export const GET = handler(async () => {
  await requireUser("admin");
  const devices = all("SELECT u.role, COUNT(*) c, COUNT(DISTINCT p.user_id) users FROM push_subscriptions p JOIN users u ON u.id=p.user_id GROUP BY u.role");
  const audiences = Object.fromEntries(Object.keys(AUDIENCE).map((a) => {
    const list = ids(a);
    const reach = list.length ? get<any>(`SELECT COUNT(DISTINCT user_id) c FROM push_subscriptions WHERE user_id IN (${list.map(() => "?").join(",")})`, ...list)!.c : 0;
    return [a, { users: list.length, push: reach }];
  }));
  return ok({ devices, audiences, history: all("SELECT * FROM broadcasts ORDER BY id DESC LIMIT 20") });
});

export const POST = handler(async (req: Request) => {
  await requireUser("admin");
  const b = await body(req);
  if (!AUDIENCE[b.audience]) return fail(400, "invalid_audience");
  if (!b.title_ar || !b.title_en) return fail(400, "title_required");
  const url = typeof b.url === "string" && b.url.startsWith("/") ? b.url : "/";
  const list = ids(b.audience);
  const ts = now();
  const bid = tx(() => {
    for (const id of list) run("INSERT INTO notifications(user_id,title_ar,title_en,body_ar,body_en,read,created_at) VALUES(?,?,?,?,?,0,?)", id, b.title_ar, b.title_en, b.body_ar || "", b.body_en || "", ts);
    return run("INSERT INTO broadcasts(title_ar,title_en,body_ar,body_en,url,audience,recipients,push_sent,created_at) VALUES(?,?,?,?,?,?,?,0,?)", b.title_ar, b.title_en, b.body_ar || "", b.body_en || "", url, b.audience, list.length, ts).id;
  });
  const sent = await sendPush(list, { title_ar: b.title_ar, title_en: b.title_en, body_ar: b.body_ar, body_en: b.body_en, url, tag: `campaign-${bid}` });
  run("UPDATE broadcasts SET push_sent=? WHERE id=?", sent, bid);
  return ok({ recipients: list.length, push_sent: sent });
});
