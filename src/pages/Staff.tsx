import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { QrCode, CheckCircle2, XCircle, ShieldCheck, Clock, Search, Banknote, CreditCard } from "lucide-react";
import { successChime, errorBuzz, beep } from "@/lib/sound";
import { requestNotifPermission, notify } from "@/lib/notifications";

interface OrderRow {
  id: string;
  total: number;
  status: string;
  qr_token: string;
  expires_at: string;
  verified_at: string | null;
  created_at: string;
  payment_method?: string | null;
  counter_no?: number | null;
}
interface ItemRow {
  id: string;
  name: string;
  price: number;
  quantity: number;
  size: string | null;
}

const Staff = () => {
  const { user } = useAuth();
  const [scanning, setScanning] = useState(false);
  const [manualId, setManualId] = useState("");
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [recent, setRecent] = useState<OrderRow[]>([]);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lockRef = useRef(false);

  useEffect(() => {
    requestNotifPermission();
    const load = async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      setRecent((data as OrderRow[]) ?? []);
    };
    load();

    const ch = supabase
      .channel("staff-orders")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (p) => {
        const o = p.new as OrderRow;
        beep(660, 0.1, "triangle", 0.15);
        notify("New Exit Pending", `Order #${o.id.slice(0,8).toUpperCase()} • ₹${Number(o.total).toFixed(2)}`, `order-${o.id}`);
        load();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    if (!scanning || !containerRef.current) return;
    const id = "staff-scanner";
    containerRef.current.id = id;
    const scanner = new Html5Qrcode(id, { verbose: false });
    scannerRef.current = scanner;
    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 250 },
      async (text) => {
        if (lockRef.current) return;
        lockRef.current = true;
        await processQr(text);
        setTimeout(() => (lockRef.current = false), 2000);
      },
      () => {}
    ).catch((e) => toast.error(String(e)));
    return () => { scanner.stop().then(() => scanner.clear()).catch(() => {}); };
  }, [scanning]);

  const processQr = async (raw: string) => {
    let payload: { order_id?: string; token?: string };
    try { payload = JSON.parse(raw); } catch { errorBuzz(); toast.error("Invalid QR"); return; }
    if (!payload.order_id || !payload.token) { errorBuzz(); toast.error("Invalid QR payload"); return; }

    const { data: o, error } = await supabase
      .from("orders").select("*").eq("id", payload.order_id).maybeSingle();
    if (error || !o) { errorBuzz(); toast.error("Order not found"); return; }
    if (o.qr_token !== payload.token) { errorBuzz(); toast.error("QR token mismatch"); return; }
    successChime();
    const { data: it } = await supabase.from("order_items").select("*").eq("order_id", o.id);
    setOrder(o as OrderRow);
    setItems((it as ItemRow[]) ?? []);
    setScanning(false);
  };

  const loadOrderById = async (rawId: string) => {
    const orderId = rawId.trim().toLowerCase();
    if (!orderId) { toast.error("Enter an Order ID"); return; }
    let query = supabase.from("orders").select("*");
    if (orderId.length < 36) {
      query = query.ilike("id", `${orderId}%`);
    } else {
      query = query.eq("id", orderId);
    }
    const { data: matches, error } = await query.limit(2);
    if (error) { toast.error(error.message); return; }
    if (!matches || matches.length === 0) { toast.error("Order not found"); return; }
    if (matches.length > 1) { toast.error("Multiple matches — enter full ID"); return; }
    const o = matches[0] as OrderRow;
    const { data: it } = await supabase.from("order_items").select("*").eq("order_id", o.id);
    setOrder(o);
    setItems((it as ItemRow[]) ?? []);
    setScanning(false);
  };

  const completeOrder = async (orderId: string) => {
    if (!user) return false;
    const { error } = await supabase
      .from("orders")
      .update({ status: "completed", verified_at: new Date().toISOString(), verified_by: user.id })
      .eq("id", orderId)
      .neq("status", "completed");
    if (error) { toast.error(error.message); return false; }
    toast.success("Exit approved — order completed ✓");
    return true;
  };

  const approveExit = async () => {
    if (!order) return;
    const ok = await completeOrder(order.id);
    if (ok) setOrder({ ...order, status: "completed", verified_at: new Date().toISOString() });
  };

  const expired = order ? new Date(order.expires_at).getTime() < Date.now() : false;
  const completed = order?.status === "completed" || order?.status === "verified";

  return (
    <AppLayout title="Staff">
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Card className="p-4 shadow-soft">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold flex items-center gap-2"><QrCode className="h-4 w-4 text-primary" /> Scan Customer QR</h2>
              <Button size="sm" variant={scanning ? "secondary" : "default"} onClick={() => { setScanning((s) => !s); setOrder(null); }}>
                {scanning ? "Stop" : "Start Scanner"}
              </Button>
            </div>
            {scanning ? (
              <div ref={containerRef} className="w-full aspect-square rounded-xl overflow-hidden border bg-black" />
            ) : (
              <div className="aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground bg-secondary/40">
                <QrCode className="h-12 w-12 mb-2" />
                <p className="text-sm">Tap "Start Scanner" to verify exit</p>
              </div>
            )}
          </Card>

          <Card className="p-4 shadow-soft">
            <h2 className="font-semibold flex items-center gap-2 mb-3">
              <Search className="h-4 w-4 text-primary" /> Manual Order Lookup
            </h2>
            <p className="text-xs text-muted-foreground mb-3">
              Enter the 8-character Order ID (e.g. <span className="font-mono">A1B2C3D4</span>) shown on the customer's receipt.
            </p>
            <form
              className="flex gap-2"
              onSubmit={(e) => { e.preventDefault(); loadOrderById(manualId); }}
            >
              <Input
                placeholder="Order ID"
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                className="font-mono uppercase"
              />
              <Button type="submit" disabled={!manualId.trim()}>Verify</Button>
            </form>
          </Card>

          {order && (() => {
            const isCash = (order.payment_method ?? "digital") === "cash";
            return (
            <Card className={`p-4 shadow-elegant ${isCash && !completed ? "ring-2 ring-accent/60 border-accent/40" : ""}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs text-muted-foreground">Order</p>
                  <p className="font-mono font-semibold">#{order.id.slice(0, 8).toUpperCase()}</p>
                  <div className="mt-1 inline-flex items-center gap-1 text-[11px]">
                    {isCash ? (
                      <Badge className="bg-accent text-accent-foreground"><Banknote className="h-3 w-3 mr-1" /> Cash Pending {order.counter_no ? `• Aisle ${order.counter_no}` : ""}</Badge>
                    ) : (
                      <Badge variant="secondary"><CreditCard className="h-3 w-3 mr-1" /> Digital — Paid</Badge>
                    )}
                  </div>
                </div>
                {completed ? (
                  <Badge className="bg-success text-success-foreground"><ShieldCheck className="h-3 w-3 mr-1" /> Completed</Badge>
                ) : expired ? (
                  <Badge variant="destructive"><Clock className="h-3 w-3 mr-1" /> Expired</Badge>
                ) : (
                  <Badge className="bg-warning text-warning-foreground">{isCash ? "Awaiting cash" : "Awaiting approval"}</Badge>
                )}
              </div>
              <div className="space-y-2 mb-4">
                {items.map((i) => (
                  <div key={i.id} className="flex justify-between text-sm border-b pb-2 last:border-0">
                    <div>
                      <p className="font-medium">{i.name}</p>
                      <p className="text-xs text-muted-foreground">{i.size && `Size ${i.size} • `}Qty {i.quantity}</p>
                    </div>
                    <p className="font-semibold">₹{(i.price * i.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>
              <div className={`flex justify-between font-bold mb-4 ${isCash && !completed ? "text-gold text-lg" : ""}`}>
                <span>{isCash && !completed ? "Collect Cash" : "Total Paid"}</span>
                <span>₹{Number(order.total).toFixed(2)}</span>
              </div>
              {completed ? (
                <div className="flex items-center justify-center gap-2 text-success py-2">
                  <CheckCircle2 className="h-5 w-5" /> Customer cleared to exit
                </div>
              ) : expired ? (
                <div className="flex items-center justify-center gap-2 text-destructive py-2">
                  <XCircle className="h-5 w-5" /> QR expired — direct to help desk
                </div>
              ) : isCash ? (
                <Button className="w-full bg-success text-success-foreground hover:bg-success/90 border-0 shadow-elegant" size="lg" onClick={approveExit}>
                  <Banknote className="h-4 w-4 mr-2" /> Cash Received & Approve Exit
                </Button>
              ) : (
                <Button className="w-full gradient-primary text-primary-foreground border-0" size="lg" onClick={approveExit}>
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Approve Exit
                </Button>
              )}
            </Card>
            );
          })()}
        </div>


        <Card className="p-4 shadow-soft">
          <h2 className="font-semibold mb-3">Recent Orders (live)</h2>
          <ScrollArea className="h-[600px] pr-2">
            <div className="space-y-2">
              {recent.length === 0 && <p className="text-sm text-muted-foreground">No orders yet.</p>}
              {recent.map((o) => {
                const isCompleted = o.status === "completed" || o.status === "verified";
                const isExpired = !isCompleted && new Date(o.expires_at).getTime() < Date.now();
                return (
                  <div
                    key={o.id}
                    className="flex items-center justify-between gap-2 p-3 rounded-lg border bg-card hover:border-primary/40 transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => loadOrderById(o.id)}
                      className="flex-1 text-left"
                    >
                      <p className="font-mono text-xs text-muted-foreground">#{o.id.slice(0, 8).toUpperCase()}</p>
                      <p className="text-sm">₹{Number(o.total).toFixed(2)} • {new Date(o.created_at).toLocaleTimeString()}</p>
                    </button>
                    {isCompleted ? (
                      <Badge className="bg-success text-success-foreground">Completed</Badge>
                    ) : isExpired ? (
                      <Badge variant="destructive">Expired</Badge>
                    ) : (
                      <Button
                        size="sm"
                        className="gradient-primary text-primary-foreground border-0"
                        onClick={(e) => { e.stopPropagation(); completeOrder(o.id); }}
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Approve Exit
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Staff;
