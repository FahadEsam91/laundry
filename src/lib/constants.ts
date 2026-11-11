// Shared (client + server) domain constants

export const ORDER_FLOW = [
  "pending",
  "accepted",
  "driver_assigned",
  "picked_up",
  "at_laundry",
  "processing",
  "ready",
  "out_for_delivery",
  "delivered",
] as const;

export type OrderStatus = (typeof ORDER_FLOW)[number] | "cancelled";

export const ACTIVE_STATUSES: OrderStatus[] = ORDER_FLOW.filter((s) => s !== "delivered");

export const STATUS_META: Record<OrderStatus, { ar: string; en: string; tone: string; descAr: string; descEn: string }> = {
  pending: { ar: "بانتظار القبول", en: "Awaiting confirmation", tone: "amber", descAr: "أرسلنا طلبك إلى المغسلة", descEn: "We sent your order to the laundry" },
  accepted: { ar: "تم القبول", en: "Confirmed", tone: "blue", descAr: "المغسلة قبلت طلبك ونبحث عن مندوب", descEn: "Laundry confirmed, finding a rider" },
  driver_assigned: { ar: "المندوب في الطريق للاستلام", en: "Rider on the way to pick up", tone: "indigo", descAr: "المندوب متجه إليك لاستلام الملابس", descEn: "Your rider is heading to collect your items" },
  picked_up: { ar: "تم الاستلام", en: "Picked up", tone: "violet", descAr: "تم استلام ملابسك وهي في الطريق للمغسلة", descEn: "Items collected and heading to the laundry" },
  at_laundry: { ar: "وصلت المغسلة", en: "At the laundry", tone: "cyan", descAr: "ملابسك وصلت المغسلة وتم فحصها", descEn: "Items arrived and were checked in" },
  processing: { ar: "قيد الغسيل والكوي", en: "Cleaning in progress", tone: "sky", descAr: "يتم غسل وكوي ملابسك بعناية", descEn: "Your items are being cleaned & pressed" },
  ready: { ar: "جاهز للتوصيل", en: "Ready", tone: "teal", descAr: "ملابسك جاهزة ومغلفة", descEn: "Items are clean, packed and ready" },
  out_for_delivery: { ar: "في الطريق إليك", en: "Out for delivery", tone: "emerald", descAr: "المندوب في طريقه لتسليمك الطلب", descEn: "Your rider is on the way to you" },
  delivered: { ar: "تم التوصيل", en: "Delivered", tone: "green", descAr: "تم تسليم طلبك. نتمنى أن ينال رضاك!", descEn: "Delivered. Enjoy your fresh clothes!" },
  cancelled: { ar: "ملغي", en: "Cancelled", tone: "red", descAr: "تم إلغاء الطلب", descEn: "This order was cancelled" },
};

export const TONE_CLASSES: Record<string, string> = {
  amber: "bg-amber-50 text-amber-700 ring-amber-600/20",
  blue: "bg-blue-50 text-blue-700 ring-blue-600/20",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  violet: "bg-violet-50 text-violet-700 ring-violet-600/20",
  cyan: "bg-cyan-50 text-cyan-700 ring-cyan-600/20",
  sky: "bg-sky-50 text-sky-700 ring-sky-600/20",
  teal: "bg-teal-50 text-teal-700 ring-teal-600/20",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  green: "bg-green-50 text-green-700 ring-green-600/20",
  red: "bg-red-50 text-red-700 ring-red-600/20",
  gray: "bg-ink-100 text-ink-600 ring-ink-500/20",
};

export const STATUS_HEX: Record<OrderStatus, string> = {
  pending: "#F59E0B",
  accepted: "#3B82F6",
  driver_assigned: "#6366F1",
  picked_up: "#8B5CF6",
  at_laundry: "#06B6D4",
  processing: "#0EA5E9",
  ready: "#14B8A6",
  out_for_delivery: "#10B981",
  delivered: "#22C55E",
  cancelled: "#EF4444",
};

/** cash & card_pos are collected by the rider at delivery; card = online gateway (enable in settings once connected). */
export const PAYMENT_METHODS = ["cash", "card_pos", "card", "wallet"] as const;
export const PAY_ON_DELIVERY = ["cash", "card_pos"];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const UNIT_LABEL: Record<string, { ar: string; en: string }> = {
  piece: { ar: "قطعة", en: "item" },
  kg: { ar: "كغم", en: "kg" },
  m2: { ar: "م²", en: "m²" },
  m: { ar: "متر", en: "m" },
  bag: { ar: "كيس", en: "bag" },
};

/** Who may move an order from one status to the next */
export const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: "accepted",
  accepted: "driver_assigned",
  driver_assigned: "picked_up",
  picked_up: "at_laundry",
  at_laundry: "processing",
  processing: "ready",
  ready: "out_for_delivery",
  out_for_delivery: "delivered",
};

export const PARTNER_STEPS: OrderStatus[] = ["pending", "at_laundry", "processing"]; // partner moves these forward
export const DRIVER_STEPS: OrderStatus[] = ["accepted", "driver_assigned", "picked_up", "ready", "out_for_delivery"];

export const CANCELLABLE: OrderStatus[] = ["pending", "accepted"];
