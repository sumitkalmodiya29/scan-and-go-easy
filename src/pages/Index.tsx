import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScanLine, ShoppingBag, ShieldCheck, Zap, QrCode, Clock } from "lucide-react";

const Index = () => {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && role) {
      navigate(role === "customer" ? "/shop" : "/staff", { replace: true });
    }
  }, [user, role, loading, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-lg">
          <ScanLine className="h-6 w-6 text-primary" />
          <span>ScanGo</span>
        </div>
        <Button asChild variant="ghost"><Link to="/auth">Sign in</Link></Button>
      </header>

      <section className="gradient-hero text-primary-foreground">
        <div className="container py-20 md:py-28 text-center">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur px-3 py-1 rounded-full text-xs mb-6">
            <Zap className="h-3 w-3" /> Skip the queue. Forever.
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4 max-w-3xl mx-auto">
            Self-checkout for modern retail
          </h1>
          <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto mb-8">
            Customers scan products with their phone, pay in-app, and walk out with a secure QR pass. Staff verify in seconds.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" variant="secondary" className="shadow-elegant">
              <Link to="/auth"><ShoppingBag className="h-4 w-4 mr-2" /> Start shopping</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-white/10 border-white/30 text-primary-foreground hover:bg-white/20">
              <Link to="/auth"><ShieldCheck className="h-4 w-4 mr-2" /> Staff login</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="container py-16">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: ScanLine, title: "Scan", text: "Use your phone camera to scan barcodes as you shop." },
            { icon: QrCode, title: "Pay & get QR", text: "Mock UPI/card checkout instantly generates a secure exit pass." },
            { icon: Clock, title: "10-min, one-time", text: "QR expires in 10 minutes and works only once at the exit." },
          ].map((f) => (
            <Card key={f.title} className="p-6 shadow-soft hover:shadow-elegant transition-smooth">
              <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center mb-4">
                <f.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.text}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Index;
