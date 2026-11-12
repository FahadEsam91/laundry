import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { I18nManager, Platform, DevSettings } from "react-native";
import * as Updates from "expo-updates";
import { getLocales } from "expo-localization";
import { translate, pickLang, type Lang, type TKey } from "@shared/i18n";
import { STATUS_META } from "@shared/constants";
import { prefs } from "./storage";

type Ctx = {
  lang: Lang;
  rtl: boolean;
  t: (k: TKey, v?: Record<string, string | number>) => string;
  L: (o: any, f: string) => string;
  setLang: (l: Lang) => Promise<void>;
  money: (n: number) => string;
  num: (n: number, d?: number) => string;
  fmtDate: (iso: string, o?: Intl.DateTimeFormatOptions) => string;
  statusLabel: (s: string) => string;
  settings: any;
  setSettings: (s: any) => void;
};
const I18n = createContext<Ctx | null>(null);
export const useI18n = () => useContext(I18n)!;

/** Arabic is RTL: React Native needs a reload after flipping layout direction. */
async function applyDirection(lang: Lang) {
  const rtl = lang === "ar";
  if (Platform.OS === "web") {
    if (typeof document !== "undefined") {
      document.documentElement.dir = rtl ? "rtl" : "ltr";
      document.documentElement.lang = lang;
    }
    return false;
  }
  if (I18nManager.isRTL === rtl) return false;
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
  return true;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const device: Lang = getLocales()[0]?.languageCode === "en" ? "en" : "ar";
  const [lang, setLangState] = useState<Lang>(Platform.OS === "web" ? device : I18nManager.isRTL ? "ar" : device);
  const [settings, setSettings] = useState<any>({ currency_ar: "د.ع", currency_en: "IQD", timezone: "Asia/Baghdad" });

  useEffect(() => {
    prefs.get<Lang | null>("lang", null).then(async (saved) => {
      const l = saved || device;
      setLangState(l);
      if (await applyDirection(l)) await reload();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<Ctx>(() => {
    const nf = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
    const locale = lang === "ar" ? "ar-IQ-u-nu-latn" : "en-GB";
    return {
      lang,
      rtl: lang === "ar",
      t: (k, v) => translate(lang, k, v),
      L: (o, f) => pickLang(lang, o, f),
      setLang: async (l) => {
        await prefs.set("lang", l);
        setLangState(l);
        if (await applyDirection(l)) await reload();
      },
      money: (n) => `${nf.format(Math.round(n || 0))} ${lang === "ar" ? settings.currency_ar : settings.currency_en}`,
      num: (n, d = 0) => new Intl.NumberFormat("en-US", { maximumFractionDigits: d, minimumFractionDigits: d }).format(n || 0),
      fmtDate: (iso, o) => {
        try {
          return new Intl.DateTimeFormat(locale, o || { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: settings.timezone }).format(new Date(iso));
        } catch {
          return new Date(iso).toLocaleString();
        }
      },
      statusLabel: (s) => (STATUS_META as any)[s]?.[lang] ?? s,
      settings,
      setSettings,
    };
  }, [lang, settings]);

  return <I18n.Provider value={value}>{children}</I18n.Provider>;
}

async function reload() {
  try {
    await Updates.reloadAsync();
  } catch {
    DevSettings.reload();
  }
}

const ERR: Record<string, [string, string]> = {
  network_error: ["تعذر الاتصال بالخادم. تحقق من الإنترنت", "Can't reach the server. Check your connection"],
  invalid_code: ["رمز التحقق غير صحيح", "Incorrect verification code"],
  code_expired: ["انتهت صلاحية الرمز، اطلب رمزاً جديداً", "Code expired, request a new one"],
  too_many_requests: ["طلبات كثيرة، حاول بعد قليل", "Too many requests, try again shortly"],
  too_many_attempts: ["محاولات كثيرة، اطلب رمزاً جديداً", "Too many attempts, request a new code"],
  invalid_phone: ["رقم الهاتف غير صحيح", "Invalid phone number"],
  wallet_insufficient: ["رصيد المحفظة غير كافٍ", "Insufficient wallet balance"],
  memberships_disabled: ["اشتراكات نقاء بلس غير متاحة حالياً", "Nuqa Plus is not available right now"],
  online_payments_disabled: ["الدفع الإلكتروني غير متاح حالياً", "Online payment isn't available yet"],
  promo_invalid: ["كود الخصم غير صالح", "Invalid promo code"],
  promo_expired: ["انتهت صلاحية الكود", "This code has expired"],
  promo_first_only: ["هذا الكود للطلب الأول فقط", "First orders only"],
  promo_min: ["الحد الأدنى لاستخدام الكود {x}", "Minimum spend is {x}"],
  min_order: ["الحد الأدنى للطلب {x}", "Minimum order is {x}"],
  address_required: ["يرجى إضافة عنوان", "Please add an address"],
  active_orders_exist: ["لديك طلبات قيد التنفيذ", "You have orders in progress"],
  already_taken: ["أخذ مندوب آخر هذه المهمة", "Another rider took this job"],
  cannot_cancel: ["لا يمكن إلغاء الطلب بعد استلامه", "Can't cancel after pickup"],
  sms_not_configured: ["خدمة الرسائل غير مفعلة", "SMS service is not configured"],
};
export function errText(e: any, lang: Lang, money?: (n: number) => string) {
  const [code, arg] = String(e?.code || e?.message || "").split(":");
  const m = ERR[code];
  if (!m) return lang === "ar" ? "حدث خطأ، حاول مرة أخرى" : "Something went wrong, please try again";
  const s = m[lang === "ar" ? 0 : 1];
  return arg ? s.replace("{x}", money ? money(Number(arg)) : arg) : s;
}
