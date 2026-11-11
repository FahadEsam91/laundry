import "server-only";
import { all, get, run, tx, now } from "./db";
import { getSettings } from "./settings";
import { computeTotals, type Promo } from "./pricing";
import { HttpError, type SessionUser } from "./auth";
import { CANCELLABLE, NEXT_STATUS, ORDER_FLOW, STATUS_META, type OrderStatus } from "./constants";
import { driverUser, onlineDriverUsers, partnerStaff, queuePush } from "./push";
import { activeSubscription, refundFreeDelivery, renewSweep } from "./subscriptions";

// ---------------------------------------------------------------- helpers

export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** In-app notification + mobile push to all of the user's devices. */
export function notify(userId: number, titleAr: string, titleEn: string, bodyAr: string, bodyEn: string, orderId?: number, url?: string) {
  run("INSERT INTO notifications(user_id,title_ar,title_en,body_ar,body_en,order_id,read,created_at) VALUES(?,?,?,?,?,?,0,?)", userId, titleAr, titleEn, bodyAr, bodyEn, orderId ?? null, now());
  queuePush([userId], { title_ar: titleAr, title_en: titleEn, body_ar: bodyAr, body_en: bodyEn, url: url || (orderId ? `/orders/${orderId}` : "/notifications"), tag: orderId ? `order-${orderId}` : undefined });
}

// ---------------------------------------------------------------- promos

export function validatePromo(code: string, userId: number, subtotal: number): Promo {
  const p = get<any>("SELECT * FROM promos WHERE code=? COLLATE NOCASE", code.trim());
  if (!p || !p.active) throw new HttpError(400, "promo_invalid");
  if (p.expires_at && new Date(p.expires_at) < new Date()) throw new HttpError(400, "promo_expired");
  if (p.usage_limit && p.used >= p.usage_limit) throw new HttpError(400, "promo_exhausted");
  if (subtotal < p.min_order) throw new HttpError(400, `promo_min:${p.min_order}`);
  if (p.first_order_only) {
    const c = get<any>("SELECT COUNT(*) c FROM orders WHERE customer_id=? AND status!='cancelled'", userId);
    if (c.c > 0) throw new HttpError(400, "promo_first_only");
  }
  return p as Promo;
}

// ---------------------------------------------------------------- read models

const LIST_SQL = `
SELECT o.id,o.code,o.status,o.express,o.total,o.subtotal,o.payment_method,o.payment_status,o.items_count,o.created_at,o.updated_at,o.status_at,
  o.rating,o.address_text,o.pickup_slot,o.delivery_slot,o.partner_id,o.customer_id,o.driver_id,
  p.name_ar AS partner_ar, p.name_en AS partner_en, p.color AS partner_color, p.color2 AS partner_color2, p.initials AS partner_initials, p.commission,
  u.name AS customer_name, u.phone AS customer_phone,
  du.name AS driver_name
FROM orders o
JOIN partners p ON p.id=o.partner_id
JOIN users u ON u.id=o.customer_id
LEFT JOIN drivers d ON d.id=o.driver_id
LEFT JOIN users du ON du.id=d.user_id`;

export function listOrders(where = "1=1", params: any[] = [], limit = 100, offset = 0) {
  return all(`${LIST_SQL} WHERE ${where} ORDER BY o.created_at DESC LIMIT ? OFFSET ?`, ...params, limit, offset);
}

