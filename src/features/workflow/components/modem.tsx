import { motion } from "framer-motion";
import { Camera, CameraOff, Upload } from "lucide-react";
import { useState } from "react";
import { INTERNET_LIGHT_STATES, MODEM_LIGHTS, type InternetLight } from "@/data/mock";
import { GigaNote } from "@/features/giga/GigaAvatar";
import { cn } from "@/lib/utils";
import { decide } from "../engine";
import { setModemLight } from "../services/aiUsta";
import type { Workflow } from "../types";

const LIGHT_CLS: Record<InternetLight, string> = {
  red: "bg-destructive shadow-[0_0_10px_var(--destructive)]",
  off: "bg-muted-foreground/25",
  blink: "bg-warning animate-pulse shadow-[0_0_10px_var(--warning)]",
  green: "bg-success shadow-[0_0_10px_var(--success)]",
};

/** Front panel of a modem with its four indicator lights. Only the Internet light varies. */
export function ModemIllustration({ internet, className }: { internet: InternetLight; className?: string }) {
  return (
    <div className={cn("mx-auto w-full max-w-[260px] rounded-[22px] bg-card p-4 shadow-device", className)} aria-label={`Modem: Internet ışığı ${INTERNET_LIGHT_STATES.find((s) => s.id === internet)?.label}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-extrabold tracking-[0.2em] text-primary/70">TÜRKNET</span>
        <span className="text-[9px] font-semibold text-muted-foreground">Fiber Modem</span>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2">
        {MODEM_LIGHTS.map((l) => (
          <div key={l.key} className="flex flex-col items-center gap-1.5">
            <span className={cn("h-3 w-3 rounded-full", l.key === "internet" ? LIGHT_CLS[internet] : l.key === "wifi" ? "animate-pulse bg-success" : "bg-success")} />
            <span className="text-[9px] font-semibold text-muted-foreground">{l.name}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 h-1.5 rounded-full bg-muted" />
    </div>
  );
}

/**
 * GIGA Teknik camera step (simulated). Works without camera permission: the
 * customer sees a viewfinder with a modem and shows which light is on.
 */
export function ModemCameraCard({ wf }: { wf: Workflow }) {
  const [open, setOpen] = useState(false);
  const [light, setLight] = useState<InternetLight>((wf.data["light"] as InternetLight | undefined) ?? "red");
  const [preview, setPreview] = useState<string | null>(null);

  const shoot = () => {
    setModemLight(wf.id, light);
    decide(wf.id, "demo_photo", "customer");
  };

  return (
    <div className="rounded-card border-2 border-magenta/30 bg-card p-5 shadow-card" role="group" aria-label="Modem kontrolü">
      <p className="text-[11px] font-bold uppercase tracking-widest text-magenta">GIGA Teknik yanında</p>
      <h3 className="mt-1 text-lg font-semibold leading-snug text-primary">Modemini göster, birlikte kontrol edelim.</h3>
      {!open ? (
        <>
          <p className="mt-1.5 text-sm text-muted-foreground">Kamerayı açıp modeminin ön yüzünü göster. Işıklara bakıp sana tek seferde bir güvenli adım söyleyeceğim.</p>
          <button type="button" onClick={() => setOpen(true)} className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-primary text-base font-semibold text-primary-foreground shadow-float">
            <Camera className="size-5" /> Kamerayı aç
          </button>
          <label className="mt-2 flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full border border-primary/20 text-sm font-semibold text-primary">
            {preview ? <img src={preview} alt="Yüklenen modem fotoğrafı" className="h-8 w-8 rounded-lg object-cover" /> : <Upload className="size-4" />}
            Fotoğraf yükle
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setPreview(URL.createObjectURL(f));
                setModemLight(wf.id, light);
                decide(wf.id, "uploaded", "customer");
              }}
            />
          </label>
        </>
      ) : (
        <>
          <div className="relative mt-4 overflow-hidden rounded-3xl bg-primary-deep px-4 pb-5 pt-8">
            <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-2.5 py-1 text-[10px] font-bold text-primary-foreground">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" /> Kamera · simülasyon
            </span>
            {/* viewfinder corners */}
            {["left-3 top-10 border-l-2 border-t-2", "right-3 top-10 border-r-2 border-t-2", "bottom-3 left-3 border-b-2 border-l-2", "bottom-3 right-3 border-b-2 border-r-2"].map((c) => (
              <span key={c} className={cn("absolute h-6 w-6 rounded-sm border-primary-foreground/60", c)} />
            ))}
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
              <ModemIllustration internet={light} className="mt-3" />
            </motion.div>
            <div className="scan-line pointer-events-none absolute inset-x-0 top-0 h-full" />
          </div>
          <p className="mt-4 text-sm font-semibold text-foreground">Modemindeki Internet ışığı nasıl görünüyor?</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {INTERNET_LIGHT_STATES.map((s) => (
              <button key={s.id} type="button" onClick={() => setLight(s.id)} aria-pressed={light === s.id} className={cn("flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-semibold", light === s.id ? "border-primary bg-icon-box text-primary" : "border-border text-muted-foreground")}>
                <span className={cn("h-2.5 w-2.5 rounded-full", LIGHT_CLS[s.id])} /> {s.label}
              </button>
            ))}
          </div>
          <GigaNote className="mt-4">{INTERNET_LIGHT_STATES.find((s) => s.id === light)?.say}</GigaNote>
          <button type="button" onClick={shoot} className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-primary text-base font-semibold text-primary-foreground shadow-float">
            <Camera className="size-5" /> Görüntüyü gönder
          </button>
          <button type="button" onClick={() => setOpen(false)} className="mt-2 flex min-h-11 w-full items-center justify-center gap-1.5 text-sm font-semibold text-primary">
            <CameraOff className="size-4" /> Kamerayı kapat
          </button>
        </>
      )}
      <p className="mt-3 text-[11px] text-muted-foreground">Görsel analiz bu prototipte simülasyondur; gerçek kamera görüntüsü işlenmez, kesin teşhis yapılmaz.</p>
    </div>
  );
}
