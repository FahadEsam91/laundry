import { createContext, useContext, useEffect, useState } from "react";
import { prefs } from "./storage";

export type CartLine = { product_id: number; qty: number; name_ar: string; name_en: string; icon: string; price: number; service_ar: string; service_en: string };
type State = { partner: any | null; lines: Record<number, CartLine> };
type Ctx = State & {
  count: number;
  subtotal: number;
  setQty: (partner: any, line: Omit<CartLine, "qty">, qty: number) => boolean;
  replace: (partner: any, lines: CartLine[]) => void;
  clear: () => void;
};
const CartC = createContext<Ctx | null>(null);
export const useCart = () => useContext(CartC)!;

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [s, setS] = useState<State>({ partner: null, lines: {} });
  useEffect(() => {
    prefs.get<State>("cart", { partner: null, lines: {} }).then(setS);
  }, []);
  const save = (n: State) => {
    setS(n);
    prefs.set("cart", n);
  };
  const lines = Object.values(s.lines);
  return (
    <CartC.Provider
      value={{
        ...s,
        count: lines.reduce((a, l) => a + l.qty, 0),
        subtotal: lines.reduce((a, l) => a + l.qty * l.price, 0),
        setQty: (partner, line, qty) => {
          if (s.partner && s.partner.id !== partner.id && lines.length) return false;
          const next = { ...s.lines };
          if (qty <= 0) delete next[line.product_id];
          else next[line.product_id] = { ...line, qty };
          save({ partner: Object.keys(next).length ? partner : null, lines: next });
          return true;
        },
        replace: (partner, ls) => save({ partner, lines: Object.fromEntries(ls.map((l) => [l.product_id, l])) }),
        clear: () => save({ partner: null, lines: {} }),
      }}
    >
      {children}
    </CartC.Provider>
  );
}
