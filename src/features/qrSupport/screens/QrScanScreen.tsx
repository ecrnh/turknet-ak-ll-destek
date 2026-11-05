import { useNavigate, useRouter } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, QrCode, Smartphone } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useCamera } from "@/features/videoSupport/useCamera";
import { USER } from "@/data/mock";
import { useQrStore } from "../store";
import { matchesSupportQr } from "../qr";
import { startQrGigaSupport } from "../startQrSupport";
import { track, useFlow } from "@/lib/analytics";

export function QrScanScreen({ deepLink }: { deepLink?: { sub?: string | undefined; dev?: string | undefined } }) {
  useFlow("qr_scan");
  const navigate = useNavigate();
  const router = useRouter();
  const serial = useQrStore((s) => s.serial);
  const hasValidLink = deepLink?.sub === USER.subscriberNo && deepLink.dev === serial;
  const cam = useCamera(!hasValidLink);
  const [found, setFound] = useState(false);
  const foundRef = useRef(false);

  const go = (via: string) => {
    if (foundRef.current) return;
    foundRef.current = true;
    setFound(true);
    track("flow_started", "qr_support", { via, modem: serial });
    window.setTimeout(() => {
      cam.stop();
      startQrGigaSupport();
      navigate({ to: "/qr/destek" });
    }, 550);
  };

  useEffect(() => {
    if (hasValidLink) go("personal_qr_link");
    // Run once for each route's validated QR identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasValidLink]);

  useEffect(() => {
    if (cam.status !== "live") return;
    type Code = { rawValue: string };
    type Detector = { detect: (source: HTMLVideoElement) => Promise<Code[]> };
    type DetectorCtor = new (options: { formats: string[] }) => Detector;
    const DetectorClass = (window as Window & { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
    if (!DetectorClass) return;
    const detector = new DetectorClass({ formats: ["qr_code"] });
    let scanning = false;
    const timer = window.setInterval(async () => {
      const video = cam.videoRef.current;
      if (!video || video.readyState < 2 || scanning || foundRef.current) return;
      scanning = true;
      try {
        const codes = await detector.detect(video);
        if (codes.some((code) => matchesSupportQr(code.rawValue, serial))) go("camera");
      } catch {
        // Browser QR decoding is optional; the demo action below remains usable.
      } finally {
        scanning = false;
      }
    }, 450);
    return () => window.clearInterval(timer);
  }, [cam.status, cam.videoRef, serial]);

  return (
    <div className="relative flex h-full min-h-full flex-col bg-call text-call-foreground">
      <div className="absolute inset-0">
        {cam.status === "live" ? (
          <video ref={cam.videoRef} autoPlay playsInline muted className="h-full w-full object-cover opacity-70" />
        ) : (
          <div className="h-full w-full bg-[radial-gradient(circle_at_50%_40%,var(--call-surface),var(--call))]" />
        )}
      </div>
      <div className="relative z-10 flex items-center gap-2 px-3 pt-3">
        <button onClick={() => { cam.stop(); router.history.back(); }} aria-label="Geri" className="flex h-11 w-11 items-center justify-center rounded-full bg-call-foreground/10">
          <ArrowLeft className="size-6" />
        </button>
        <h1 className="text-xl font-semibold">QR Tara</h1>
      </div>
      <p className="relative z-10 mt-6 px-8 text-center text-lg">Modeminin üzerindeki TürkNet QR etiketini çerçeveye getir</p>

      <div className="relative z-10 mx-auto mt-8 h-64 w-64">
        {["left-0 top-0 border-l-4 border-t-4 rounded-tl-3xl", "right-0 top-0 border-r-4 border-t-4 rounded-tr-3xl", "left-0 bottom-0 border-l-4 border-b-4 rounded-bl-3xl", "right-0 bottom-0 border-r-4 border-b-4 rounded-br-3xl"].map((c) => (
          <span key={c} className={`absolute h-14 w-14 ${found ? "border-success" : "border-magenta"} ${c}`} />
        ))}
        {!found ? (
          <div className="absolute inset-x-4 top-4 h-1 rounded-full bg-magenta shadow-[0_0_16px_var(--magenta)] scan-line" />
        ) : (
          <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute inset-0 flex flex-col items-center justify-center">
            <QrCode className="size-20 text-success" />
            <p className="mt-2 font-semibold">{serial} bulundu · GIGA açılıyor</p>
          </motion.div>
        )}
        {cam.status !== "live" && !found && <QrCode className="absolute inset-0 m-auto size-24 text-call-foreground/15" />}
      </div>

      <div className="flex-1" />
      <div className="relative z-10 space-y-3 px-5 pb-6">
        {(cam.status === "denied" || cam.status === "unavailable") && (
          <p className="text-center text-xs text-call-foreground/70">Kamera açılamadı. GIGA destek akışını demo olarak başlatabilirsin.</p>
        )}
        <Button size="xl" variant="magenta" className="w-full rounded-full" onClick={() => go("demo")} disabled={found}>
          <QrCode /> QR ile Destek Akışını Dene
        </Button>
        <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-call-foreground/70">
          <Smartphone className="mt-0.5 size-3.5 shrink-0" /> QR kodun modemini ve aboneliğini tanır; GIGA bağlantı kontrollerini başlatır.
        </p>
      </div>
    </div>
  );
}

