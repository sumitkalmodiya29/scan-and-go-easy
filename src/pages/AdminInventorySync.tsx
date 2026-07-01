import { useCallback, useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Loader2, Database, Building2, Radio } from "lucide-react";
import { parseFile, bulkUpsertProducts, ImportReport, ImportRow } from "@/lib/inventoryImport";
import {
  STORE_BRANCHES, fetchActiveCampaigns, fetchLiveInventory,
  getCurrentBranchId, setCurrentBranchId, Campaign,
} from "@/lib/enterpriseApi";

const AdminInventorySync = () => {
  const [branch, setBranch] = useState<string>(getCurrentBranchId());
  const [dragging, setDragging] = useState(false);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [parseErrors, setParseErrors] = useState<{ row: number; reason: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [report, setReport] = useState<ImportReport | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [probeBarcode, setProbeBarcode] = useState("");
  const [probeResult, setProbeResult] = useState<string>("");

  useEffect(() => { setCurrentBranchId(branch); fetchActiveCampaigns(branch).then(setCampaigns); }, [branch]);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const file = Array.from(files)[0];
    if (!file) return;
    setReport(null); setRows([]); setParseErrors([]);
    try {
      const { rows: parsed, errors } = await parseFile(file);
      setRows(parsed); setParseErrors(errors);
      toast.success(`Parsed ${parsed.length} rows${errors.length ? ` (${errors.length} skipped)` : ""}`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, []);

  const commit = async () => {
    if (rows.length === 0) return;
    setUploading(true); setProgress({ done: 0, total: rows.length });
    const stamped = rows.map((r) => ({ ...r, store_branch: r.store_branch ?? branch }));
    const rep = await bulkUpsertProducts(stamped, (done, total) => setProgress({ done, total }));
    setReport(rep); setUploading(false);
    if (rep.failed === 0) toast.success(`Synced ${rep.upserted} products to ${branch}`);
    else toast.warning(`Synced ${rep.upserted}, ${rep.failed} failed`);
  };

  const probeInventory = async () => {
    if (!probeBarcode) return;
    setProbeResult("…");
    const inv = await fetchLiveInventory(probeBarcode.trim(), branch);
    setProbeResult(`On-hand: ${inv.on_hand} · Reserved: ${inv.reserved} · Reorder ≤ ${inv.reorder_level}`);
  };

  return (
    <AppLayout title="Inventory Sync">
      <div className="grid gap-4 md:grid-cols-3 mb-6 animate-float-in">
        <Card className="p-4 glass shadow-soft border-0 md:col-span-2">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-emerald">
            <Building2 className="h-3 w-3" /> Store Branch (ERP Gateway)
          </div>
          <Select value={branch} onValueChange={setBranch}>
            <SelectTrigger className="mt-2 glass border-white/10"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STORE_BRANCHES.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name} · {b.city}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-2">GSTIN {STORE_BRANCHES.find(b => b.id === branch)?.gstin}</p>
        </Card>
        <Card className="p-4 glass shadow-soft border-0">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-gold"><Radio className="h-3 w-3" /> Live Campaigns</div>
          <p className="text-2xl font-bold mt-1">{campaigns.length}</p>
          <p className="text-xs text-muted-foreground">active offers pulled from SAP mock</p>
        </Card>
      </div>

      <Card
        className={`p-8 mb-6 glass-strong border-2 border-dashed transition-all ${dragging ? "border-primary bg-primary/10" : "border-white/15"}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
      >
        <div className="flex flex-col items-center text-center gap-3">
          <div className="h-14 w-14 rounded-2xl gradient-primary grid place-items-center shadow-glow">
            <Upload className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Drop CSV / JSON POS export</h2>
            <p className="text-sm text-muted-foreground">Accepts SAP, Oracle Retail, Ginesys & Tally Prime exports · Upserts by barcode</p>
          </div>
          <label className="inline-flex">
            <input
              type="file" accept=".csv,.json,text/csv,application/json" hidden
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
            <span className="tappable inline-flex items-center gap-2 px-4 py-2 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold shadow-elegant cursor-pointer">
              <FileSpreadsheet className="h-4 w-4" /> Choose file
            </span>
          </label>
          <p className="text-[11px] text-muted-foreground max-w-md">
            Recognised columns: barcode, name, category, sub_category, price, mrp, discount_price, tax_rate_gst, stock_quantity, size, image_url, variants (JSON).
          </p>
        </div>
      </Card>

      {rows.length > 0 && (
        <Card className="p-4 mb-6 glass shadow-soft border-0 animate-float-in">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <Database className="h-4 w-4 text-emerald" />
              <span className="font-semibold">{rows.length}</span>
              <span className="text-muted-foreground text-sm">rows ready</span>
              {parseErrors.length > 0 && (
                <Badge variant="outline" className="border-warning text-warning">
                  <AlertTriangle className="h-3 w-3 mr-1" /> {parseErrors.length} skipped
                </Badge>
              )}
            </div>
            <Button className="gradient-primary text-primary-foreground border-0 tappable" onClick={commit} disabled={uploading}>
              {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Syncing…</> : <>Commit to Cloud DB</>}
            </Button>
          </div>
          {uploading && <Progress value={(progress.done / Math.max(1, progress.total)) * 100} />}

          <div className="mt-4 overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full text-xs">
              <thead className="bg-white/5 text-muted-foreground">
                <tr>{["Barcode","Name","Category","MRP","Price","Stock","GST%"].map(h => <th key={h} className="p-2 text-left font-medium">{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.slice(0, 8).map((r, i) => (
                  <tr key={i} className="border-t border-white/5">
                    <td className="p-2 font-mono">{r.barcode}</td>
                    <td className="p-2">{r.name}</td>
                    <td className="p-2">{r.category ?? "—"}</td>
                    <td className="p-2">{r.mrp ?? "—"}</td>
                    <td className="p-2 font-semibold">₹{r.price}</td>
                    <td className="p-2">{r.stock_quantity ?? 0}</td>
                    <td className="p-2">{r.tax_rate_gst ?? 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 8 && <p className="p-2 text-center text-xs text-muted-foreground">…and {rows.length - 8} more</p>}
          </div>
        </Card>
      )}

      {report && (
        <Card className="p-4 mb-6 glass shadow-soft border-0 animate-float-in">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-4 w-4 text-emerald" />
            <span className="font-semibold">Sync report</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-lg glass"><p className="text-2xl font-bold text-emerald">{report.upserted}</p><p className="text-xs text-muted-foreground">Upserted</p></div>
            <div className="p-3 rounded-lg glass"><p className="text-2xl font-bold">{report.total}</p><p className="text-xs text-muted-foreground">Total</p></div>
            <div className="p-3 rounded-lg glass"><p className={`text-2xl font-bold ${report.failed ? "text-destructive" : "text-muted-foreground"}`}>{report.failed}</p><p className="text-xs text-muted-foreground">Failed</p></div>
          </div>
          {report.errors.length > 0 && (
            <details className="mt-3 text-xs">
              <summary className="cursor-pointer text-warning">View {report.errors.length} errors</summary>
              <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                {report.errors.map((e, i) => <li key={i} className="font-mono">Row {e.row}: {e.reason}</li>)}
              </ul>
            </details>
          )}
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4 glass shadow-soft border-0">
          <div className="flex items-center gap-2 text-sm font-semibold mb-3"><Radio className="h-4 w-4 text-gold" /> Active Store Campaigns</div>
          <div className="space-y-2">
            {campaigns.map(c => (
              <div key={c.id} className="p-3 rounded-lg glass flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{c.title}</p>
                  <p className="text-xs text-muted-foreground">{c.category ?? "All categories"} · ends {new Date(c.ends_at).toLocaleDateString()}</p>
                </div>
                <Badge className="gradient-primary text-primary-foreground border-0">-{c.discount_pct}%</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4 glass shadow-soft border-0">
          <div className="flex items-center gap-2 text-sm font-semibold mb-3"><Database className="h-4 w-4 text-emerald" /> Live Inventory Probe (Mock ERP)</div>
          <div className="flex gap-2">
            <input
              value={probeBarcode} onChange={(e) => setProbeBarcode(e.target.value)}
              placeholder="Enter barcode…"
              className="flex-1 px-3 py-2 rounded-lg glass border border-white/10 text-sm font-mono bg-transparent"
            />
            <Button onClick={probeInventory} className="tappable">Query</Button>
          </div>
          {probeResult && <p className="mt-3 text-sm font-mono text-emerald">{probeResult}</p>}
          <p className="mt-2 text-[11px] text-muted-foreground">GET /v1/inventory?branch={branch}&barcode=…</p>
        </Card>
      </div>
    </AppLayout>
  );
};

export default AdminInventorySync;
