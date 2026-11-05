import { Camera, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { INTERNET_LIGHT_STATES, MODEM_LIGHTS, type InternetLight } from "@/data/mock";
import { cn } from "@/lib/utils";
import { decide } from "../engine";
import { setInspection } from "../services/aiUsta";
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

/** One photo slot (front or back). The image stays on the phone; nothing is analysed for real. */
function PhotoSlot({ title, hint, preview, onFile }: { title: string; hint: string; preview: string | null; onFile: (url: string) => void }) {
  return (
    <label className={cn("flex min-h-[132px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed p-3 text-center", preview ? "border-success/40 bg-success-soft" : "border-primary/25 bg-icon-box/40")}>
      {preview ? <img src={preview} alt={`${title} fotoğrafı`} className="h-14 w-14 rounded-xl object-cover" /> : <Camera className="size-6 text-primary" strokeWidth={1.5} />}
      <span className="text-sm font-semibold text-primary">{title}</span>
      <span className="text-[11px] leading-snug text-muted-foreground">{preview ? "Fotoğraf eklendi" : hint}</span>
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(URL.createObjectURL(f));
        }}
      />
    </label>
  );
}

/**
 * Modem inspection after a clean digital repair: two photo slots (front = lights,
 * back = cables) plus manual answers, so the flow works without a camera or image analysis.
 */
export function ModemInspectCard({ wf }: { wf: Workflow }) {
  const [front, setFront] = useState<string | null>(null);
  const [back, setBack] = useState<string | null>(null);
  const ready = !!front;
  const send = () => {
    if (!front) return;
    setInspection(wf.id, { front: true, back: !!back });
    decide(wf.id, "done", "customer");
  };
  return (
    <div className="rounded-card border-2 border-magenta/30 bg-card p-5 shadow-card" role="group" aria-label="Modem kontrolü">
      <p className="text-[11px] font-bold uppercase tracking-widest text-magenta">Modem kontrolü</p>
      <h3 className="mt-1 text-base font-semibold leading-snug text-primary">Modeminin fotoğrafını paylaş; birlikte inceleyelim.</h3>
      <div className="mt-4 space-y-2.5">
        <PhotoSlot title="Modeminin ön yüzü" hint="Işıklar görünecek şekilde fotoğraf çek" preview={front} onFile={(u) => { setFront(u); setInspection(wf.id, { front: true }); }} />
        <PhotoSlot title="Arka yüz · isteğe bağlı" hint="Kablo bağlantılarını da gösterebilirsin" preview={back} onFile={(u) => { setBack(u); setInspection(wf.id, { back: true }); }} />
      </div>
      <button type="button" onClick={send} disabled={!ready} className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-primary text-base font-semibold text-primary-foreground shadow-float disabled:opacity-50">
        <CheckCircle2 className="size-5" /> Fotoğrafı GIGA’ya gönder
      </button>
      {!ready && <p className="mt-1.5 text-center text-[11px] text-muted-foreground">Ön yüz fotoğrafını ekleyerek devam et.</p>}
    </div>
  );
}

