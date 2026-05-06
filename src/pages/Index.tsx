import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScanLine, ShoppingBag, ShieldCheck, Zap, QrCode, Clock } from "lucide-react";
import { LanguageToggle } from "@/components/LanguageToggle";
import { TrustBadges } from "@/components/TrustBadges";
import { useT } from "@/lib/i18n";

const Index = () => {
  const { user, role, loading } = useAuth();
  const { t } = useT();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && role) {
      navigate(role === "customer" ? "/shop" : "/staff", { replace: true });
    }
  }, [user, role, loading, navigate]);

  return (
    <div className="min-h-screen">
      <header className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-lg">
          <ScanLine className="h-6 w-6 text-emerald" />
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">ScanGo</span>
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <Button asChild variant="ghost" className="tappable"><Link to="/auth">{t("signIn")}</Link></Button>
        </div>
      </header>

      <section className="gradient-hero">
        <div className="container py-20 md:py-28 text-center">
          <div className="inline-flex items-center gap-2 glass px-3 py-1 rounded-full text-xs mb-6">
            <Zap className="h-3 w-3 text-gold" /> {t("appTagline")}
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4 max-w-3xl mx-auto bg-gradient-to-br from-foreground via-foreground to-primary/70 bg-clip-text text-transparent">
            Self-checkout for modern retail
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-6">
            Scan products with your phone, pay in-app, and walk out with a secure QR pass.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
            <Button asChild size="lg" className="tappable gradient-primary text-primary-foreground border-0 shadow-elegant">
              <Link to="/auth"><ShoppingBag className="h-4 w-4 mr-2" /> Start shopping</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="tappable glass border-white/20">
              <Link to="/auth"><ShieldCheck className="h-4 w-4 mr-2" /> Staff login</Link>
            </Button>
          </div>
          <TrustBadges />
        </div>
      </section>

      <section className="container py-16">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: ScanLine, title: "Scan", text: "Use your phone camera to scan barcodes as you shop." },
            { icon: QrCode, title: "Pay & get QR", text: "Mock UPI/card checkout instantly generates a secure exit pass." },
            { icon: Clock, title: "10-min, one-time", text: "QR expires in 10 minutes and works only once at the exit." },
          ].map((f) => (
            <Card key={f.title} className="p-6 glass shadow-soft hover:shadow-elegant transition-smooth border-0 tappable-lift">
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
