import { useEffect, useState } from "react";
import { Volume2, Sparkles } from "lucide-react";
import { useT } from "@/lib/i18n";

const SESSION_KEY = "scango.namasteSeen";

/**
 * Premium glassmorphism overlay shown once per browser session
 * after the customer enters the dashboard. Indian cultural welcome
 * with glowing gold Namaste (🙏) icon, bilingual i18n, and a
 * subtle text-to-speech greeting button.
 */
export const NamasteWelcome = () => {
  const { t, lang } = useT();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SESSION_KEY) === "1") return;
    // tiny delay so the page paints first
    const id = setTimeout(() => setOpen(true), 250);
    return () => clearTimeout(id);
  }, []);

  const dismiss = () => {
    setClosing(true);
    sessionStorage.setItem(SESSION_KEY, "1");
    setTimeout(() => setOpen(false), 280);
  };

  const speak = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const text = lang === "hi"
        ? "नमस्ते कस्टमर, ScanGo में आपका स्वागत है।"
        : "Namaste Customer. Welcome to ScanGo.";
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang === "hi" ? "hi-IN" : "en-IN";
      u.rate = 0.95;
      u.pitch = 1.05;
      window.speechSynthesis.speak(u);
    } catch { /* noop */ }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="namaste-title"
      className={`fixed inset-0 z-[100] grid place-items-center px-5 ${closing ? "animate-fade-out" : "animate-fade-in"}`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/60 backdrop-blur-2xl"
        onClick={dismiss}
      />
      {/* Card */}
      <div className={`relative w-full max-w-sm rounded-[28px] glass-strong shadow-elegant border border-accent/30 p-7 text-center ${closing ? "" : "animate-scale-in"}`}>
        {/* Gold glow halo */}
        <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 h-44 w-44 rounded-full gradient-amber opacity-40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -right-10 h-40 w-40 rounded-full bg-primary/30 blur-3xl" />

        {/* Folded-hands icon — emoji with glowing gold halo */}
        <div className="relative mx-auto mb-5 h-28 w-28 grid place-items-center">
          <div className="absolute inset-0 rounded-full gradient-amber opacity-30 blur-2xl animate-pulse-glow" />
          <div className="absolute inset-2 rounded-full border border-accent/50 shadow-amber" />
          <span
            className="relative text-6xl select-none"
            style={{
              filter: "drop-shadow(0 0 14px hsl(var(--accent) / 0.85)) drop-shadow(0 0 28px hsl(var(--accent) / 0.45))",
            }}
            aria-hidden="true"
          >
            🙏
          </span>
        </div>

        <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-[0.25em] text-gold mb-2">
          <Sparkles className="h-3 w-3" /> ScanGo
        </div>

        <h2
          id="namaste-title"
          className="text-2xl font-bold bg-gradient-to-r from-accent via-accent-glow to-accent bg-clip-text text-transparent animate-fade-in"
        >
          {t("namasteTitle")}
        </h2>
        <p className="mt-1 text-lg font-medium text-foreground/90 animate-fade-in">
          {t("namasteSubtitle")}
        </p>
        <p className="mt-2 text-xs text-muted-foreground animate-fade-in">
          {t("namasteTagline")}
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={dismiss}
            className="w-full h-12 rounded-2xl gradient-amber text-accent-foreground font-semibold shadow-amber tappable"
          >
            {t("enterStore")}
          </button>
          <button
            onClick={speak}
            className="inline-flex items-center justify-center gap-2 mx-auto mt-1 text-xs text-muted-foreground hover:text-accent transition-colors tappable"
            aria-label={t("playWelcome")}
          >
            <Volume2 className="h-3.5 w-3.5" /> {t("playWelcome")}
          </button>
        </div>
      </div>
    </div>
  );
};
