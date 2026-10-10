import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { CartProvider } from "@/hooks/useCart";
import { RequireAuth } from "@/components/RequireAuth";
import { I18nProvider } from "@/lib/i18n";
import { useEffect } from "react";
import { primeCache, refreshProductCache, isCacheStale } from "@/lib/productCache";
import { syncQueue } from "@/lib/db";
import { toast } from "sonner";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import Shop from "./pages/Shop.tsx";
import Receipt from "./pages/Receipt.tsx";
import Staff from "./pages/Staff.tsx";
import Oops from "./pages/Oops.tsx";
import Settings from "./pages/Settings.tsx";
import Welcome from "./pages/Welcome.tsx";
import Home from "./pages/Home.tsx";
import Orders from "./pages/Orders.tsx";
import Wallet from "./pages/Wallet.tsx";
import Inventory from "./pages/Inventory.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const Bootstrap = () => {
  useEffect(() => {
    (async () => {
      await primeCache();
      if (await isCacheStale()) refreshProductCache();
    })();
    const onOnline = async () => {
      const synced = await syncQueue();
      if (synced > 0) toast.success(`Synced ${synced} offline order${synced === 1 ? "" : "s"}`);
    };
    window.addEventListener("online", onOnline);
    onOnline();
    return () => window.removeEventListener("online", onOnline);
  }, []);
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <I18nProvider>
        <AuthProvider>
          <CartProvider>
            <Bootstrap />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/welcome" element={<Welcome />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/home" element={<RequireAuth role="customer"><Home /></RequireAuth>} />
              <Route path="/orders" element={<RequireAuth role="customer"><Orders /></RequireAuth>} />
              <Route path="/wallet" element={<RequireAuth role="customer"><Wallet /></RequireAuth>} />
              <Route path="/shop" element={<RequireAuth role="customer"><Shop /></RequireAuth>} />
              <Route path="/receipt/:id" element={<RequireAuth><Receipt /></RequireAuth>} />
              <Route path="/staff" element={<RequireAuth role={["staff", "admin"]}><Staff /></RequireAuth>} />
              <Route path="/inventory" element={<RequireAuth role={["staff", "admin"]}><Inventory /></RequireAuth>} />
              <Route path="/oops" element={<Oops />} />
              <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </CartProvider>
        </AuthProvider>
        </I18nProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
