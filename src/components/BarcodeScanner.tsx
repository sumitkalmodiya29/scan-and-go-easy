import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface Props {
  onScan: (text: string) => void;
  onError?: (err: string) => void;
}

export const BarcodeScanner = ({ onScan, onError }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lockRef = useRef(false);

  useEffect(() => {
    if (!ref.current) return;
    const id = "scanner-region";
    ref.current.id = id;
    const scanner = new Html5Qrcode(id, { verbose: false });
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: { ideal: "environment" } },
        {
          fps: 12,
          qrbox: { width: 280, height: 180 },
          aspectRatio: 1.333,
          videoConstraints: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            // @ts-expect-error advanced constraints
            advanced: [{ focusMode: "continuous" }, { exposureMode: "continuous" }, { whiteBalanceMode: "continuous" }],
          } as MediaTrackConstraints,
        },
        (decoded) => {
          if (lockRef.current) return;
          lockRef.current = true;
          onScan(decoded);
          setTimeout(() => (lockRef.current = false), 1500);
        },
        () => {}
      )
      .catch((e) => onError?.(String(e)));

    return () => {
      scanner.stop().then(() => scanner.clear()).catch(() => {});
    };
  }, [onScan, onError]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-primary/30 bg-black shadow-elegant">
      <div ref={ref} className="w-full aspect-[4/3]" />
      {/* AR overlay */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 ar-grid opacity-40" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-[260px] h-[170px] rounded-lg border border-primary/60 shadow-glow overflow-hidden">
            <div className="ar-laser" />
            <span className="ar-corner border-t-2 border-l-2 top-0 left-0 rounded-tl-md" />
            <span className="ar-corner border-t-2 border-r-2 top-0 right-0 rounded-tr-md" />
            <span className="ar-corner border-b-2 border-l-2 bottom-0 left-0 rounded-bl-md" />
            <span className="ar-corner border-b-2 border-r-2 bottom-0 right-0 rounded-br-md" />
          </div>
        </div>
        <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-full glass text-[10px] uppercase tracking-widest text-emerald">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald animate-pulse" /> AR · SCAN
        </div>
      </div>
    </div>
  );
};
