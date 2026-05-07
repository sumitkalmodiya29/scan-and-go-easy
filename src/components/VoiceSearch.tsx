import { useState, useRef } from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

interface Props { onResult: (text: string) => void; }

// Lightweight webkitSpeechRecognition wrapper
export const VoiceSearch = ({ onResult }: Props) => {
  const { t, lang } = useT();
  const [active, setActive] = useState(false);
  const recRef = useRef<any>(null);

  const start = () => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error("Voice search not supported in this browser"); return; }
    const r = new SR();
    r.lang = lang === "hi" ? "hi-IN" : "en-IN";
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (e: any) => {
      const txt = e.results?.[0]?.[0]?.transcript ?? "";
      if (txt) { toast.success(`🎙 "${txt}"`); onResult(txt); }
    };
    r.onerror = () => toast.error("Mic error");
    r.onend = () => setActive(false);
    recRef.current = r;
    r.start();
    setActive(true);
    toast.message(t("listening"), { description: t("sayItem") });
  };

  const stop = () => { try { recRef.current?.stop(); } catch { /* noop */ } setActive(false); };

  return (
    <Button
      type="button" size="icon" variant={active ? "destructive" : "secondary"}
      className={`h-9 w-9 tappable ${active ? "animate-pulse-glow" : ""}`}
      onClick={active ? stop : start}
      aria-label={t("voiceSearch")}
      title={t("voiceSearch")}
    >
      {active ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </Button>
  );
};
