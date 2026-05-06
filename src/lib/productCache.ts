import { supabase } from "@/integrations/supabase/client";

export interface CachedProduct {
  id: string;
  barcode: string;
  name: string;
  price: number;
  size: string | null;
  stock: number;
}

const KEY = "scango.products.v1";
const TS_KEY = "scango.products.ts";
const TTL = 1000 * 60 * 30; // 30 min

export const getCachedProducts = (): CachedProduct[] => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

export const refreshProductCache = async (): Promise<CachedProduct[]> => {
  const { data } = await supabase
    .from("products")
    .select("id, barcode, name, price, size, stock");
  if (data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      localStorage.setItem(TS_KEY, String(Date.now()));
    } catch { /* noop */ }
    return data as CachedProduct[];
  }
  return getCachedProducts();
};

export const isCacheStale = () => {
  const ts = Number(localStorage.getItem(TS_KEY) ?? 0);
  return !ts || Date.now() - ts > TTL;
};

export const lookupByBarcode = async (barcode: string): Promise<CachedProduct | null> => {
  const code = barcode.trim();
  // Try cache first for instant feel
  const cached = getCachedProducts().find((p) => p.barcode === code);
  if (cached) return cached;
  // Network fallback
  if (!navigator.onLine) return null;
  const { data } = await supabase
    .from("products")
    .select("id, barcode, name, price, size, stock")
    .eq("barcode", code)
    .maybeSingle();
  return (data as CachedProduct) ?? null;
};
