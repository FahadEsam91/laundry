# Nuqa نقاء — On‑demand laundry delivery platform

A complete, production‑grade laundry marketplace (the "Talabat model" applied to laundry):
customers order washing, ironing, dry cleaning and more from partner laundries; riders collect
and deliver; the platform earns commission + fees. Fully bilingual **Arabic (RTL) / English (LTR)**.

## Apps

**Native mobile apps (iOS & Android)** live in [`mobile/`](mobile/README.md) — Expo / React Native, one codebase that builds
two store apps: **Nuqa** (customers) and **Nuqa Rider** (riders). The step‑by‑step App Store / Google Play guide is in
[`mobile/README.md`](mobile/README.md).

## Web platform (four interfaces in one codebase)

| App | URL | Who |
|---|---|---|
| Customer app (mobile‑first PWA) | `/` | Customers |
| Admin dashboard | `/admin` | Platform operators |
| Laundry partner panel | `/partner` | Laundry owners/staff |
| Rider app | `/driver` | Delivery riders |

### Customer app
- Phone + OTP sign‑in, saved addresses with map pin & GPS
- 9 services (wash & iron, ironing, dry cleaning, wash & fold by kg, shoes, bedding, carpets, curtains, alterations)
- Laundry listing with ratings, distance, ETA, delivery fee, tags, sort & filters, search
- Laundry page: per‑service price list, popular items, reviews, favourites
- Checkout: standard/express turnaround, pickup scheduling (ASAP or 2‑hour slots), notes, promo codes,
  cash / card / wallet, free‑delivery progress, live price breakdown (server re‑computes everything)
- **Live order tracking**: map with moving rider, ETA, 5‑stage progress, full timeline, call rider
- Cancel (with automatic wallet refund), rate & review, reorder, notifications, wallet & loyalty points, offers page

### Admin dashboard
- KPIs vs previous period (GMV, platform revenue, orders, AOV, new customers, cancel rate, rating, live orders)
- Sales trend, orders by hour, sales by service, payment mix, status pipeline, top laundries
- **Live map** of active orders, laundries and online riders
- Orders: filters, search, pagination, CSV export, detail drawer (advance/set status, assign rider, cancel + refund)
- Laundries: onboard/approve/suspend, commission & fees, open/closed, map location, per‑item price editor
- Riders, customers (wallet credit, suspend), services catalog, promo codes, platform settings

### Nuqa Plus — monthly memberships
- 3 plans out of the box (Basic / Plus / Family), fully editable from Admin → Subscriptions (price, period,
  free deliveries — limited or unlimited, member % discount, no service fee, express discount, priority support)
- Subscribe with card or wallet, switch plans, cancel renewal (benefits stay until period end), billing history,
  "saved this month / total saved" tracker
- Benefits are applied server‑side at checkout and stack with promo codes; checkout shows a personalised
  "save X with Plus" upsell to non‑members
- Automatic renewal (wallet/card) with failure handling → membership expires and the customer is notified
- Admin analytics: members, **MRR / ARR**, subscription revenue, churn, member penetration, member vs non‑member AOV,
  savings given, member growth chart, subscriber list with "+7 free days" and terminate actions

### Mobile push notifications
- Real **Web Push** (VAPID) via a service worker: Android (Chrome, Samsung, Firefox), desktop browsers and
  **iPhone/iPad (iOS 16.4+) once the app is added to the Home Screen** — the app shows iPhone users how
- Customers: every order status change, membership renewals, wallet credits, campaigns; contextual
  "enable notifications" prompt on the tracking screen; on/off + test in Account
- Laundries: instant "new order" alerts; riders: "new pickup/delivery job" and "you were assigned" alerts
- Admin → Notifications & campaigns: target all customers, members, non‑members, inactive (30d), riders or
  laundries; bilingual message with live phone preview, reach counts, campaign history
- Dead devices are cleaned up automatically (HTTP 404/410 from the push service)

### Staff roles & permissions (RBAC)
- 19 granular permissions in 9 groups (orders, laundries, riders, customers, services, memberships, marketing, system…)
- Built‑in roles: **Super admin**, **Operations**, **Customer support**, **Finance**, **Marketing** — plus **custom roles**
  built from a permission matrix (Admin → Staff & permissions → Roles)
- Invite staff by phone number (they sign in with OTP — no passwords); change role or suspend access instantly
- Enforced on the server for every endpoint; the dashboard hides pages and buttons a person can't use
- Safety rules: no self‑demotion/suspension, the last super admin can't be removed, only super admins edit super admins,
  and **nobody can grant permissions they don't hold** (anti privilege‑escalation)
- **Audit log** of every staff change (who, what, which record, details, IP), filterable — Admin → Audit log
- Demo mode includes one staff account per role (buttons on `/login`)

### Partner panel
Kanban board (new → inbound → cleaning → ready) with accept/reject, start cleaning, mark ready,
new‑order alerts, today's sales, 30‑day net earnings after commission, price list editor, history.

### Rider app
Online/offline, available pickup & delivery jobs, step‑by‑step job flow, navigation link, cash‑to‑collect, daily earnings.

## Order lifecycle
`pending → accepted → driver_assigned → picked_up → at_laundry → processing → ready → out_for_delivery → delivered` (or `cancelled`).
Every transition is validated server‑side, logged in a timeline and pushed as a customer notification.

**Demo autopilot** (Admin → Settings): new orders advance automatically every N seconds so you can watch live tracking end to end.
Turn it off to drive orders manually from the partner and rider apps.

## Run it

Requires **Node.js 22.5+**. Uses **PostgreSQL** when `DATABASE_URL` is set, otherwise a zero‑setup SQLite file
(handy for development). **Going live? Read [DEPLOYMENT.md](DEPLOYMENT.md)** (Docker + PostgreSQL + automatic HTTPS).

```bash
npm install
npm run build
npm start          # http://localhost:3000
```
Dev mode: `npm run dev`. The database (`data/nuqa.db`) is created and seeded with ~75 days of realistic data on first start.
Reset it with `npm run reset-db`.

**Demo logins** (demo mode only): on `/login` use the demo buttons, or any phone number with OTP `1234`.
In production (`NUQA_DEMO=0`) codes are random 6‑digit SMS/WhatsApp codes, and the first admin is created from `ADMIN_PHONE`.

**Where is the super admin?** → `/admin` (role `admin`, full access).

Tests (against a running demo instance): `scripts/smoke-test.sh` (22 end‑to‑end API checks) and
`scripts/rbac-test.sh` (41 role/permission checks, including privilege‑escalation attempts).

## Production readiness
- PostgreSQL (or SQLite) behind one async data layer; additive automatic migrations; atomic wallet debits;
  collision‑free order numbers
- Real OTP: random 6‑digit codes, hashed, 5‑minute expiry, 5 attempts, per‑phone and per‑IP rate limits, Twilio SMS/WhatsApp
- In‑app **account deletion** (App Store / Google Play requirement) + personal **data export**; `/privacy` & `/terms`
- Cookie sessions for web, **Bearer tokens** for the native apps
- Security headers, no internal errors leaked to clients, required `SESSION_SECRET`, `/api/health`
- Docker image (non‑root, healthcheck) + docker‑compose with PostgreSQL and Caddy (auto HTTPS), backup script

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for the full checklist (payments gateway, SMS, VAPID keys, backups).

## Tech
Next.js 15 (App Router, route handlers) · React 19 · TypeScript · Tailwind CSS · SWR · Recharts · Leaflet (OSM/CARTO tiles) · node:sqlite
