import { useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, Download } from "lucide-react";
import { refreshProductCache } from "@/lib/productCache";

type Row = { barcode: string; name: string; price: number; size: string | null; stock: number; category: string | null; mrp: number | null };

const pick = (r: Record<string, unknown>, keys: string[]) => {
  for (const k of Object.keys(r)) if (keys.includes(k.toLowerCase().replace(/[\s_-]/g, ""))) return r[k];
  return undefined;
};

const normalize = (raw: Record<string, unknown>[]): { rows: Row[]; skipped: number } => {
  const map = new Map<string, Row>();
  let skipped = 0;
  for (const r of raw) {
    const barcode = String(pick(r, ["barcode", "ean", "sku", "code", "itemcode"]) ?? "").trim();
    const name = String(pick(r, ["name", "productname", "item", "description", "itemname"]) ?? "").trim();
    const price = Number(pick(r, ["price", "sellingprice", "rate", "sp"]));
    if (!barcode || !name || !isFinite(price) || price < 0) { skipped++; continue; }
    const mrp = Number(pick(r, ["mrp"]));
    map.set(barcode, {
      barcode, name, price,
      size: (pick(r, ["size", "unit", "qty"]) as string)?.toString() || null,
      stock: Math.max(0, Math.floor(Number(pick(r, ["stock", "quantity", "inventory", "onhand"])) || 0)),
      category: (pick(r, ["category", "dept", "department"]) as string)?.toString() || null,
      mrp: isFinite(mrp) && mrp > 0 ? mrp : null,
    });
  }
  return { rows: [...map.values()], skipped };
};

const Inventory = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState("");

  const onFile = async (f: File) => {
    setFileName(f.name);
    const wb = XLSX.read(await f.arrayBuffer());
    const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: "" });
    const n = normalize(data);
    setRows(n.rows); setSkipped(n.skipped); setProgress(0);
  };

  const upload = async () => {
    setBusy(true);
    const CHUNK = 500;
    let done = 0;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const batch = rows.slice(i, i + CHUNK).map((r) => ({ ...r, stock_quantity: r.stock }));
      const { error } = await supabase.from("products").upsert(batch, { onConflict: "barcode" });
      if (error) { toast.error(`Stopped at row ${i + 1}: ${error.message}`); setBusy(false); return; }
      done += batch.length;
      setProgress(Math.round((done / rows.length) * 100));
    }
    await refreshProductCache();
    setBusy(false);
    toast.success(`${done} products synced`);
  };

  const template = () => {
    const ws = XLSX.utils.json_to_sheet([
      { barcode: "8901234500011", name: "Zudio Cotton Tee", price: 299, mrp: 399, size: "", stock: 40, category: "Clothing" },
      { barcode: "8901234500028", name: "Basmati Rice (loose)", price: 120, mrp: "", size: "per kg", stock: 200, category: "Loose Grocery" },
    ]);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    XLSX.writeFile(wb, "scango-inventory-template.xlsx");
  };

  return (
    <AppLayout title="Bulk Inventory">
      <Card className="p-6 glass shadow-soft border-0 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold flex items-center gap-2"><FileSpreadsheet className="h-4 w-4 text-primary" /> Import from POS (CSV / Excel)</h2>
          <Button variant="outline" size="sm" onClick={template}><Download className="h-4 w-4 mr-1" /> Template</Button>
        </div>
        <p className="text-sm text-muted-foreground">Columns: barcode, name, price (required) • mrp, size, stock, category (optional). Existing barcodes are updated. Use category "Clothing" for size choice and "Loose" for weight choice (price per kg).</p>
        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
          className="flex flex-col items-center justify-center gap-2 p-10 rounded-xl border-2 border-dashed border-border cursor-pointer hover:border-primary transition-colors"
        >
          <Upload className="h-8 w-8 text-muted-foreground" />
          <span className="text-sm">{fileName || "Drop file here or tap to choose"}</span>
          <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </label>
        {rows.length > 0 && (
          <>
            <p className="text-sm">{rows.length} valid products ready{skipped ? ` • ${skipped} rows skipped (missing barcode/name/price)` : ""}</p>
            <div className="max-h-64 overflow-auto rounded-lg border border-border text-xs">
              <table className="w-full">
                <thead className="bg-muted/40"><tr>{["Barcode", "Name", "Price", "Stock", "Category"].map((h) => <th key={h} className="p-2 text-left">{h}</th>)}</tr></thead>
                <tbody>{rows.slice(0, 50).map((r) => (
                  <tr key={r.barcode} className="border-t border-border"><td className="p-2 font-mono">{r.barcode}</td><td className="p-2">{r.name}</td><td className="p-2">₹{r.price}</td><td className="p-2">{r.stock}</td><td className="p-2">{r.category}</td></tr>
                ))}</tbody>
              </table>
            </div>
            {busy || progress > 0 ? <Progress value={progress} /> : null}
            <Button className="w-full" disabled={busy} onClick={upload}>{busy ? `Syncing… ${progress}%` : `Sync ${rows.length} products`}</Button>
          </>
        )}
      </Card>
    </AppLayout>
  );
};

export default Inventory;
