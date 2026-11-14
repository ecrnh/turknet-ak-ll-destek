import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Play, RefreshCw, Router } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QR_MODEMS, QR_SETUP_COPY } from "@/data/mock";
import { modemGuide, type ModemId } from "../setupGuide";

function SetupAnimation({ id, kind }: { id: ModemId; kind: string }) {
  const { modem } = modemGuide(id);
  const reduced = useReducedMotion();
  const connection = kind === "line" || kind === "power";
  return (
    <svg viewBox="0 0 320 190" role="img" aria-label={`${modem.brand} ${modem.model}: ${kind === "line" ? modem.port : kind} bağlantı gösterimi`} className="aspect-[32/19] w-full rounded-lg bg-muted text-primary">
      <rect x="32" y="28" width="256" height="94" rx="8" className="fill-card stroke-border" strokeWidth="2" />
      <text x="160" y="52" textAnchor="middle" fontSize="14" fill="currentColor">{modem.brand} · {modem.model}</text>
      <rect x="62" y="71" width="32" height="23" rx="3" className="fill-magenta-soft stroke-magenta" strokeWidth="2" />
      <text x="78" y="110" textAnchor="middle" fontSize="11" fill="currentColor">{modem.port}</text>
      <rect x="122" y="71" width="32" height="23" rx="3" className="fill-muted stroke-border" />
      <text x="138" y="110" textAnchor="middle" fontSize="11" fill="currentColor">LAN</text>
      <circle cx="218" cy="82" r="9" className="fill-muted stroke-primary" strokeWidth="2" />
      <text x="218" y="110" textAnchor="middle" fontSize="11" fill="currentColor">POWER</text>
      {connection && <motion.g animate={reduced ? { y: 0 } : { y: [45, 0, 0, 45] }} transition={{ duration: 3, repeat: Infinity, times: [0, .4, .75, 1] }}>
        <path d={`M ${kind === "power" ? 218 : 78} 128 v 62`} className="stroke-magenta" strokeWidth="6" />
        <rect x={kind === "power" ? 211 : 69} y="94" width={kind === "power" ? 14 : 18} height="34" rx="3" className="fill-magenta" />
      </motion.g>}
      {kind === "lights" && <motion.g animate={reduced ? { opacity: 1 } : { opacity: [.35, 1, 1] }} transition={{ duration: 2, repeat: Infinity }}>
        {[100, 140, 180].map((x) => <circle key={x} cx={x} cy="149" r="5" className="fill-success" />)}
        <text x="160" y="175" textAnchor="middle" fontSize="11" fill="currentColor">{modem.connection === "fiber" ? "Power · PON · Wi-Fi" : "Power · DSL · Wi-Fi"}</text>
      </motion.g>}
      {kind === "wifi" && <motion.path d="M130 153 Q160 123 190 153 M142 162 Q160 144 178 162 M155 174 Q160 169 165 174" fill="none" className="stroke-magenta" strokeWidth="4" strokeLinecap="round" animate={reduced ? { opacity: 1 } : { opacity: [.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />}
    </svg>
  );
}

export function ModemSetupGuide({ onComplete, onModemChange }: { onComplete: () => void; onModemChange: (id: ModemId) => void }) {
  const [id, setId] = useState<ModemId>("zte");
  const [choosing, setChoosing] = useState(false);
  const [step, setStep] = useState<number | null>(null);
  useEffect(() => {
    const saved = sessionStorage.getItem("qr-setup-modem");
    const modem = QR_MODEMS.find((m) => m.id === saved);
    if (modem) { setId(modem.id); onModemChange(modem.id); }
  }, [onModemChange]);
  const guide = modemGuide(id);
  const current = step === null ? null : guide.steps[step];
  return (
    <div className="mb-5 space-y-3">
      <h1 className="text-2xl font-bold">{QR_SETUP_COPY.title}</h1>
      <div className="flex items-center gap-2 text-sm text-primary"><Router className="size-5 shrink-0" /><span className="flex-1 font-semibold">{guide.modem.brand} {guide.modem.model}</span></div>
      <Button variant="outline" size="sm" onClick={() => setChoosing((v) => !v)} aria-expanded={choosing}><RefreshCw />{QR_SETUP_COPY.change}</Button>
      {choosing && <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-semibold">{QR_SETUP_COPY.choose}</legend>
        {QR_MODEMS.map((modem) => <label key={modem.id} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-border bg-card px-3 text-sm">
          <input type="radio" name="setup-modem" value={modem.id} checked={id === modem.id} onChange={() => { setId(modem.id); setStep(null); onModemChange(modem.id); sessionStorage.setItem("qr-setup-modem", modem.id); setChoosing(false); }} />
          {modem.brand} {modem.model}
        </label>)}
      </fieldset>}
      {!current ? <Button className="h-auto min-h-12 w-full whitespace-normal rounded-lg py-3" onClick={() => setStep(0)}><Play />{QR_SETUP_COPY.start}</Button> : <div className="space-y-3" aria-live="polite">
        <p className="text-xs font-semibold text-muted-foreground">Adım {(step ?? 0) + 1} / {guide.steps.length}</p>
        <SetupAnimation key={`${id}-${step}`} id={id} kind={current.kind} />
        <h2 className="text-lg font-semibold">{current.title}</h2>
        <p className="text-sm text-muted-foreground">{current.body}</p>
        <p className="text-xs text-muted-foreground">{QR_SETUP_COPY.safety}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" aria-label={QR_SETUP_COPY.back} title={QR_SETUP_COPY.back} onClick={() => setStep((s) => s === null || s === 0 ? null : s - 1)}><ArrowLeft /></Button>
          <Button className="h-auto min-h-11 flex-1 whitespace-normal rounded-lg" onClick={() => { if (step === guide.steps.length - 1) onComplete(); else setStep((s) => (s ?? 0) + 1); }}>
            {step === guide.steps.length - 1 ? QR_SETUP_COPY.finish : QR_SETUP_COPY.next}<ArrowRight />
          </Button>
        </div>
      </div>}
    </div>
  );
}