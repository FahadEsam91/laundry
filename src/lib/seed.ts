import type { DatabaseSync } from "node:sqlite";
import { ORDER_FLOW } from "./constants";

/** Deterministic demo data so dashboards look alive on first run. */

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const R = rng(20261111);
const pick = <T,>(a: T[]) => a[Math.floor(R() * a.length)];
const int = (a: number, b: number) => a + Math.floor(R() * (b - a + 1));
const round250 = (n: number) => Math.round(n / 250) * 250;

export const SERVICES = [
  { slug: "wash_iron", ar: "غسيل وكوي", en: "Wash & Iron", dAr: "غسيل احترافي مع كوي بالبخار", dEn: "Pro wash with steam pressing", icon: "shirt", color: "#1A62EC" },
  { slug: "iron", ar: "كوي فقط", en: "Ironing", dAr: "كوي بالبخار يدوي دقيق", dEn: "Precise hand steam ironing", icon: "wind", color: "#F97316" },
  { slug: "dry_clean", ar: "تنظيف جاف", en: "Dry Cleaning", dAr: "للبدلات والملابس الحساسة", dEn: "For suits & delicate fabrics", icon: "sparkles", color: "#8B5CF6" },
  { slug: "wash_fold", ar: "غسيل وطي", en: "Wash & Fold", dAr: "بالكيلو، مغسول ومطوي", dEn: "By weight, washed & folded", icon: "washing-machine", color: "#06B6D4" },
  { slug: "shoes", ar: "تنظيف أحذية", en: "Shoe Care", dAr: "تنظيف وتلميع الأحذية والحقائب", dEn: "Clean & restore shoes and bags", icon: "footprints", color: "#EC4899" },
  { slug: "home", ar: "مفروشات وبطانيات", en: "Bedding & Home", dAr: "بطانيات، لحف، شراشف ومناشف", dEn: "Blankets, duvets, sheets & towels", icon: "bed-double", color: "#10B981" },
  { slug: "carpets", ar: "سجاد", en: "Carpets", dAr: "غسيل سجاد عميق مع التجفيف", dEn: "Deep carpet wash & dry", icon: "layers", color: "#B45309" },
  { slug: "curtains", ar: "ستائر", en: "Curtains", dAr: "فك وغسيل وتركيب الستائر", dEn: "Curtain cleaning by the meter", icon: "blinds", color: "#0EA5E9" },
  { slug: "alterations", ar: "خياطة وتعديل", en: "Alterations", dAr: "تقصير، تضييق وتبديل سحابات", dEn: "Hemming, resizing & repairs", icon: "scissors", color: "#64748B" },
];

