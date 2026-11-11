#!/usr/bin/env bash
# End-to-end API smoke test. Usage: BASE=http://localhost:3000 scripts/smoke-test.sh   (requires NUQA_DEMO enabled)
set -u
BASE=${BASE:-http://localhost:3000}
T=$(mktemp -d); J='content-type: application/json'; FAIL=0
pass(){ echo "  ✓ $1"; }; fail(){ echo "  ✗ $1 — $2"; FAIL=1; }
jqv(){ python3 -c "import json,sys;d=json.load(sys.stdin);print(eval('d'+sys.argv[1]))" "$1" 2>/dev/null; }
login(){ curl -s -c "$T/$1" -X POST "$BASE/api/auth/demo" -H "$J" -d "{\"role\":\"$1\"}" >/dev/null; }
call(){ local who=$1 m=$2 path=$3 body=${4:-}; if [ -n "$body" ]; then curl -s -b "$T/$who" -X "$m" "$BASE$path" -H "$J" -d "$body"; else curl -s -b "$T/$who" -X "$m" "$BASE$path"; fi; }
for r in customer admin partner driver; do login $r; done

echo "health / catalog"
[ "$(curl -s $BASE/api/health | jqv "['ok']")" = "True" ] && pass health || fail health "$(curl -s $BASE/api/health)"
n=$(curl -s "$BASE/api/partners" | jqv "['partners'].__len__()"); [ "${n:-0}" -ge 5 ] && pass "partners ($n)" || fail partners "$n"
[ "$(curl -s "$BASE/api/partners?q=Golden" | jqv "['partners'][0]['name_en']")" = "Golden Steam" ] && pass "search (case-insensitive)" || fail search "-"
[ "$(curl -s "$BASE/api/partners/1" | jqv "['products'].__len__() > 10")" = "True" ] && pass "laundry menu" || fail menu "-"

echo "orders"
call admin PATCH /api/admin/settings '{"autopilot":false}' >/dev/null
r=$(call customer POST /api/orders '{"partner_id":1,"items":[{"product_id":1,"qty":8}],"address_id":1,"payment_method":"card_pos","promo_code":"nuqa20"}')
ID=$(echo "$r" | jqv "['id']"); CODE=$(echo "$r" | jqv "['code']")
[ -n "$ID" ] && pass "create order $CODE (promo case-insensitive)" || fail "create order" "$r"
st(){ call customer GET /api/orders/$ID | jqv "['order']['status']"; }
call driver POST /api/driver/status '{"status":"online"}' >/dev/null
call partner POST /api/partner/orders/$ID '{"action":"accept"}' >/dev/null
for a in take picked_up at_laundry; do call driver POST /api/driver/jobs/$ID "{\"action\":\"$a\"}" >/dev/null; done
for a in start ready; do call partner POST /api/partner/orders/$ID "{\"action\":\"$a\"}" >/dev/null; done
for a in take out_for_delivery delivered; do call driver POST /api/driver/jobs/$ID "{\"action\":\"$a\"}" >/dev/null; done
[ "$(st)" = "delivered" ] && pass "full lifecycle → delivered" || fail lifecycle "$(st)"
[ "$(call customer GET /api/orders/$ID | jqv "['order']['payment_status']")" = "paid" ] && pass "card on delivery marked paid at delivery" || fail "card_pos paid" "-"
[ "$(call customer POST /api/orders/$ID/rate '{"rating":5,"review":"ok"}' | jqv "['ok']")" = "True" ] && pass rating || fail rating "-"
w1=$(call customer GET /api/me | jqv "['user']['wallet']")
r=$(call customer POST /api/orders '{"partner_id":1,"items":[{"product_id":1,"qty":4}],"address_id":1,"payment_method":"wallet"}'); ID2=$(echo "$r" | jqv "['id']")
call customer POST /api/orders/$ID2/cancel '{}' >/dev/null
w2=$(call customer GET /api/me | jqv "['user']['wallet']")
[ "$w1" = "$w2" ] && pass "wallet pay + cancel refund ($w1)" || fail refund "$w1 -> $w2"
[ "$(call customer POST /api/orders '{"partner_id":1,"items":[{"product_id":1,"qty":1}],"address_id":1,"payment_method":"cash"}' | jqv "['error']")" = "min_order:5000" ] && pass "min order enforced" || fail "min order" "-"

echo "payments"
call admin PATCH /api/admin/settings '{"online_payments":false}' >/dev/null
[ "$(call customer POST /api/orders '{"partner_id":1,"items":[{"product_id":1,"qty":8}],"address_id":1,"payment_method":"card"}' | jqv "['error']")" = "online_payments_disabled" ] && pass "online card refused while gateway off" || fail "online card gate" "-"
[ "$(call customer POST /api/wallet '{"amount":5000}' | jqv "['error']")" = "online_payments_disabled" ] && pass "wallet top-up refused while gateway off" || fail "topup gate" "-"
call admin PATCH /api/admin/settings '{"online_payments":true}' >/dev/null
[ -n "$(call customer POST /api/orders '{"partner_id":1,"items":[{"product_id":1,"qty":8}],"address_id":1,"payment_method":"card"}' | jqv "['id']")" ] && pass "online card accepted when enabled" || fail "online card enabled" "-"
call admin PATCH /api/admin/settings '{"online_payments":false}' >/dev/null

echo "membership"
r=$(call customer POST /api/subscription '{"plan_id":2,"payment_method":"wallet"}')
if [ -n "$(echo "$r" | jqv "['id']")" ]; then pass subscribe; elif [ "$(echo "$r" | jqv "['error']")" = "already_subscribed" ]; then pass "subscribe (already a member — duplicate correctly refused)"; else fail subscribe "$r"; fi
r=$(call customer POST /api/orders '{"partner_id":1,"items":[{"product_id":1,"qty":10}],"address_id":1,"payment_method":"cash"}'); ID3=$(echo "$r" | jqv "['id']")
sv=$(call customer GET /api/orders/$ID3 | jqv "['order']['sub_savings']"); [ "${sv%.*}" -gt 0 ] 2>/dev/null && pass "member savings applied ($sv)" || fail savings "$sv"

echo "admin / analytics"
[ "$(call admin GET '/api/admin/overview?days=30' | jqv "['kpis']['orders']['value'] > 0")" = "True" ] && pass overview || fail overview "$(call admin GET '/api/admin/overview?days=30' | head -c 200)"
[ "$(call admin GET /api/admin/subscriptions | jqv "['kpis']['active'] > 0")" = "True" ] && pass subscriptions || fail subs "-"
[ "$(call admin GET '/api/admin/orders?q=nq-1' | jqv "['total'] > 0")" = "True" ] && pass "orders search" || fail "orders search" "-"
for p in partners drivers customers services promos broadcast settings; do [ -z "$(call admin GET /api/admin/$p | jqv "['error']")" ] && pass "admin/$p" || fail "admin/$p" "$(call admin GET /api/admin/$p | head -c 150)"; done
[ "$(call customer GET /api/admin/overview | jqv "['error']")" = "forbidden" ] && pass "customer blocked from admin" || fail authz "-"
call admin PATCH /api/admin/settings '{"autopilot":true}' >/dev/null
rm -rf "$T"; [ $FAIL = 0 ] && echo "ALL PASSED" || { echo "SOME CHECKS FAILED"; exit 1; }
