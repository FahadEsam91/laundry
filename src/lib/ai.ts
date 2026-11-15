import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { all, get, insert, now, run } from "./db";
import { HttpError } from "./auth";
import { getSettings } from "./settings";
import { partnerStaff } from "./push";

/**
 * AI features (Claude):
 *   • photo analysis — garment type, stains, fabric/care warnings and the matching item from the laundry's price list
 *   • order assistant — "عندي 5 قمصان و بدلة، اريدهم باچر الصبح" → basket + pickup time
 *
 * Off until ANTHROPIC_API_KEY is set on the server (and the admin setting "ai_features" is on).
 * Optional: AI_MODEL to pick another model. AI_MOCK=1 answers without calling the API (automated tests only).
 */
const MODEL = process.env.AI_MODEL || "claude-opus-5-5";
// models that accept server-side fallbacks (another model answers if this one declines)
const FALLBACK_MODELS = ["claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5", "claude-fable-5-2", "claude-fable-5-1"];
const MOCK = process.env.AI_MOCK === "1";
const DAILY_LIMIT = { photo: 40, order: 30 } as const;

export async function aiEnabled() {
  return (await getSettings()).ai;
}

let client: Anthropic | null = null;
const claude = () => (client ||= new Anthropic({ timeout: 60_000, maxRetries: 2 }));

async function assertQuota(userId: number, kind: keyof typeof DAILY_LIMIT) {
  if (!(await aiEnabled())) throw new HttpError(404, "ai_disabled");
  const since = new Date(Date.now() - 86400000).toISOString();
  const n = (await get<any>("SELECT COUNT(*) c FROM ai_usage WHERE user_id=? AND kind=? AND created_at>=?", userId, kind, since))!.c;
  if (Number(n) >= DAILY_LIMIT[kind]) throw new HttpError(429, "ai_limit");
  await insert("INSERT INTO ai_usage(user_id,kind,created_at) VALUES(?,?,?)", userId, kind, now());
}

/** One structured-output request. Returns the parsed JSON object. */
async function ask<T>(opts: { system: string; content: Anthropic.Beta.BetaContentBlockParam[]; schema: Record<string, unknown> }): Promise<T> {
  const fallback = FALLBACK_MODELS.includes(MODEL);
  let res: Anthropic.Beta.BetaMessage;
  try {
    res = await claude().beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: opts.system,
      messages: [{ role: "user", content: opts.content }],
      output_config: { effort: "low", format: { type: "json_schema", schema: opts.schema } },
      ...(fallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
    });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) throw new HttpError(503, "ai_busy");
    if (e instanceof Anthropic.AuthenticationError) {
      console.error("[ai] ANTHROPIC_API_KEY was rejected");
      throw new HttpError(503, "ai_unavailable");
    }
    if (e instanceof Anthropic.APIError) {
      console.error("[ai] api error", e.status, e.message.slice(0, 300));
      throw new HttpError(503, "ai_unavailable");
    }
    console.error("[ai] request failed", (e as Error)?.message);
    throw new HttpError(503, "ai_unavailable");
  }
  if (res.stop_reason === "refusal") throw new HttpError(422, "ai_refused");
  if (res.stop_reason === "max_tokens") throw new HttpError(503, "ai_unavailable");
  const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  try {
    return JSON.parse(text) as T;
  } catch {
    console.error("[ai] unparseable output", text.slice(0, 200));
    throw new HttpError(503, "ai_unavailable");
  }
}

// ------------------------------------------------------------------ catalog

type Product = { id: number; name_ar: string; name_en: string; price: number; unit: string; service_ar: string; service_en: string };

async function catalog(partnerId: number): Promise<Product[]> {
  return await all<Product>(
    `SELECT p.id,p.name_ar,p.name_en,p.price,p.unit,s.name_ar service_ar,s.name_en service_en
     FROM products p JOIN services s ON s.id=p.service_id WHERE p.partner_id=? AND p.active=1 ORDER BY s.sort,p.id`,
    partnerId,
  );
}
const catalogText = (ps: Product[]) => ps.map((p) => `${p.id} | ${p.name_ar} / ${p.name_en} | ${p.service_ar} / ${p.service_en} | ${p.price} | ${p.unit}`).join("\n");

// ------------------------------------------------------------------ photo analysis

export type PhotoInsight = {
  is_garment: boolean;
  garment_ar: string;
  garment_en: string;
  fabric_ar: string;
  fabric_en: string;
  stains: { ar: string; en: string; severity: "light" | "medium" | "heavy" }[];
  warnings: { ar: string; en: string }[];
  product_id: number | null;
  quantity: number;
  note_ar: string;
  note_en: string;
};

