import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { Sparkles, Crown } from "lucide-react";

const Wallet = () => {
  const { user } = useAuth();
  const [points, setPoints] = useState(0);
  const [spent, setSpent] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase.from("orders").select("total").eq("user_id", user.id)
      .then(({ data }) => {
        const list = data ?? [];
        const sum = list.reduce((s: number, o: any) => s + Number(o.total), 0);
        setSpent(sum);
        setPoints(Math.floor(sum * 0.01));
      });
  }, [user]);

  const tier = points >= 500 ? "Platinum" : points >= 200 ? "Gold" : points >= 50 ? "Silver" : "Member";

  return (
    <div className="min-h-screen pb-32 page-slide px-5 pt-8">
      <h1 className="text-2xl font-bold mb-5">Wallet</h1>
      <div className="glass-strong rounded-[28px] p-6 shadow-elegant relative overflow-hidden">
        <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full gradient-amber opacity-30 blur-3xl" />
        <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-widest mb-4">
          <Crown className="h-3.5 w-3.5 text-gold" /> {tier}
        </div>
        <div className="text-xs text-muted-foreground">GoPoints balance</div>
        <div className="text-5xl font-bold bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
          {points}
        </div>
        <div className="mt-3 text-xs text-muted-foreground">≈ ₹{points} reward value</div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="glass rounded-[20px] p-4">
          <Sparkles className="h-5 w-5 text-gold mb-2" />
          <div className="text-xs text-muted-foreground">Total Spent</div>
          <div className="font-semibold">₹{spent.toFixed(2)}</div>
        </div>
        <div className="glass rounded-[20px] p-4">
          <Sparkles className="h-5 w-5 text-emerald mb-2" />
          <div className="text-xs text-muted-foreground">Cashback Rate</div>
          <div className="font-semibold">1%</div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Wallet;
