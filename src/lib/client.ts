"use client";

export class ApiError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}

export async function api<T = any>(path: string, opts: { method?: string; body?: any } = {}): Promise<T> {
  const res = await fetch(path, {
    method: opts.method || (opts.body ? "POST" : "GET"),
    headers: opts.body ? { "Content-Type": "application/json" } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || "error");
  return data as T;
}

export const fetcher = (url: string) => api(url);

const ERR: Record<string, [string, string]> = {
  promo_invalid: ["كود الخصم غير صالح", "Invalid promo code"],
  promo_expired: ["انتهت صلاحية الكود", "This code has expired"],
  promo_exhausted: ["تم استنفاد الكود", "This code is fully used"],
  promo_first_only: ["هذا الكود للطلب الأول فقط", "This code is for first orders only"],
  promo_min: ["الحد الأدنى لاستخدام الكود {x}", "Minimum spend for this code is {x}"],
  min_order: ["الحد الأدنى للطلب {x}", "Minimum order is {x}"],
  wallet_insufficient: ["رصيد المحفظة غير كافٍ", "Insufficient wallet balance"],
  address_required: ["يرجى اختيار عنوان", "Please choose an address"],
  invalid_code: ["رمز التحقق غير صحيح", "Incorrect verification code"],
  invalid_phone: ["رقم الهاتف غير صحيح", "Invalid phone number"],
  no_driver_available: ["لا يوجد مندوب متاح حالياً", "No rider available right now"],
  cannot_cancel: ["لا يمكن إلغاء الطلب بعد استلامه", "Order can't be cancelled after pickup"],
  already_taken: ["تم أخذ المهمة من مندوب آخر", "Another rider already took this job"],
  phone_exists: ["رقم الهاتف مسجل مسبقاً", "Phone number already registered"],
  code_exists: ["الكود موجود مسبقاً", "Code already exists"],
  unauthorized: ["يرجى تسجيل الدخول", "Please sign in"],
  account_suspended: ["الحساب موقوف", "Account suspended"],
};

export function errText(e: any, lang: "ar" | "en", money?: (n: number) => string) {
  const raw = String(e?.code || e?.message || "error");
  const [code, arg] = raw.split(":");
  const m = ERR[code];
  if (!m) return lang === "ar" ? "حدث خطأ، حاول مرة أخرى" : "Something went wrong, please try again";
  const s = m[lang === "ar" ? 0 : 1];
  return arg ? s.replace("{x}", money ? money(Number(arg)) : arg) : s;
}

export function timeAgo(iso: string, lang: "ar" | "en") {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(lang === "ar" ? "ar-u-nu-latn" : "en", { numeric: "auto" });
  if (s < 60) return rtf.format(-Math.round(s), "second");
  if (s < 3600) return rtf.format(-Math.round(s / 60), "minute");
  if (s < 86400) return rtf.format(-Math.round(s / 3600), "hour");
  return rtf.format(-Math.round(s / 86400), "day");
}
