import { all, get } from "@/lib/db";
import { handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";

/** Personal data export (right of access / portability). */
export const GET = handler(async () => {
  const u = await requireUser();
  const orders = await all<any>("SELECT id,code,status,created_at,partner_id,subtotal,delivery_fee,express_fee,service_fee,discount,member_discount,total,payment_method,payment_status,address_text,notes,rating,review FROM orders WHERE customer_id=? ORDER BY id", u.id);
  for (const o of orders) o.items = await all("SELECT name_en,name_ar,service_en,qty,unit_price FROM order_items WHERE order_id=?", o.id);
  const data = {
    exported_at: new Date().toISOString(),
    profile: await get("SELECT id,name,phone,email,role,wallet,points,created_at,last_seen FROM users WHERE id=?", u.id),
    addresses: await all("SELECT label,area,street,building,notes,lat,lng,is_default FROM addresses WHERE user_id=?", u.id),
    orders,
    wallet_transactions: await all("SELECT amount,kind,note,created_at FROM wallet_tx WHERE user_id=? ORDER BY id", u.id),
    subscriptions: await all("SELECT s.status,s.started_at,s.current_period_end,s.auto_renew,p.name_en plan FROM subscriptions s JOIN plans p ON p.id=s.plan_id WHERE s.user_id=?", u.id),
    notifications: await all("SELECT title_en,body_en,created_at FROM notifications WHERE user_id=? ORDER BY id", u.id),
    devices: await all("SELECT user_agent,created_at FROM push_subscriptions WHERE user_id=?", u.id),
  };
  return new Response(JSON.stringify(data, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="nuqa-my-data.json"` },
  });
});
