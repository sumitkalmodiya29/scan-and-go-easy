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
    <div className="relative overflow-hidden rounded-xl border bg-black">
      <div ref={ref} className="w-full aspect-[4/3]" />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="w-[260px] h-[160px] border-2 border-primary-glow/80 rounded-lg shadow-glow" />
      </div>
    </div>
  );
};
