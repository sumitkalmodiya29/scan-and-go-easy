import { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ScanLine, LogOut } from "lucide-react";

export const AppLayout = ({ children, title }: { children: ReactNode; title?: string }) => {
  const { signOut, role } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-14 items-center justify-between">
          <Link to={role === "staff" ? "/staff" : "/shop"} className="flex items-center gap-2 font-bold">
            <ScanLine className="h-5 w-5 text-primary" />
            <span>ScanGo</span>
            {title && <span className="text-muted-foreground font-normal hidden sm:inline">/ {title}</span>}
          </Link>
          <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate("/auth"); }}>
            <LogOut className="h-4 w-4 mr-1" /> Sign out
          </Button>
        </div>
      </header>
      <main className="container py-6">{children}</main>
    </div>
  );
};
