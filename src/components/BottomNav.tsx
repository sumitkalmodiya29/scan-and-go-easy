import { NavLink, useLocation } from "react-router-dom";
import { Home, Receipt, Wallet, Settings as SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/home", icon: Home, label: "Home" },
  { to: "/orders", icon: Receipt, label: "Orders" },
  { to: "/wallet", icon: Wallet, label: "Wallet" },
  { to: "/settings", icon: SettingsIcon, label: "Settings" },
];

export const BottomNav = () => {
  const { pathname } = useLocation();
  // Hide on scanner / receipt / staff / auth / welcome
  const hidden = ["/auth", "/welcome", "/", "/staff", "/shop"].includes(pathname) || pathname.startsWith("/receipt");
  if (hidden) return null;
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 px-3"
      aria-label="Primary"
    >
      <div className="mx-auto max-w-md glass-strong rounded-[24px] shadow-elegant border border-white/10 px-2 py-1.5 flex items-center justify-around">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl tappable transition-all",
                isActive
                  ? "text-primary bg-white/5 shadow-glow"
                  : "text-muted-foreground hover:text-foreground"
              )
            }
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px] font-medium tracking-wide">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
