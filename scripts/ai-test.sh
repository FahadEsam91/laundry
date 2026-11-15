#!/usr/bin/env bash
# AI + WhatsApp test (offline). Start the server with AI_MOCK=1 WHATSAPP_MOCK=1 (demo mode), then:
#   BASE=http://localhost:3000 scripts/ai-test.sh
set -u
BASE=${BASE:-http://localhost:3000}
T=$(mktemp -d); J='content-type: application/json'; FAIL=0
pass(){ echo "  ✓ $1"; }; fail(){ echo "  ✗ $1 — $2"; FAIL=1; }
jqv(){ python3 -c "import json,sys;d=json.load(sys.stdin);print(eval('d'+sys.argv[1]))" "$1" 2>/dev/null; }
jqe(){ python3 -c "import json,sys;d=json.load(sys.stdin);print(eval(sys.argv[1]))" "$1" 2>/dev/null; }
login(){ curl -s -c "$T/$1" -X POST "$BASE/api/auth/demo" -H "$J" -d "{\"role\":\"$1\"}" >/dev/null; }
call(){ local who=$1 m=$2 path=$3 body=${4:-}; if [ -n "$body" ]; then curl -s -b "$T/$who" -X "$m" "$BASE$path" -H "$J" -d "$body"; else curl -s -b "$T/$who" -X "$m" "$BASE$path"; fi; }
code(){ curl -s -o /dev/null -w '%{http_code}' -b "$T/$1" -X "$2" "$BASE$3" -H "$J" ${4:+-d "$4"}; }
for r in customer admin partner driver; do login $r; done
JPEG='data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q=='
call admin PATCH /api/admin/settings '{"autopilot":false,"proof_photos":false,"handover_pin":false,"ai_features":true,"whatsapp_notifications":true}' >/dev/null

echo "configuration"
[ "$(curl -s "$BASE/api/config" | jqv "['settings']['ai']")" = True ] && pass "AI on (key present + setting on)" || fail "config.ai" "-"
[ "$(call admin GET /api/admin/settings | jqv "['integrations']['ai']")" = True ] && pass "admin sees the server is ready" || fail integrations "-"
[ "$(code customer POST /api/ai/order '{}')" != 401 ] && [ "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/ai/order" -H "$J" -d '{}')" = 401 ] && pass "signed-out users can't use the assistant" || fail auth "-"

echo "order by text"
P=$(curl -s "$BASE/api/partners/1")
NAME=$(echo "$P" | jqv "['products'][0]['name_ar']"); PID=$(echo "$P" | jqv "['products'][0]['id']")
D=$(call customer POST /api/ai/order "{\"partner_id\":1,\"text\":\"عندي ٣ $NAME اريدهم باچر الصبح مستعجل\"}")
[ "$(echo "$D" | jqe "[(i['product_id'],i['qty']) for i in d['draft']['items']][0]")" = "($PID, 3)" ] && pass "\"٣ $NAME\" → 3× product #$PID" || fail items "$D"
[ "$(echo "$D" | jqe "(d['draft']['pickup_day'],d['draft']['pickup_hour'],d['draft']['express'])")" = "('tomorrow', 10, True)" ] && pass "pickup tomorrow morning, express" || fail pickup "$D"
[ "$(echo "$D" | jqe "d['draft']['lines'][0]['price']>0")" = True ] && pass "lines come back with prices" || fail lines "-"
[ "$(call customer POST /api/ai/order '{"partner_id":1,"text":""}' | jqv "['error']")" = ai_text_required ] && pass "empty text rejected" || fail empty "-"
[ "$(code customer POST /api/ai/order '{"partner_id":99999,"text":"قميص"}')" = 404 ] && pass "unknown laundry → 404" || fail "404" "-"

echo "photo analysis at checkout"
PH=$(call customer POST /api/media "{\"kind\":\"order\",\"data\":\"$JPEG\"}" | jqv "['url']")
I=$(call customer POST /api/ai/photo "{\"photo\":\"$PH\",\"partner_id\":1}")
[ "$(echo "$I" | jqe "d['insight']['is_garment'] and len(d['insight']['stains'])>0")" = True ] && pass "garment + stains returned" || fail insight "$I"
[ "$(echo "$I" | jqv "['insight']['product_id']")" = "$PID" ] && pass "suggests an item from this laundry's list" || fail suggest "$I"
[ "$(code partner POST /api/ai/photo "{\"photo\":\"$PH\",\"partner_id\":1}")" = 404 ] && pass "someone else's photo can't be analysed" || fail "other user" "-"

echo "order → laundry sees the analysis and gets an alert"
ADDR=$(call customer GET /api/me | jqv "['addresses'][0]['id']")
PH2=$(call customer POST /api/media "{\"kind\":\"order\",\"data\":\"$JPEG\"}" | jqv "['url']")
call customer PATCH /api/me '{"whatsapp_opt_in":true}' >/dev/null
[ "$(call customer GET /api/me | jqv "['user']['whatsapp_opt_in']")" = 1 ] && pass "customer opted in to WhatsApp" || fail optin "-"
R=$(call customer POST /api/orders "{\"partner_id\":1,\"items\":[{\"product_id\":$PID,\"qty\":6}],\"address_id\":$ADDR,\"photos\":[\"$PH\",\"$PH2\"],\"payment_method\":\"cash\"}")
O=$(echo "$R" | jqv "['id']"); CODE=$(echo "$R" | jqv "['code']")
[ -n "$O" ] && [ "$O" != None ] && pass "order placed ($CODE)" || fail order "$R"
sleep 1.5
OD=$(call partner GET /api/orders/$O)
[ "$(echo "$OD" | jqe "len([x for x in d['order']['photo_ai'] if x])")" = 2 ] && pass "both photos analysed (one at checkout, one after the order)" || fail photo_ai "$(echo "$OD" | jqv "['order']['photo_ai']")"
[ "$(call admin GET /api/orders/$O | jqe "len(d['order']['photo_ai'])")" = 2 ] && pass "super admin sees the analysis" || fail admin "-"
call partner GET /api/notifications | grep -q "عناية خاصة — $CODE" && pass "laundry alerted about special care" || fail alert "$(call partner GET /api/notifications | head -c 300)"

echo "WhatsApp"
call partner POST /api/partner/orders/$O '{"action":"accept"}' >/dev/null
sleep 1
WA=$(call admin GET /api/admin/whatsapp-log)
echo "$WA" | grep -q "$CODE" && pass "order update sent by WhatsApp to the opted-in customer" || fail "wa sent" "$WA"
call customer PATCH /api/me '{"whatsapp_opt_in":false}' >/dev/null
N1=$(echo "$WA" | jqe "len(d['sent'])")
call partner POST /api/partner/orders/$O '{"action":"start"}' >/dev/null 2>&1
call driver POST /api/driver/status '{"status":"online"}' >/dev/null
call driver POST /api/driver/jobs/$O '{"action":"take"}' >/dev/null
sleep 1
[ "$(call admin GET /api/admin/whatsapp-log | jqe "len(d['sent'])")" = "$N1" ] && pass "nothing sent after opting out" || fail "opt out" "-"
call admin PATCH /api/admin/settings '{"whatsapp_notifications":false}' >/dev/null
[ "$(curl -s "$BASE/api/config" | jqv "['settings']['whatsapp']")" = False ] && pass "admin can turn WhatsApp off" || fail "wa off" "-"

echo "switching AI off"
call admin PATCH /api/admin/settings '{"ai_features":false,"whatsapp_notifications":true}' >/dev/null
[ "$(curl -s "$BASE/api/config" | jqv "['settings']['ai']")" = False ] && pass "config hides AI" || fail "config off" "-"
[ "$(code customer POST /api/ai/order '{"partner_id":1,"text":"قميص"}')" = 404 ] && pass "assistant disabled → 404" || fail "disabled" "-"
call admin PATCH /api/admin/settings '{"ai_features":true}' >/dev/null

[ $FAIL = 0 ] && echo "ALL AI/WHATSAPP TESTS PASSED" || { echo "SOME TESTS FAILED"; exit 1; }
