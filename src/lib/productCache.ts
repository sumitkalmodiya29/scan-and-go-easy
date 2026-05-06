// Thin wrapper around the IndexedDB cache for product catalog.
// Falls back to localStorage-free pure IDB. Same shape as before so callers don't change much.
import { supabase } from "@/integrations/supabase/client";
import {
  CachedProduct,
  idbGetProducts,
  idbSaveProducts,
  idbProductsStale,
} from "./db";

export type { CachedProduct };

let memCache: CachedProduct[] | null = null;

export const getCachedProducts = (): CachedProduct[] => memCache ?? [];

export const primeCache = async () => {
  if (memCache) return memCache;
  memCache = await idbGetProducts();
  return memCache;
};

export const refreshProductCache = async (): Promise<CachedProduct[]> => {
  const { data } = await supabase
    .from("products")
    .select("id, barcode, name, price, size, stock");
  if (data) {
    memCache = data as CachedProduct[];
    await idbSaveProducts(memCache);
    return memCache;
  }
  return memCache ?? (await primeCache());
};

export const isCacheStale = async () => idbProductsStale();

export const lookupByBarcode = async (barcode: string): Promise<CachedProduct | null> => {
  const code = barcode.trim();
  if (!memCache) await primeCache();
  const cached = (memCache ?? []).find((p) => p.barcode === code);
  if (cached) return cached;
  if (!navigator.onLine) return null;
  const { data } = await supabase
    .from("products")
    .select("id, barcode, name, price, size, stock")
    .eq("barcode", code)
    .maybeSingle();
  return (data as CachedProduct) ?? null;
};
