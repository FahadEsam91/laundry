# Nuqa native apps (iOS & Android)

One Expo / React Native codebase that produces **two store apps**:

| App | Who | Bundle ID (change before first release) | Build variant |
|---|---|---|---|
| **Nuqa** | Customers | `com.fahadesam.nuqa` | `APP_VARIANT=customer` |
| **Nuqa Rider** | Delivery riders | `com.fahadesam.nuqarider` | `APP_VARIANT=rider` |

Laundry partners and admins use the web dashboards (`/partner`, `/admin`) — like Talabat's vendor and ops tools.

Both apps talk to the same server (the Next.js app in the repo root) over its JSON API using a Bearer token,
and share its translations (`src/lib/i18n.ts`), pricing engine (`src/lib/pricing.ts`) and order statuses.

**Features:** Arabic (RTL) + English · phone OTP sign-in (iOS/Android SMS auto-fill) · laundries, menus, basket ·
checkout with express, pickup slots, promo codes, cash/card/wallet · Nuqa Plus memberships · live order tracking
on Apple/Google Maps · push notifications · addresses with GPS · wallet · ratings · reorder · **in-app account deletion**.
Rider app: go online/offline, live GPS sharing, job pipeline, turn-by-turn navigation hand-off, cash collection.

---

## 0. Before you start
1. **Deploy the server first** (see `../DEPLOYMENT.md`) — the apps need a public `https://` URL.
2. Accounts: [Apple Developer Program](https://developer.apple.com/programs/) ($99/year) ·
   [Google Play Console](https://play.google.com/console) ($25 once) · [Expo](https://expo.dev/signup) (free).
3. Android maps: create a **Google Maps SDK for Android** API key in Google Cloud Console.
4. Install tools on your computer: Node.js 22+, then `npm i -g eas-cli` and `eas login`.
   You do **not** need a Mac — EAS builds iOS apps in the cloud.

## 1. Configure
```bash
cd mobile
npm install
```
- `app.config.ts` → change `com.fahadesam.nuqa` / `com.fahadesam.nuqarider` to your own reverse domain (e.g. `com.yourbrand.laundry`).
- `eas.json` → set `EXPO_PUBLIC_API_URL` in `build.base.env` to your server, e.g. `https://app.yourbrand.com`.
- Create one EAS project per app and save the IDs:
  ```bash
  APP_VARIANT=customer eas init      # copy the project ID it prints
  APP_VARIANT=rider eas init
  eas env:create --name EAS_PROJECT_ID --value <customer-id> --environment production
  eas env:create --name EAS_PROJECT_ID_RIDER --value <rider-id> --environment production
  eas env:create --name GOOGLE_MAPS_ANDROID_KEY --value <key> --environment production --visibility secret
  ```

## 2. Push notifications
- **iOS:** nothing to do — `eas build` creates the APNs key for you (answer "yes" when asked).
- **Android:** create a Firebase project → add Android apps `com.fahadesam.nuqa` and `com.fahadesam.nuqarider` →
  Project settings → Service accounts → *Generate new private key* → upload it in
  expo.dev → your project → Credentials → Android → **FCM V1 service account key**.
- The server already sends to Expo's push service (`src/lib/push.ts`); optional `EXPO_ACCESS_TOKEN` env for enhanced security.

## 3. Test on your phone
```bash
eas build --profile customer-preview --platform android     # installable .apk link
eas build --profile customer-preview --platform ios         # register devices first: eas device:create
```
Day-to-day development: `eas build --profile development` once, then `npx expo start` (set the LAN IP of your
dev server in `eas.json → development.env.EXPO_PUBLIC_API_URL`).

## 4. Build for the stores
```bash
eas build --profile customer-production --platform all
eas build --profile rider-production --platform all
```

## 5. Submit
```bash
eas submit --profile customer-production --platform ios        # uploads to App Store Connect
eas submit --profile customer-production --platform android    # uploads to Play (internal track)
eas submit --profile rider-production --platform all
```
First Android upload: Play requires the very first AAB to be uploaded manually in the console; after that `eas submit` works
(put the Play service-account JSON at `mobile/google-play-key.json` — it is git-ignored).
In `eas.json → submit`, replace `ascAppId` with each app's Apple ID from App Store Connect.

## 6. Store review checklist
- [ ] **Reviewer login**: SMS can't reach reviewers. On the server set
      `REVIEW_LOGINS=+9647000000001:482913,+9647000000002:551208` (a customer and a rider account), then put the numbers
      and codes in *App Review Information* (Apple) and *App access* (Google).
- [ ] Privacy policy URL: `https://your-domain/privacy` · Support URL / terms: `https://your-domain/terms`
- [ ] Account deletion: in-app (Account → Delete account / Rider menu → Delete account) ✓ — Google also asks for a web URL:
      use the privacy policy URL (it explains how to delete).
- [ ] Apple *App Privacy* & Google *Data safety*: Name, Phone number, Precise location (addresses / rider location),
      Purchase history, Device ID (push token). Used for app functionality; not sold; not used for tracking.
- [ ] Location permission text is set in `app.config.ts`. The rider app only uses location while open (no background location).
- [ ] Card payments are a **demo** until you connect a gateway — don't publish with "card" enabled before that,
      or hide it (see `../DEPLOYMENT.md#7-payments`).
- [ ] Screenshots: iPhone 6.7" (1290×2796) and Android phone — take them from the preview builds.
- Store texts in Arabic & English: see `STORE_LISTING.md`.

## Project structure
```
app/                  screens (expo-router)
  (customer)/         tab bar: home, orders, plus, account
  laundry/[id]        laundry menu      cart          checkout
  order/[id]          live tracking     addresses/    list + new (map pin)
  rider               rider app home    login         phone OTP
src/                  api client, auth (SecureStore token), i18n/RTL, cart, push, map, UI kit
```
