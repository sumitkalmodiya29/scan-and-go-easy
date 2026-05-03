import { useState } from "react";
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
import { Camera, ShoppingBag, Trash2, Plus, Minus, CreditCard, Loader2 } from "lucide-react";

const Shop = () => {
  const { items, add, setQty, remove, total, count, clear } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [paying, setPaying] = useState(false);

  const handleScan = async (barcode: string) => {
    const { data, error } = await supabase
      .from("products")
      .select("id, barcode, name, price, size")
      .eq("barcode", barcode.trim())
      .maybeSingle();
    if (error || !data) {
      toast.error(`Unknown barcode: ${barcode}`);
      return;
    }
    add({
      product_id: data.id,
      barcode: data.barcode,
      name: data.name,
      price: Number(data.price),
      size: data.size,
    });
    toast.success(`Added ${data.name}`);
  };

  const handlePay = async () => {
    if (!user || items.length === 0) return;
    setPaying(true);

    // Mock payment delay
    await new Promise((r) => setTimeout(r, 1200));

    const qrToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        total,
        status: "paid",
        qr_token: qrToken,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error || !order) {
      toast.error(error?.message ?? "Payment failed");
      setPaying(false);
      return;
    }

    const itemsPayload = items.map((i) => ({
      order_id: order.id,
      product_id: i.product_id,
      name: i.name,
      price: i.price,
      quantity: i.quantity,
      size: i.size,
    }));
    const { error: itErr } = await supabase.from("order_items").insert(itemsPayload);
    if (itErr) {
      toast.error(itErr.message);
      setPaying(false);
      return;
    }

    clear();
    setPaying(false);
    toast.success("Payment successful!");
    navigate(`/receipt/${order.id}`);
  };

  return (
    <AppLayout title="Shop">
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-4 shadow-soft">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2"><Camera className="h-4 w-4 text-primary" /> Scan Products</h2>
            <Button size="sm" variant={scanning ? "secondary" : "default"} onClick={() => setScanning((s) => !s)}>
              {scanning ? "Stop Scanner" : "Start Scanner"}
            </Button>
          </div>
          {scanning ? (
            <BarcodeScanner onScan={handleScan} onError={(e) => toast.error(e)} />
          ) : (
            <div className="aspect-[4/3] rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground gap-2 bg-secondary/40">
              <Camera className="h-10 w-10" />
              <p className="text-sm">Tap "Start Scanner" to scan barcodes</p>
            </div>
          )}
          <details className="mt-3 text-xs text-muted-foreground">
            <summary className="cursor-pointer">Demo barcodes</summary>
            <div className="mt-2 grid grid-cols-2 gap-1 font-mono">
              {["8901030865278","8901030865285","8901058765432","8902080112233","8901234567890","8907654321098","8903344556677","8909988776655"].map(b => (
                <button key={b} className="text-left hover:text-primary" onClick={() => handleScan(b)}>+ {b}</button>
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
                {items.map((i) => (
                  <div key={i.product_id} className="flex items-center gap-3 p-2 rounded-lg border bg-card">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{i.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {i.size && `Size ${i.size} • `}₹{i.price.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setQty(i.product_id, i.quantity - 1)}><Minus className="h-3 w-3" /></Button>
                      <span className="w-6 text-center text-sm font-medium">{i.quantity}</span>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setQty(i.product_id, i.quantity + 1)}><Plus className="h-3 w-3" /></Button>
                    </div>
                    <p className="w-20 text-right font-semibold">₹{(i.price * i.quantity).toFixed(2)}</p>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(i.product_id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
          <div className="border-t mt-4 pt-4 space-y-3">
            <div className="flex items-center justify-between text-lg">
              <span className="text-muted-foreground">Total</span>
              <span className="font-bold">₹{total.toFixed(2)}</span>
            </div>
            <Button className="w-full gradient-primary text-primary-foreground border-0 shadow-elegant" size="lg" disabled={items.length === 0 || paying} onClick={handlePay}>
              {paying ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing payment...</> : <><CreditCard className="h-4 w-4 mr-2" /> Pay Now (UPI / Card)</>}
            </Button>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Shop;
