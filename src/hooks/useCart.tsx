import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from "react";

export interface CartItem {
  product_id: string;
  barcode: string;
  name: string;
  price: number;
  size: string | null;
  quantity: number;
}

interface CartCtx {
  items: CartItem[];
  add: (item: Omit<CartItem, "quantity">) => void;
  remove: (product_id: string) => void;
  setQty: (product_id: string, qty: number) => void;
  clear: () => void;
  total: number;
  count: number;
}

const Ctx = createContext<CartCtx | null>(null);
const STORAGE_KEY = "scango.cart.v1";

const loadCart = (): CartItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch { return []; }
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(loadCart);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch { /* noop */ }
  }, [items]);

  const add: CartCtx["add"] = useCallback((item) => {
    setItems((prev) => {
      const ex = prev.find((i) => i.product_id === item.product_id);
      if (ex) return prev.map((i) => i.product_id === item.product_id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...item, quantity: 1 }];
    });
  }, []);

  const remove = useCallback((id: string) => {
    setItems((p) => p.filter((i) => i.product_id !== id));
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    if (qty <= 0) return setItems((p) => p.filter((i) => i.product_id !== id));
    setItems((p) => p.map((i) => (i.product_id === id ? { ...i, quantity: qty } : i)));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <Ctx.Provider value={{ items, add, remove, setQty, clear, total, count }}>
      {children}
    </Ctx.Provider>
  );
};

export const useCart = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart outside provider");
  return c;
};
