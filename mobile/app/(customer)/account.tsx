import { useState } from "react";
import { Linking, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { api } from "@/api";
import { deleteAccount, useAuth } from "@/auth";
import { useCart } from "@/cart";
import { useI18n, errText } from "@/i18n";
import { registerForPush } from "@/push";
import { useToast } from "@/toast";
import { API_URL } from "@/config";
import { C } from "@/theme";
import { Btn, Empty, Row, Sheet, Txt } from "@/ui";

export default function Account() {
  const { t, L, lang, setLang, money, num, fmtDate, settings } = useI18n();
  const { token, me, signOut, refreshMe } = useAuth();
  const cart = useCart();
  const toast = useToast();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [delOpen, setDelOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const u = me?.user;
  const web = (path: string) => WebBrowser.openBrowserAsync(`${API_URL}${path}`);

  const logout = async () => {
    await signOut();
    cart.clear();
    router.replace("/home");
  };
  const remove = async () => {
    setBusy(true);
    try {
      await deleteAccount();
      await signOut();
      cart.clear();
      toast(t("account_deleted"));
      router.replace("/home");
    } catch (e) {
      toast(errText(e, lang), "error");
    } finally {
      setBusy(false);
      setDelOpen(false);
    }
  };
  const enablePush = async () => {
    const r = await registerForPush(lang);
    toast(r === "on" ? t("push_on") : r === "denied" ? t("push_denied") : t("push_unsupported"), r === "on" ? "success" : "info");
    if (r === "denied") Linking.openSettings();
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.ink50 }} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={{ backgroundColor: C.white, paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: 18 }}>
        {u ? (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: C.brand, alignItems: "center", justifyContent: "center" }}><Txt w="bold" size={24} color="#fff">{u.name.slice(0, 1)}</Txt></View>
              <View style={{ flex: 1 }}>
                <Txt w="bold" size={20}>{u.name}</Txt>
                <Txt color={C.ink500}>{u.phone}</Txt>
                <Txt size={12} color={C.ink400}>{t("member_since")} {fmtDate(u.created_at, { month: "long", year: "numeric" })}</Txt>
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
              {[[money(u.wallet), t("wallet"), C.brandSoft, "/wallet"], [num(u.points), t("points"), C.amberSoft, null], [num(me?.stats?.orders || 0), t("orders"), C.greenSoft, "/orders"]].map(([v, l, bg, href]) => (
                <View key={l as string} style={{ flex: 1, backgroundColor: bg as string, borderRadius: 16, padding: 12 }} onTouchEnd={() => href && router.push(href as any)}>
                  <Txt w="bold">{v}</Txt>
                  <Txt size={11} color={C.ink500}>{l}</Txt>
                </View>
              ))}
            </View>
          </>
        ) : (
          <Empty icon="person-outline" title={t("login_title")} sub={t("login_sub")} action={<Btn title={t("verify")} onPress={() => router.push("/login")} />} />
        )}
      </View>

      {u && (
        <View style={{ marginTop: 8 }}>
          <Row icon="diamond-outline" label={t("plus_title")} onPress={() => router.push("/plus")} right={me?.member ? <Txt w="bold" size={12} color={C.amber}>👑 {L(me.member.plan, "name")}</Txt> : null} />
          <Row icon="location-outline" label={t("addresses")} onPress={() => router.push("/addresses")} right={<Txt size={12} color={C.ink400}>{me.addresses.length}</Txt>} />
          <Row icon="wallet-outline" label={t("wallet")} onPress={() => router.push("/wallet")} />
          <Row icon="notifications-outline" label={t("notifications")} onPress={() => router.push("/notifications")} right={me.unread ? <View style={{ backgroundColor: C.red, borderRadius: 999, paddingHorizontal: 7 }}><Txt w="bold" size={11} color="#fff">{me.unread}</Txt></View> : null} />
          <Row icon="phone-portrait-outline" label={t("push_title")} onPress={enablePush} />
        </View>
      )}

      <View style={{ marginTop: 8 }}>
        <Row icon="language-outline" label={t("language")} onPress={() => setLang(lang === "ar" ? "en" : "ar")} right={<Txt w="bold" size={12} color={C.brand}>{lang === "ar" ? "العربية" : "English"}</Txt>} />
        <Row icon="headset-outline" label={t("support")} onPress={() => Linking.openURL(`tel:${settings.support_phone}`)} />
        <Row icon="shield-checkmark-outline" label={t("privacy")} onPress={() => web("/privacy")} />
        <Row icon="document-text-outline" label={t("terms")} onPress={() => web("/terms")} />
      </View>

      {u && (
        <View style={{ padding: 16 }}>
          <Btn title={t("logout")} variant="danger" icon="log-out-outline" onPress={logout} />
          <Btn title={t("delete_account")} variant="ghost" size="sm" icon="trash-outline" style={{ marginTop: 10 }} onPress={() => setDelOpen(true)} />
        </View>
      )}

      <Sheet open={delOpen} onClose={() => setDelOpen(false)} title={t("delete_account")}>
        <Txt color={C.ink700} style={{ lineHeight: 22 }}>{t("delete_account_d")}</Txt>
        {u?.wallet > 0 && <View style={{ backgroundColor: C.amberSoft, borderRadius: 12, padding: 12, marginTop: 12 }}><Txt size={13} color={C.amber}>{t("delete_wallet_warn", { x: money(u.wallet) })}</Txt></View>}
        <Btn title={t("delete_forever")} variant="danger" icon="trash" style={{ marginTop: 18 }} loading={busy} onPress={remove} />
        <Btn title={t("cancel")} variant="outline" style={{ marginTop: 8 }} onPress={() => setDelOpen(false)} />
      </Sheet>
    </ScrollView>
  );
}
