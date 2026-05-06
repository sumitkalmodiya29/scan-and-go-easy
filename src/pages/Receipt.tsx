import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, ShieldCheck, ArrowLeft, Download } from "lucide-react";
import { generateReceiptPDF } from "@/lib/receiptPdf";
import { TrustBadges } from "@/components/TrustBadges";
import { useT } from "@/lib/i18n";

interface Order {
  id: string; total: number; status: string;
  qr_token: string; expires_at: string; verified_at: string | null;
  created_at: string;
}
interface Item { id: string; name: string; price: number; quantity: number; size: string | null; }

const Receipt = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useT();
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

  const TOTAL_MS = 10 * 60 * 1000;
  const expiresMs = new Date(order.expires_at).getTime() - now;
  const expired = expiresMs <= 0;
  const verified = !!order.verified_at;
  const mins = Math.max(0, Math.floor(expiresMs / 60000));
  const secs = Math.max(0, Math.floor((expiresMs % 60000) / 1000));
  const pct = Math.max(0, Math.min(1, expiresMs / TOTAL_MS));

  if (expired && !verified) {
    // Soft redirect option to oops, but keep page so customer sees status
  }

  const qrPayload = JSON.stringify({ order_id: order.id, token: order.qr_token });

  // Circular ring math
  const size = 260;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;
  const ringColor = expiresMs < 60000 ? "hsl(var(--destructive))" : expiresMs < 180000 ? "hsl(var(--accent))" : "hsl(var(--primary))";

  const downloadPdf = () => {
    generateReceiptPDF({
      orderId: order.id,
      total: Number(order.total),
      items: items.map(i => ({ name: i.name, quantity: i.quantity, price: Number(i.price), size: i.size })),
      createdAt: order.created_at,
    });
  };

  return (
    <AppLayout title={t("receipt")}>
      <div className="max-w-md mx-auto space-y-4">
        <Link to="/shop" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground tappable">
          <ArrowLeft className="h-4 w-4 mr-1" /> {t("backToShop")}
        </Link>

        <Card className="p-6 glass-strong shadow-elegant border-0 text-center animate-float-in">
          <div className="flex items-center justify-center gap-2 mb-1 text-success">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-semibold">{t("paymentSuccessful")}</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Order #{order.id.slice(0, 8).toUpperCase()}</p>

          <div className="mb-4 flex justify-center">
            <TrustBadges />
          </div>

          <div className="relative inline-block">
            {!verified && !expired && (
              <svg width={size} height={size} className="absolute inset-0 -rotate-90">
                <circle cx={size/2} cy={size/2} r={r} stroke="hsl(var(--muted))" strokeWidth={stroke} fill="none" />
                <circle cx={size/2} cy={size/2} r={r}
                  stroke={ringColor} strokeWidth={stroke} fill="none" strokeLinecap="round"
                  strokeDasharray={circ} strokeDashoffset={circ - dash}
                  style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s" }} />
              </svg>
            )}
            <div className="bg-white rounded-2xl p-4 inline-block shadow-soft border" style={{ width: size, height: size }}>
              {verified ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-success">
                  <ShieldCheck className="h-16 w-16 mb-2 animate-pulse-glow rounded-full" />
                  <p className="font-semibold">{t("verified")}</p>
                  <p className="text-xs text-muted-foreground">{t("exitApproved")}</p>
                </div>
              ) : expired ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-destructive">
                  <Clock className="h-16 w-16 mb-2" />
                  <p className="font-semibold">{t("qrExpired")}</p>
                  <Button size="sm" variant="outline" className="mt-2 tappable" onClick={() => navigate("/oops?reason=expired")}>What now?</Button>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <QRCodeCanvas value={qrPayload} size={size - 48} level="H" />
                </div>
              )}
            </div>
          </div>

          {!verified && !expired && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-warning" />
                <span className="font-mono font-semibold text-lg">
                  {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
                </span>
                <span className="text-muted-foreground">{t("remaining")}</span>
              </div>
              <p className="text-xs text-muted-foreground">{t("showQr")}</p>
            </div>
          )}

          {verified && <Badge className="mt-3 bg-success text-success-foreground">{t("checkedOut")}</Badge>}
        </Card>

        <Card className="p-4 glass shadow-soft border-0">
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
          <div className="border-t border-white/10 mt-3 pt-3 flex justify-between font-bold">
            <span>{t("total")}</span>
            <span>₹{Number(order.total).toFixed(2)}</span>
          </div>
        </Card>

        <Button onClick={downloadPdf} className="w-full gradient-amber text-accent-foreground border-0 shadow-amber tappable font-semibold" size="lg">
          <Download className="h-4 w-4 mr-2" /> {t("downloadPdf")}
        </Button>

        <Button asChild variant="outline" className="w-full tappable">
          <Link to="/shop">{t("newTrip")}</Link>
        </Button>
      </div>
    </AppLayout>
  );
};

export default Receipt;
