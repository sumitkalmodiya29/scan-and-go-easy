import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScanLine, CreditCard, DoorOpen, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const SEEN_KEY = "scango.welcomeSeen";

const slides = [
  { icon: ScanLine, title: "Scan items", text: "Use your phone camera to scan products as you shop." },
  { icon: CreditCard, title: "Pay digitally", text: "One-tap UPI or card checkout — no queues, no waiting." },
  { icon: DoorOpen, title: "Quick exit", text: "Show your secure QR pass at the door and walk right out." },
];

const Welcome = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [phase, setPhase] = useState<"splash" | "onboarding">("splash");
  const [step, setStep] = useState(0);

  // Splash → onboarding
  useEffect(() => {
    const t = setTimeout(() => setPhase("onboarding"), 1600);
    return () => clearTimeout(t);
  }, []);

  const finish = () => {
    localStorage.setItem(SEEN_KEY, "1");
    if (user && role) {
      navigate(role === "customer" ? "/home" : "/staff", { replace: true });
    } else {
      navigate("/auth", { replace: true });
    }
  };

  const next = () => (step < slides.length - 1 ? setStep(step + 1) : finish());

  // Slide-to-unlock
  const trackRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);

  const onDown = (e: React.PointerEvent) => {
    setDragging(true);
    startX.current = e.clientX - drag;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const max = (trackRef.current?.offsetWidth ?? 280) - 56;
    setDrag(Math.max(0, Math.min(max, e.clientX - startX.current)));
  };
  const onUp = () => {
    setDragging(false);
    const max = (trackRef.current?.offsetWidth ?? 280) - 56;
    if (drag > max * 0.75) finish();
    else setDrag(0);
  };

  if (phase === "splash") {
    return (
      <div className="fixed inset-0 grid place-items-center gradient-hero">
        <div className="flex flex-col items-center gap-3 splash-pop">
          <div className="h-24 w-24 rounded-[28px] gradient-primary grid place-items-center shadow-glow">
            <ScanLine className="h-12 w-12 text-primary-foreground" />
          </div>
          <div className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent tracking-tight">
            ScanGo
          </div>
          <div className="text-xs text-muted-foreground">Skip the queue. Forever.</div>
        </div>
      </div>
    );
  }

  const isLast = step === slides.length - 1;

  return (
    <div className="min-h-screen flex flex-col gradient-hero px-6 py-10">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 font-semibold">
          <ScanLine className="h-5 w-5 text-emerald" /> ScanGo
        </div>
        <button onClick={finish} className="text-xs text-muted-foreground tappable px-3 py-1.5 rounded-full glass">
          Skip
        </button>
      </div>

      <div className="flex-1 grid place-items-center">
        <div className="w-full max-w-sm">
          <div className="overflow-hidden rounded-[24px]">
            <div
              className="flex transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
              style={{ transform: `translateX(-${step * 100}%)` }}
            >
              {slides.map((s, i) => (
                <div key={i} className="min-w-full px-2">
                  <div className="glass-strong rounded-[28px] p-8 text-center shadow-elegant">
                    <div className="mx-auto mb-6 h-20 w-20 rounded-[24px] gradient-primary grid place-items-center shadow-glow">
                      <s.icon className="h-10 w-10 text-primary-foreground" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">{s.title}</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">{s.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dots */}
          <div className="flex justify-center gap-2 mt-6">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === step ? "w-6 bg-primary" : "w-1.5 bg-white/20"
                )}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-sm mx-auto w-full">
        {!isLast ? (
          <button
            onClick={next}
            className="w-full h-14 rounded-[20px] gradient-primary text-primary-foreground font-semibold shadow-glow tappable flex items-center justify-center gap-2"
          >
            Continue <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <div
            ref={trackRef}
            className="relative h-14 rounded-[20px] glass-strong overflow-hidden select-none"
          >
            <div
              className="absolute inset-0 grid place-items-center text-sm text-muted-foreground pointer-events-none"
              style={{ opacity: 1 - drag / 200 }}
            >
              Slide to get started →
            </div>
            <div
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
              className={cn(
                "absolute top-1 left-1 h-12 w-12 rounded-[16px] gradient-primary grid place-items-center shadow-glow touch-none cursor-grab",
                dragging && "cursor-grabbing"
              )}
              style={{ transform: `translateX(${drag}px)`, transition: dragging ? "none" : "transform 250ms ease" }}
            >
              <ChevronRight className="h-5 w-5 text-primary-foreground" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Welcome;
