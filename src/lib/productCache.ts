// Thin wrapper around the IndexedDB cache for product catalog,
// with Open Food Facts fallback for unknown barcodes.
import { supabase } from "@/integrations/supabase/client";
import {
  CachedProduct,
  idbGetProducts,
  idbSaveProducts,
  idbProductsStale,
  lookupQueueAdd,
  lookupQueueAll,
  lookupQueueReplace,
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
    .select("id, barcode, name, price, size, stock, image_url");
  if (data) {
    memCache = data as CachedProduct[];
    await idbSaveProducts(memCache);
    return memCache;
  }
  return memCache ?? (await primeCache());
};

export const isCacheStale = async () => idbProductsStale();

const upsertMem = (p: CachedProduct) => {
  const list = memCache ?? [];
  const idx = list.findIndex((x) => x.barcode === p.barcode);
  if (idx >= 0) list[idx] = p;
  else list.push(p);
  memCache = list;
  idbSaveProducts(list).catch(() => {});
};

// Realistic INR retail price fallback for OFF products (₹20–₹150)
const randomRetailPrice = () =>
  Math.round((20 + Math.random() * 130) * 100) / 100;

interface OffProduct {
  product_name?: string;
  product_name_en?: string;
  brands?: string;
  image_front_url?: string;
  image_url?: string;
  quantity?: string;
}

// Fetch from Open Food Facts, persist to Supabase, prime cache.
export const fetchFromOpenFoodFacts = async (
  barcode: string
): Promise<CachedProduct | null> => {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(
        barcode
      )}.json?fields=product_name,product_name_en,brands,image_front_url,image_url,quantity`
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { status?: number; product?: OffProduct };
    if (json.status !== 1 || !json.product) return null;
    const p = json.product;
    const rawName =
      p.product_name_en?.trim() || p.product_name?.trim() || "";
    if (!rawName) return null;
    const name = p.brands ? `${p.brands.split(",")[0].trim()} ${rawName}` : rawName;

    const insertPayload = {
      barcode,
      name: name.slice(0, 120),
      price: randomRetailPrice(),
      size: p.quantity?.slice(0, 40) ?? null,
      stock: 25,
      image_url: p.image_front_url || p.image_url || null,
    };

    const { data, error } = await supabase
      .from("products")
      .insert(insertPayload)
      .select("id, barcode, name, price, size, stock, image_url")
      .single();

    if (error || !data) return null;
    const cached = data as CachedProduct;
    upsertMem(cached);
    return cached;
  } catch {
    return null;
  }
};

// Queue for retry when device comes back online
export const queueBarcodeLookup = (barcode: string) =>
  lookupQueueAdd(barcode).catch(() => {});

export const flushPendingLookups = async (): Promise<number> => {
  if (!navigator.onLine) return 0;
  const list = await lookupQueueAll();
  if (list.length === 0) return 0;
  const remaining: string[] = [];
  let synced = 0;
  for (const code of list) {
    const cached = (memCache ?? []).find((p) => p.barcode === code);
    if (cached) { synced++; continue; }
    const { data } = await supabase
      .from("products")
      .select("id, barcode, name, price, size, stock, image_url")
      .eq("barcode", code)
      .maybeSingle();
    if (data) { upsertMem(data as CachedProduct); synced++; continue; }
    const fetched = await fetchFromOpenFoodFacts(code);
    if (fetched) synced++;
    else remaining.push(code);
  }
  await lookupQueueReplace(remaining);
  return synced;
};

if (typeof window !== "undefined") {
  window.addEventListener("online", () => { flushPendingLookups(); });
}

export const lookupByBarcode = async (
  barcode: string
): Promise<CachedProduct | null> => {
  const code = barcode.trim();
  if (!memCache) await primeCache();
  const cached = (memCache ?? []).find((p) => p.barcode === code);
  if (cached) return cached;
  if (!navigator.onLine) return null;
  const { data } = await supabase
    .from("products")
    .select("id, barcode, name, price, size, stock, image_url")
    .eq("barcode", code)
    .maybeSingle();
  if (data) {
    const c = data as CachedProduct;
    upsertMem(c);
    return c;
  }
  return null;
};

export type ResolveResult =
  | { status: "found"; product: CachedProduct; source: "cache" | "supabase" | "openfoodfacts" }
  | { status: "queued"; barcode: string }
  | { status: "not_found"; barcode: string };

// Full resolver: local cache → Supabase → Open Food Facts → not-found / queued
export const resolveByBarcode = async (barcode: string): Promise<ResolveResult> => {
  const code = barcode.trim();
  if (!memCache) await primeCache();
  const cached = (memCache ?? []).find((p) => p.barcode === code);
  if (cached) return { status: "found", product: cached, source: "cache" };

  if (!navigator.onLine) {
    await queueBarcodeLookup(code);
    return { status: "queued", barcode: code };
  }

  const { data } = await supabase
    .from("products")
    .select("id, barcode, name, price, size, stock, image_url")
    .eq("barcode", code)
    .maybeSingle();
  if (data) {
    const c = data as CachedProduct;
    upsertMem(c);
    return { status: "found", product: c, source: "supabase" };
  }

  const fetched = await fetchFromOpenFoodFacts(code);
  if (fetched) return { status: "found", product: fetched, source: "openfoodfacts" };
  return { status: "not_found", barcode: code };
};
