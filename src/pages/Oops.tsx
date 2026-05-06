import { Link, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowLeft, RefreshCw, LifeBuoy } from "lucide-react";

const reasons: Record<string, { title: string; body: string; cta: string; href: string }> = {
  payment: {
    title: "Payment couldn't be completed",
    body: "No money was deducted. Please check your connection or try a different payment method.",
    cta: "Try again",
    href: "/shop",
  },
  expired: {
    title: "Your exit QR expired",
    body: "QR codes are valid for 10 minutes for security. Please visit the help desk to verify your purchase manually.",
    cta: "Back to shop",
    href: "/shop",
  },
  default: {
    title: "Oops — something went sideways",
    body: "An unexpected issue occurred. Don't worry — your data is safe.",
    cta: "Go home",
    href: "/",
  },
};

const Oops = () => {
  const [params] = useSearchParams();
  const r = params.get("reason") ?? "default";
  const info = reasons[r] ?? reasons.default;

  return (
    <AppLayout title="Oops">
      <div className="max-w-md mx-auto pt-8 animate-float-in">
        <Card className="p-8 text-center shadow-elegant gradient-card border-0">
          <div className="mx-auto h-20 w-20 rounded-full gradient-amber flex items-center justify-center shadow-amber mb-4 animate-pulse-glow">
            <AlertTriangle className="h-10 w-10 text-accent-foreground" />
          </div>
          <h1 className="text-2xl font-bold mb-2">{info.title}</h1>
          <p className="text-muted-foreground mb-6">{info.body}</p>
          <div className="flex flex-col gap-2">
            <Button asChild size="lg" className="gradient-primary text-primary-foreground border-0 tappable">
              <Link to={info.href}><RefreshCw className="h-4 w-4 mr-2" /> {info.cta}</Link>
            </Button>
            <Button asChild variant="outline" className="tappable">
              <Link to="/shop"><ArrowLeft className="h-4 w-4 mr-2" /> Back to shop</Link>
            </Button>
            <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
              <LifeBuoy className="h-3 w-3" /> Need help? Visit the in-store help desk.
            </p>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Oops;
