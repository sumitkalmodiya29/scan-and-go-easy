import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth, AppRole } from "@/hooks/useAuth";
import { ScanLine } from "lucide-react";

export const RequireAuth = ({ children, role }: { children: ReactNode; role?: AppRole | AppRole[] }) => {
  const { user, role: userRole, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ScanLine className="h-8 w-8 text-primary animate-pulse" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (role) {
    const allowed = Array.isArray(role) ? role : [role];
    if (userRole && !allowed.includes(userRole)) {
      return <Navigate to={userRole === "staff" || userRole === "admin" ? "/staff" : "/shop"} replace />;
    }
  }
  return <>{children}</>;
};
