// Portable schema (SQLite dialect), translated for PostgreSQL at startup.
// Dates are ISO-8601 UTC strings; booleans are 0/1 integers; money is stored in the minor-less unit (e.g. IQD).

const BASE = [
  `CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'customer',
  partner_id INTEGER,
  wallet REAL NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  last_seen TEXT,
  deleted_at TEXT
)`,
  `CREATE TABLE IF NOT EXISTS addresses(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  area TEXT NOT NULL,
  street TEXT,
  building TEXT,
  notes TEXT,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0
)`,
  `CREATE TABLE IF NOT EXISTS services(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL, name_en TEXT NOT NULL,
  desc_ar TEXT, desc_en TEXT,
  icon TEXT NOT NULL, color TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
)`,
  `CREATE TABLE IF NOT EXISTS partners(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name_ar TEXT NOT NULL, name_en TEXT NOT NULL,
  desc_ar TEXT, desc_en TEXT,
  area_ar TEXT, area_en TEXT,
  lat REAL NOT NULL, lng REAL NOT NULL,
  rating REAL NOT NULL DEFAULT 5, rating_count INTEGER NOT NULL DEFAULT 0,
  eta_hours INTEGER NOT NULL DEFAULT 24, express_hours INTEGER NOT NULL DEFAULT 6,
  delivery_fee REAL NOT NULL DEFAULT 0, min_order REAL NOT NULL DEFAULT 0,
  commission REAL NOT NULL DEFAULT 15,
  color TEXT NOT NULL, color2 TEXT NOT NULL, initials TEXT NOT NULL,
  is_open INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  featured INTEGER NOT NULL DEFAULT 0,
  tags TEXT NOT NULL DEFAULT '',
  phone TEXT,
  created_at TEXT NOT NULL
)`,
  `CREATE TABLE IF NOT EXISTS products(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  service_id INTEGER NOT NULL REFERENCES services(id),
  name_ar TEXT NOT NULL, name_en TEXT NOT NULL,
  icon TEXT NOT NULL,
  price REAL NOT NULL,
  unit TEXT NOT NULL DEFAULT 'piece',
  popular INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
)`,
  `CREATE INDEX IF NOT EXISTS idx_products_partner ON products(partner_id)`,
  `CREATE TABLE IF NOT EXISTS drivers(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  vehicle TEXT NOT NULL DEFAULT 'motorbike',
  plate TEXT,
  status TEXT NOT NULL DEFAULT 'offline',
  lat REAL, lng REAL,
  rating REAL NOT NULL DEFAULT 5,
  created_at TEXT NOT NULL
)`,
  `CREATE TABLE IF NOT EXISTS orders(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  customer_id INTEGER NOT NULL REFERENCES users(id),
  partner_id INTEGER NOT NULL REFERENCES partners(id),
  driver_id INTEGER REFERENCES drivers(id),
  pickup_driver_id INTEGER,
  status TEXT NOT NULL,
  express INTEGER NOT NULL DEFAULT 0,
  address_text TEXT NOT NULL,
  address_lat REAL NOT NULL, address_lng REAL NOT NULL,
  pickup_slot TEXT, delivery_slot TEXT,
  subtotal REAL NOT NULL, delivery_fee REAL NOT NULL, express_fee REAL NOT NULL,
  service_fee REAL NOT NULL, discount REAL NOT NULL, vat REAL NOT NULL DEFAULT 0, total REAL NOT NULL,
  payment_method TEXT NOT NULL, payment_status TEXT NOT NULL,
  promo_code TEXT, notes TEXT,
  rating INTEGER, review TEXT,
  items_count INTEGER NOT NULL DEFAULT 0,
  auto INTEGER NOT NULL DEFAULT 0,
  subscription_id INTEGER,
  member_discount REAL NOT NULL DEFAULT 0,
  sub_savings REAL NOT NULL DEFAULT 0,
  sub_free_delivery INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, status_at TEXT NOT NULL
)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_partner ON orders(partner_id)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at)`,
  `CREATE TABLE IF NOT EXISTS order_items(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER,
  service_id INTEGER,
  name_ar TEXT NOT NULL, name_en TEXT NOT NULL,
  service_ar TEXT, service_en TEXT,
  icon TEXT,
  qty REAL NOT NULL, unit_price REAL NOT NULL
)`,
  `CREATE INDEX IF NOT EXISTS idx_items_order ON order_items(order_id)`,
  `CREATE TABLE IF NOT EXISTS order_events(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT,
  actor TEXT,
  created_at TEXT NOT NULL
)`,
  `CREATE INDEX IF NOT EXISTS idx_events_order ON order_events(order_id)`,
  `CREATE TABLE IF NOT EXISTS promos(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL,
  value REAL NOT NULL,
  min_order REAL NOT NULL DEFAULT 0,
  max_discount REAL,
  usage_limit INTEGER,
  used INTEGER NOT NULL DEFAULT 0,
  first_order_only INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  expires_at TEXT,
  title_ar TEXT, title_en TEXT,
  created_at TEXT NOT NULL
)`,
  `CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS notifications(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title_ar TEXT NOT NULL, title_en TEXT NOT NULL,
  body_ar TEXT, body_en TEXT,
  order_id INTEGER,
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
)`,
  `CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id)`,
  `CREATE TABLE IF NOT EXISTS wallet_tx(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount REAL NOT NULL,
  kind TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL
)`,
  `CREATE TABLE IF NOT EXISTS favorites(
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  PRIMARY KEY(user_id, partner_id)
)`,
  `CREATE TABLE IF NOT EXISTS plans(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL, name_en TEXT NOT NULL,
  desc_ar TEXT, desc_en TEXT,
  price REAL NOT NULL,
  interval_days INTEGER NOT NULL DEFAULT 30,
  free_deliveries INTEGER NOT NULL DEFAULT 0,      -- -1 = unlimited
  discount_pct REAL NOT NULL DEFAULT 0,
  no_service_fee INTEGER NOT NULL DEFAULT 0,
  express_discount_pct REAL NOT NULL DEFAULT 0,
  priority_support INTEGER NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#1A62EC',
  popular INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
)`,
  `CREATE TABLE IF NOT EXISTS subscriptions(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id INTEGER NOT NULL REFERENCES plans(id),
  status TEXT NOT NULL,                             -- active | cancelled | expired
  auto_renew INTEGER NOT NULL DEFAULT 1,
  payment_method TEXT NOT NULL DEFAULT 'wallet',
  current_period_start TEXT NOT NULL,
  current_period_end TEXT NOT NULL,
  deliveries_used INTEGER NOT NULL DEFAULT 0,
  started_at TEXT NOT NULL,
  cancelled_at TEXT,
  created_at TEXT NOT NULL
)`,
  `CREATE INDEX IF NOT EXISTS idx_subs_user ON subscriptions(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_subs_status ON subscriptions(status)`,
  `CREATE TABLE IF NOT EXISTS subscription_payments(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL,
  plan_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  kind TEXT NOT NULL DEFAULT 'new',                 -- new | renewal
  period_start TEXT NOT NULL, period_end TEXT NOT NULL,
  created_at TEXT NOT NULL
)`,
  `CREATE TABLE IF NOT EXISTS push_subscriptions(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL, auth TEXT NOT NULL,
  lang TEXT NOT NULL DEFAULT 'ar',
  user_agent TEXT,
  created_at TEXT NOT NULL,
  last_success_at TEXT, fail_count INTEGER NOT NULL DEFAULT 0
)`,
  `CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id)`,
  `CREATE TABLE IF NOT EXISTS broadcasts(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title_ar TEXT NOT NULL, title_en TEXT NOT NULL,
  body_ar TEXT, body_en TEXT, url TEXT,
  audience TEXT NOT NULL,
  recipients INTEGER NOT NULL DEFAULT 0,
  push_sent INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
)`,
  `CREATE TABLE IF NOT EXISTS otp_codes(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  ip TEXT,
  created_at TEXT NOT NULL
)`,
  `CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_codes(phone)`,
  `CREATE TABLE IF NOT EXISTS mobile_push_tokens(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform TEXT,
  app TEXT,
  lang TEXT NOT NULL DEFAULT 'ar',
  created_at TEXT NOT NULL,
  last_success_at TEXT
)`,
  `CREATE INDEX IF NOT EXISTS idx_mpt_user ON mobile_push_tokens(user_id)`,
];

const pg = (s: string) =>
  s
    .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, "SERIAL PRIMARY KEY")
    .replace(/\bREAL\b/g, "DOUBLE PRECISION");

export function SCHEMA(kind: "postgres" | "sqlite") {
  return kind === "postgres" ? BASE.map(pg) : BASE;
}

/** Additive migrations for databases created by older versions (safe to re-run). */
const COLUMNS: [table: string, column: string, def: string][] = [
  ["orders", "subscription_id", "INTEGER"],
  ["orders", "member_discount", "REAL NOT NULL DEFAULT 0"],
  ["orders", "sub_savings", "REAL NOT NULL DEFAULT 0"],
  ["orders", "sub_free_delivery", "INTEGER NOT NULL DEFAULT 0"],
  ["users", "deleted_at", "TEXT"],
];

export function MIGRATIONS(kind: "postgres" | "sqlite") {
  return COLUMNS.map(([t, c, d]) =>
    kind === "postgres" ? `ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS ${c} ${pg(d)}` : `ALTER TABLE ${t} ADD COLUMN ${c} ${d}`,
  );
}