const PHOTO_SYSTEM = `You inspect photos that customers of a laundry service in Iraq take of the clothes and textiles they are sending.
Report only what is visible. Be specific and brief (a few words per field). Arabic fields are in clear Arabic that Iraqi customers and laundry staff understand.
- is_garment: false if the photo shows no clothing or textile (then leave the other text fields empty, quantity 0, product_id 0).
- garment: what the item is (e.g. "قميص رجالي أبيض" / "white men's shirt").
- fabric: the likely material if you can tell (cotton, wool, silk, denim, leather…), otherwise "".
- stains: each visible stain or mark with where it is (e.g. "بقعة زيت على الياقة" / "oil stain on the collar") and how bad it looks. Empty list if none.
- warnings: care risks the laundry must know (delicate fabric, beads or sequins, colours that may bleed, leather trim, dry-clean only, existing tears or missing buttons). Empty list if none.
- product_id: the best matching line from the laundry's price list below, or 0 if nothing fits.
- quantity: how many of these items are in the photo.
- note: one short sentence for the laundry staff (what to watch out for), or "" if nothing special.`;

export async function analyzePhoto(mediaId: number, partnerId: number | null, userId: number): Promise<PhotoInsight> {
  const img = await get<{ mime: string; data: string; ai: string | null; user_id: number | null }>("SELECT mime,data,ai,user_id FROM media WHERE id=? AND private=1", mediaId);
  if (!img) throw new HttpError(404, "not_found");
  if (img.ai) return JSON.parse(img.ai);
  const products = partnerId ? await catalog(partnerId) : [];
  const ids = [0, ...products.map((p) => p.id)];
  let out: PhotoInsight;
  if (MOCK) out = mockPhoto(products);
  else {
    const raw = await ask<any>({
      system: `${PHOTO_SYSTEM}\n\nPrice list (id | name | service | price | unit):\n${catalogText(products) || "(none)"}`,
      content: [
        { type: "image", source: { type: "base64", media_type: img.mime as "image/jpeg" | "image/png" | "image/webp", data: img.data } },
        { type: "text", text: "Inspect this item." },
      ],
      schema: photoSchema(ids),
    });
    out = cleanPhoto(raw, products);
  }
  await run("UPDATE media SET ai=? WHERE id=?", JSON.stringify(out), mediaId);
  return out;
}

const str = { type: "string" };
const pair = { type: "object", properties: { ar: str, en: str }, required: ["ar", "en"], additionalProperties: false };
function photoSchema(ids: number[]) {
  return {
    type: "object",
    properties: {
      is_garment: { type: "boolean" },
      garment_ar: str, garment_en: str, fabric_ar: str, fabric_en: str,
      stains: { type: "array", items: { type: "object", properties: { ar: str, en: str, severity: { type: "string", enum: ["light", "medium", "heavy"] } }, required: ["ar", "en", "severity"], additionalProperties: false } },
      warnings: { type: "array", items: pair },
      product_id: { type: "integer", enum: ids },
      quantity: { type: "integer" },
      note_ar: str, note_en: str,
    },
    required: ["is_garment", "garment_ar", "garment_en", "fabric_ar", "fabric_en", "stains", "warnings", "product_id", "quantity", "note_ar", "note_en"],
    additionalProperties: false,
  };
}

const clip = (v: unknown, n = 120) => String(v ?? "").slice(0, n);
function cleanPhoto(r: any, products: Product[]): PhotoInsight {
  const pid = Number(r?.product_id);
  return {
    is_garment: r?.is_garment !== false,
    garment_ar: clip(r?.garment_ar), garment_en: clip(r?.garment_en),
    fabric_ar: clip(r?.fabric_ar), fabric_en: clip(r?.fabric_en),
    stains: (Array.isArray(r?.stains) ? r.stains : []).slice(0, 6).map((s: any) => ({ ar: clip(s?.ar), en: clip(s?.en), severity: ["light", "medium", "heavy"].includes(s?.severity) ? s.severity : "medium" })),
    warnings: (Array.isArray(r?.warnings) ? r.warnings : []).slice(0, 6).map((w: any) => ({ ar: clip(w?.ar), en: clip(w?.en) })),
    product_id: products.some((p) => p.id === pid) ? pid : null,
    quantity: Math.max(0, Math.min(50, Math.round(Number(r?.quantity) || 0))),
    note_ar: clip(r?.note_ar, 240), note_en: clip(r?.note_en, 240),
  };
}

