import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, ShieldCheck, ArrowLeft } from "lucide-react";

interface Order {
  id: string;
  total: number;
  status: string;
  qr_token: string;
  expires_at: string;
  verified_at: string | null;
}
interface Item {
  id: string;
  name: string;
  price: number;
  quantity: number;
  size: string | null;
}

const Receipt = () => {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data: o } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
      const { data: it } = await supabase.from("order_items").select("*").eq("order_id", id);
      setOrder(o as Order);
      setItems((it as Item[]) ?? []);
    };
    load();

    const ch = supabase
      .channel(`order-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${id}` },
        (p) => setOrder(p.new as Order))
      .subscribe();

    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => { supabase.removeChannel(ch); clearInterval(t); };
  }, [id]);

  if (!order) {
    return <AppLayout title="Receipt"><Card className="p-8 text-center text-muted-foreground">Loading receipt...</Card></AppLayout>;
  }

  const expiresMs = new Date(order.expires_at).getTime() - now;
  const expired = expiresMs <= 0;
  const verified = !!order.verified_at;
  const mins = Math.max(0, Math.floor(expiresMs / 60000));
  const secs = Math.max(0, Math.floor((expiresMs % 60000) / 1000));
  const pct = Math.max(0, Math.min(100, (expiresMs / (10 * 60 * 1000)) * 100));

  const qrPayload = JSON.stringify({ order_id: order.id, token: order.qr_token });

  return (
    <AppLayout title="Exit Pass">
      <div className="max-w-md mx-auto space-y-4">
        <Link to="/shop" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to shop
        </Link>

        <Card className="p-6 shadow-elegant gradient-card text-center">
          <div className="flex items-center justify-center gap-2 mb-1 text-success">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-semibold">Payment Successful</span>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Order #{order.id.slice(0, 8).toUpperCase()}</p>

          <div className="bg-white rounded-xl p-4 inline-block shadow-soft border">
            {verified ? (
              <div className="w-[220px] h-[220px] flex flex-col items-center justify-center text-success">
                <ShieldCheck className="h-16 w-16 mb-2" />
                <p className="font-semibold">Verified</p>
                <p className="text-xs text-muted-foreground">Exit approved</p>
              </div>
            ) : expired ? (
              <div className="w-[220px] h-[220px] flex flex-col items-center justify-center text-destructive">
                <Clock className="h-16 w-16 mb-2" />
                <p className="font-semibold">QR Expired</p>
                <p className="text-xs text-muted-foreground">Visit help desk</p>
              </div>
            ) : (
              <QRCodeCanvas value={qrPayload} size={220} level="H" />
            )}
          </div>

          {!verified && !expired && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-warning" />
                <span className="font-mono font-semibold">
                  {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
                </span>
                <span className="text-muted-foreground">remaining</span>
              </div>
              <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                <div className="h-full gradient-primary transition-all" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">Show this QR at the exit. One-time use.</p>
            </div>
          )}

          {verified && <Badge className="mt-3 bg-success text-success-foreground">Checked Out</Badge>}
        </Card>

        <Card className="p-4 shadow-soft">
          <h3 className="font-semibold mb-3">Items ({items.reduce((s, i) => s + i.quantity, 0)})</h3>
          <div className="space-y-2">
            {items.map((i) => (
              <div key={i.id} className="flex justify-between text-sm">
                <span>
                  {i.name} {i.size && <span className="text-muted-foreground">({i.size})</span>}
                  <span className="text-muted-foreground"> × {i.quantity}</span>
                </span>
                <span className="font-medium">₹{(i.price * i.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="border-t mt-3 pt-3 flex justify-between font-bold">
            <span>Total Paid</span>
            <span>₹{Number(order.total).toFixed(2)}</span>
          </div>
        </Card>

        <Button asChild variant="outline" className="w-full">
          <Link to="/shop">Start new shopping trip</Link>
        </Button>
      </div>
    </AppLayout>
  );
};

export default Receipt;
