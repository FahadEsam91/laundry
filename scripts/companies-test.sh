#!/usr/bin/env bash
# Business accounts test. Usage: BASE=http://localhost:3000 scripts/companies-test.sh   (demo mode)
set -u
BASE=${BASE:-http://localhost:3000}
T=$(mktemp -d); J='content-type: application/json'; FAIL=0
pass(){ echo "  ✓ $1"; }; fail(){ echo "  ✗ $1 — $2"; FAIL=1; }
jqv(){ python3 -c "import json,sys;d=json.load(sys.stdin);print(eval('d'+sys.argv[1]))" "$1" 2>/dev/null; }
login(){ curl -s -c "$T/$1" -X POST "$BASE/api/auth/demo" -H "$J" -d "{\"role\":\"$1\"}" >/dev/null; }
call(){ local who=$1 m=$2 path=$3 body=${4:-}; if [ -n "$body" ]; then curl -s -b "$T/$who" -X "$m" "$BASE$path" -H "$J" -d "$body"; else curl -s -b "$T/$who" -X "$m" "$BASE$path"; fi; }
code(){ curl -s -o /dev/null -w '%{http_code}' -b "$T/$1" -X "$2" "$BASE$3" -H "$J" ${4:+-d "$4"}; }
for r in customer admin partner driver finance marketing; do login $r; done
JPEG='data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q=='
call admin PATCH /api/admin/settings '{"autopilot":false,"proof_photos":false,"handover_pin":false}' >/dev/null
MONTH=$(date -u +%Y-%m)
ADDR=$(call customer GET /api/me | jqv "['addresses'][0]['id']")
PROD=$(curl -s "$BASE/api/partners/1" | jqv "['products'][0]['id']")
PRICE=$(curl -s "$BASE/api/partners/1" | jqv "['products'][0]['price']")
order(){ local ph; ph=$(call customer POST /api/media "{\"kind\":\"order\",\"data\":\"$JPEG\"}" | jqv "['url']"); call customer POST /api/orders "{\"partner_id\":1,\"items\":[{\"product_id\":$PROD,\"qty\":10}],\"address_id\":$ADDR,\"photos\":[\"$ph\"],\"payment_method\":\"$1\"}"; }

echo "permissions"
[ "$(code marketing GET /api/admin/companies)" = 403 ] && pass "marketing can't see business accounts" || fail perm "-"
[ "$(code finance GET /api/admin/companies)" = 200 ] && pass "finance manages business accounts" || fail "finance" "-"

echo "company and staff"
[ "$(order invoice | jqv "['error']")" = "invoice_not_allowed" ] && pass "no company → can't bill a company" || fail "not allowed" "-"
C=$(call finance POST /api/admin/companies '{"name":"فندق الاختبار","contact_name":"Ahmed","discount_pct":15}' | jqv "['id']")
[ -n "$C" ] && pass "company created (#$C, 15%)" || fail create "-"
CPHONE=$(call customer GET /api/me | jqv "['user']['phone']")
[ "$(call finance POST /api/admin/companies/$C "{\"action\":\"add_member\",\"phone\":\"$CPHONE\"}" | jqv "['user_id']")" != "None" ] && pass "existing customer added as staff" || fail "add member" "-"
[ "$(call finance POST /api/admin/companies/$C '{"action":"add_member","phone":"07701239876","name":"New"}' | jqv "['user_id']")" != "None" ] && pass "new phone → account created and linked" || fail "add new" "-"
APHONE=$(call admin GET /api/me | jqv "['user']['phone']")
[ "$(call finance POST /api/admin/companies/$C "{\"action\":\"add_member\",\"phone\":\"$APHONE\"}" | jqv "['error']")" = "member_not_customer" ] && pass "staff/admin numbers can't be added" || fail "not customer" "-"
[ "$(call customer GET /api/me | jqv "['company']['discount_pct']")" = "15.0" ] || [ "$(call customer GET /api/me | jqv "['company']['discount_pct']")" = "15" ] && pass "customer sees their business account" || fail "me.company" "$(call customer GET /api/me | jqv "['company']")"

echo "billing"
R=$(order invoice); O=$(echo "$R" | jqv "['id']")
OD=$(call customer GET /api/orders/$O)
[ "$(echo "$OD" | jqv "['order']['payment_status']")" = "invoiced" ] && pass "order billed to the company (invoiced)" || fail invoiced "$R"
EXP=$(python3 -c "print(round($PRICE*10*15/100/250)*250)")
[ "$(echo "$OD" | jqv "int(d['order']['company_discount'])" 2>/dev/null || echo "$OD" | python3 -c "import sys,json;print(int(json.load(sys.stdin)['order']['company_discount']))")" = "$EXP" ] && pass "15% company discount applied ($EXP)" || fail discount "$(echo "$OD" | python3 -c "import sys,json;print(json.load(sys.stdin)['order']['company_discount'])")"
call partner POST /api/partner/orders/$O '{"action":"accept"}' >/dev/null
call driver POST /api/driver/status '{"status":"online"}' >/dev/null
for a in take picked_up at_laundry; do call driver POST /api/driver/jobs/$O "{\"action\":\"$a\"}" >/dev/null; done
for a in start ready; do call partner POST /api/partner/orders/$O "{\"action\":\"$a\"}" >/dev/null; done
for a in take out_for_delivery delivered; do call driver POST /api/driver/jobs/$O "{\"action\":\"$a\"}" >/dev/null; done
[ "$(call customer GET /api/orders/$O | jqv "['order']['payment_status']")" = "invoiced" ] && pass "still invoiced after delivery (paid by the company later)" || fail "after delivery" "-"
ST=$(call finance GET "/api/admin/companies/$C?month=$MONTH")
[ "$(echo "$ST" | jqv "['totals']['orders']")" = 1 ] && [ "$(echo "$ST" | python3 -c "import sys,json;t=json.load(sys.stdin)['totals'];print(t['due']==t['total']>0)")" = "True" ] && pass "monthly statement: 1 order, amount due" || fail statement "$ST"

echo "credit limit"
call finance PATCH /api/admin/companies/$C '{"credit_limit":1000}' >/dev/null
[ "$(order invoice | jqv "['error']")" = "credit_limit_reached" ] && pass "credit limit stops new invoiced orders" || fail credit "-"
call finance PATCH /api/admin/companies/$C '{"credit_limit":0}' >/dev/null

echo "settle"
[ "$(call finance POST /api/admin/companies/$C "{\"action\":\"settle\",\"month\":\"$MONTH\"}" | jqv "['settled']")" = 1 ] && pass "month marked paid" || fail settle "-"
[ "$(call finance GET "/api/admin/companies/$C?month=$MONTH" | jqv "['totals']['due']")" = 0 ] && pass "nothing due after payment" || fail "due 0" "-"

echo "deactivate / remove"
call finance PATCH /api/admin/companies/$C '{"active":false}' >/dev/null
[ "$(order invoice | jqv "['error']")" = "invoice_not_allowed" ] && pass "inactive company can't be billed" || fail inactive "-"
call finance POST /api/admin/companies/$C "{\"action\":\"remove_member\",\"user_id\":$(call customer GET /api/me | jqv "['user']['id']")}" >/dev/null
[ "$(call customer GET /api/me | jqv "['company']")" = "None" ] && pass "removed staff lose the business account" || fail remove "-"
call admin PATCH /api/admin/settings '{"proof_photos":true,"handover_pin":true}' >/dev/null
rm -rf "$T"; [ $FAIL = 0 ] && echo "ALL BUSINESS CHECKS PASSED" || { echo "SOME BUSINESS CHECKS FAILED"; exit 1; }
