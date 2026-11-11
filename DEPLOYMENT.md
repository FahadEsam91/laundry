# Deploying Nuqa to production

This guide takes you from zero to a live, secure platform at `https://your-domain`.
The native apps (see `mobile/`) talk to this same server, so deploy it **first**.

## 1. What you need
| Item | Notes |
|---|---|
| A domain | e.g. `app.yourbrand.com` — point an **A record** to your server's IP |
| A server | Any Linux VPS with 2 GB RAM+ (Hetzner, DigitalOcean, AWS Lightsail…) with Docker installed |
| Twilio account | For SMS/WhatsApp verification codes (or any SMS provider — see `src/lib/sms.ts`) |
| Payment gateway | Card payments are **demo** until connected — see "Payments" below |

## 2a. One-command install on a VPS (easiest)
On a fresh Ubuntu 22.04/24.04 or Debian 12 server (2 GB RAM+), as root:
```bash
curl -fsSL https://raw.githubusercontent.com/FahadEsam91/laundry/main/deploy/install.sh | sudo bash
```
It installs Docker, downloads the app to `/opt/nuqa`, asks 3–4 questions (domain — or a free `<ip>.sslip.io` address,
admin phone, production/demo, optional Twilio), generates all secrets and web-push keys, opens the firewall,
starts everything with HTTPS and schedules daily backups. Update later with `sudo bash /opt/nuqa/deploy/update.sh`.

## 2b. Manual Docker deployment
```bash
git clone https://github.com/FahadEsam91/laundry && cd laundry
cp .env.example .env
nano .env                       # fill DOMAIN, SESSION_SECRET, POSTGRES_PASSWORD, ADMIN_PHONE, Twilio, VAPID
docker compose up -d --build
```
That starts **PostgreSQL**, the **app**, and **Caddy**, which issues and renews the HTTPS certificate automatically.

- Health check: `https://your-domain/api/health` → `{"ok":true,"db":"postgres"}`
- Super admin: open `https://your-domain/login`, sign in with the `ADMIN_PHONE` number, then go to `/admin`.
- Add laundries, riders, plans and promo codes from the admin dashboard. With `NUQA_DEMO=0` the platform starts empty
  (only services, membership plans and your admin account are created).

Generate secrets:
```bash
openssl rand -base64 48                 # SESSION_SECRET
npx web-push generate-vapid-keys        # VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY
```

## 3. Alternative: managed platforms
Railway, Render or Fly.io: create a **PostgreSQL** database, deploy this repo with the included `Dockerfile`,
and set the same environment variables (`DATABASE_URL` + `DATABASE_SSL=1` for most managed databases).
Vercel also works if you use an external PostgreSQL (the SQLite fallback needs a persistent disk).

## 4. Backups
```bash
crontab -e
0 3 * * * /path/to/laundry/deploy/backup.sh     # daily pg_dump, keeps 14 days in ./backups
```
Copy `backups/` off the server (S3, Backblaze…) — a backup on the same disk is not a backup.
Restore: `docker compose exec -T db pg_restore -U nuqa -d nuqa --clean < backups/nuqa-YYYY-MM-DD.dump`

## 5. Updating
```bash
git pull && docker compose up -d --build
```
Database changes are applied automatically and are additive (no data loss).

## 6. Production checklist
- [ ] `NUQA_DEMO=0` (disables demo data, demo logins and the fixed `1234` code)
- [ ] `SESSION_SECRET` set (the app refuses to start sign-ins without it)
- [ ] Twilio configured and a test code received on a real phone
- [ ] VAPID keys set (otherwise keys are generated and stored in the DB — fine, but env keys survive DB resets)
- [ ] Admin → Settings: currency, fees, VAT, city, timezone, support phone; **turn off "Demo autopilot"**
- [ ] Privacy policy & terms (`/privacy`, `/terms`) reviewed by a lawyer for your country
- [ ] Payments connected (below)
- [ ] Backups scheduled and a restore tested

## 7. Payments (to do before accepting cards)
Card payments and saved-card renewals are simulated. Connect a gateway in:
- `src/lib/orders.ts` → `createOrder()` (order payment)
- `src/lib/subscriptions.ts` → `charge()` (membership renewals)
- `src/app/api/wallet/route.ts` (wallet top-ups)

Typical choices: **Stripe** / **Checkout.com** (international), **ZainCash**, **FIB**, **Qi Card** (Iraq).
Use the gateway's hosted checkout or SDK so card numbers never touch your server.

## 8. Scaling notes
- Stateless app servers: run several `app` replicas behind the proxy (sessions are signed tokens, data is in PostgreSQL).
- The demo autopilot and membership renewal sweep run inside request handling; for multiple replicas, also call
  `renewDue()` from a daily cron job.
- Put the map tiles behind your own key (MapTiler/Mapbox) when traffic grows; the default CARTO tiles have fair-use limits.
