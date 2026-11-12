#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  Switch a Nuqa server from DEMO to PRODUCTION (real customers).
#
#    sudo bash /opt/nuqa/deploy/go-live.sh
#
#  1. backs up the current database to backups/
#  2. asks for the super-admin phone, SMS (Twilio) details and creates an App Store /
#     Google Play reviewer login
#  3. turns demo mode off and starts from an EMPTY database (demo laundries, orders and
#     customers are removed — you add your real laundries in the admin dashboard)
#  Any prompt can be pre-answered with an environment variable of the same name.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")/.."

ok()   { printf '\033[1;32m✓ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m! %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31m✗ %s\033[0m\n' "$*"; exit 1; }
ask()  { local var=$1 q=$2 def=${3:-} ans=""
  if [ -n "${!var:-}" ]; then return; fi
  if (exec </dev/tty) 2>/dev/null; then read -rp "$q${def:+ [$def]}: " ans </dev/tty || true; fi
  printf -v "$var" '%s' "${ans:-$def}"; }
setenv() { # setenv KEY VALUE — replace or append one line in .env
  local tmp; tmp=$(mktemp)
  grep -v -E "^#? ?$1=" .env > "$tmp" || true
  printf '%s=%s\n' "$1" "$2" >> "$tmp"
  cat "$tmp" > .env; rm -f "$tmp"; }
phone() { local d; d=$(printf '%s' "$1" | tr -cd '0-9')
  case "$d" in 00*) d=${d#00} ;; 07*) d="964${d#0}" ;; esac
  [ ${#d} -ge 10 ] && [ ${#d} -le 15 ] && printf '+%s' "$d"; }

[ "$(id -u)" = 0 ] || die "Please run as root:  sudo bash deploy/go-live.sh"
[ -f .env ] || die "No .env here — install first with deploy/install.sh"
set -a; . ./.env; set +a
[ "${NUQA_DEMO:-1}" = 0 ] && warn "This server is already in production mode. Continuing will ERASE its database."

echo
echo "Super-admin: the phone number that signs in to /admin with full permissions."
CUR_ADMIN=${ADMIN_PHONE:-}; unset ADMIN_PHONE
ask ADMIN_PHONE "Super-admin phone" "$CUR_ADMIN"
ADMIN_PHONE=$(phone "$ADMIN_PHONE") || die "Invalid admin phone number"
ok "Admin: $ADMIN_PHONE"

echo
echo "SMS login codes are sent with Twilio (twilio.com → Console → Account SID / Auth Token / a sender)."
echo "Press Enter to skip: codes are then only printed in the server log (customers can't sign in)."
ask TWILIO_ACCOUNT_SID "Twilio Account SID (AC…)" "${TWILIO_ACCOUNT_SID:-}"
TWILIO_ACCOUNT_SID=$(printf '%s' "$TWILIO_ACCOUNT_SID" | grep -oE 'AC[0-9a-fA-F]{32}' || true)
if [ -n "$TWILIO_ACCOUNT_SID" ]; then
  ask TWILIO_AUTH_TOKEN "Twilio Auth Token" "${TWILIO_AUTH_TOKEN:-}"
  ask TWILIO_FROM "Twilio sender (+1… number or MG… messaging service SID)" "${TWILIO_FROM:-}"
  TWILIO_AUTH_TOKEN=$(printf '%s' "$TWILIO_AUTH_TOKEN" | tr -cd 'A-Za-z0-9')
  TWILIO_FROM=$(printf '%s' "$TWILIO_FROM" | tr -cd 'A-Za-z0-9+')
  [ -n "$TWILIO_AUTH_TOKEN" ] && [ -n "$TWILIO_FROM" ] || die "Twilio needs the Auth Token and a sender"
  ok "SMS: Twilio"
else
  warn "SMS skipped — real customers can't receive login codes until you add Twilio (run this again)."
fi

# Reviewer login: a dedicated number with a fixed code (no SMS) for Apple / Google app review.
REVIEW_PHONE=${REVIEW_PHONE:-+9647000000001}
REVIEW_CODE=${REVIEW_CODE:-$(printf '%06d' $(( $(od -An -N4 -tu4 /dev/urandom) % 1000000 )))}

echo
warn "This deletes ALL current data (demo laundries, riders, customers and orders)."
CONFIRM=${CONFIRM:-}
ask CONFIRM "Type GO to switch to production" ""
[ "$CONFIRM" = "GO" ] || die "Cancelled — nothing was changed."

mkdir -p backups
if docker compose ps -q db 2>/dev/null | grep -q .; then
  docker compose exec -T db pg_dump -U nuqa -Fc nuqa > "backups/before-go-live-$(date +%F-%H%M).dump" && ok "Backup saved in $(pwd)/backups"
fi

cp .env ".env.before-go-live.$(date +%s)"; chmod 600 .env.before-go-live.*
setenv NUQA_DEMO 0
setenv ADMIN_PHONE "$ADMIN_PHONE"
setenv SMS_PROVIDER "$([ -n "$TWILIO_ACCOUNT_SID" ] && echo twilio || echo console)"
setenv TWILIO_ACCOUNT_SID "$TWILIO_ACCOUNT_SID"
setenv TWILIO_AUTH_TOKEN "${TWILIO_AUTH_TOKEN:-}"
setenv TWILIO_FROM "${TWILIO_FROM:-}"
setenv REVIEW_LOGINS "$REVIEW_PHONE:$REVIEW_CODE"
chmod 600 .env
ok ".env updated"

vol=$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Name}}{{end}}{{end}}' "$(docker compose ps -q db)" 2>/dev/null || true)
docker compose down
[ -n "$vol" ] && docker volume rm "$vol" >/dev/null && ok "Demo database removed"
git pull -q --ff-only || warn "Could not update the code (continuing with the current version)"
docker compose up -d --build

printf 'Waiting for the app'
for _ in $(seq 1 60); do
  if curl -fsS "https://$DOMAIN/api/health" >/dev/null 2>&1 || docker compose exec -T app wget -qO- http://localhost:3000/api/health >/dev/null 2>&1; then echo; ok "Nuqa is live in PRODUCTION mode"; break; fi
  printf '.'; sleep 3
done

cat <<DONE

  Website:        https://$DOMAIN
  Admin:          https://$DOMAIN/admin   (sign in with $ADMIN_PHONE)

  App review login — put this in App Store Connect → App Review Information
  and in Google Play → App content → App access:
      Phone: $REVIEW_PHONE      Code: $REVIEW_CODE

  Next: in the admin dashboard add your real laundries (with their prices) and riders.
  The apps and website show no laundries until you do.
DONE
