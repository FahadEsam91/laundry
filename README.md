# Nuqa نقاء — On‑demand laundry delivery platform

A complete, production‑grade laundry marketplace (the "Talabat model" applied to laundry):
customers order washing, ironing, dry cleaning and more from partner laundries; riders collect
and deliver; the platform earns commission + fees. Fully bilingual **Arabic (RTL) / English (LTR)**.

## Four apps in one codebase

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

Requires **Node.js 22.5+** (uses the built‑in SQLite — no database server needed).

```bash
npm install
npm run build
npm start          # http://localhost:3000
```
Dev mode: `npm run dev`. The database (`data/nuqa.db`) is created and seeded with ~75 days of realistic data on first start.
Reset it with `npm run reset-db`.

**Demo logins**: on `/login` use the demo buttons, or any phone number with OTP `1234`.

## Going to production — checklist
| Area | Where | What to do |
|---|---|---|
| SMS OTP | `src/app/api/auth/otp`, `verify` | Plug in an SMS/WhatsApp provider; set `NUQA_DEMO=0` to disable demo logins |
| Payments | `createOrder` in `src/lib/orders.ts`, `api/wallet` | Integrate a gateway (Stripe, Checkout.com, or local e.g. ZainCash/FIB) |
| Database | `src/lib/db.ts` | Swap to PostgreSQL for multi‑instance scale (all SQL is isolated there) |
| Secrets | env | Set `SESSION_SECRET` |
| Push notifications | `src/lib/push.ts` | Set `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` (generate once with `npx web-push generate-vapid-keys`). Without them keys are auto‑generated and stored in the DB. HTTPS is required in production |
| Subscription renewals | `renewDue()` in `src/lib/subscriptions.ts` | Runs lazily + every minute of traffic; also call it from a daily cron. Plug saved‑card charging into `charge()` |
| Native apps | — | Wrap the PWA with Capacitor (add FCM/APNs native push alongside Web Push), or reuse the API from React Native |
| Rider GPS | `api/driver/status` | Send real coordinates from the rider device instead of simulated legs |

Currency, fees, VAT, express surcharge, free‑delivery threshold, city & timezone are all editable in Admin → Settings,
so the platform can launch in any country.

## Tech
Next.js 15 (App Router, route handlers) · React 19 · TypeScript · Tailwind CSS · SWR · Recharts · Leaflet (OSM/CARTO tiles) · node:sqlite
