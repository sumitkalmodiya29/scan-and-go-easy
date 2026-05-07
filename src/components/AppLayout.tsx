import { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ScanLine, LogOut, Settings as SettingsIcon } from "lucide-react";
import { LanguageToggle } from "./LanguageToggle";
import { OfflineBadge } from "./OfflineBadge";
import { Footer } from "./Footer";
import { useT } from "@/lib/i18n";

export const AppLayout = ({ children, title }: { children: ReactNode; title?: string }) => {
  const { signOut, role } = useAuth();
  const navigate = useNavigate();
  const { t } = useT();
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 glass border-b border-white/10">
        <div className="container flex h-14 items-center justify-between gap-2">
          <Link to={role === "staff" ? "/staff" : "/shop"} className="flex items-center gap-2 font-bold">
            <ScanLine className="h-5 w-5 text-emerald" />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">ScanGo</span>
            {title && <span className="text-muted-foreground font-normal hidden sm:inline">/ {title}</span>}
          </Link>
          <div className="flex items-center gap-2">
            <OfflineBadge />
            <LanguageToggle />
            <Button variant="ghost" size="icon" className="tappable h-8 w-8" onClick={() => navigate("/settings")} aria-label={t("settings")} title={t("settings")}>
              <SettingsIcon className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="tappable" onClick={async () => { await signOut(); navigate("/auth"); }}>
              <LogOut className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">{t("signOut")}</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="container py-6">{children}</main>
      <Footer />
    </div>
  );
};
