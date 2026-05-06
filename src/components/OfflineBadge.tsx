import { useEffect, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";
import { useT } from "@/lib/i18n";
import { syncQueue, queueAll } from "@/lib/db";
import { toast } from "sonner";

export const useOnline = () => {
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const refresh = async () => setPending((await queueAll()).length);
    refresh();

    const on = async () => {
      setOnline(true);
      const synced = await syncQueue();
      if (synced > 0) toast.success(`Synced ${synced} offline order${synced === 1 ? "" : "s"}`);
      refresh();
    };
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    const t = setInterval(refresh, 5000);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      clearInterval(t);
    };
  }, []);

  return { online, pending };
};

export const OfflineBadge = () => {
  const { online, pending } = useOnline();
  const { t } = useT();
  if (online && pending === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-success/90 font-medium">
        <Wifi className="h-3 w-3" /> Online
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border backdrop-blur-md ${
        online
          ? "bg-warning/15 text-warning border-warning/30"
          : "bg-destructive/15 text-destructive border-destructive/30 animate-pulse"
      }`}
    >
      <WifiOff className="h-3 w-3" />
      {online ? `Syncing ${pending}…` : t("workingOffline")}
    </span>
  );
};
