#!/usr/bin/env bash
# QR labels + wardrobe test. Usage: BASE=http://localhost:3000 scripts/labels-test.sh   (demo mode)
set -u
BASE=${BASE:-http://localhost:3000}
T=$(mktemp -d); J='content-type: application/json'; FAIL=0
pass(){ echo "  ✓ $1"; }; fail(){ echo "  ✗ $1 — $2"; FAIL=1; }
jqv(){ python3 -c "import json,sys;d=json.load(sys.stdin);print(eval('d'+sys.argv[1]))" "$1" 2>/dev/null; }
jqe(){ python3 -c "import json,sys;d=json.load(sys.stdin);print(eval(sys.argv[1]))" "$1" 2>/dev/null; }
login(){ curl -s -c "$T/$1" -X POST "$BASE/api/auth/demo" -H "$J" -d "{\"role\":\"$1\"}" >/dev/null; }
call(){ local who=$1 m=$2 path=$3 body=${4:-}; if [ -n "$body" ]; then curl -s -b "$T/$who" -X "$m" "$BASE$path" -H "$J" -d "$body"; else curl -s -b "$T/$who" -X "$m" "$BASE$path"; fi; }
for r in customer admin partner driver marketing; do login $r; done
curl -s -X POST "$BASE/api/auth/otp" -H "$J" -d '{"phone":"+9647705554433"}' >/dev/null
curl -s -c "$T/other" -X POST "$BASE/api/auth/verify" -H "$J" -d '{"phone":"+9647705554433","code":"1234","name":"Other"}' >/dev/null
JPEG='data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q=='
call admin PATCH /api/admin/settings '{"autopilot":false,"proof_photos":false,"handover_pin":false}' >/dev/null
call driver POST /api/driver/status '{"status":"online"}' >/dev/null

echo "label batches"
[ "$(curl -s -o /dev/null -w '%{http_code}' -b "$T/marketing" -X POST "$BASE/api/admin/tags" -H "$J" -d '{"count":3}')" = 403 ] && pass "marketing can't create labels" || fail "perm" "-"
B=$(call admin POST /api/admin/tags '{"count":4}')
C1=$(echo "$B" | jqv "['codes'][0]"); C2=$(echo "$B" | jqv "['codes'][1]"); C3=$(echo "$B" | jqv "['codes'][2]")
[[ "$C1" =~ ^NQ-[A-Z2-9]{4}-[A-Z2-9]{4}$ ]] && pass "batch of 4 unique codes ($C1)" || fail "codes" "$B"

echo "order"
PID=$(call partner GET /api/partner/orders | jqv "['partner']['id']")
PROD=$(curl -s "$BASE/api/partners/$PID" | jqv "['products'][0]['id']")
ADDR=$(call customer GET /api/me | jqv "['addresses'][0]['id']")
PH=$(call customer POST /api/media "{\"kind\":\"order\",\"data\":\"$JPEG\"}" | jqv "['url']")
O=$(call customer POST /api/orders "{\"partner_id\":$PID,\"items\":[{\"product_id\":$PROD,\"qty\":10}],\"address_id\":$ADDR,\"photos\":[\"$PH\"],\"payment_method\":\"cash\"}" | jqv "['id']")
call partner POST /api/partner/orders/$O '{"action":"accept"}' >/dev/null
[ "$(curl -s -o /dev/null -w '%{http_code}' -b "$T/driver" -X POST "$BASE/api/scan" -H "$J" -d "{\"order_id\":$O,\"code\":\"$C1\",\"stage\":\"collect\",\"product_id\":$PROD}")" = 403 ] && pass "rider can't scan before taking the job" || fail "driver perm" "-"
call driver POST /api/driver/jobs/$O '{"action":"take"}' >/dev/null

echo "rider scans at pickup"
[ "$(call driver POST /api/scan "{\"order_id\":$O,\"code\":\"$C1\",\"stage\":\"collect\"}" | jqv "['error']")" = "tag_item_required" ] && pass "new label asks for the item type" || fail "item required" "-"
[ "$(call driver POST /api/scan "{\"order_id\":$O,\"code\":\"$C1\",\"stage\":\"collect\",\"product_id\":$PROD}" | jqv "['created']")" = "True" ] && pass "label → new garment in the customer's wardrobe" || fail "create" "-"
LOWER=$(echo "$C2" | tr 'A-Z' 'a-z' | tr -d '-')
[ "$(call driver POST /api/scan "{\"order_id\":$O,\"code\":\"$LOWER\",\"stage\":\"collect\",\"product_id\":$PROD}" | jqv "['counts']['collected']")" = 2 ] && pass "typed code without dashes / lower case works" || fail "normalize" "-"
[ "$(call driver POST /api/scan "{\"order_id\":$O,\"code\":\"$C1\",\"stage\":\"collect\"}" | jqv "['counts']['collected']")" = 2 ] && pass "scanning twice doesn't double count" || fail "idempotent" "-"
[ "$(call driver POST /api/scan "{\"order_id\":$O,\"code\":\"NQ-AAAA-AAAA\",\"stage\":\"collect\",\"product_id\":$PROD}" | jqv "['error']")" = "tag_unknown" ] && pass "unregistered label refused" || fail "unknown" "-"
call driver POST /api/driver/jobs/$O '{"action":"picked_up"}' >/dev/null
call driver POST /api/driver/jobs/$O '{"action":"at_laundry"}' >/dev/null

echo "laundry"
[ "$(call partner POST /api/scan "{\"order_id\":$O,\"code\":\"$C1\",\"stage\":\"receive\"}" | jqv "['counts']['received']")" = 1 ] && pass "laundry checks items in" || fail receive "-"
call partner POST /api/scan "{\"order_id\":$O,\"code\":\"$C2\",\"stage\":\"receive\"}" >/dev/null
[ "$(call partner POST /api/scan "{\"order_id\":$O,\"code\":\"$C3\",\"stage\":\"ready\"}" | jqv "['error']")" = "tag_not_on_order" ] && pass "label from outside the order refused at check-out" || fail "not on order" "-"
for c in $C1 $C2; do call partner POST /api/scan "{\"order_id\":$O,\"code\":\"$c\",\"stage\":\"ready\"}" >/dev/null; done
[ "$(call customer GET /api/orders/$O | jqe "len([g for g in d['order']['garments'] if g['ready_at']])")" = 2 ] && pass "customer sees each item ready" || fail "customer garments" "-"

echo "another customer"
O2=$(call admin GET "/api/admin/orders?limit=50" | jqe "[o['id'] for o in d['orders'] if o['customer_id']!=$(call customer GET /api/me | jqv "['user']['id']") and o['status'] in ('picked_up','at_laundry','processing')][0]")
[ "$(call admin POST /api/scan "{\"order_id\":$O2,\"code\":\"$C1\",\"stage\":\"receive\"}" | jqv "['error']")" = "tag_other_customer" ] && pass "a customer's label can't go on someone else's order" || fail "other customer" "-"

echo "delivery and wardrobe"
for a in start ready; do call partner POST /api/partner/orders/$O "{\"action\":\"$a\"}" >/dev/null; done
for a in take out_for_delivery delivered; do call driver POST /api/driver/jobs/$O "{\"action\":\"$a\"}" >/dev/null; done
W=$(call customer GET /api/wardrobe)
[ "$(echo "$W" | jqe "[g['wash_count'] for g in d['garments'] if g['tag']=='$C1'][0]")" = 1 ] && pass "wardrobe: cleaned once, after delivery" || fail "wash count" "$W"
G1=$(echo "$W" | jqe "[g['id'] for g in d['garments'] if g['tag']=='$C1'][0]")
[ "$(call customer PATCH /api/wardrobe/$G1 '{"name":"دشداشة العيد"}' | jqv "['ok']")" = "True" ] && pass "customer renames an item" || fail rename "-"
[ "$(curl -s -o /dev/null -w '%{http_code}' -b "$T/other" -X PATCH "$BASE/api/wardrobe/$G1" -H "$J" -d '{"name":"x"}')" = 404 ] && pass "another customer can't touch it" || fail "other rename" "-"
[ "$(call other GET /api/wardrobe | jqv "['garments'].__len__()")" = 0 ] && pass "wardrobes are private" || fail "private" "-"
call admin PATCH /api/admin/settings '{"proof_photos":true,"handover_pin":true}' >/dev/null
rm -rf "$T"; [ $FAIL = 0 ] && echo "ALL LABEL CHECKS PASSED" || { echo "SOME LABEL CHECKS FAILED"; exit 1; }
