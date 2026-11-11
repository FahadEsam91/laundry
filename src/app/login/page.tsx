"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Phone, ShieldCheck, UserRound, LayoutDashboard, Store, Truck, ShoppingBag, Languages, ArrowLeft, ArrowRight } from "lucide-react";
import { useApp, useToast } from "@/components/providers";
import { Button, Input, LogoMark, cx } from "@/components/ui";
import { api, errText } from "@/lib/client";

const HOME: Record<string, string> = { admin: "/admin", partner: "/partner", driver: "/driver", customer: "/" };

function LoginInner() {
  const { t, lang, setLang, refreshMe, dir } = useApp();
  const toast = useToast();
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [step, setStep] = useState<"phone" | "otp" | "name">("phone");
  const [phone, setPhone] = useState("");
  const [norm, setNorm] = useState("");
  const [len, setLen] = useState(4);
  const [code, setCode] = useState<string[]>(Array(4).fill(""));
  const [resendIn, setResendIn] = useState(0);
  const { settings } = useApp();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const Back = dir === "rtl" ? ArrowRight : ArrowLeft;

  const go = (role: string) => {
    refreshMe();
    const target = next && (role === "customer" ? !/^\/(admin|partner|driver)/.test(next) : next.startsWith(HOME[role])) ? next : HOME[role] || "/";
    router.replace(target);
    router.refresh();
  };

  const sendOtp = async () => {
    setBusy("otp");
    try {
      const r = await api("/api/auth/otp", { body: { phone, lang } });
      setNorm(r.phone);
      setLen(r.length || 4);
      setCode(Array(r.length || 4).fill(""));
      setResendIn(45);
      setStep("otp");
      setTimeout(() => boxes.current[0]?.focus(), 50);
    } catch (e) {
      toast(errText(e, lang), "error");
    } finally {
      setBusy(null);
    }
  };
  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((x) => x - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  const verify = async (c = code.join(""), n?: string) => {
    setBusy("verify");
    try {
      const r = await api("/api/auth/verify", { body: { phone: norm, code: c, name: n } });
      if (r.needName) setStep("name");
      else go(r.role);
    } catch (e) {
      toast(errText(e, lang), "error");
      setCode(Array(len).fill(""));
      boxes.current[0]?.focus();
    } finally {
      setBusy(null);
    }
  };
  const demo = async (role: string) => {
    setBusy(role);
    try {
      const r = await api("/api/auth/demo", { body: { role } });
      go(r.role);
    } catch (e) {
      toast(errText(e, lang), "error");
      setBusy(null);
    }
  };
  const setDigit = (i: number, v: string) => {
    const d = v.replace(/\D/g, "").slice(-1);
    const nc = [...code];
    nc[i] = d;
    setCode(nc);
    if (d && i < len - 1) boxes.current[i + 1]?.focus();
    if (nc.every(Boolean)) verify(nc.join(""));
  };

  return (
    <div className="flex min-h-screen bg-white">
      <div className="relative hidden flex-1 overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-sky-500 lg:block">
        <svg className="absolute inset-0 h-full w-full opacity-20" aria-hidden>
          <defs>
            <pattern id="bub" width="80" height="80" patternUnits="userSpaceOnUse">
              <circle cx="20" cy="20" r="10" fill="none" stroke="white" strokeWidth="2" />
              <circle cx="60" cy="55" r="5" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#bub)" />
        </svg>
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3"><LogoMark className="h-10 w-10" /><span className="text-2xl font-extrabold">{t("app_name")}</span></div>
          <div>
            <h2 className="max-w-lg text-5xl font-extrabold leading-tight">{lang === "ar" ? "منصة الغسيل الذكية الأولى" : "The smart laundry platform"}</h2>
            <p className="mt-4 max-w-md text-lg text-white/80">{t("tagline")}</p>
          </div>
          <div className="flex gap-6 text-sm text-white/70">
            <span>✓ {lang === "ar" ? "استلام خلال 45 دقيقة" : "45-min pickup"}</span>
            <span>✓ {lang === "ar" ? "تتبع مباشر" : "Live tracking"}</span>
            <span>✓ {lang === "ar" ? "ضمان الجودة" : "Quality guarantee"}</span>
          </div>
        </div>
      </div>

      <div className="flex w-full flex-col px-6 py-6 lg:max-w-[520px] lg:px-12">
        <div className="flex items-center justify-between">
          {step !== "phone" ? (
            <button onClick={() => setStep("phone")} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-ink-100" aria-label="back"><Back className="h-5 w-5" /></button>
          ) : (
            <button onClick={() => router.push("/")} className="flex items-center gap-2"><LogoMark className="h-9 w-9" /></button>
          )}
          <button onClick={() => setLang(lang === "ar" ? "en" : "ar")} className="flex items-center gap-1.5 rounded-full border border-ink-200 px-3 py-1.5 text-xs font-bold">
            <Languages className="h-4 w-4" /> {t("switch_lang")}
          </button>
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          {step === "phone" && (
            <div className="animate-fade-up">
              <h1 className="text-3xl font-extrabold">{t("login_title")}</h1>
              <p className="mt-2 text-ink-500">{t("login_sub")}</p>
              <div className="mt-8 flex gap-2" dir="ltr">
                <span className="flex h-14 items-center gap-2 rounded-xl border border-ink-200 bg-ink-50 px-3 text-sm font-bold">🇮🇶 +964</span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && phone && sendOtp()}
                  inputMode="tel"
                  placeholder="770 123 4567"
                  className="h-14 flex-1 rounded-xl border border-ink-200 px-4 text-lg font-semibold tracking-wide outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                />
              </div>
              <Button block size="lg" className="mt-4" loading={busy === "otp"} disabled={phone.replace(/\D/g, "").length < 9} onClick={sendOtp}>
                <Phone className="h-5 w-5" /> {t("send_code")}
              </Button>
              <p className="mt-3 text-center text-xs text-ink-400">{t("terms_note")}</p>

              {settings.demo && <div className="mt-10">
                <div className="mb-3 flex items-center gap-3 text-xs font-bold uppercase text-ink-400">
                  <span className="h-px flex-1 bg-ink-100" /> {t("demo_accounts")} <span className="h-px flex-1 bg-ink-100" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ["customer", t("role_customer"), ShoppingBag, "bg-brand-50 text-brand-700"],
                    ["admin", t("role_admin"), LayoutDashboard, "bg-violet-50 text-violet-700"],
                    ["partner", t("role_partner"), Store, "bg-emerald-50 text-emerald-700"],
                    ["driver", t("role_driver"), Truck, "bg-amber-50 text-amber-700"],
                  ].map(([role, label, I, cls]: any) => (
                    <button key={role} onClick={() => demo(role)} disabled={!!busy} className={cx("flex items-center gap-2 rounded-xl p-3 text-sm font-bold transition hover:brightness-95 disabled:opacity-60", cls)}>
                      <I className="h-5 w-5" /> {busy === role ? "…" : label}
                    </button>
                  ))}
                </div>
                <div className="mb-2 mt-5 text-center text-[11px] font-bold uppercase text-ink-400">{t("staff_roles_demo")}</div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ["operations", lang === "ar" ? "العمليات" : "Operations"],
                    ["support", lang === "ar" ? "خدمة العملاء" : "Support"],
                    ["finance", lang === "ar" ? "المالية" : "Finance"],
                    ["marketing", lang === "ar" ? "التسويق" : "Marketing"],
                  ].map(([role, label]) => (
                    <button key={role} onClick={() => demo(role)} disabled={!!busy} className="rounded-xl border border-ink-200 p-2.5 text-xs font-bold text-ink-700 hover:bg-ink-50 disabled:opacity-60">
                      {busy === role ? "…" : label}
                    </button>
                  ))}
                </div>
              </div>}
              <p className="mt-8 text-center text-xs text-ink-400">
                <a href="/terms" className="underline">{lang === "ar" ? "الشروط والأحكام" : "Terms"}</a> · <a href="/privacy" className="underline">{lang === "ar" ? "سياسة الخصوصية" : "Privacy"}</a>
              </p>
            </div>
          )}

          {step === "otp" && (
            <div className="animate-fade-up">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><ShieldCheck className="h-7 w-7" /></div>
              <h1 className="text-3xl font-extrabold">{t("otp_title")}</h1>
              <p className="mt-2 text-ink-500">{t("otp_sub")} <b dir="ltr" className="text-ink-900">{norm}</b></p>
              <div className="mt-8 flex justify-center gap-3" dir="ltr">
                {code.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => { boxes.current[i] = el; }}
                    value={d}
                    onChange={(e) => setDigit(i, e.target.value)}
                    onKeyDown={(e) => e.key === "Backspace" && !d && i > 0 && boxes.current[i - 1]?.focus()}
                    inputMode="numeric"
                    maxLength={1}
                    autoComplete={i === 0 ? "one-time-code" : "off"}
                    onPaste={(e) => {
                      const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, len);
                      if (digits.length === len) {
                        e.preventDefault();
                        setCode(digits.split(""));
                        verify(digits);
                      }
                    }}
                    className={cx("rounded-2xl border-2 border-ink-200 text-center font-extrabold outline-none focus:border-brand-600", len > 4 ? "h-14 w-11 text-xl" : "h-16 w-14 text-2xl")}
                  />
                ))}
              </div>
              {settings.demo && <div className="mt-5 rounded-xl bg-amber-50 p-3 text-center text-sm font-semibold text-amber-800">{t("otp_demo")}</div>}
              <div className="mt-4 text-center text-sm">
                {resendIn > 0 ? (
                  <span className="text-ink-400">{lang === "ar" ? `إعادة الإرسال بعد ${resendIn} ثانية` : `Resend in ${resendIn}s`}</span>
                ) : (
                  <button onClick={sendOtp} className="font-bold text-brand-600">{lang === "ar" ? "إعادة إرسال الرمز" : "Resend code"}</button>
                )}
              </div>
              <Button block size="lg" className="mt-4" loading={busy === "verify"} disabled={!code.every(Boolean)} onClick={() => verify()}>{t("verify")}</Button>
            </div>
          )}

          {step === "name" && (
            <div className="animate-fade-up">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><UserRound className="h-7 w-7" /></div>
              <h1 className="text-3xl font-extrabold">{t("your_name")}</h1>
              <p className="mt-2 text-ink-500">{t("name_needed")}</p>
              <div className="mt-8">
                <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus className="h-14 text-lg" />
              </div>
              <Button block size="lg" className="mt-4" loading={busy === "verify"} disabled={name.trim().length < 2} onClick={() => verify(code.join(""), name)}>{t("create_account")}</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
