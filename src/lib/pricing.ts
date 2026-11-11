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

export type Totals = {
  subtotal: number;
  deliveryFee: number;
  expressFee: number;
  serviceFee: number;
  discount: number;
  vat: number;
  total: number;
  freeDeliveryGap: number;
};

const r250 = (n: number) => Math.round(n / 250) * 250;

export function computeTotals(
  subtotal: number,
  partnerDeliveryFee: number,
  express: boolean,
  s: PricingSettings,
  promo?: Promo | null,
): Totals {
  const freeDelivery = s.free_delivery_over > 0 && subtotal >= s.free_delivery_over;
  const deliveryFee = freeDelivery ? 0 : partnerDeliveryFee;
  const expressFee = express ? r250((subtotal * s.express_pct) / 100) : 0;
  const serviceFee = subtotal > 0 ? s.service_fee : 0;
  let discount = 0;
  if (promo && subtotal >= promo.min_order) {
    if (promo.kind === "percent") discount = r250((subtotal * promo.value) / 100);
    else if (promo.kind === "fixed") discount = promo.value;
    else if (promo.kind === "delivery") discount = deliveryFee;
    if (promo.max_discount) discount = Math.min(discount, promo.max_discount);
    discount = Math.min(discount, subtotal + deliveryFee);
  }
  const taxable = subtotal + deliveryFee + expressFee + serviceFee - discount;
  const vat = s.vat_pct > 0 ? Math.round((taxable * s.vat_pct) / 100) : 0;
  return {
    subtotal,
    deliveryFee,
    expressFee,
    serviceFee,
    discount,
    vat,
    total: Math.max(0, taxable + vat),
    freeDeliveryGap: freeDelivery || s.free_delivery_over <= 0 ? 0 : s.free_delivery_over - subtotal,
  };
}
