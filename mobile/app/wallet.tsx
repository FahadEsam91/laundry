import { useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import useSWR from "swr";
import { api } from "@/api";
import { useAuth } from "@/auth";
import { useI18n } from "@/i18n";
import { useToast } from "@/toast";
import { C } from "@/theme";
import { Btn, Header, Icon, Sheet, Txt } from "@/ui";

const KIND: Record<string, [string, string]> = { topup: ["شحن رصيد", "Top-up"], payment: ["دفع طلب", "Order payment"], refund: ["استرداد", "Refund"], credit: ["رصيد من الدعم", "Support credit"], subscription: ["اشتراك", "Membership"] };

export default function Wallet() {
  const { t, money, fmtDate, lang, settings } = useI18n();
  const { refreshMe } = useAuth();
  const toast = useToast();
  const { data, mutate } = useSWR("/api/wallet");
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(25000);
  const [busy, setBusy] = useState(false);
  return (
    <View style={{ flex: 1, backgroundColor: C.white }}>
      <Header title={t("wallet")} />
      <FlatList
        data={data?.transactions || []}
        keyExtractor={(x: any) => String(x.id)}
        ListHeaderComponent={
          <View style={{ padding: 16 }}>
            <LinearGradient colors={[C.brandDark, C.brand, "#38BDF8"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 28, padding: 22 }}>
              <Txt color="rgba(255,255,255,.8)">{t("balance")}</Txt>
              <Txt w="bold" size={34} color="#fff">{money(data?.balance || 0)}</Txt>
              <Txt color="rgba(255,255,255,.7)">{data?.points || 0} {t("points")}</Txt>
              {settings.online_payments ? <Btn title={t("top_up")} variant="outline" icon="add" style={{ marginTop: 16, alignSelf: "flex-start" }} onPress={() => setOpen(true)} /> : null}
            </LinearGradient>
            <Txt w="bold" size={16} style={{ marginTop: 20 }}>{t("transactions")}</Txt>
          </View>
        }
        renderItem={({ item: x }) => (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 10 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: x.amount > 0 ? C.greenSoft : C.redSoft, alignItems: "center", justifyContent: "center" }}>
              <Icon name={x.amount > 0 ? "arrow-down" : "arrow-up"} size={18} color={x.amount > 0 ? C.green : C.red} />
            </View>
            <View style={{ flex: 1 }}><Txt w="semibold">{KIND[x.kind]?.[lang === "ar" ? 0 : 1] || x.kind}</Txt><Txt size={12} color={C.ink400}>{x.note} • {fmtDate(x.created_at)}</Txt></View>
            <Txt w="bold" color={x.amount > 0 ? C.green : C.ink900}>{x.amount > 0 ? "+" : ""}{money(x.amount)}</Txt>
          </View>
        )}
      />
      <Sheet open={open} onClose={() => setOpen(false)} title={t("top_up")}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {[10000, 25000, 50000, 100000].map((a) => (
            <Pressable key={a} onPress={() => setAmount(a)} style={{ width: "48%", height: 52, borderRadius: 14, borderWidth: 2, borderColor: amount === a ? C.brand : C.ink100, alignItems: "center", justifyContent: "center", backgroundColor: amount === a ? C.brandSoft : C.white }}>
              <Txt w="bold">{money(a)}</Txt>
            </Pressable>
          ))}
        </View>
        <Txt size={11} color={C.ink400} style={{ marginTop: 10 }}>{t("card_note")}</Txt>
        <Btn title={`${t("top_up")} • ${money(amount)}`} size="lg" style={{ marginTop: 14 }} loading={busy} onPress={async () => { setBusy(true); await api("/api/wallet", { body: { amount } }); setBusy(false); setOpen(false); mutate(); refreshMe(); toast(t("saved")); }} />
      </Sheet>
    </View>
  );
}
