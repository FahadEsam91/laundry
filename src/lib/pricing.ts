// Pure pricing logic shared by checkout UI and the order API (server is the source of truth).

export type Promo = {
  code: string;
  kind: "percent" | "fixed" | "delivery";
  value: number;
  min_order: number;
  max_discount: number | null;
  title_ar?: string;
  title_en?: string;
};

export type PricingSettings = {
  service_fee: number;
  express_pct: number;
  vat_pct: number;
  free_delivery_over: number;
};

/** Membership benefits resolved for the current billing period (see lib/subscriptions.ts). */
export type Benefits = {
  free_delivery: boolean; // includes "free deliveries left this period"
  discount_pct: number;
  no_service_fee: boolean;
  express_discount_pct: number;
};

export type Totals = {
  subtotal: number;
  deliveryFee: number;
  expressFee: number;
  serviceFee: number;
  discount: number; // promo code
  memberDiscount: number; // subscription % off
  vat: number;
  total: number;
  freeDeliveryGap: number;
  subSavings: number; // everything the membership saved on this order
  subFreeDelivery: boolean; // a membership free delivery was consumed
};

const r250 = (n: number) => Math.round(n / 250) * 250;

export function computeTotals(
  subtotal: number,
  partnerDeliveryFee: number,
  express: boolean,
  s: PricingSettings,
  promo?: Promo | null,
  benefits?: Benefits | null,
): Totals {
  const thresholdFree = s.free_delivery_over > 0 && subtotal >= s.free_delivery_over;
  let deliveryFee = thresholdFree ? 0 : partnerDeliveryFee;
  let expressFee = express ? r250((subtotal * s.express_pct) / 100) : 0;
  let serviceFee = subtotal > 0 ? s.service_fee : 0;
  let subSavings = 0;
  let subFreeDelivery = false;

  if (benefits && subtotal > 0) {
    if (benefits.free_delivery && deliveryFee > 0) {
      subSavings += deliveryFee;
      deliveryFee = 0;
      subFreeDelivery = true;
    }
    if (benefits.no_service_fee && serviceFee > 0) {
      subSavings += serviceFee;
      serviceFee = 0;
    }
    if (benefits.express_discount_pct > 0 && expressFee > 0) {
      const cut = r250((expressFee * benefits.express_discount_pct) / 100);
      subSavings += cut;
      expressFee -= cut;
    }
  }
  const memberDiscount = benefits?.discount_pct ? r250((subtotal * benefits.discount_pct) / 100) : 0;
  subSavings += memberDiscount;

  let discount = 0;
  if (promo && subtotal >= promo.min_order) {
    if (promo.kind === "percent") discount = r250(((subtotal - memberDiscount) * promo.value) / 100);
    else if (promo.kind === "fixed") discount = promo.value;
    else if (promo.kind === "delivery") discount = deliveryFee;
    if (promo.max_discount) discount = Math.min(discount, promo.max_discount);
    discount = Math.max(0, Math.min(discount, subtotal - memberDiscount + deliveryFee));
  }
  const taxable = subtotal + deliveryFee + expressFee + serviceFee - discount - memberDiscount;
  const vat = s.vat_pct > 0 ? Math.round((taxable * s.vat_pct) / 100) : 0;
  return {
    subtotal,
    deliveryFee,
    expressFee,
    serviceFee,
    discount,
    memberDiscount,
    vat,
    total: Math.max(0, taxable + vat),
    freeDeliveryGap: thresholdFree || s.free_delivery_over <= 0 || deliveryFee === 0 ? 0 : s.free_delivery_over - subtotal,
    subSavings,
    subFreeDelivery,
  };
}
