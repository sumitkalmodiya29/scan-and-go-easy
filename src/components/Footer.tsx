import { Lock, ShieldCheck } from "lucide-react";
import { useT } from "@/lib/i18n";

export const Footer = () => {
  const { t } = useT();
  return (
    <footer className="mt-12 border-t border-white/10">
      <div className="container py-5 flex flex-wrap items-center justify-center gap-3 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full glass">
          <Lock className="h-3 w-3 text-emerald" /> {t("e2eEncrypted")}
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full glass">
          <ShieldCheck className="h-3 w-3 text-gold" /> {t("verifiedBy")}
        </span>
        <span>© {new Date().getFullYear()} ScanGo</span>
      </div>
    </footer>
  );
};
