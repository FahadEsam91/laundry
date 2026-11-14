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
  online_payments_disabled: ["الدفع الإلكتروني غير متاح حالياً", "Online payment isn't available yet"],
  invalid_image: ["الملف ليس صورة صالحة (JPG أو PNG)", "That file isn't a valid image (JPG or PNG)"],
  outside_zone: ["عنوانك خارج مناطق التغطية حالياً", "Your address is outside our service area"],
  zone_paused: ["الخدمة متوقفة مؤقتاً في منطقتك", "Service is paused in your area"],
  partner_not_in_zone: ["هذه المغسلة لا تخدم منطقتك. اختر مغسلة أخرى", "This laundry doesn't serve your area. Please choose another"],
  invalid_zone: ["حدود المنطقة غير صحيحة", "Invalid zone shape"],
  photos_required: ["أضف صورة واحدة على الأقل لقطعك قبل تأكيد الطلب", "Add at least one photo of your items to place the order"],
  too_many_photos: ["عدد الصور أكبر من المسموح", "Too many photos"],
  image_too_large: ["الصورة كبيرة جداً", "The image is too large"],
  memberships_disabled: ["اشتراكات نقاء بلس غير متاحة حالياً", "Nuqa Plus is not available right now"],
  forbidden: ["ليست لديك صلاحية لهذا الإجراء", "You don't have permission for this action"],
  cannot_change_own_access: ["لا يمكنك تغيير دورك أو إيقاف حسابك بنفسك", "You can't change your own role or suspend yourself"],
  last_super_admin: ["لا يمكن إزالة آخر مدير عام", "You can't remove the last super admin"],
  only_super_admin_can_edit_super_admin: ["فقط المدير العام يمكنه تعديل مدير عام", "Only a super admin can edit another super admin"],
  cannot_grant_more_than_you_have: ["لا يمكنك منح صلاحيات لا تملكها", "You can't grant permissions you don't have"],
  system_role_locked: ["الأدوار الأساسية لا يمكن تعديلها", "Built-in roles can't be edited"],
  role_in_use: ["الدور مستخدم من موظفين، انقلهم أولاً", "Role is assigned to staff; move them first"],
  role_exists: ["يوجد دور بنفس الاسم", "A role with this name already exists"],
  permissions_required: ["اختر صلاحية واحدة على الأقل", "Select at least one permission"],
  invalid_input: ["تحقق من الاسم ورقم الهاتف", "Check the name and phone number"],
  too_many_requests: ["طلبات كثيرة، حاول بعد قليل", "Too many requests, please try again shortly"],
  too_many_attempts: ["محاولات كثيرة، اطلب رمزاً جديداً", "Too many attempts, request a new code"],
  code_expired: ["انتهت صلاحية الرمز، اطلب رمزاً جديداً", "Code expired, request a new one"],
  sms_not_configured: ["خدمة الرسائل غير مفعلة بعد", "SMS service is not configured yet"],
  sms_failed: ["تعذر إرسال الرسالة، حاول مرة أخرى", "Couldn't send the SMS, please try again"],
  active_orders_exist: ["لديك طلبات قيد التنفيذ، انتظر اكتمالها أو ألغها أولاً", "You have orders in progress. Wait for them to finish or cancel them first"],
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