function mockPhoto(products: Product[]): PhotoInsight {
  const p = products[0];
  return {
    is_garment: true,
    garment_ar: "قميص أبيض", garment_en: "White shirt", fabric_ar: "قطن", fabric_en: "Cotton",
    stains: [{ ar: "بقعة على الياقة", en: "Mark on the collar", severity: "light" }],
    warnings: [{ ar: "زر مفقود", en: "Missing button" }],
    product_id: p?.id ?? null, quantity: 1,
    note_ar: "عالج بقعة الياقة قبل الغسل.", note_en: "Pre-treat the collar before washing.",
  };
}

/** Insights for an order's item photos, in the same order as `photos`. */
export async function orderInsights(orderId: number): Promise<(PhotoInsight | null)[]> {
  const rows = await all<{ ai: string | null }>("SELECT ai FROM media WHERE order_id=? AND private=1 AND kind='item' ORDER BY id", orderId);
  return rows.map((r) => (r.ai ? JSON.parse(r.ai) : null));
}

/**
 * After an order is placed: analyse photos the customer didn't analyse at checkout,
 * then alert the laundry if any item has stains or needs special care.
 */
export function queueOrderAnalysis(orderId: number) {
  setTimeout(() => {
    analyzeOrder(orderId).catch((e) => console.error("[ai] order analysis", orderId, (e as Error)?.message));
  }, 0);
}

async function analyzeOrder(orderId: number) {
  if (!(await aiEnabled())) return;
  const o = await get<any>("SELECT id,code,partner_id,customer_id FROM orders WHERE id=?", orderId);
  if (!o) return;
  const photos = await all<{ id: number; ai: string | null }>("SELECT id,ai FROM media WHERE order_id=? AND private=1 AND kind='item' ORDER BY id", orderId);
  const found: PhotoInsight[] = [];
  for (const ph of photos) {
    try {
      found.push(ph.ai ? JSON.parse(ph.ai) : await analyzePhoto(ph.id, o.partner_id, o.customer_id));
    } catch (e) {
      if (!(e instanceof HttpError)) throw e;
    }
  }
  const flagged = found.filter((f) => f.stains.length || f.warnings.length);
  if (!flagged.length) return;
  const ar = flagged.map((f) => [f.garment_ar, ...f.stains.map((s) => s.ar), ...f.warnings.map((w) => w.ar)].filter(Boolean).join("، ")).join(" • ");
  const en = flagged.map((f) => [f.garment_en, ...f.stains.map((s) => s.en), ...f.warnings.map((w) => w.en)].filter(Boolean).join(", ")).join(" • ");
  const { notify } = await import("./orders");
  for (const uid of await partnerStaff(o.partner_id)) {
    await notify(uid, `⚠️ عناية خاصة — ${o.code}`, `⚠️ Special care — ${o.code}`, ar.slice(0, 300), en.slice(0, 300), o.id, "/partner");
  }
}

// ------------------------------------------------------------------ order assistant

export type OrderDraft = {
  items: { product_id: number; qty: number }[];
  express: boolean;
  pickup_day: "" | "today" | "tomorrow" | "after_tomorrow";
  pickup_hour: number | null;
  notes: string;
  unmatched: string[];
  reply_ar: string;
  reply_en: string;
};

const ORDER_SYSTEM = `You turn a laundry customer's message into a basket. Customers are in Iraq and usually write in Iraqi Arabic dialect (e.g. "اريد اغسل ٥ قمصان وبدلة، تعالوا باچر الصبح"), sometimes in English or mixed, often with typos and Arabic-Indic digits.
- items: only lines from the laundry's price list below (by id) with a quantity. "قاط"/"بدلة" is a suit; "دشداشة" is a dishdasha; "بطانية" is a blanket. If the customer says "wash and iron" or similar, choose the line whose service matches. If a garment is mentioned without a count, use 1.
- express: true only if they ask for it urgently / same day / "مستعجل".
- pickup_day: "today", "tomorrow" ("باچر"/"باكر"), "after_tomorrow" ("عكب باچر"), or "" if not mentioned. pickup_hour: 0–23 in local time if a time is mentioned ("الصبح" ≈ 10, "الظهر" ≈ 13, "العصر" ≈ 16, "بالليل" ≈ 20), otherwise -1.
- notes: special instructions for the laundry in the customer's words (stains, starch, perfume, fold not hang…), "" if none.
- unmatched: things they asked for that are not on the price list.
- reply: one short friendly sentence confirming what you understood, Arabic in Iraqi dialect and English.`;

