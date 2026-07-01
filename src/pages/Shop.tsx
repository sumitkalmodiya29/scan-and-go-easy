import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { TrustBadges } from "@/components/TrustBadges";
import { VoiceSearch } from "@/components/VoiceSearch";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Camera, ShoppingBag, Trash2, Plus, Minus, CreditCard, Loader2, Sparkles, TrendingUp, Receipt as ReceiptIcon, AlertTriangle, Wallet, Banknote } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { lookupByBarcode, getCachedProducts, resolveByBarcode } from "@/lib/productCache";
import { requestNotifPermission, notify } from "@/lib/notifications";
import { successChime, errorBuzz } from "@/lib/sound";
import { useT } from "@/lib/i18n";
import { queueAdd } from "@/lib/db";
import { loadSettings } from "@/lib/settings";

interface RecentOrder { id: string; total: number; created_at: string; status: string; }

const Shop = () => {
  const { items, add, setQty, remove, total, count, clear } = useCart();
  const { user } = useAuth();
  const { t } = useT();
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [paying, setPaying] = useState(false);
  const [recent, setRecent] = useState<RecentOrder[]>([]);
  const [profileName, setProfileName] = useState<string>("");
  const [budgetLimit, setBudgetLimit] = useState(0);
  const [payOpen, setPayOpen] = useState(false);
  const [lookupPending, setLookupPending] = useState<string | null>(null);

  useEffect(() => { requestNotifPermission(); loadSettings().then((s) => setBudgetLimit(s.budgetLimit)); }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle()
      .then(({ data }) => setProfileName(data?.full_name ?? ""));
    supabase.from("orders").select("id,total,created_at,status")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(3)
      .then(({ data }) => setRecent((data as RecentOrder[]) ?? []));
  }, [user]);

  // GoPoints — 1% cashback on recent purchases
  const points = Math.floor(recent.reduce((s, o) => s + Number(o.total) * 0.01, 0));

  const handleScan = async (barcode: string) => {
    if (lookupPending) return;
    // Fast path: already in local cache — no shimmer needed
    const known = await lookupByBarcode(barcode);
    if (known) {
      add({
        product_id: known.id,
        barcode: known.barcode,
        name: known.name,
        price: Number(known.price),
        size: known.size,
      });
      successChime();
      if (known.stock > 0 && known.stock <= 5) {
        toast.warning(`${known.name} • ${t("limitedStock")} (${known.stock})`);
      } else {
        toast.success(`Added ${known.name}`);
      }
      return;
    }

    // Unknown → resolve via Supabase → Open Food Facts (shimmer while fetching)
    setLookupPending(barcode);
    const result = await resolveByBarcode(barcode);
    setLookupPending(null);

    if (result.status === "found") {
      const p = result.product;
      add({
        product_id: p.id,
        barcode: p.barcode,
        name: p.name,
        price: Number(p.price),
        size: p.size,
      });
      successChime();
      if (result.source === "openfoodfacts") {
        toast.success(`✨ Discovered ${p.name} • ₹${Number(p.price).toFixed(2)}`);
      } else {
        toast.success(`Added ${p.name}`);
      }
      return;
    }

    if (result.status === "queued") {
      errorBuzz();
      toast.warning(`Offline — will look up ${barcode} when back online`);
      return;
    }

    errorBuzz();
    toast.error("Product not found in store inventory. Please alert the staff.");
  };

  const handlePay = async (method: "digital" | "cash") => {
    if (!user || items.length === 0) return;
    setPayOpen(false);
    setPaying(true);
    await new Promise((r) => setTimeout(r, 500));

    const qrToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const status = method === "cash" ? "pending" : "paid";
    // Smart counter allocation: pseudo-random aisle 1..5 for demo
    const counterNo = method === "cash" ? ((Math.floor(Math.random() * 5)) + 1) : null;

    // Offline path → enqueue (digital only — cash needs live counter staff)
    if (!navigator.onLine && method === "digital") {
      const localId = crypto.randomUUID();
      await queueAdd({
        local_id: localId,
        user_id: user.id,
        total,
        qr_token: qrToken,
        expires_at: expiresAt,
        created_at: new Date().toISOString(),
        items: items.map((i) => ({
          product_id: i.product_id,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          size: i.size,
        })),
      });
      clear();
      setPaying(false);
      successChime();
      toast.success(t("paymentQueued"));
      return;
    }

    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        user_id: user.id, total, status, qr_token: qrToken, expires_at: expiresAt,
        payment_method: method, counter_no: counterNo,
      })
      .select().single();

    if (error || !order) {
      errorBuzz();
      toast.error(error?.message ?? "Payment failed");
      setPaying(false);
      navigate("/oops?reason=payment");
      return;
    }

    const itemsPayload = items.map((i) => ({
      order_id: order.id, product_id: i.product_id,
      name: i.name, price: i.price, quantity: i.quantity, size: i.size,
    }));
    const { error: itErr } = await supabase.from("order_items").insert(itemsPayload);
    if (itErr) {
      toast.error(itErr.message);
      setPaying(false);
      return;
    }

    clear();
    setPaying(false);
    successChime();
    if (method === "cash") {
      notify("Cash Pending Settlement", `₹${total.toFixed(2)} — show QR at exit counter`, "scango-cash");
      toast.success("Cash QR generated — proceed to exit counter");
    } else {
      notify("Payment Successful ✓", `₹${total.toFixed(2)} paid. Show your QR at exit.`, "scango-pay");
      toast.success("Payment successful!");
    }
    navigate(`/receipt/${order.id}`);
  };

  return (
    <AppLayout title="Shop">
      {/* Welcome dashboard */}
      <div className="mb-6 grid gap-4 md:grid-cols-3 animate-float-in">
        <Card className="md:col-span-2 p-5 glass-strong shadow-elegant border-0 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-primary/30 blur-3xl" />
          <div className="absolute -left-10 -bottom-12 w-44 h-44 rounded-full bg-accent/20 blur-3xl" />
          <div className="relative">
            <p className="text-xs uppercase tracking-widest text-emerald flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> {t("welcome")}
            </p>
            <h1 className="text-2xl md:text-3xl font-bold mt-1">
              {profileName ? `${t("welcome")}, ${profileName.split(" ")[0]}` : t("welcome")} 👋
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{t("appTagline")}</p>
          </div>
        </Card>
        <Card className="p-5 glass shadow-soft border-0">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-gold">
            <TrendingUp className="h-3 w-3" /> {t("pointsEarned")}
          </div>
          <p className="text-3xl font-bold mt-1 text-gold">{points}</p>
          <p className="text-xs text-muted-foreground">1% cashback • {recent.length} recent</p>
        </Card>
      </div>

      {recent.length > 0 && (
        <Card className="mb-6 p-4 glass shadow-soft animate-float-in border-0">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><ReceiptIcon className="h-4 w-4 text-emerald" /> {t("recentPurchases")}</h3>
          <div className="grid sm:grid-cols-3 gap-2">
            {recent.map(r => (
              <button key={r.id} onClick={() => navigate(`/receipt/${r.id}`)}
                className="text-left p-3 rounded-xl glass tappable-lift">
                <p className="font-mono text-xs text-muted-foreground">#{r.id.slice(0, 8).toUpperCase()}</p>
                <p className="font-semibold">₹{Number(r.total).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
              </button>
            ))}
          </div>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-4 glass shadow-soft border-0">
          <div className="flex items-center justify-between mb-3 gap-2">
            <h2 className="font-semibold flex items-center gap-2"><Camera className="h-4 w-4 text-emerald" /> {t("scanProducts")}</h2>
            <div className="flex items-center gap-2">
              <VoiceSearch onResult={(text) => {
                const q = text.toLowerCase().trim();
                const match = getCachedProducts().find(p => p.name.toLowerCase().includes(q) || p.barcode.includes(q));
                if (match) handleScan(match.barcode);
                else { errorBuzz(); toast.error(`No product matches "${text}"`); }
              }} />
              <Button size="sm" variant={scanning ? "secondary" : "default"} className="tappable" onClick={() => setScanning((s) => !s)}>
                {scanning ? t("stopScanner") : t("startScanner")}
              </Button>
            </div>
          </div>
          {scanning ? (
            <BarcodeScanner onScan={handleScan} onError={(e) => toast.error(e)} />
          ) : (
            <div className="aspect-[4/3] rounded-xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-muted-foreground gap-2 bg-card/40">
              <Camera className="h-10 w-10" />
              <p className="text-sm">{t("tapStartScan")}</p>
            </div>
          )}
          <details className="mt-3 text-xs text-muted-foreground">
            <summary className="cursor-pointer">{t("demoBarcodes")}</summary>
            <div className="mt-2 grid grid-cols-2 gap-1 font-mono">
              {(getCachedProducts().length ? getCachedProducts().map(p => p.barcode) : ["8901030865278","8901030865285","8901058765432","8902080112233","8901234567890","8907654321098","8903344556677","8909988776655"]).map(b => (
                <button key={b} className="text-left hover:text-emerald tappable" onClick={() => handleScan(b)}>+ {b}</button>
              ))}
            </div>
          </details>
        </Card>

        <Card className="p-4 glass shadow-soft border-0 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2"><ShoppingBag className="h-4 w-4 text-emerald" /> {t("cart")}</h2>
            <Badge variant="secondary">{count} {t("items")}</Badge>
          </div>
          {items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground py-12">
              <ShoppingBag className="h-10 w-10 mb-2 opacity-40" />
              <p className="text-sm">{t("cartEmpty")}</p>
            </div>
          ) : (
            <ScrollArea className="flex-1 max-h-[400px] pr-2">
              <div className="space-y-2">
                {items.map((i) => {
                  const cached = getCachedProducts().find(p => p.id === i.product_id);
                  const lowStock = cached && cached.stock > 0 && cached.stock <= 5;
                  return (
                    <div key={i.product_id} className="flex items-center gap-3 p-2 rounded-lg glass animate-float-in">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate flex items-center gap-2">
                          {i.name}
                          {lowStock && <Badge variant="outline" className="border-warning text-warning text-[10px] py-0 h-4"><AlertTriangle className="h-2.5 w-2.5 mr-0.5" /> {t("limitedStock")}</Badge>}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {i.size && `Size ${i.size} • `}₹{i.price.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7 tappable" onClick={() => setQty(i.product_id, i.quantity - 1)}><Minus className="h-3 w-3" /></Button>
                        <span className="w-6 text-center text-sm font-medium">{i.quantity}</span>
                        <Button size="icon" variant="ghost" className="h-7 w-7 tappable" onClick={() => setQty(i.product_id, i.quantity + 1)}><Plus className="h-3 w-3" /></Button>
                      </div>
                      <p className="w-20 text-right font-semibold">₹{(i.price * i.quantity).toFixed(2)}</p>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive tappable" onClick={() => remove(i.product_id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
          <div className="border-t border-white/10 mt-4 pt-4 space-y-3">
            <div className="flex items-center justify-between text-lg">
              <span className="text-muted-foreground">{t("total")}</span>
              <span className="font-bold">₹{total.toFixed(2)}</span>
            </div>
            {budgetLimit > 0 && (() => {
              const pct = Math.min(100, (total / budgetLimit) * 100);
              const over = total > budgetLimit;
              const near = !over && pct >= 80;
              return (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-muted-foreground"><Wallet className="h-3 w-3 text-gold" /> {t("budgetTracker")}</span>
                    <span className={`font-mono font-semibold ${over ? "text-destructive" : near ? "text-warning" : "text-emerald"}`}>
                      ₹{total.toFixed(0)} / ₹{budgetLimit}
                    </span>
                  </div>
                  <Progress value={pct} className={over ? "[&>div]:bg-destructive" : near ? "[&>div]:bg-warning" : "[&>div]:bg-primary"} />
                  {over && <p className="text-xs text-destructive flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {t("overBudget")}</p>}
                  {near && <p className="text-xs text-warning flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {t("nearBudget")}</p>}
                </div>
              );
            })()}
            <TrustBadges compact />
            <Button className="w-full gradient-primary text-primary-foreground border-0 shadow-elegant tappable font-semibold" size="lg" disabled={items.length === 0 || paying} onClick={() => setPayOpen(true)}>
              {paying ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t("processingPayment")}</> : <><CreditCard className="h-4 w-4 mr-2" /> {t("payNow")}</>}
            </Button>
          </div>
        </Card>
      </div>

      {/* Payment method dialog: Digital vs Cash-at-counter */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="glass-strong border-white/10 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald" /> {t("choosePayment")}
            </DialogTitle>
            <DialogDescription>
              {t("total")}: <span className="font-bold text-foreground">₹{total.toFixed(2)}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 mt-2">
            <button
              onClick={() => handlePay("digital")}
              className="text-left p-4 rounded-2xl glass tappable-lift border border-primary/30 hover:border-primary/60 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl gradient-primary grid place-items-center text-primary-foreground shadow-glow">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{t("payDigital")}</p>
                  <p className="text-xs text-muted-foreground">{t("payDigitalDesc")}</p>
                </div>
              </div>
            </button>
            <button
              onClick={() => handlePay("cash")}
              className="text-left p-4 rounded-2xl glass tappable-lift border border-accent/40 hover:border-accent/70 transition-colors shadow-amber/40"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl gradient-amber grid place-items-center text-accent-foreground shadow-amber">
                  <Banknote className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gold">{t("payCash")}</p>
                  <p className="text-xs text-muted-foreground">{t("payCashDesc")}</p>
                </div>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Shop;
