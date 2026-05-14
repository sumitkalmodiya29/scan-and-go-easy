import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { Receipt as ReceiptIcon, ChevronRight } from "lucide-react";

interface Order { id: string; total: number; created_at: string; status: string; }

const Orders = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("orders").select("id,total,created_at,status")
      .eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => setOrders((data as Order[]) ?? []));
  }, [user]);

  return (
    <div className="min-h-screen pb-32 page-slide px-5 pt-8">
      <h1 className="text-2xl font-bold mb-5">Orders</h1>
      {orders.length === 0 ? (
        <div className="glass rounded-[20px] p-10 text-center text-muted-foreground">
          No orders yet. Tap Start Shopping to begin.
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id}>
              <button
                onClick={() => navigate(`/receipt/${o.id}`)}
                className="w-full glass rounded-[20px] p-4 flex items-center justify-between tappable-lift"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl gradient-primary grid place-items-center">
                    <ReceiptIcon className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">₹{Number(o.total).toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleString()} · {o.status}
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <BottomNav />
    </div>
  );
};

export default Orders;
