import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import { api } from "@/api";
import { useAuth } from "@/auth";
import { useI18n, errText } from "@/i18n";
import { useToast } from "@/toast";
import { API_URL, IS_RIDER } from "@/config";
import { C, F } from "@/theme";
import { Btn, Icon, Input, Txt } from "@/ui";

export default function Login() {
  const { t, lang, setLang, settings } = useI18n();
  const { signIn, refreshMe } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [step, setStep] = useState<"phone" | "otp" | "name">("phone");
  const [phone, setPhone] = useState("");
  const [norm, setNorm] = useState("");
  const [len, setLen] = useState(4);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [resend, setResend] = useState(0);
  const codeRef = useRef<any>(null);

  useEffect(() => {
    if (resend <= 0) return;
    const id = setTimeout(() => setResend((x) => x - 1), 1000);
    return () => clearTimeout(id);
  }, [resend]);

  const done = async (tok: string, role: string) => {
    if (IS_RIDER && role !== "driver") return toast(lang === "ar" ? "هذا التطبيق مخصص للمندوبين" : "This app is for riders only", "error");
    await signIn(tok);
    refreshMe();
    router.replace((next as any) || (IS_RIDER ? "/rider" : "/home"));
  };
  const send = async () => {
    setBusy("send");
    try {
      const r = await api("/api/auth/otp", { body: { phone, lang } });
      setNorm(r.phone);
      setLen(r.length || 4);
      setCode("");
      setResend(45);
      setStep("otp");
      setTimeout(() => codeRef.current?.focus(), 200);
    } catch (e) {
      toast(errText(e, lang), "error");
    } finally {
      setBusy(null);
    }
  };
  const verify = async (c = code, n?: string) => {
    setBusy("verify");
    try {
      const r = await api("/api/auth/verify", { body: { phone: norm, code: c, name: n, client: "mobile" } });
      if (r.needName) setStep("name");
      else await done(r.token, r.role);
    } catch (e) {
      toast(errText(e, lang), "error");
      setCode("");
    } finally {
      setBusy(null);
    }
  };
  const demo = async (role: string) => {
    setBusy(role);
    try {
      const r = await api("/api/auth/demo", { body: { role, client: "mobile" } });
      await done(r.token, r.role);
    } catch (e) {
      toast(errText(e, lang), "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.white }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <LinearGradient colors={[C.brand, C.brandDark]} style={{ paddingTop: 70, paddingBottom: 40, paddingHorizontal: 24 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          {step !== "phone" ? (
            <Pressable onPress={() => setStep("phone")} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,.2)", alignItems: "center", justifyContent: "center" }}>
              <Icon name={lang === "ar" ? "chevron-forward" : "chevron-back"} size={22} color="#fff" />
            </Pressable>
          ) : !IS_RIDER ? (
            <Pressable onPress={() => router.replace("/home")}><Txt w="semibold" color="#fff">{lang === "ar" ? "تصفح أولاً" : "Browse first"}</Txt></Pressable>
          ) : <View />}
          <Pressable onPress={() => setLang(lang === "ar" ? "en" : "ar")} style={{ flexDirection: "row", gap: 6, alignItems: "center", backgroundColor: "rgba(255,255,255,.2)", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Icon name="language" size={16} color="#fff" />
            <Txt w="bold" size={12} color="#fff">{t("switch_lang")}</Txt>
          </Pressable>
        </View>
        <View style={{ marginTop: 28, flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
            <Icon name={IS_RIDER ? "bicycle" : "water"} size={30} color={C.brand} />
          </View>
          <View>
            <Txt w="bold" size={26} color="#fff">{IS_RIDER ? (lang === "ar" ? "نقاء للمندوبين" : "Nuqa Rider") : t("app_name")}</Txt>
            <Txt color="rgba(255,255,255,.8)">{IS_RIDER ? t("driver_panel") : t("tagline")}</Txt>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
        {step === "phone" && (
          <>
            <Txt w="bold" size={24}>{t("login_title")}</Txt>
            <Txt color={C.ink500} style={{ marginTop: 4 }}>{t("login_sub")}</Txt>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 24, direction: "ltr" } as any}>
              <View style={{ height: 56, borderRadius: 14, borderWidth: 1, borderColor: C.ink200, backgroundColor: C.ink50, paddingHorizontal: 12, justifyContent: "center" }}>
                <Txt w="bold">🇮🇶 +964</Txt>
              </View>
              <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="770 123 4567" placeholderTextColor={C.ink400} textContentType="telephoneNumber" autoComplete="tel"
                style={{ flex: 1, minWidth: 0, height: 56, borderRadius: 14, borderWidth: 1, borderColor: C.ink200, paddingHorizontal: 14, fontFamily: F.semibold, fontSize: 18, color: C.ink900, textAlign: "left" }} />
            </View>
            <Btn title={t("send_code")} icon="chatbubble-ellipses-outline" size="lg" style={{ marginTop: 16 }} loading={busy === "send"} disabled={phone.replace(/\D/g, "").length < 9} onPress={send} />
            <Txt size={12} color={C.ink400} center style={{ marginTop: 12 }}>{t("terms_note")}</Txt>
            <View style={{ flexDirection: "row", justifyContent: "center", gap: 16, marginTop: 6 }}>
              <Pressable onPress={() => WebBrowser.openBrowserAsync(`${API_URL || ""}/terms`)}><Txt size={12} w="semibold" color={C.brand}>{t("terms")}</Txt></Pressable>
              <Pressable onPress={() => WebBrowser.openBrowserAsync(`${API_URL || ""}/privacy`)}><Txt size={12} w="semibold" color={C.brand}>{t("privacy")}</Txt></Pressable>
            </View>
            {settings.demo && (
              <View style={{ marginTop: 32 }}>
                <Txt w="bold" size={12} color={C.ink400} center style={{ marginBottom: 10 }}>{t("demo_accounts")}</Txt>
                <Btn title={IS_RIDER ? t("role_driver") : t("role_customer")} variant="secondary" icon="flash-outline" loading={!!busy && busy !== "send"} onPress={() => demo(IS_RIDER ? "driver" : "customer")} />
              </View>
            )}
          </>
        )}
        {step === "otp" && (
          <>
            <Txt w="bold" size={24}>{t("otp_title")}</Txt>
            <Txt color={C.ink500} style={{ marginTop: 4 }}>{t("otp_sub")} <Txt w="bold">{norm}</Txt></Txt>
            <Pressable onPress={() => codeRef.current?.focus()} style={{ flexDirection: "row", justifyContent: "center", gap: 10, marginTop: 28, direction: "ltr" } as any}>
              {Array.from({ length: len }).map((_, i) => (
                <View key={i} style={{ width: len > 4 ? 46 : 58, height: 60, borderRadius: 16, borderWidth: 2, borderColor: code.length === i ? C.brand : C.ink200, alignItems: "center", justifyContent: "center" }}>
                  <Txt w="bold" size={24}>{code[i] || ""}</Txt>
                </View>
              ))}
            </Pressable>
            <TextInput ref={codeRef} value={code} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="sms-otp" maxLength={len}
              onChangeText={(v) => { const d = v.replace(/\D/g, ""); setCode(d); if (d.length === len) verify(d); }}
              style={{ position: "absolute", opacity: 0, height: 1, width: 1 }} />
            {settings.demo && <View style={{ marginTop: 18, backgroundColor: C.amberSoft, borderRadius: 12, padding: 12 }}><Txt w="semibold" color={C.amber} center>{t("otp_demo")}</Txt></View>}
            <Btn title={t("verify")} size="lg" style={{ marginTop: 16 }} loading={busy === "verify"} disabled={code.length !== len} onPress={() => verify()} />
            <View style={{ alignItems: "center", marginTop: 16 }}>
              {resend > 0 ? <Txt color={C.ink400}>{lang === "ar" ? `إعادة الإرسال بعد ${resend} ثانية` : `Resend in ${resend}s`}</Txt> : <Pressable onPress={send}><Txt w="bold" color={C.brand}>{lang === "ar" ? "إعادة إرسال الرمز" : "Resend code"}</Txt></Pressable>}
            </View>
          </>
        )}
        {step === "name" && (
          <>
            <Txt w="bold" size={24}>{t("your_name")}</Txt>
            <Txt color={C.ink500} style={{ marginTop: 4, marginBottom: 20 }}>{t("name_needed")}</Txt>
            <Input value={name} onChangeText={setName} autoFocus textContentType="name" />
            <Btn title={t("create_account")} size="lg" style={{ marginTop: 16 }} loading={busy === "verify"} disabled={name.trim().length < 2} onPress={() => verify(code, name)} />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
