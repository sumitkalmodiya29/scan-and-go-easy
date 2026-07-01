// Bulk CSV/JSON inventory importer.
// Parses POS/ERP exports and upserts into the Supabase `products` table
// in chunks (barcode conflict target). Returns per-row parse errors.
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";

export interface ImportRow {
  barcode: string;
  name: string;
  category?: string | null;
  sub_category?: string | null;
  price: number;
  mrp?: number | null;
  discount_price?: number | null;
  tax_rate_gst?: number | null;
  stock?: number;
  stock_quantity?: number;
  size?: string | null;
  image_url?: string | null;
  store_branch?: string | null;
  variants?: unknown | null;
}

export interface ImportReport {
  total: number;
  upserted: number;
  failed: number;
  errors: Array<{ row: number; reason: string }>;
}

const toNum = (v: unknown): number | undefined => {
  if (v === null || v === undefined || v === "") return undefined;
  const n = Number(String(v).replace(/[₹,\s]/g, ""));
  return Number.isFinite(n) ? n : undefined;
};

const pick = (r: Record<string, unknown>, keys: string[]): unknown => {
  for (const k of keys) {
    const kl = k.toLowerCase();
    for (const rk of Object.keys(r)) if (rk.toLowerCase() === kl) return r[rk];
  }
  return undefined;
};

const normalizeRow = (raw: Record<string, unknown>, idx: number): ImportRow | { error: string; row: number } => {
  const barcode = String(pick(raw, ["barcode", "ean", "upc", "sku"]) ?? "").trim();
  const name = String(pick(raw, ["name", "product_name", "title", "description"]) ?? "").trim();
  if (!barcode) return { row: idx, error: "Missing barcode" };
  if (!name) return { row: idx, error: "Missing name" };

  const mrp = toNum(pick(raw, ["mrp", "list_price"]));
  const discount = toNum(pick(raw, ["discount_price", "sale_price", "offer_price"]));
  const price = toNum(pick(raw, ["price", "selling_price", "retail_price"])) ?? discount ?? mrp;
  if (price === undefined) return { row: idx, error: "Missing price" };

  const stockQ = toNum(pick(raw, ["stock_quantity", "stock", "qty", "quantity", "on_hand"])) ?? 0;

  let variants: unknown = null;
  const rawVar = pick(raw, ["variants", "variant_json"]);
  if (rawVar) {
    if (typeof rawVar === "string") {
      try { variants = JSON.parse(rawVar); } catch { variants = null; }
    } else variants = rawVar;
  }

  return {
    barcode,
    name,
    category: (pick(raw, ["category", "dept", "department"]) as string) ?? null,
    sub_category: (pick(raw, ["sub_category", "subcategory"]) as string) ?? null,
    price,
    mrp: mrp ?? null,
    discount_price: discount ?? null,
    tax_rate_gst: toNum(pick(raw, ["tax_rate_gst", "gst", "tax"])) ?? 0,
    stock: stockQ,
    stock_quantity: stockQ,
    size: (pick(raw, ["size", "pack_size", "weight"]) as string) ?? null,
    image_url: (pick(raw, ["image_url", "image"]) as string) ?? null,
    store_branch: (pick(raw, ["store_branch", "branch", "store"]) as string) ?? null,
    variants,
  };
};

export const parseFile = async (file: File): Promise<{ rows: ImportRow[]; errors: ImportReport["errors"] }> => {
  const text = await file.text();
  const errors: ImportReport["errors"] = [];
  let raw: Record<string, unknown>[] = [];

  if (file.name.toLowerCase().endsWith(".json")) {
    try {
      const parsed = JSON.parse(text);
      raw = Array.isArray(parsed) ? parsed : Array.isArray((parsed as { products?: unknown[] }).products) ? (parsed as { products: Record<string, unknown>[] }).products : [];
    } catch (e) {
      throw new Error(`Invalid JSON: ${(e as Error).message}`);
    }
  } else {
    const res = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim() });
    raw = res.data;
    res.errors.forEach((e) => errors.push({ row: e.row ?? -1, reason: e.message }));
  }

  const rows: ImportRow[] = [];
  raw.forEach((r, i) => {
    const norm = normalizeRow(r, i + 2); // header + 1-indexed
    if ("error" in norm) errors.push({ row: norm.row, reason: norm.error });
    else rows.push(norm);
  });
  return { rows, errors };
};

/** Upsert products in chunks. Reports per-chunk failures without aborting. */
export const bulkUpsertProducts = async (
  rows: ImportRow[],
  onProgress?: (done: number, total: number) => void
): Promise<ImportReport> => {
  const report: ImportReport = { total: rows.length, upserted: 0, failed: 0, errors: [] };
  const CHUNK = 250;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const { error, count } = await supabase
      .from("products")
      .upsert(slice as never, { onConflict: "barcode", count: "exact" });
    if (error) {
      report.failed += slice.length;
      report.errors.push({ row: i + 2, reason: error.message });
    } else {
      report.upserted += count ?? slice.length;
    }
    onProgress?.(Math.min(i + CHUNK, rows.length), rows.length);
  }
  return report;
};