export function countOrders(where = "1=1", params: any[] = []) {
  return (get<any>(`SELECT COUNT(*) c FROM orders o JOIN users u ON u.id=o.customer_id WHERE ${where}`, ...params)?.c as number) || 0;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function orderDTO(id: number) {
  const o = get<any>("SELECT * FROM orders WHERE id=?", id);
  if (!o) return null;
  const partner = get<any>("SELECT id,name_ar,name_en,area_ar,area_en,lat,lng,phone,color,color2,initials,rating,eta_hours,express_hours FROM partners WHERE id=?", o.partner_id);
  const customer = get<any>("SELECT id,name,phone FROM users WHERE id=?", o.customer_id);
  const driver = o.driver_id
    ? get<any>("SELECT d.id,d.vehicle,d.plate,d.rating,d.lat,d.lng,u.name,u.phone FROM drivers d JOIN users u ON u.id=d.user_id WHERE d.id=?", o.driver_id)
    : null;
  const items = all("SELECT * FROM order_items WHERE order_id=? ORDER BY id", id);
  const events = all("SELECT status,note,actor,created_at FROM order_events WHERE order_id=? ORDER BY id", id);

  // live position (simulated trip interpolation for the 3 moving legs)
  let tracking: any = null;
  const legs: Record<string, [number, number, number, number] | null> = {
    driver_assigned: driver ? [driver.lat ?? partner.lat, driver.lng ?? partner.lng, o.address_lat, o.address_lng] : null,
    picked_up: [o.address_lat, o.address_lng, partner.lat, partner.lng],
    out_for_delivery: [partner.lat, partner.lng, o.address_lat, o.address_lng],
  };
  const leg = legs[o.status];
  if (leg) {
    const s = getSettings();
    const tripMs = (o.auto && s.autopilot ? s.autopilot_seconds : 240) * 1000;
    const p = Math.min(1, (Date.now() - new Date(o.status_at).getTime()) / tripMs);
    const ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    const dist = haversineKm(leg[0], leg[1], leg[2], leg[3]);
    tracking = {
      lat: lerp(leg[0], leg[2], ease),
      lng: lerp(leg[1], leg[3], ease),
      from: [leg[0], leg[1]],
      to: [leg[2], leg[3]],
      progress: ease,
      distance_km: dist,
      eta_min: Math.max(1, Math.ceil(((dist / 22) * 60 + 3) * (1 - ease))),
    };
  }
  return { ...o, partner, customer, driver, items, events, tracking };
}

// ---------------------------------------------------------------- transitions

function pickDriver(nearLat: number, nearLng: number): number | null {
  const ds = all<any>(
    `SELECT d.id,d.lat,d.lng,(SELECT COUNT(*) FROM orders o WHERE o.driver_id=d.id AND o.status IN ('driver_assigned','picked_up','out_for_delivery')) AS load
     FROM drivers d JOIN users u ON u.id=d.user_id WHERE d.status='online' AND u.status='active'`,
  );
  if (!ds.length) return null;
  ds.sort((a, b) => a.load - b.load || haversineKm(a.lat, a.lng, nearLat, nearLng) - haversineKm(b.lat, b.lng, nearLat, nearLng));
  return ds[0].id;
}

export function transition(orderId: number, to: OrderStatus, actor: string, opts: { note?: string; driverId?: number | null; force?: boolean } = {}) {
  return tx(() => {
    const o = get<any>("SELECT * FROM orders WHERE id=?", orderId);
    if (!o) throw new HttpError(404, "order_not_found");
    const from = o.status as OrderStatus;
    if (from === "delivered" || from === "cancelled") throw new HttpError(409, "order_closed");
    if (!opts.force) {
      if (to === "cancelled") {
        if (actor === "customer" && !CANCELLABLE.includes(from)) throw new HttpError(409, "cannot_cancel");
      } else if (NEXT_STATUS[from] !== to) throw new HttpError(409, `invalid_transition:${from}->${to}`);
    }
    const ts = now();
    let driverId = opts.driverId !== undefined ? opts.driverId : o.driver_id;
    let pickupDriverId = o.pickup_driver_id ?? null;
    if ((to === "driver_assigned" || to === "out_for_delivery") && !driverId) {
      const partner = get<any>("SELECT lat,lng FROM partners WHERE id=?", o.partner_id);
      driverId = pickDriver(partner.lat, partner.lng);
      if (!driverId) throw new HttpError(409, "no_driver_available");
    }
    const prevDriver = driverId;
    if (to === "at_laundry") {
      // pickup leg finished — free the rider; the delivery leg is offered to any rider later
      pickupDriverId = driverId ?? pickupDriverId;
      driverId = null;
    }
    let payStatus = o.payment_status;
    if (to === "delivered" && o.payment_method === "cash") payStatus = "paid";
    if (to === "cancelled" && o.payment_status === "paid") {
      payStatus = "refunded";
      run("UPDATE users SET wallet=wallet+? WHERE id=?", o.total, o.customer_id);
      run("INSERT INTO wallet_tx(user_id,amount,kind,note,created_at) VALUES(?,?,?,?,?)", o.customer_id, o.total, "refund", o.code, ts);
    }
    if (to === "cancelled" && o.sub_free_delivery && o.subscription_id) refundFreeDelivery(o.subscription_id);
    run("UPDATE orders SET status=?,driver_id=?,pickup_driver_id=?,payment_status=?,updated_at=?,status_at=? WHERE id=?", to, driverId ?? null, pickupDriverId, payStatus, ts, ts, orderId);
    run("INSERT INTO order_events(order_id,status,note,actor,created_at) VALUES(?,?,?,?,?)", orderId, to, opts.note ?? null, actor, ts);

    // keep rider position roughly in sync with the leg they just finished
    if (prevDriver) {
      const p = get<any>("SELECT lat,lng FROM partners WHERE id=?", o.partner_id);
      if (to === "picked_up" || to === "delivered") run("UPDATE drivers SET lat=?,lng=? WHERE id=?", o.address_lat, o.address_lng, prevDriver);
      if (to === "at_laundry" || to === "out_for_delivery") run("UPDATE drivers SET lat=?,lng=? WHERE id=?", p.lat, p.lng, prevDriver);
    }
    if (to === "delivered") {
      const pts = Math.floor(o.total / 1000);
      run("UPDATE users SET points=points+? WHERE id=?", pts, o.customer_id);
    }
    if ((to === "accepted" || to === "ready") && !o.auto && !driverId) {
      const area = get<any>("SELECT name_ar,name_en FROM partners WHERE id=?", o.partner_id);
      queuePush(onlineDriverUsers(), {
        title_ar: to === "accepted" ? "🛵 مهمة استلام جديدة" : "📦 مهمة توصيل جديدة",
        title_en: to === "accepted" ? "🛵 New pickup job" : "📦 New delivery job",
        body_ar: `${o.code} • ${area.name_ar}`, body_en: `${o.code} • ${area.name_en}`, url: "/driver", tag: `job-${orderId}`,
      });
    }
    const m = STATUS_META[to];
    notify(o.customer_id, `${m.ar} • ${o.code}`, `${m.en} • ${o.code}`, m.descAr, m.descEn, orderId);
    return get<any>("SELECT * FROM orders WHERE id=?", orderId);
  });
}

// ---------------------------------------------------------------- demo autopilot

const g = globalThis as unknown as { __nuqaTick?: number };

/** Advances demo orders (auto=1) one stage at a time. Called opportunistically from read endpoints. */
export function autopilotTick() {
  const t = Date.now();
  if (g.__nuqaTick && t - g.__nuqaTick < 1500) return;
  g.__nuqaTick = t;
  renewSweep();
  const s = getSettings();
  if (!s.autopilot) return;
  const secs = Math.max(5, s.autopilot_seconds);
  const rows = all<any>(`SELECT id,status,status_at FROM orders WHERE auto=1 AND status NOT IN ('delivered','cancelled')`);
  for (const r of rows) {
    const wait = (r.status === "pending" ? 0.6 : r.status === "processing" ? 1.6 : 1) * secs * 1000;
    if (t - new Date(r.status_at).getTime() < wait) continue;
    const next = NEXT_STATUS[r.status as OrderStatus];
    if (!next) continue;
    try {
      transition(r.id, next, "system", { note: "autopilot" });
    } catch {
      /* e.g. no driver online — try next tick */
    }
  }
}

// ---------------------------------------------------------------- create & rate

export type CreateOrderInput = {
  partner_id: number;
  items: { product_id: number; qty: number }[];
  express?: boolean;
  address_id: number;
  pickup_slot?: string; // 'asap' | ISO
  notes?: string;
  payment_method: "cash" | "card" | "wallet";
  promo_code?: string | null;
};

export function createOrder(user: SessionUser, input: CreateOrderInput) {
  const s = getSettings();
  const partner = get<any>("SELECT * FROM partners WHERE id=? AND status='active'", input.partner_id);
  if (!partner) throw new HttpError(400, "partner_unavailable");
  const addr = get<any>("SELECT * FROM addresses WHERE id=? AND user_id=?", input.address_id, user.id);
  if (!addr) throw new HttpError(400, "address_required");
  if (!Array.isArray(input.items) || !input.items.length) throw new HttpError(400, "empty_basket");
  if (!["cash", "card", "wallet"].includes(input.payment_method)) throw new HttpError(400, "invalid_payment");

  const lines = input.items.map((it) => {
    const p = get<any>(
      "SELECT p.*,s.name_ar AS s_ar,s.name_en AS s_en FROM products p JOIN services s ON s.id=p.service_id WHERE p.id=? AND p.partner_id=? AND p.active=1",
      it.product_id,
      partner.id,
    );
    const qty = Math.max(1, Math.min(99, Number(it.qty) || 1));
    if (!p) throw new HttpError(400, "item_unavailable");
    return { p, qty };
  });
  const subtotal = lines.reduce((sum, l) => sum + l.p.price * l.qty, 0);
  if (subtotal < partner.min_order) throw new HttpError(400, `min_order:${partner.min_order}`);
  const promo = input.promo_code ? validatePromo(input.promo_code, user.id, subtotal) : null;
  const member = activeSubscription(user.id);
  const totals = computeTotals(subtotal, partner.delivery_fee, !!input.express, s, promo, member?.benefits);

  return tx(() => {
    const ts = now();
    let payStatus = "unpaid";
    if (input.payment_method === "wallet") {
      const w = get<any>("SELECT wallet FROM users WHERE id=?", user.id);
      if (w.wallet < totals.total) throw new HttpError(400, "wallet_insufficient");
      run("UPDATE users SET wallet=wallet-? WHERE id=?", totals.total, user.id);
      payStatus = "paid";
    } else if (input.payment_method === "card") {
      payStatus = "paid"; // integrate a real gateway (Stripe / Checkout.com / local PSP) here
    }
    const pickup = !input.pickup_slot || input.pickup_slot === "asap" ? new Date(Date.now() + 45 * 60000) : new Date(input.pickup_slot);
    const delivery = new Date(pickup.getTime() + (input.express ? partner.express_hours : partner.eta_hours) * 3600000);
    const seq = (get<any>("SELECT COALESCE(MAX(id),0) m FROM orders")!.m as number) + 10421;
    const code = `NQ-${seq}`;
    const addrText = [addr.area, addr.street, addr.building].filter(Boolean).join("، ");
    const { id } = run(
      `INSERT INTO orders(code,customer_id,partner_id,driver_id,status,express,address_text,address_lat,address_lng,pickup_slot,delivery_slot,subtotal,delivery_fee,express_fee,service_fee,discount,vat,total,payment_method,payment_status,promo_code,notes,items_count,auto,subscription_id,member_discount,sub_savings,sub_free_delivery,created_at,updated_at,status_at)
       VALUES(?,?,?,NULL,'pending',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      code, user.id, partner.id, input.express ? 1 : 0, addrText, addr.lat, addr.lng, pickup.toISOString(), delivery.toISOString(),
      totals.subtotal, totals.deliveryFee, totals.expressFee, totals.serviceFee, totals.discount, totals.vat, totals.total,
      input.payment_method, payStatus, promo?.code ?? null, input.notes?.slice(0, 500) || null,
      lines.reduce((a, l) => a + l.qty, 0), s.autopilot ? 1 : 0,
      member && totals.subSavings > 0 ? member.sub.id : null, totals.memberDiscount, totals.subSavings, totals.subFreeDelivery && member!.plan.free_deliveries > 0 ? 1 : 0,
      ts, ts, ts,
    );
    for (const { p, qty } of lines) {
      run("INSERT INTO order_items(order_id,product_id,service_id,name_ar,name_en,service_ar,service_en,icon,qty,unit_price) VALUES(?,?,?,?,?,?,?,?,?,?)", id, p.id, p.service_id, p.name_ar, p.name_en, p.s_ar, p.s_en, p.icon, qty, p.price);
    }
    run("INSERT INTO order_events(order_id,status,note,actor,created_at) VALUES(?,?,?,?,?)", id, "pending", null, "customer", ts);
    if (input.payment_method === "wallet") run("INSERT INTO wallet_tx(user_id,amount,kind,note,created_at) VALUES(?,?,?,?,?)", user.id, -totals.total, "payment", code, ts);
    if (promo) run("UPDATE promos SET used=used+1 WHERE code=?", promo.code);
    if (member && totals.subFreeDelivery && member.plan.free_deliveries > 0) run("UPDATE subscriptions SET deliveries_used=deliveries_used+1 WHERE id=?", member.sub.id);
    queuePush(partnerStaff(partner.id), {
      title_ar: `🔔 طلب جديد ${code}`, title_en: `🔔 New order ${code}`,
      body_ar: `${lines.reduce((a, l) => a + l.qty, 0)} قطعة${input.express ? " • مستعجل ⚡" : ""}`, body_en: `${lines.reduce((a, l) => a + l.qty, 0)} items${input.express ? " • Express ⚡" : ""}`,
      url: "/partner", tag: `new-${code}`,
    });
    notify(user.id, `تم استلام طلبك • ${code}`, `Order received • ${code}`, `أرسلنا طلبك إلى ${partner.name_ar}`, `We sent your order to ${partner.name_en}`, id);
    return { id, code };
  });
}

export function rateOrder(user: SessionUser, id: number, rating: number, review?: string) {
  const o = get<any>("SELECT * FROM orders WHERE id=? AND customer_id=?", id, user.id);
  if (!o) throw new HttpError(404, "order_not_found");
  if (o.status !== "delivered") throw new HttpError(409, "not_delivered");
  if (o.rating) throw new HttpError(409, "already_rated");
  const r = Math.max(1, Math.min(5, Math.round(rating)));
  tx(() => {
    run("UPDATE orders SET rating=?,review=? WHERE id=?", r, review?.slice(0, 500) || null, id);
    const p = get<any>("SELECT rating,rating_count FROM partners WHERE id=?", o.partner_id);
    const nr = (p.rating * p.rating_count + r) / (p.rating_count + 1);
    run("UPDATE partners SET rating=?,rating_count=rating_count+1 WHERE id=?", Math.round(nr * 100) / 100, o.partner_id);
  });
}

export const STATUS_INDEX = (s: string) => ORDER_FLOW.indexOf(s as any);
