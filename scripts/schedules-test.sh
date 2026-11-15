#!/usr/bin/env bash
# Recurring pickups test. Usage: BASE=http://localhost:3000 scripts/schedules-test.sh   (demo mode; removes what it creates)
set -u
BASE=${BASE:-http://localhost:3000}
T=$(mktemp -d); J='content-type: application/json'; FAIL=0
pass(){ echo "  ✓ $1"; }; fail(){ echo "  ✗ $1 — $2"; FAIL=1; }
jqv(){ python3 -c "import json,sys;d=json.load(sys.stdin);print(eval('d'+sys.argv[1]))" "$1" 2>/dev/null; }
jqe(){ python3 -c "import json,sys;d=json.load(sys.stdin);print(eval(sys.argv[1]))" "$1" 2>/dev/null; }
login(){ curl -s -c "$T/$1" -X POST "$BASE/api/auth/demo" -H "$J" -d "{\"role\":\"$1\"}" >/dev/null; }
call(){ local who=$1 m=$2 path=$3 body=${4:-}; if [ -n "$body" ]; then curl -s -b "$T/$who" -X "$m" "$BASE$path" -H "$J" -d "$body"; else curl -s -b "$T/$who" -X "$m" "$BASE$path"; fi; }
login customer; login admin
curl -s -X POST "$BASE/api/auth/otp" -H "$J" -d '{"phone":"+9647708887766"}' >/dev/null
curl -s -c "$T/other" -X POST "$BASE/api/auth/verify" -H "$J" -d '{"phone":"+9647708887766","code":"1234","name":"Other"}' >/dev/null
call admin PATCH /api/admin/settings '{"autopilot":false}' >/dev/null
ADDR=$(call customer GET /api/me | jqv "['addresses'][0]['id']")
PROD=$(curl -s "$BASE/api/partners/1" | jqv "['products'][0]['id']")
BASKET="\"partner_id\":1,\"address_id\":$ADDR,\"items\":[{\"product_id\":$PROD,\"qty\":10}]"

echo "validation"
[ "$(call customer POST /api/schedules "{$BASKET,\"days\":[],\"time\":\"10:00\"}" | jqv "['error']")" = "schedule_days_required" ] && pass "needs at least one day" || fail days "-"
[ "$(call customer POST /api/schedules "{$BASKET,\"days\":[1],\"time\":\"03:00\"}" | jqv "['error']")" = "schedule_time_invalid" ] && pass "rejects a time outside 7am–10pm" || fail time "-"

echo "next pickup in Baghdad time"
R=$(call customer POST /api/schedules "{$BASKET,\"days\":[4],\"time\":\"17:00\"}")
S1=$(echo "$R" | jqv "['id']"); NEXT=$(echo "$R" | jqv "['next_run_at']")
LOCAL=$(python3 -c "from datetime import datetime;from zoneinfo import ZoneInfo;d=datetime.fromisoformat('$NEXT'.replace('Z','+00:00')).astimezone(ZoneInfo('Asia/Baghdad'));print(d.strftime('%a %H:%M'), d>datetime.now(ZoneInfo('Asia/Baghdad')))")
[ "$LOCAL" = "Thu 17:00 True" ] && pass "every Thursday 5pm → next is a future Thursday 17:00 Baghdad" || fail "next run" "$LOCAL ($NEXT)"

echo "privacy"
[ "$(curl -s -o /dev/null -w '%{http_code}' -b "$T/other" -X PATCH "$BASE/api/schedules/$S1" -H "$J" -d '{"active":false}')" = 404 ] && pass "another customer can't change it" || fail "other user" "-"
[ "$(call other GET /api/schedules | jqv "['schedules'].__len__()")" = 0 ] && pass "another customer can't see it" || fail "other list" "-"

echo "pause and resume"
[ "$(call customer PATCH /api/schedules/$S1 '{"active":false}' | jqv "['next_run_at']")" = "None" ] && pass "paused: no next pickup" || fail pause "-"
[ "$(call customer PATCH /api/schedules/$S1 '{"active":true}' | jqv "['next_run_at'] is not None")" = "True" ] && pass "resumed: next pickup planned" || fail resume "-"

echo "automatic order"
SOON=$(python3 -c "from datetime import datetime,timedelta;from zoneinfo import ZoneInfo;d=datetime.now(ZoneInfo('Asia/Baghdad'))+timedelta(hours=2);print(d.strftime('%w'), d.strftime('%H:00'))")
DOW=${SOON% *}; HR=${SOON#* }
if [ "$HR" \> "06:59" ] && [ "$HR" \< "22:01" ]; then
  S2=$(call customer POST /api/schedules "{$BASKET,\"days\":[$DOW],\"time\":\"$HR\"}" | jqv "['id']")
  for _ in 1 2 3 4 5 6 7 8 9 10; do OID=$(call customer GET /api/schedules | jqe "[s for s in d['schedules'] if s['id']==$S2][0]['last_order_id']"); [ "$OID" != "None" ] && [ -n "$OID" ] && break; sleep 1; done
  [ "$OID" != "None" ] && [ -n "$OID" ] && pass "pickup within 3 hours → order created automatically (#$OID)" || fail "auto order" "$(call customer GET /api/schedules | jqe "[s for s in d['schedules'] if s['id']==$S2][0]['last_error']")"
  [ "$(call customer GET /api/orders/$OID | jqv "['order']['schedule_id']")" = "$S2" ] && pass "order is linked to its schedule" || fail "linked" "-"
  [ "$(call customer GET /api/schedules | jqe "[s for s in d['schedules'] if s['id']==$S2][0]['next_run_at'] > [s for s in d['schedules'] if s['id']==$S2][0]['last_run_at']")" = "True" ] && pass "next occurrence moved a week ahead" || fail "advance" "-"
  call admin POST /api/admin/orders/$OID '{"action":"cancel"}' >/dev/null
  call customer DELETE /api/schedules/$S2 >/dev/null
else
  echo "  • automatic order check skipped (outside service hours in Baghdad)"
fi

echo "clean up"
[ "$(call customer DELETE /api/schedules/$S1 | jqv "['ok']")" = "True" ] && pass "schedule deleted" || fail delete "-"
rm -rf "$T"; [ $FAIL = 0 ] && echo "ALL SCHEDULE CHECKS PASSED" || { echo "SOME SCHEDULE CHECKS FAILED"; exit 1; }