type P = [en: string, ar: string, icon: string, price: number, unit?: string, popular?: boolean];
const CATALOG: Record<string, P[]> = {
  wash_iron: [
    ["Shirt", "قميص", "👔", 1500, "piece", true],
    ["Dishdasha / Thobe", "دشداشة", "🥼", 2500, "piece", true],
    ["Trousers", "بنطلون", "👖", 1500, "piece", true],
    ["T-Shirt", "تيشيرت", "👕", 1000],
    ["Abaya", "عباية", "🧥", 3000, "piece", true],
    ["Dress", "فستان", "👗", 3000],
    ["Jacket", "جاكيت", "🧥", 4000],
    ["Suit (2 pcs)", "بدلة (قطعتين)", "🤵", 6000],
    ["Shemagh / Scarf", "يشماغ / وشاح", "🧣", 1000],
    ["Kids clothing", "ملابس أطفال", "🧸", 750],
  ],
  iron: [
    ["Shirt", "قميص", "👔", 750, "piece", true],
    ["Dishdasha / Thobe", "دشداشة", "🥼", 1250, "piece", true],
    ["Trousers", "بنطلون", "👖", 750, "piece", true],
    ["T-Shirt", "تيشيرت", "👕", 500],
    ["Abaya", "عباية", "🧥", 1500],
    ["Dress", "فستان", "👗", 1500],
    ["Suit (2 pcs)", "بدلة (قطعتين)", "🤵", 3000],
    ["Shemagh / Scarf", "يشماغ / وشاح", "🧣", 500],
  ],
  dry_clean: [
    ["Suit (2 pcs)", "بدلة (قطعتين)", "🤵", 8000, "piece", true],
    ["Coat", "معطف", "🧥", 9000, "piece", true],
    ["Evening dress", "فستان سهرة", "👗", 15000],
    ["Wedding dress", "فستان زفاف", "👰", 45000],
    ["Abaya (premium)", "عباية (فاخرة)", "🧕", 5000, "piece", true],
    ["Bisht", "بشت", "🥻", 12000],
    ["Tie", "ربطة عنق", "👔", 2000],
    ["Leather jacket", "جاكيت جلد", "🧥", 15000],
  ],
  wash_fold: [
    ["Bag up to 5 kg", "كيس حتى 5 كغم", "🧺", 7000, "bag", true],
    ["Bag up to 10 kg", "كيس حتى 10 كغم", "🧺", 12000, "bag", true],
    ["Per kilogram", "بالكيلو", "⚖️", 1500, "kg"],
    ["Delicates bag", "كيس ملابس حساسة", "🫧", 9000, "bag"],
  ],
  shoes: [
    ["Sneakers", "حذاء رياضي", "👟", 6000, "piece", true],
    ["Leather shoes", "حذاء جلد", "👞", 7000, "piece", true],
    ["Boots", "جزمة", "🥾", 9000],
    ["Heels", "كعب عالي", "👠", 6000],
    ["Handbag", "حقيبة يد", "👜", 10000],
  ],
  home: [
    ["Blanket (single)", "بطانية مفردة", "🛌", 8000, "piece", true],
    ["Blanket (double)", "بطانية مزدوجة", "🛏️", 12000, "piece", true],
    ["Duvet", "لحاف", "🛏️", 15000],
    ["Bedsheet set", "طقم شراشف", "🛏️", 6000],
    ["Pillow", "وسادة", "💤", 3000],
    ["Towel", "منشفة", "🧻", 1000],
    ["Sofa cover", "غطاء كنبة", "🛋️", 10000],
  ],
  carpets: [
    ["Carpet (per m²)", "سجاد (للمتر المربع)", "🟫", 2500, "m2", true],
    ["Hand-made rug", "سجادة يدوية", "🧶", 30000],
    ["Door mat", "دواسة", "🟧", 3000],
  ],
  curtains: [
    ["Curtain (per m)", "ستارة (للمتر)", "🪟", 3000, "m", true],
    ["Sheer curtain (per m)", "ستارة شفافة (للمتر)", "🪟", 2000, "m"],
    ["Blackout curtain (per m)", "ستارة معتمة (للمتر)", "🪟", 4000, "m"],
  ],
  alterations: [
    ["Hemming", "تقصير", "🪡", 3000, "piece", true],
    ["Zipper replacement", "تبديل سحاب", "🧵", 4000],
    ["Take in / let out", "تضييق / توسيع", "✂️", 6000],
    ["Buttons", "تركيب أزرار", "🔘", 1000],
  ],
};

// Baghdad as the launch city (configurable — coordinates are just data)
const AREAS = [
  { ar: "المنصور", en: "Al-Mansour", lat: 33.3128, lng: 44.3362 },
  { ar: "الكرادة", en: "Karrada", lat: 33.3036, lng: 44.4219 },
  { ar: "زيونة", en: "Zayouna", lat: 33.3262, lng: 44.4548 },
  { ar: "الجادرية", en: "Jadriya", lat: 33.2799, lng: 44.3855 },
  { ar: "اليرموك", en: "Al-Yarmouk", lat: 33.2985, lng: 44.3285 },
  { ar: "الأعظمية", en: "Adhamiya", lat: 33.3747, lng: 44.3615 },
  { ar: "الحارثية", en: "Harthiya", lat: 33.3155, lng: 44.3604 },
  { ar: "السيدية", en: "Saydiya", lat: 33.2487, lng: 44.3459 },
  { ar: "الكاظمية", en: "Kadhimiya", lat: 33.3797, lng: 44.3399 },
  { ar: "شارع فلسطين", en: "Palestine St.", lat: 33.3434, lng: 44.4356 },
];

