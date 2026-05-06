import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Camera, ShoppingBag, Trash2, Plus, Minus, CreditCard, Loader2, Sparkles, TrendingUp, Receipt as ReceiptIcon, Wifi, WifiOff, AlertTriangle } from "lucide-react";
import { lookupByBarcode, refreshProductCache, getCachedProducts, isCacheStale } from "@/lib/productCache";
import { requestNotifPermission, notify } from "@/lib/notifications";
import { successChime, errorBuzz } from "@/lib/sound";

interface RecentOrder { id: string; total: number; created_at: string; status: string; }

const Shop = () => {
  const { items, add, setQty, remove, total, count, clear } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [paying, setPaying] = useState(false);
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [recent, setRecent] = useState<RecentOrder[]>([]);
  const [profileName, setProfileName] = useState<string>("");

  useEffect(() => {
    requestNotifPermission();
    if (isCacheStale()) refreshProductCache();
  }, []);

  useEffect(() => {
    const on = () => { setOnline(true); toast.success("Back online — syncing"); refreshProductCache(); };
    const off = () => { setOnline(false); toast.warning("Offline mode — using cached catalog"); };
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle()
      .then(({ data }) => setProfileName(data?.full_name ?? ""));
    supabase.from("orders").select("id,total,created_at,status")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(3)
      .then(({ data }) => setRecent((data as RecentOrder[]) ?? []));
  }, [user]);

  const points = recent.reduce((s, o) => s + Math.floor(Number(o.total) / 10), 0);

  const handleScan = async (barcode: string) => {
    const product = await lookupByBarcode(barcode);
    if (!product) {
      errorBuzz();
      toast.error(`Unknown barcode: ${barcode}`);
      return;
    }
    add({
      product_id: product.id,
      barcode: product.barcode,
      name: product.name,
      price: Number(product.price),
      size: product.size,
    });
    successChime();
    if (product.stock > 0 && product.stock <= 5) {
      toast.warning(`${product.name} • Limited Stock (${product.stock} left)`);
    } else {
      toast.success(`Added ${product.name}`);
    }
  };

  const handlePay = async () => {
    if (!user || items.length === 0) return;
    if (!navigator.onLine) {
      toast.error("Payment requires internet — your cart is saved");
      return;
    }
    setPaying(true);
    await new Promise((r) => setTimeout(r, 900));

    const qrToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { data: order, error } = await supabase
      .from("orders")
      .insert({ user_id: user.id, total, status: "paid", qr_token: qrToken, expires_at: expiresAt })
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
    notify("Payment Successful ✓", `₹${total.toFixed(2)} paid. Show your QR at exit.`, "scango-pay");
    toast.success("Payment successful!");
    navigate(`/receipt/${order.id}`);
  };

  return (
    <AppLayout title="Shop">
      {/* Welcome dashboard */}
      <div className="mb-6 grid gap-4 md:grid-cols-3 animate-float-in">
        <Card className="md:col-span-2 p-5 gradient-hero text-primary-foreground shadow-elegant border-0 relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <p className="text-xs uppercase tracking-widest opacity-80 flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Welcome {online ? <Wifi className="h-3 w-3 ml-1" /> : <WifiOff className="h-3 w-3 ml-1 text-warning" />}
            </p>
            <h1 className="text-2xl md:text-3xl font-bold mt-1">
              {profileName ? `Hey ${profileName.split(" ")[0]}` : "Hey shopper"} 👋
            </h1>
            <p className="text-sm opacity-90 mt-1">Scan, pay and walk out — no queues.</p>
          </div>
        </Card>
        <Card className="p-5 shadow-soft border-0 bg-gradient-to-br from-accent/15 to-accent/5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-accent-foreground/70">
            <TrendingUp className="h-3 w-3" /> Points earned
          </div>
          <p className="text-3xl font-bold mt-1 text-foreground">{points}</p>
          <p className="text-xs text-muted-foreground">From {recent.length} recent purchase{recent.length === 1 ? "" : "s"}</p>
        </Card>
      </div>

      {recent.length > 0 && (
        <Card className="mb-6 p-4 shadow-soft animate-float-in">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><ReceiptIcon className="h-4 w-4 text-primary" /> Recent purchases</h3>
          <div className="grid sm:grid-cols-3 gap-2">
            {recent.map(r => (
              <button key={r.id} onClick={() => navigate(`/receipt/${r.id}`)}
                className="text-left p-3 rounded-xl border bg-card tappable-lift">
                <p className="font-mono text-xs text-muted-foreground">#{r.id.slice(0, 8).toUpperCase()}</p>
                <p className="font-semibold">₹{Number(r.total).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
              </button>
            ))}
          </div>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-4 shadow-soft">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2"><Camera className="h-4 w-4 text-primary" /> Scan Products</h2>
            <Button size="sm" variant={scanning ? "secondary" : "default"} className="tappable" onClick={() => setScanning((s) => !s)}>
              {scanning ? "Stop Scanner" : "Start Scanner"}
            </Button>
          </div>
          {scanning ? (
            <BarcodeScanner onScan={handleScan} onError={(e) => toast.error(e)} />
          ) : (
            <div className="aspect-[4/3] rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground gap-2 bg-secondary/40">
              <Camera className="h-10 w-10" />
              <p className="text-sm">Tap "Start Scanner" to scan barcodes</p>
              {!online && <Badge variant="outline" className="border-warning text-warning"><WifiOff className="h-3 w-3 mr-1" /> Offline — cart syncs when back online</Badge>}
            </div>
          )}
          <details className="mt-3 text-xs text-muted-foreground">
            <summary className="cursor-pointer">Demo barcodes</summary>
            <div className="mt-2 grid grid-cols-2 gap-1 font-mono">
              {(getCachedProducts().length ? getCachedProducts().map(p => p.barcode) : ["8901030865278","8901030865285","8901058765432","8902080112233","8901234567890","8907654321098","8903344556677","8909988776655"]).map(b => (
                <button key={b} className="text-left hover:text-primary tappable" onClick={() => handleScan(b)}>+ {b}</button>
              ))}
            </div>
          </details>
        </Card>

        <Card className="p-4 shadow-soft flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2"><ShoppingBag className="h-4 w-4 text-primary" /> Cart</h2>
            <Badge variant="secondary">{count} items</Badge>
          </div>
          {items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground py-12">
              <ShoppingBag className="h-10 w-10 mb-2 opacity-40" />
              <p className="text-sm">Your cart is empty</p>
            </div>
          ) : (
            <ScrollArea className="flex-1 max-h-[400px] pr-2">
              <div className="space-y-2">
                {items.map((i) => {
                  const cached = getCachedProducts().find(p => p.id === i.product_id);
                  const lowStock = cached && cached.stock > 0 && cached.stock <= 5;
                  return (
                    <div key={i.product_id} className="flex items-center gap-3 p-2 rounded-lg border bg-card animate-float-in">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate flex items-center gap-2">
                          {i.name}
                          {lowStock && <Badge variant="outline" className="border-warning text-warning text-[10px] py-0 h-4"><AlertTriangle className="h-2.5 w-2.5 mr-0.5" /> Limited</Badge>}
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
          <div className="border-t mt-4 pt-4 space-y-3">
            <div className="flex items-center justify-between text-lg">
              <span className="text-muted-foreground">Total</span>
              <span className="font-bold">₹{total.toFixed(2)}</span>
            </div>
            <Button className="w-full gradient-primary text-primary-foreground border-0 shadow-elegant tappable" size="lg" disabled={items.length === 0 || paying} onClick={handlePay}>
              {paying ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing payment...</> : <><CreditCard className="h-4 w-4 mr-2" /> Pay Now (UPI / Card)</>}
            </Button>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Shop;
