import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ScanLine, Sparkles, TrendingUp, Crown } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { OfflineBadge } from "@/components/OfflineBadge";
import { LanguageToggle } from "@/components/LanguageToggle";
import { NamasteWelcome } from "@/components/NamasteWelcome";

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [points, setPoints] = useState(0);
  const [orderCount, setOrderCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle()
      .then(({ data }) => setName((data?.full_name ?? "").split(" ")[0] || "there"));
    supabase.from("orders").select("total").eq("user_id", user.id)
      .then(({ data }) => {
        const list = data ?? [];
        setOrderCount(list.length);
        setPoints(Math.floor(list.reduce((s: number, o: any) => s + Number(o.total) * 0.01, 0)));
      });
  }, [user]);

  const tier = points >= 500 ? "Platinum" : points >= 200 ? "Gold" : points >= 50 ? "Silver" : "Member";
  const initial = (name || "U").charAt(0).toUpperCase();

  return (
    <div className="min-h-screen pb-32 page-slide">
      {/* Header */}
      <header className="px-5 pt-8 pb-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground">{greeting()},</div>
          <h1 className="text-2xl font-bold tracking-tight">{name || "Welcome"} 👋</h1>
        </div>
        <div className="flex items-center gap-2">
          <OfflineBadge />
          <LanguageToggle />
          <button
            onClick={() => navigate("/settings")}
            className="h-11 w-11 rounded-full gradient-primary grid place-items-center font-semibold text-primary-foreground shadow-glow tappable"
            aria-label="Profile"
          >
            {initial}
          </button>
        </div>
      </header>

      {/* Loyalty Card */}
      <section className="px-5">
        <div className="glass-strong rounded-[24px] p-5 shadow-elegant relative overflow-hidden animate-float-in">
          <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full gradient-amber opacity-30 blur-3xl pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-widest">
              <Crown className="h-3.5 w-3.5 text-gold" /> {tier} Member
            </div>
            <span className="text-xs glass px-2.5 py-1 rounded-full">ScanGo</span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-xs text-muted-foreground mb-1">GoPoints</div>
              <div className="text-4xl font-bold bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                {points}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground mb-1">Orders</div>
              <div className="text-2xl font-semibold">{orderCount}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick stats */}
      <section className="px-5 mt-4 grid grid-cols-2 gap-3">
        <button onClick={() => navigate("/orders")} className="glass rounded-[20px] p-4 text-left tappable-lift">
          <TrendingUp className="h-5 w-5 text-emerald mb-2" />
          <div className="text-xs text-muted-foreground">Recent</div>
          <div className="font-semibold">{orderCount} orders</div>
        </button>
        <button onClick={() => navigate("/wallet")} className="glass rounded-[20px] p-4 text-left tappable-lift">
          <Sparkles className="h-5 w-5 text-gold mb-2" />
          <div className="text-xs text-muted-foreground">Wallet</div>
          <div className="font-semibold">{points} pts</div>
        </button>
      </section>

      {/* Floating Start Shopping CTA */}
      <section className="px-5 mt-10 grid place-items-center">
        <button
          onClick={() => navigate("/shop")}
          className="relative h-40 w-40 rounded-full gradient-primary grid place-items-center text-primary-foreground font-bold shadow-glow tappable animate-pulse-glow"
          aria-label="Start Shopping"
        >
          <span className="absolute inset-0 rounded-full bg-white/10 blur-xl" />
          <div className="relative flex flex-col items-center gap-1">
            <ScanLine className="h-10 w-10" />
            <span className="text-sm">Start Shopping</span>
          </div>
        </button>
        <p className="mt-4 text-xs text-muted-foreground">Tap to open the scanner</p>
      </section>

      <BottomNav />
    </div>
  );
};

export default Home;