const PARTNERS = [
  { ar: "مغسلة الندى", en: "Al Nada Laundry", area: 0, c: ["#1A62EC", "#56A3FD"], ini: "ND", r: 4.8, n: 1240, eta: 24, ex: 4, fee: 2000, min: 5000, mult: 1.0, featured: 1, tags: "top,express", services: ["wash_iron", "iron", "dry_clean", "wash_fold", "home", "alterations"], dAr: "خبرة 15 سنة في العناية بالملابس الفاخرة والدشاديش", dEn: "15 years of premium garment & thobe care" },
  { ar: "لمسة نظافة", en: "Clean Touch", area: 1, c: ["#0F766E", "#2DD4BF"], ini: "CT", r: 4.7, n: 980, eta: 24, ex: 6, fee: 1500, min: 4000, mult: 0.95, featured: 1, tags: "express,deal", services: ["wash_iron", "iron", "wash_fold", "home", "curtains"], dAr: "غسيل سريع وأسعار منافسة لكل العائلة", dEn: "Fast turnaround & family-friendly prices" },
  { ar: "البخار الذهبي", en: "Golden Steam", area: 2, c: ["#B45309", "#FBBF24"], ini: "GS", r: 4.9, n: 2110, eta: 24, ex: 3, fee: 2500, min: 6000, mult: 1.15, featured: 1, tags: "top,premium,express", services: ["wash_iron", "iron", "dry_clean", "shoes", "alterations"], dAr: "تنظيف جاف فاخر للبدلات وفساتين السهرة", dEn: "Luxury dry cleaning for suits & gowns" },
  { ar: "فريش برو", en: "Fresh Pro", area: 3, c: ["#7C3AED", "#C4B5FD"], ini: "FP", r: 4.6, n: 640, eta: 36, ex: 6, fee: 2000, min: 5000, mult: 0.9, featured: 0, tags: "deal", services: ["wash_iron", "iron", "wash_fold", "shoes", "home", "carpets"], dAr: "حلول غسيل متكاملة للبيت والملابس", dEn: "Complete home & garment laundry" },
  { ar: "مغسلة اللؤلؤة", en: "Pearl Cleaners", area: 4, c: ["#BE185D", "#F9A8D4"], ini: "PC", r: 4.8, n: 1530, eta: 24, ex: 5, fee: 2000, min: 5000, mult: 1.05, featured: 1, tags: "top", services: ["wash_iron", "iron", "dry_clean", "home", "curtains", "alterations"], dAr: "متخصصون بالعبايات والفساتين والأقمشة الحساسة", dEn: "Specialists in abayas, dresses & delicates" },
  { ar: "سبارك إكسبريس", en: "Spark Express", area: 5, c: ["#DC2626", "#FCA5A5"], ini: "SE", r: 4.5, n: 720, eta: 12, ex: 2, fee: 3000, min: 3000, mult: 1.1, featured: 0, tags: "express", services: ["wash_iron", "iron", "wash_fold", "shoes"], dAr: "أسرع خدمة كوي في بغداد — خلال ساعتين", dEn: "Fastest pressing in town — in 2 hours" },
  { ar: "مغسلة الأناقة", en: "Elegance Laundry", area: 6, c: ["#111827", "#6B7280"], ini: "EL", r: 4.7, n: 860, eta: 24, ex: 6, fee: 2000, min: 5000, mult: 1.0, featured: 0, tags: "premium", services: ["wash_iron", "iron", "dry_clean", "shoes", "home"], dAr: "عناية راقية بكل قطعة", dEn: "Refined care for every garment" },
  { ar: "إيكو واش", en: "Eco Wash", area: 7, c: ["#15803D", "#86EFAC"], ini: "EW", r: 4.6, n: 410, eta: 48, ex: 8, fee: 1000, min: 4000, mult: 0.85, featured: 0, tags: "eco,deal", services: ["wash_iron", "wash_fold", "home", "carpets", "curtains"], dAr: "منظفات صديقة للبيئة وآمنة للأطفال", dEn: "Eco-friendly, baby-safe detergents" },
  { ar: "سجاد بغداد", en: "Baghdad Carpets", area: 8, c: ["#92400E", "#FDBA74"], ini: "BC", r: 4.7, n: 530, eta: 72, ex: 24, fee: 0, min: 15000, mult: 1.0, featured: 0, tags: "free_delivery", services: ["carpets", "curtains", "home"], dAr: "غسيل سجاد ومفروشات بالمعدات الحديثة", dEn: "Carpet & upholstery cleaning, modern machines" },
];

