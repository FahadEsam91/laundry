#!/usr/bin/env bash
# Role-based access control test. Usage: BASE=http://localhost:3000 scripts/rbac-test.sh   (demo mode)
set -u
BASE=${BASE:-http://localhost:3000}
T=$(mktemp -d); J='content-type: application/json'; FAIL=0
login(){ curl -s -c "$T/$1" -X POST "$BASE/api/auth/demo" -H "$J" -d "{\"role\":\"$1\"}" >/dev/null; }
otp_login(){ curl -s -X POST "$BASE/api/auth/otp" -H "$J" -d "{\"phone\":\"$2\"}" >/dev/null; curl -s -c "$T/$1" -X POST "$BASE/api/auth/verify" -H "$J" -d "{\"phone\":\"$2\",\"code\":\"1234\"}" >/dev/null; }
code(){ local who=$1 m=$2 path=$3 body=${4:-}; if [ -n "$body" ]; then curl -s -o /dev/null -w '%{http_code}' -b "$T/$who" -X "$m" "$BASE$path" -H "$J" -d "$body"; else curl -s -o /dev/null -w '%{http_code}' -b "$T/$who" -X "$m" "$BASE$path"; fi; }
body(){ local who=$1 m=$2 path=$3 b=${4:-}; if [ -n "$b" ]; then curl -s -b "$T/$who" -X "$m" "$BASE$path" -H "$J" -d "$b"; else curl -s -b "$T/$who" -X "$m" "$BASE$path"; fi; }
expect(){ local desc=$1 want=$2 got=$3; if [ "$want" = "$got" ]; then echo "  ✓ $desc ($got)"; else echo "  ✗ $desc — expected $want, got $got"; FAIL=1; fi; }
jqv(){ python3 -c "import json,sys;d=json.load(sys.stdin);print(eval('d'+sys.argv[1]))" "$1" 2>/dev/null; }
jqe(){ python3 -c "import json,sys;d=json.load(sys.stdin);print(eval(sys.argv[1]))" "$1" 2>/dev/null; }
for r in admin operations support finance marketing customer partner; do login $r; done
OID=$(body admin GET '/api/admin/orders?status=processing' | jqv "['orders'][0]['id']")
CID=$(body admin GET '/api/admin/customers' | jqv "['customers'][0]['id']")

echo "support"
expect "view orders" 200 "$(code support GET /api/admin/orders)"
expect "no dashboard KPIs" 403 "$(code support GET /api/admin/overview)"
expect "credit a wallet" 200 "$(code support POST /api/admin/customers/$CID '{"action":"credit","amount":1000,"note":"test"}')"
expect "cannot suspend customer" 403 "$(code support POST /api/admin/customers/$CID '{"action":"status","status":"suspended"}')"
expect "cannot export orders" 403 "$(code support GET '/api/admin/orders?format=csv')"
expect "cannot edit laundries" 403 "$(code support PATCH /api/admin/partners/1 '{"featured":1}')"
expect "cannot change settings" 403 "$(code support PATCH /api/admin/settings '{"service_fee":500}')"
expect "cannot manage staff" 403 "$(code support GET /api/admin/staff)"
expect "cannot use partner API" 403 "$(code support GET /api/partner/orders)"

echo "finance"
expect "dashboard KPIs" 200 "$(code finance GET /api/admin/overview)"
expect "export orders" 200 "$(code finance GET '/api/admin/orders?format=csv')"
expect "read audit log" 200 "$(code finance GET /api/admin/audit)"
expect "cannot change order status" 403 "$(code finance POST /api/admin/orders/$OID '{"action":"status","to":"ready"}')"
expect "cannot create promos" 403 "$(code finance POST /api/admin/promos '{"code":"FIN10","kind":"percent","value":10}')"

echo "marketing"
expect "create promo" 201 "$(code marketing POST /api/admin/promos '{"code":"MKT10","kind":"percent","value":10}')"
expect "send campaign" 200 "$(code marketing POST /api/admin/broadcast '{"audience":"partners","title_ar":"تجربة","title_en":"Test"}')"
expect "cannot view orders" 403 "$(code marketing GET /api/admin/orders)"
expect "cannot view riders" 403 "$(code marketing GET /api/admin/drivers)"

echo "operations"
expect "advance an order" 200 "$(code operations POST /api/admin/orders/$OID '{"action":"status","to":"ready"}')"
expect "edit laundry" 200 "$(code operations PATCH /api/admin/partners/1 '{"featured":1}')"
expect "cannot change settings" 403 "$(code operations PATCH /api/admin/settings '{"service_fee":500}')"
expect "cannot view memberships" 403 "$(code operations GET /api/admin/subscriptions)"

echo "customer / partner"
expect "customer blocked" 403 "$(code customer GET /api/admin/orders)"
expect "partner blocked" 403 "$(code partner GET /api/admin/overview)"

echo "staff management & escalation"
RID=$(body admin POST /api/admin/roles '{"name_ar":"موارد بشرية","name_en":"HR test","perms":["staff.manage","orders.view"]}' | jqv "['id']")
[ -n "$RID" ] && echo "  ✓ custom role created (#$RID)" || { echo "  ✗ custom role"; FAIL=1; }
SID=$(body admin POST /api/admin/staff "{\"name\":\"HR person\",\"phone\":\"+9647712340001\",\"role_id\":$RID}" | jqv "['id']")
[ -n "$SID" ] && echo "  ✓ staff invited (#$SID)" || { echo "  ✗ invite"; FAIL=1; }
otp_login hr +9647712340001
perms=$(body hr GET /api/me | jqv "['user']['permissions']")
expect "new staff gets role permissions" "['staff.manage', 'orders.view']" "$perms"
SUPER=$(body admin GET /api/admin/roles | jqe "[r['id'] for r in d['roles'] if r['key']=='super_admin'][0]")
FINR=$(body admin GET /api/admin/roles | jqe "[r['id'] for r in d['roles'] if r['key']=='finance'][0]")
[ -n "$SUPER" ] && [ -n "$FINR" ] || { echo "  ✗ could not read role ids"; FAIL=1; }
expect "HR cannot invite a super admin" 403 "$(code hr POST /api/admin/staff "{\"name\":\"X Y\",\"phone\":\"+9647712340002\",\"role_id\":$SUPER}")"
expect "HR cannot grant finance perms it lacks" 403 "$(code hr POST /api/admin/staff "{\"name\":\"X Y\",\"phone\":\"+9647712340003\",\"role_id\":$FINR}")"
expect "HR cannot create role with more perms" 403 "$(code hr POST /api/admin/roles '{"name_ar":"س","name_en":"Esc","perms":["settings.manage"]}')"
ADMIN_ID=$(body admin GET /api/me | jqv "['user']['id']")
expect "HR cannot edit the super admin" 403 "$(code hr PATCH /api/admin/staff/$ADMIN_ID '{"status":"suspended"}')"
expect "HR cannot change own role" 409 "$(code hr PATCH /api/admin/staff/$SID "{\"role_id\":$SUPER}")"
expect "admin cannot suspend self" 409 "$(code admin PATCH /api/admin/staff/$ADMIN_ID '{"status":"suspended"}')"
expect "built-in role locked" 409 "$(code admin PATCH /api/admin/roles/$SUPER '{"perms":["orders.view"]}')"
expect "role in use can't be deleted" 409 "$(code admin DELETE /api/admin/roles/$RID)"
expect "suspend staff" 200 "$(code admin PATCH /api/admin/staff/$SID '{"status":"suspended"}')"
expect "suspended staff loses access" 401 "$(code hr GET /api/admin/orders)"

echo "audit trail"
n=$(body admin GET '/api/admin/audit?action=staff.' | jqv "['total']"); [ "${n:-0}" -ge 2 ] && echo "  ✓ staff actions audited ($n)" || { echo "  ✗ audit staff ($n)"; FAIL=1; }
a=$(body admin GET '/api/admin/audit?action=customer.credit' | jqv "['rows'][0]['user_name']"); [ -n "$a" ] && echo "  ✓ wallet credit audited (by $a)" || { echo "  ✗ audit credit"; FAIL=1; }
expect "support cannot read audit" 403 "$(code support GET /api/admin/audit)"
rm -rf "$T"; [ $FAIL = 0 ] && echo "ALL RBAC CHECKS PASSED" || { echo "SOME RBAC CHECKS FAILED"; exit 1; }
