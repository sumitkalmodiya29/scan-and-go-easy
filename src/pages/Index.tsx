import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ScanLine } from "lucide-react";

const Index = () => {
  const { user, role, loading } = useAuth();
  const seen = typeof window !== "undefined" && localStorage.getItem("scango.welcomeSeen") === "1";

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <ScanLine className="h-8 w-8 text-primary animate-pulse" />
      </div>
    );
  }
  if (!seen) return <Navigate to="/welcome" replace />;
  if (!user) return <Navigate to="/auth" replace />;
  return <Navigate to={role === "customer" ? "/home" : "/staff"} replace />;
};

export default Index;
