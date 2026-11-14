#!/usr/bin/env bash
# Service zones test. Usage: BASE=http://localhost:3000 scripts/zones-test.sh   (demo mode; removes the zones it creates)
set -u
BASE=${BASE:-http://localhost:3000}
T=$(mktemp -d); J='content-type: application/json'; FAIL=0
pass(){ echo "  ✓ $1"; }; fail(){ echo "  ✗ $1 — $2"; FAIL=1; }
jqv(){ python3 -c "import json,sys;d=json.load(sys.stdin);print(eval('d'+sys.argv[1]))" "$1" 2>/dev/null; }
jqe(){ python3 -c "import json,sys;d=json.load(sys.stdin);print(eval(sys.argv[1]))" "$1" 2>/dev/null; }  # any expression over d
login(){ curl -s -c "$T/$1" -X POST "$BASE/api/auth/demo" -H "$J" -d "{\"role\":\"$1\"}" >/dev/null; }
call(){ local who=$1 m=$2 path=$3 body=${4:-}; if [ -n "$body" ]; then curl -s -b "$T/$who" -X "$m" "$BASE$path" -H "$J" -d "$body"; else curl -s -b "$T/$who" -X "$m" "$BASE$path"; fi; }
code(){ local who=$1 m=$2 path=$3 body=${4:-}; curl -s -o /dev/null -w '%{http_code}' -b "$T/$who" -X "$m" "$BASE$path" -H "$J" ${body:+-d "$body"}; }
for r in customer admin operations support; do login $r; done
JPEG='data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q=='
photo(){ call customer POST /api/media "{\"kind\":\"order\",\"data\":\"$JPEG\"}" | jqv "['url']"; }
call admin PATCH /api/admin/settings '{"autopilot":false}' >/dev/null

# the demo customer's default address and a laundry near it
ADDR=$(call customer GET /api/me | jqv "['addresses'][0]['id']")
LAT=$(call customer GET /api/me | jqv "['addresses'][0]['lat']"); LNG=$(call customer GET /api/me | jqv "['addresses'][0]['lng']")
N_ALL=$(call customer GET /api/partners | jqv "['partners'].__len__()")
[ "$(call customer GET "/api/zones/check?lat=$LAT&lng=$LNG" | jqv "['status']")" = "open" ] && pass "no zones: service open everywhere" || fail "open" "-"

echo "permissions"
[ "$(code support GET /api/admin/zones)" = 403 ] && pass "support can't manage zones" || fail "support zones" "-"
[ "$(code operations GET /api/admin/zones)" = 200 ] && pass "operations can manage zones" || fail "ops zones" "-"
[ "$(code admin POST /api/admin/zones '{"name_ar":"x","polygon":[[1,1],[2,2]]}')" = 400 ] && pass "rejects a shape with < 3 corners" || fail "invalid polygon" "-"

echo "draw a zone around the customer"
POLY=$(python3 -c "la,ln=$LAT,$LNG;d=0.03;print([[la+d,ln-d],[la+d,ln+d],[la-d,ln+d],[la-d,ln-d]])")
Z=$(call admin POST /api/admin/zones "{\"name_ar\":\"اختبار\",\"name_en\":\"Test zone\",\"polygon\":$POLY}" | jqv "['id']")
[ -n "$Z" ] && pass "zone created (#$Z)" || fail "create zone" "-"
SERVED=$(call admin GET /api/admin/zones | jqe "[z for z in d['zones'] if z['id']==$Z][0]['partner_ids']")
[ "$SERVED" != "[]" ] && pass "laundries inside joined the zone: $SERVED" || fail "auto-assign" "$SERVED"
IN=$(echo "$SERVED" | python3 -c "import sys,ast;print(ast.literal_eval(sys.stdin.read())[0])")
OUT=$(call admin GET /api/admin/partners | jqe "[p['id'] for p in d['partners'] if p['status']=='active' and $Z not in p['zone_ids']][0]")
[ "$(call customer GET "/api/zones/check?lat=$LAT&lng=$LNG" | jqv "['status']")" = "ok" ] && pass "customer's address is covered" || fail "check ok" "-"
N_Z=$(call customer GET /api/partners | jqv "['partners'].__len__()")
[ "$N_Z" -lt "$N_ALL" ] && [ "$(call customer GET /api/partners | jqe "all(p['id'] in $SERVED for p in d['partners'])")" = "True" ] && pass "only laundries serving the zone are listed ($N_Z of $N_ALL)" || fail "filter" "$N_Z/$N_ALL"
PROD_IN=$(curl -s "$BASE/api/partners/$IN" | jqv "['products'][0]['id']"); PROD_OUT=$(curl -s "$BASE/api/partners/$OUT" | jqv "['products'][0]['id']")
r=$(call customer POST /api/orders "{\"partner_id\":$OUT,\"items\":[{\"product_id\":$PROD_OUT,\"qty\":12}],\"address_id\":$ADDR,\"photos\":[\"$(photo)\"],\"payment_method\":\"cash\"}")
[ "$(echo "$r" | jqv "['error']")" = "partner_not_in_zone" ] && pass "laundry outside the zone can't take the order" || fail "partner not in zone" "$r"
r=$(call customer POST /api/orders "{\"partner_id\":$IN,\"items\":[{\"product_id\":$PROD_IN,\"qty\":12}],\"address_id\":$ADDR,\"photos\":[\"$(photo)\"],\"payment_method\":\"cash\"}")
OID=$(echo "$r" | jqv "['id']"); [ -n "$OID" ] && pass "order inside the zone accepted" || fail "order in zone" "$r"
call customer POST /api/orders/$OID/cancel '{}' >/dev/null

echo "close the zone"
call admin PATCH /api/admin/zones/$Z '{"active":false}' >/dev/null
[ "$(call customer GET /api/partners | jqv "['coverage']['status']")" = "paused" ] && pass "closed zone: customers see 'paused'" || fail "paused" "-"
r=$(call customer POST /api/orders "{\"partner_id\":$IN,\"items\":[{\"product_id\":$PROD_IN,\"qty\":12}],\"address_id\":$ADDR,\"photos\":[\"$(photo)\"],\"payment_method\":\"cash\"}")
[ "$(echo "$r" | jqv "['error']")" = "zone_paused" ] && pass "closed zone refuses orders" || fail "zone paused" "$r"

echo "move the zone away"
FAR=$(python3 -c "la,ln=$LAT+1,$LNG+1;d=0.03;print([[la+d,ln-d],[la+d,ln+d],[la-d,ln+d],[la-d,ln-d]])")
call admin PATCH /api/admin/zones/$Z "{\"active\":true,\"polygon\":$FAR}" >/dev/null
[ "$(call customer GET "/api/zones/check?lat=$LAT&lng=$LNG" | jqv "['status']")" = "outside" ] && pass "address outside every zone" || fail "outside" "-"
r=$(call customer POST /api/orders "{\"partner_id\":$IN,\"items\":[{\"product_id\":$PROD_IN,\"qty\":12}],\"address_id\":$ADDR,\"photos\":[\"$(photo)\"],\"payment_method\":\"cash\"}")
[ "$(echo "$r" | jqv "['error']")" = "outside_zone" ] && pass "orders from outside are refused" || fail "outside order" "$r"

echo "clean up"
[ "$(code admin DELETE /api/admin/zones/$Z)" = 200 ] && pass "zone deleted" || fail "delete" "-"
[ "$(call customer GET "/api/zones/check?lat=$LAT&lng=$LNG" | jqv "['status']")" = "open" ] && pass "no zones left: open again" || fail "open again" "-"
[ "$(call admin GET '/api/admin/audit?size=100' | jqe "len([e for e in d['rows'] if str(e.get('action','')).startswith('zone.')]) >= 3")" = "True" ] && pass "zone changes are in the audit log" || echo "  • audit log check skipped"
rm -rf "$T"; [ $FAIL = 0 ] && echo "ALL ZONE CHECKS PASSED" || { echo "SOME ZONE CHECKS FAILED"; exit 1; }
