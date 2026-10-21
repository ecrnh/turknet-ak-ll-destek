import { useNavigate, useRouter } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, Keyboard, QrCode, Smartphone } from "lucide-react";
import { useState } from "react";
import { BottomSheet } from "@/components/tn/Sheet";
import { Banner } from "@/components/tn/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCamera } from "@/features/videoSupport/useCamera";
import { useQrStore } from "../store";
import { isValidCode } from "../qr";
import { track, useFlow } from "@/lib/analytics";

export function QrScanScreen() {
  useFlow("qr_scan");
  const navigate = useNavigate();
  const router = useRouter();
  const serial = useQrStore((s) => s.serial);
  const cam = useCamera(true);
  const [manual, setManual] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [found, setFound] = useState(false);

  const go = (via: string) => {
    setFound(true);
    track("flow_started", "qr_support", { via });
    setTimeout(() => {
      cam.stop();
      navigate({ to: "/qr/analiz" });
    }, 900);
  };

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
      <p className="relative z-10 mt-6 px-8 text-center text-lg">Modeminin üstündeki Turknet QR etiketini çerçeveye getir</p>

      <div className="relative z-10 mx-auto mt-8 h-64 w-64">
        {["left-0 top-0 border-l-4 border-t-4 rounded-tl-3xl", "right-0 top-0 border-r-4 border-t-4 rounded-tr-3xl", "left-0 bottom-0 border-l-4 border-b-4 rounded-bl-3xl", "right-0 bottom-0 border-r-4 border-b-4 rounded-br-3xl"].map((c) => (
          <span key={c} className={`absolute h-14 w-14 ${found ? "border-success" : "border-magenta"} ${c}`} />
        ))}
        {!found ? (
          <div className="absolute inset-x-4 top-4 h-1 rounded-full bg-magenta shadow-[0_0_16px_var(--magenta)] scan-line" />
        ) : (
          <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute inset-0 flex flex-col items-center justify-center">
            <QrCode className="size-20 text-success" />
            <p className="mt-2 font-semibold">{serial} bulundu</p>
          </motion.div>
        )}
        {cam.status !== "live" && !found && <QrCode className="absolute inset-0 m-auto size-24 text-call-foreground/15" />}
      </div>

      <div className="flex-1" />
      <div className="relative z-10 space-y-3 px-5 pb-6">
        {(cam.status === "denied" || cam.status === "unavailable") && (
          <p className="text-center text-xs text-call-foreground/70">Kamera açılamadı — demo taraması veya manuel kod kullanabilirsin.</p>
        )}
        <Button size="xl" variant="magenta" className="w-full rounded-full" onClick={() => go("demo")} disabled={found}>
          <QrCode /> Demo QR'ı Tara
        </Button>
        <Button size="lg" variant="glass" className="w-full" onClick={() => setManual(true)} disabled={found}>
          <Keyboard /> Kodu manuel gir
        </Button>
        <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-call-foreground/70">
          <Smartphone className="mt-0.5 size-3.5 shrink-0" /> Telefonunun kendi kamerasıyla okutursan Turknet uygulaması bu ekranla açılır.
        </p>
      </div>

      <BottomSheet open={manual} onClose={() => setManual(false)} title="Kodu manuel gir">
        <p className="text-sm text-muted-foreground">Etiketin altında yazan modem kodunu gir (ör. {serial}).</p>
        <Input value={code} onChange={(e) => { setCode(e.target.value); setError(null); }} placeholder="MOD-XXXXXX" className="mt-3 h-12 rounded-xl font-mono uppercase" aria-label="Modem kodu" />
        {error && <Banner tone="error" className="mt-3">{error}</Banner>}
        <Button
          size="lg"
          className="mt-4 w-full"
          onClick={() => {
            if (!isValidCode(code, serial)) return setError("Kod tanınmadı. MOD- ile başlayan 6 karakterli kodu kontrol et.");
            setManual(false);
            go("manual");
          }}
        >
          Analizi Başlat
        </Button>
        <button className="mt-2 w-full text-sm font-semibold text-magenta" onClick={() => setCode(serial)}>
          Kendi kodumu doldur
        </button>
      </BottomSheet>
    </div>
  );
}