export async function draftOrder(text: string, partnerId: number, userId: number): Promise<OrderDraft & { lines: (Product & { qty: number })[] }> {
  const msg = String(text || "").trim().slice(0, 600);
  if (msg.length < 2) throw new HttpError(400, "ai_text_required");
  const products = await catalog(partnerId);
  if (!products.length) throw new HttpError(404, "not_found");
  await assertQuota(userId, "order");
  const raw = MOCK
    ? mockOrder(msg, products)
    : await ask<any>({
        system: `${ORDER_SYSTEM}\n\nPrice list (id | name | service | price | unit):\n${catalogText(products)}`,
        content: [{ type: "text", text: msg }],
        schema: orderSchema(products.map((p) => p.id)),
      });
  const qty = new Map<number, number>();
  for (const it of Array.isArray(raw?.items) ? raw.items : []) {
    const id = Number(it?.product_id);
    if (!products.some((p) => p.id === id)) continue;
    qty.set(id, Math.min(99, (qty.get(id) || 0) + Math.max(1, Math.round(Number(it?.qty) || 1))));
  }
  const hour = Number(raw?.pickup_hour);
  const draft: OrderDraft = {
    items: [...qty].map(([product_id, q]) => ({ product_id, qty: q })),
    express: !!raw?.express,
    pickup_day: ["today", "tomorrow", "after_tomorrow"].includes(raw?.pickup_day) ? raw.pickup_day : "",
    pickup_hour: Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : null,
    notes: clip(raw?.notes, 300),
    unmatched: (Array.isArray(raw?.unmatched) ? raw.unmatched : []).slice(0, 8).map((x: unknown) => clip(x, 60)),
    reply_ar: clip(raw?.reply_ar, 300),
    reply_en: clip(raw?.reply_en, 300),
  };
  return { ...draft, lines: draft.items.map((i) => ({ ...products.find((p) => p.id === i.product_id)!, qty: i.qty })) };
}

function orderSchema(ids: number[]) {
  return {
    type: "object",
    properties: {
      items: { type: "array", items: { type: "object", properties: { product_id: { type: "integer", enum: ids }, qty: { type: "integer" } }, required: ["product_id", "qty"], additionalProperties: false } },
      express: { type: "boolean" },
      pickup_day: { type: "string", enum: ["", "today", "tomorrow", "after_tomorrow"] },
      pickup_hour: { type: "integer" },
      notes: str,
      unmatched: { type: "array", items: str },
      reply_ar: str,
      reply_en: str,
    },
    required: ["items", "express", "pickup_day", "pickup_hour", "notes", "unmatched", "reply_ar", "reply_en"],
    additionalProperties: false,
  };
}

/** Offline stand-in for tests: matches product names and the number written before them. */
function mockOrder(text: string, products: Product[]) {
  const t = text.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  const items: { product_id: number; qty: number }[] = [];
  for (const p of products) {
    const words = [p.name_ar, p.name_en.toLowerCase()].flatMap((n) => [n, n.split(" ")[0]]).filter((w) => w.length >= 3);
    const hit = words.find((w) => t.toLowerCase().includes(w));
    if (!hit || items.some((i) => i.product_id === p.id)) continue;
    const before = t.toLowerCase().slice(0, t.toLowerCase().indexOf(hit));
    const n = before.match(/(\d+)\s*\S*\s*$/);
    items.push({ product_id: p.id, qty: n ? Number(n[1]) : 1 });
  }
  return {
    items,
    express: /مستعجل|urgent|express/i.test(t),
    pickup_day: /باچر|باكر|tomorrow/i.test(t) ? "tomorrow" : /اليوم|today/i.test(t) ? "today" : "",
    pickup_hour: /الصبح|morning/i.test(t) ? 10 : -1,
    notes: /بقع|stain/i.test(t) ? "انتبهوا للبقع" : "",
    unmatched: [],
    reply_ar: "تمام، جهزتلك السلة.",
    reply_en: "Done — your basket is ready.",
  };
}

/** Photo analysis at checkout (the customer's own private upload, not yet on an order). */
export async function analyzeUpload(path: unknown, partnerId: number | null, userId: number) {
  const id = typeof path === "string" && /^\/api\/media\/\d+$/.test(path) ? Number(path.slice(11)) : 0;
  const m = id ? await get<any>("SELECT id,user_id,ai FROM media WHERE id=? AND private=1", id) : null;
  if (!m || m.user_id !== userId) throw new HttpError(404, "not_found");
  if (m.ai) return JSON.parse(m.ai) as PhotoInsight;
  await assertQuota(userId, "photo");
  return await analyzePhoto(id, partnerId, userId);
}