const FIRST = ["علي", "محمد", "حسين", "زينب", "فاطمة", "مريم", "أحمد", "سارة", "يوسف", "نور", "عمر", "رقية", "مصطفى", "هبة", "كرار", "آية", "حيدر", "دعاء", "ليث", "رنا", "سجاد", "طيبة", "عباس", "شهد"];
const LAST = ["الجبوري", "العبيدي", "الربيعي", "التميمي", "الساعدي", "الخفاجي", "الدليمي", "الزبيدي", "الموسوي", "الحسيني", "الشمري", "العزاوي", "البياتي", "الكناني"];
const DRIVERS = ["كرار حسن", "مهند جاسم", "عباس فاضل", "ليث كريم", "أمير صادق", "زيد ناصر", "حسن عادل", "علاء مجيد"];

const iso = (d: Date) => d.toISOString();
const jitter = (v: number, s = 0.02) => v + (R() - 0.5) * s;

export function seed(db: DatabaseSync) {
  const nowD = new Date();
  const ts = iso(nowD);
  const q = (sql: string) => db.prepare(sql);

  // ---------- settings
  const settings: Record<string, string> = {
    app_name: "Nuqa",
    currency_code: "IQD",
    currency_ar: "د.ع",
    currency_en: "IQD",
    service_fee: "500",
    express_pct: "50",
    vat_pct: "0",
    free_delivery_over: "30000",
    autopilot: "1",
    autopilot_seconds: "15",
    support_phone: "+964 770 000 0000",
    city_ar: "بغداد",
    city_en: "Baghdad",
    map_lat: "33.315",
    map_lng: "44.38",
    timezone: "Asia/Baghdad",
  };
  const setS = q("INSERT INTO settings(key,value) VALUES(?,?)");
  for (const [k, v] of Object.entries(settings)) setS.run(k, v);

  // ---------- services
  const insSvc = q("INSERT INTO services(slug,name_ar,name_en,desc_ar,desc_en,icon,color,sort) VALUES(?,?,?,?,?,?,?,?)");
  const svcId: Record<string, number> = {};
  SERVICES.forEach((s, i) => {
    svcId[s.slug] = Number(insSvc.run(s.slug, s.ar, s.en, s.dAr, s.dEn, s.icon, s.color, i).lastInsertRowid);
  });

  // ---------- partners + products
  const insP = q(`INSERT INTO partners(name_ar,name_en,desc_ar,desc_en,area_ar,area_en,lat,lng,rating,rating_count,eta_hours,express_hours,delivery_fee,min_order,commission,color,color2,initials,is_open,status,featured,tags,phone,created_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const insProd = q("INSERT INTO products(partner_id,service_id,name_ar,name_en,icon,price,unit,popular) VALUES(?,?,?,?,?,?,?,?)");
  const partnerProducts: Record<number, { id: number; price: number; ar: string; en: string; icon: string; svc: string }[]> = {};
  const partnerIds: number[] = [];
  PARTNERS.forEach((p, i) => {
    const a = AREAS[p.area];
    const created = new Date(nowD.getTime() - (200 - i * 12) * 86400000);
    const id = Number(
      insP.run(p.ar, p.en, p.dAr, p.dEn, a.ar, a.en, jitter(a.lat, 0.01), jitter(a.lng, 0.01), p.r, p.n, p.eta, p.ex, p.fee, p.min, 12 + (i % 3) * 3, p.c[0], p.c[1], p.ini, i === 6 ? 0 : 1, "active", p.featured, p.tags, `+96477${int(10000000, 99999999)}`, iso(created)).lastInsertRowid,
    );
    partnerIds.push(id);
    partnerProducts[id] = [];
    for (const slug of p.services) {
      for (const [en, ar, icon, price, unit, popular] of CATALOG[slug]) {
        const pr = Math.max(250, round250(price * p.mult));
        const pid = Number(insProd.run(id, svcId[slug], ar, en, icon, pr, unit || "piece", popular ? 1 : 0).lastInsertRowid);
        partnerProducts[id].push({ id: pid, price: pr, ar, en, icon, svc: slug });
      }
    }
  });
  // one pending partner awaiting approval (for the admin workflow)
  {
    const a = AREAS[9];
    const id = Number(insP.run("مغسلة الريم", "Al Reem Laundry", "مغسلة جديدة بانتظار التفعيل", "New partner awaiting activation", a.ar, a.en, a.lat, a.lng, 5, 0, 24, 6, 2000, 5000, 15, "#0369A1", "#7DD3FC", "AR", 0, "pending", 0, "", "+9647712345678", ts).lastInsertRowid);
    for (const slug of ["wash_iron", "iron"]) for (const [en, ar, icon, price, unit] of CATALOG[slug]) insProd.run(id, svcId[slug], ar, en, icon, price, unit || "piece", 0);
  }

  // ---------- users
  const insU = q("INSERT INTO users(name,phone,email,role,partner_id,wallet,points,created_at,last_seen) VALUES(?,?,?,?,?,?,?,?,?)");
  const insA = q("INSERT INTO addresses(user_id,label,area,street,building,notes,lat,lng,is_default) VALUES(?,?,?,?,?,?,?,?,?)");
  const addUser = (name: string, phone: string, role: string, partner: number | null, wallet = 0, createdDaysAgo = 90) =>
    Number(insU.run(name, phone, null, role, partner, wallet, 0, iso(new Date(nowD.getTime() - createdDaysAgo * 86400000)), ts).lastInsertRowid);

  addUser("مدير المنصة", "+9647700000000", "admin", null, 0, 300);
  const demoCustomer = addUser("علي حسن", "+9647700000001", "customer", null, 25000, 120);
  insA.run(demoCustomer, "home", "المنصور", "شارع 14 رمضان", "عمارة 12، الطابق 3", "قرب مطعم الساعة", 33.3149, 44.3401, 1);
  insA.run(demoCustomer, "work", "الكرادة", "شارع العرصات", "برج النخيل، مكتب 7", "", 33.3011, 44.4172, 0);
  addUser("حسام — مغسلة الندى", "+9647700000002", "partner", partnerIds[0], 0, 200);

  const customers: { id: number; lat: number; lng: number; text: string }[] = [{ id: demoCustomer, lat: 33.3149, lng: 44.3401, text: "المنصور، شارع 14 رمضان، عمارة 12" }];
  for (let i = 0; i < 64; i++) {
    const name = `${pick(FIRST)} ${pick(LAST)}`;
    const area = pick(AREAS);
    const id = addUser(name, `+96478${String(10000000 + i * 7919).slice(0, 8)}`, "customer", null, pick([0, 0, 0, 5000, 10000]), int(1, 100));
    const lat = jitter(area.lat), lng = jitter(area.lng);
    const street = `شارع ${int(1, 60)}`;
    insA.run(id, "home", area.ar, street, `دار ${int(1, 120)}`, "", lat, lng, 1);
    customers.push({ id, lat, lng, text: `${area.ar}، ${street}` });
  }

  // ---------- drivers
  const insD = q("INSERT INTO drivers(user_id,vehicle,plate,status,lat,lng,rating,created_at) VALUES(?,?,?,?,?,?,?,?)");
  const driverIds: number[] = [];
  DRIVERS.forEach((n, i) => {
    const uid = addUser(n, i === 0 ? "+9647700000003" : `+96479${String(20000000 + i * 104729).slice(0, 8)}`, "driver", null, 0, 150 - i * 10);
    const a = AREAS[i % AREAS.length];
    driverIds.push(Number(insD.run(uid, i % 3 === 2 ? "car" : "motorbike", `${int(10, 99)} ${pick(["أ", "ب", "ج", "د"])} ${int(10000, 99999)}`, i < 6 ? "online" : "offline", jitter(a.lat), jitter(a.lng), Number((4.5 + R() * 0.5).toFixed(1)), ts).lastInsertRowid));
  });

  // ---------- promos
  const insPromo = q("INSERT INTO promos(code,kind,value,min_order,max_discount,usage_limit,used,first_order_only,active,expires_at,title_ar,title_en,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)");
  const in60 = iso(new Date(nowD.getTime() + 60 * 86400000));
  insPromo.run("WELCOME50", "percent", 50, 5000, 10000, null, 184, 1, 1, in60, "خصم 50% على أول طلب", "50% off your first order", ts);
  insPromo.run("NUQA20", "percent", 20, 10000, 8000, 1000, 312, 0, 1, in60, "خصم 20% على كل الخدمات", "20% off all services", ts);
  insPromo.run("FREEDEL", "delivery", 0, 8000, null, null, 520, 0, 1, in60, "توصيل مجاني", "Free delivery", ts);
  insPromo.run("SAVE5", "fixed", 5000, 25000, null, 500, 97, 0, 1, in60, "وفر 5,000 على طلبات 25,000+", "Save 5,000 on 25,000+", ts);
  insPromo.run("SUMMER", "percent", 30, 0, 15000, 300, 300, 0, 0, iso(new Date(nowD.getTime() - 20 * 86400000)), "عرض الصيف", "Summer sale", ts);

  // ---------- orders
  const insO = q(`INSERT INTO orders(code,customer_id,partner_id,driver_id,status,express,address_text,address_lat,address_lng,pickup_slot,delivery_slot,subtotal,delivery_fee,express_fee,service_fee,discount,vat,total,payment_method,payment_status,promo_code,notes,rating,review,items_count,created_at,updated_at,status_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const insI = q("INSERT INTO order_items(order_id,product_id,service_id,name_ar,name_en,service_ar,service_en,icon,qty,unit_price) VALUES(?,?,?,?,?,?,?,?,?,?)");
  const insE = q("INSERT INTO order_events(order_id,status,note,actor,created_at) VALUES(?,?,?,?,?)");
  const svcBySlug = Object.fromEntries(SERVICES.map((s) => [s.slug, s]));
  const reviews = ["خدمة ممتازة وسريعة 👌", "الكوي رائع جداً", "التوصيل بالوقت المحدد", "Great service, will order again", "ريحة الملابس حلوة", "Perfect pressing!", "ممتاز", "أفضل مغسلة جربتها", ""];
  let seq = 10420;

  const makeOrder = (createdAt: Date, status: string, cust = pick(customers), partnerIdx?: number) => {
    const pid = partnerIdx !== undefined ? partnerIds[partnerIdx] : partnerIds[Math.min(partnerIds.length - 1, Math.floor(Math.pow(R(), 1.4) * partnerIds.length))];
    const prods = partnerProducts[pid];
    const p = PARTNERS[partnerIds.indexOf(pid)];
    const lines = int(1, 4);
    const chosen = new Map<number, { prod: (typeof prods)[number]; qty: number }>();
    for (let i = 0; i < lines; i++) {
      const pr = R() < 0.6 ? pick(prods.filter((x) => ["wash_iron", "iron"].includes(x.svc)).concat(prods.slice(0, 3))) : pick(prods);
      const ex = chosen.get(pr.id);
      chosen.set(pr.id, { prod: pr, qty: (ex?.qty || 0) + int(1, pr.price > 10000 ? 1 : 5) });
    }
    const express = R() < 0.18 ? 1 : 0;
    const subtotal = [...chosen.values()].reduce((s, l) => s + l.prod.price * l.qty, 0);
    const deliveryFee = subtotal >= 30000 ? 0 : p.fee;
    const expressFee = express ? round250(subtotal * 0.5) : 0;
    const promo = R() < 0.15 ? pick(["NUQA20", "FREEDEL", "WELCOME50"]) : null;
    let discount = 0;
    if (promo === "NUQA20") discount = Math.min(8000, round250(subtotal * 0.2));
    if (promo === "WELCOME50") discount = Math.min(10000, round250(subtotal * 0.5));
    if (promo === "FREEDEL") discount = deliveryFee;
    const total = subtotal + deliveryFee + expressFee + 500 - discount;
    const pay = pick(["cash", "cash", "cash", "card", "card", "wallet"]);
    const isDone = status === "delivered";
    const payStatus = pay === "cash" ? (isDone ? "paid" : "unpaid") : status === "cancelled" ? "refunded" : "paid";
    const drv = ["pending", "accepted", "cancelled", "at_laundry", "processing", "ready"].includes(status) ? null : pick(driverIds);
    const rating = isDone && R() < 0.55 ? (R() < 0.75 ? 5 : R() < 0.7 ? 4 : 3) : null;
    const flowIdx = status === "cancelled" ? int(0, 1) : ORDER_FLOW.indexOf(status as any);
    const steps = ORDER_FLOW.slice(0, flowIdx + 1);
    const gaps = [0, 6, 14, 30, 25, 40, express ? 120 : 600, 30, 35];
    const times: Date[] = [];
    let t = createdAt.getTime();
    steps.forEach((_, i) => {
      t += (gaps[i] || 20) * 60000 * (0.6 + R() * 0.8);
      times.push(new Date(i === 0 ? createdAt.getTime() : Math.min(t, nowD.getTime() - 60000 * (steps.length - i))));
    });
    if (status === "cancelled") times.push(new Date(createdAt.getTime() + int(3, 30) * 60000));
    const last = times[times.length - 1];
    const pickup = new Date(createdAt.getTime() + 60 * 60000);
    const delivery = new Date(pickup.getTime() + (express ? p.ex : p.eta) * 3600000);
    const code = `NQ-${seq++}`;
    const oid = Number(
      insO.run(code, cust.id, pid, drv, status, express, cust.text, cust.lat, cust.lng, iso(pickup), iso(delivery), subtotal, deliveryFee, expressFee, 500, discount, 0, total, pay, payStatus, promo, null, rating, rating ? pick(reviews) : null, [...chosen.values()].reduce((s, l) => s + l.qty, 0), iso(createdAt), iso(last), iso(last)).lastInsertRowid,
    );
    for (const { prod, qty } of chosen.values()) {
      const s = svcBySlug[prod.svc];
      insI.run(oid, prod.id, svcId[prod.svc], prod.ar, prod.en, s.ar, s.en, prod.icon, qty, prod.price);
    }
    steps.forEach((s, i) => insE.run(oid, s, null, i === 0 ? "customer" : ["accepted", "at_laundry", "processing", "ready"].includes(s) ? "partner" : "driver", iso(times[i])));
    if (status === "cancelled") insE.run(oid, "cancelled", pick(["العميل ألغى الطلب", "المغسلة مشغولة", "Customer request"]), "customer", iso(times[times.length - 1]));
    return oid;
  };

  // 75 days of history with growth trend + weekend peaks
  for (let d = 75; d >= 1; d--) {
    const day = new Date(nowD.getTime() - d * 86400000);
    const dow = day.getDay();
    const base = 7 + (75 - d) * 0.16 + (dow === 5 || dow === 6 ? 4 : 0);
    const n = Math.round(base + (R() - 0.5) * 5);
    for (let k = 0; k < n; k++) {
      const c = new Date(day);
      c.setUTCHours(int(5, 19), int(0, 59), int(0, 59)); // 08:00–22:00 Baghdad (UTC+3)
      makeOrder(c, R() < 0.065 ? "cancelled" : "delivered");
    }
  }
  // today: finished + live orders across every stage
  for (let k = 0; k < 9; k++) {
    const c = new Date(nowD.getTime() - int(4, 10) * 3600000);
    makeOrder(c, "delivered");
  }
  const live = ["pending", "pending", "accepted", "driver_assigned", "picked_up", "at_laundry", "processing", "processing", "processing", "ready", "out_for_delivery", "out_for_delivery"];
  live.forEach((s, i) => makeOrder(new Date(nowD.getTime() - (20 + i * 25) * 60000), s));

  // demo customer: history + one active order, partner 0 has incoming work
  makeOrder(new Date(nowD.getTime() - 9 * 86400000), "delivered", customers[0], 0);
  makeOrder(new Date(nowD.getTime() - 22 * 86400000), "delivered", customers[0], 2);
  makeOrder(new Date(nowD.getTime() - 3 * 3600000), "processing", customers[0], 0);
  makeOrder(new Date(nowD.getTime() - 15 * 60000), "pending", pick(customers.slice(1)), 0);

  // ---------- notifications & wallet for demo customer
  const insN = q("INSERT INTO notifications(user_id,title_ar,title_en,body_ar,body_en,order_id,read,created_at) VALUES(?,?,?,?,?,?,?,?)");
  insN.run(demoCustomer, "🎉 أهلاً بك في نقاء", "🎉 Welcome to Nuqa", "استخدم الكود WELCOME50 لخصم 50% على أول طلب", "Use WELCOME50 for 50% off your first order", null, 1, iso(new Date(nowD.getTime() - 120 * 86400000)));
  insN.run(demoCustomer, "عرض نهاية الأسبوع", "Weekend deal", "خصم 20% على كل الخدمات بكود NUQA20", "20% off everything with NUQA20", null, 0, iso(new Date(nowD.getTime() - 2 * 3600000)));
  q("INSERT INTO wallet_tx(user_id,amount,kind,note,created_at) VALUES(?,?,?,?,?)").run(demoCustomer, 25000, "topup", "Card top-up", iso(new Date(nowD.getTime() - 10 * 86400000)));
}
