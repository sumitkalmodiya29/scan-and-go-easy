import { ShieldCheck, Lock, BadgeCheck } from "lucide-react";
import { useT } from "@/lib/i18n";

export const TrustBadges = ({ compact = false }: { compact?: boolean }) => {
  const { t } = useT();
  return (
    <div className={`flex flex-wrap items-center gap-2 ${compact ? "" : "justify-center"}`}>
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full glass text-[11px] font-medium">
        <Lock className="h-3 w-3 text-emerald" /> {t("sslSecured")}
      </span>
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full glass text-[11px] font-medium">
        <BadgeCheck className="h-3 w-3 text-gold" /> {t("verifiedPayment")}
      </span>
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full glass text-[11px] font-medium">
        <ShieldCheck className="h-3 w-3 text-emerald" /> PCI-DSS
      </span>
    </div>
  );
};
