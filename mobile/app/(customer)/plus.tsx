import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useSWR from "swr";
import { api } from "@/api";
import { useAuth } from "@/auth";
import { useI18n, errText } from "@/i18n";
import { useToast } from "@/toast";
import { C, shadow } from "@/theme";
import { Btn, Choice, Icon, Sheet, Txt } from "@/ui";

function benefits(p: any, t: any) {
  const out: string[] = [];
  if (p.free_deliveries === -1) out.push(t("benefit_free_delivery_unlimited"));
  else if (p.free_deliveries > 0) out.push(t("benefit_free_delivery_n", { n: p.free_deliveries }));
  if (p.discount_pct > 0) out.push(t("benefit_discount", { n: p.discount_pct }));
  if (p.no_service_fee) out.push(t("benefit_no_service_fee"));
  if (p.express_discount_pct > 0) out.push(t("benefit_express", { n: p.express_discount_pct }));
  if (p.priority_support) out.push(t("benefit_priority"));
  return out;
}

export default function Plus() {
  const { t, L, money, lang, fmtDate } = useI18n();
  const { token, me, refreshMe } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: pd } = useSWR("/api/plans");
  const { data: sum, mutate } = useSWR(token ? "/api/subscription" : null);
  const plans: any[] = pd?.plans || [];
  const sub = sum?.subscription;
  const cur = sum?.plan;
  const [sel, setSel] = useState<number | null>(null);
  const [pay, setPay] = useState<"card" | "wallet">("card");
  const [busy, setBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  useEffect(() => {
    if (sel === null && plans.length) setSel(cur?.id ?? (plans.find((p) => p.popular) || plans[0]).id);
  }, [plans, cur, sel]);
  const plan = plans.find((p) => p.id === sel);
  const wallet = me?.user?.wallet || 0;

  const subscribe = async () => {
    if (!token) return router.push({ pathname: "/login", params: { next: "/plus" } });
    setBusy(true);
    try {
      await api("/api/subscription", { body: { plan_id: plan.id, payment_method: pay } });
      toast(`🎉 ${L(plan, "name")}`);
      mutate();
      refreshMe();
    } catch (e) {
      toast(errText(e, lang, money), "error");
    } finally {
      setBusy(false);
    }
  };
  const renew = async (on: boolean) => {
    await api("/api/subscription", { method: "PATCH", body: { auto_renew: on } });
    setCancelOpen(false);
    mutate();
    refreshMe();
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.ink50 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <LinearGradient colors={["#0B0E14", "#151A24", "#19398A"]} style={{ paddingTop: insets.top + 24, paddingBottom: 48, alignItems: "center", paddingHorizontal: 24 }}>
          <View style={{ width: 64, height: 64, borderRadius: 22, backgroundColor: C.gold, alignItems: "center", justifyContent: "center" }}><Icon name="diamond" size={32} color="#422006" /></View>
          <Txt w="bold" size={28} color="#fff" style={{ marginTop: 14 }}>{t("plus_title")}</Txt>
          <Txt color="rgba(255,255,255,.7)" center>{t("plus_tagline")}</Txt>
        </LinearGradient>

        {sub && cur && (
          <View style={{ marginTop: -26, marginHorizontal: 16, backgroundColor: C.white, borderRadius: 24, padding: 16, ...shadow, shadowOpacity: 0.12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View><Txt size={12} color={C.ink400}>{t("your_plan")}</Txt><Txt w="bold" size={20}>👑 {L(cur, "name")}</Txt></View>
              <View style={{ backgroundColor: sub.auto_renew ? C.greenSoft : C.amberSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}><Txt w="bold" size={12} color={sub.auto_renew ? C.green : C.amber}>{sub.auto_renew ? t("active") : t("cancelling")}</Txt></View>
            </View>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
              {[
                [money(sum.periodSaved), t("saved_this_period"), C.greenSoft],
                [cur.free_deliveries === -1 ? t("unlimited") : String(Math.max(0, cur.free_deliveries - sub.deliveries_used)), t("free_deliveries_left"), C.brandSoft],
                [fmtDate(sub.current_period_end, { day: "numeric", month: "short" }), sub.auto_renew ? t("renews_on") : t("ends_on"), C.amberSoft],
              ].map(([v, l, bg]) => (
                <View key={l} style={{ flex: 1, backgroundColor: bg, borderRadius: 16, padding: 10, alignItems: "center" }}>
                  <Txt w="bold" size={14} center>{v}</Txt>
                  <Txt size={10} color={C.ink500} center>{l}</Txt>
                </View>
              ))}
            </View>
            <Btn title={sub.auto_renew ? t("cancel_membership") : t("resume_membership")} variant={sub.auto_renew ? "ghost" : "secondary"} size="sm" style={{ marginTop: 10 }} onPress={() => (sub.auto_renew ? setCancelOpen(true) : renew(true))} />
          </View>
        )}

        <View style={{ padding: 16, marginTop: sub ? 0 : -26, gap: 12 }}>
          {plans.map((p) => {
            const on = sel === p.id;
            return (
              <Pressable key={p.id} onPress={() => setSel(p.id)} style={{ backgroundColor: C.white, borderRadius: 24, padding: 18, borderWidth: 2, borderColor: on ? C.brand : "transparent", ...shadow }}>
                {p.popular ? <View style={{ position: "absolute", top: 0, end: 0, backgroundColor: C.gold, borderBottomStartRadius: 14, borderTopEndRadius: 22, paddingHorizontal: 10, paddingVertical: 4 }}><Txt w="bold" size={10} color="#422006">{t("most_popular")}</Txt></View> : null}
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <Icon name={on ? "radio-button-on" : "radio-button-off"} size={24} color={on ? C.brand : C.ink300} />
                  <View style={{ flex: 1 }}>
                    <Txt w="bold" size={18} color={p.color}>{L(p, "name")}{cur?.id === p.id ? `  ✓` : ""}</Txt>
                    <Txt size={13} color={C.ink500}>{L(p, "desc")}</Txt>
                    <Txt style={{ marginTop: 8 }}><Txt w="bold" size={24}>{money(p.price)}</Txt><Txt color={C.ink400}> {t("per_month")}</Txt></Txt>
                    {benefits(p, t).map((b) => (
                      <View key={b} style={{ flexDirection: "row", gap: 8, alignItems: "center", marginTop: 6 }}>
                        <Icon name="checkmark-circle" size={18} color={C.green} />
                        <Txt size={13} color={C.ink700}>{b}</Txt>
                      </View>
                    ))}
                  </View>
                </View>
              </Pressable>
            );
          })}
          {plan && cur?.id !== plan.id && (
            <View style={{ flexDirection: "row", gap: 8 }}>
              {([["card", "card-outline", t("pay_card"), "Visa • Mastercard"], ["wallet", "wallet-outline", t("pay_wallet"), `${t("balance")}: ${money(wallet)}`]] as const).map(([v, ic, l, s]) => (
                <Choice key={v} selected={pay === v} onPress={() => setPay(v)} style={{ flex: 1 }}>
                  <Icon name={ic} size={20} color={C.ink700} />
                  <Txt w="bold" size={13} style={{ marginTop: 6 }}>{l}</Txt>
                  <Txt size={11} color={v === "wallet" && wallet < plan.price ? C.red : C.ink500}>{s}</Txt>
                </Choice>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
      {plan && cur?.id !== plan.id && (
        <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: C.white, padding: 16, borderTopWidth: 1, borderTopColor: C.ink100 }}>
          <Btn title={cur ? t("switch_plan") : t("subscribe_to", { x: L(plan, "name") })} right={money(plan.price)} size="lg" icon="sparkles" loading={busy} onPress={subscribe} />
        </View>
      )}
      <Sheet open={cancelOpen} onClose={() => setCancelOpen(false)} title={t("cancel_membership")}>
        <Txt color={C.ink700}>{t("cancel_membership_note")}</Txt>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 18 }}>
          <Btn title={t("no")} variant="outline" style={{ flex: 1 }} onPress={() => setCancelOpen(false)} />
          <Btn title={t("cancel_membership")} variant="danger" style={{ flex: 1 }} onPress={() => renew(false)} />
        </View>
      </Sheet>
    </View>
  );
}
