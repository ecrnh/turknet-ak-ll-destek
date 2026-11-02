import { LED_STATE_LABEL, MODEM_LEDS, type LedKey, type LedState } from "@/data/mock";
import { cn } from "@/lib/utils";
import type { Leds } from "../services/aiUsta";

const NEXT: Record<LedState, LedState> = { green: "red", red: "blink", blink: "off", off: "green" };
const DOT: Record<LedState, string> = { green: "bg-success shadow-[0_0_10px_2px] shadow-success/60", red: "bg-destructive shadow-[0_0_10px_2px] shadow-destructive/60", blink: "bg-warning animate-pulse", off: "bg-muted-foreground/30" };

export const nextLed = (s: LedState) => NEXT[s];

/** Front panel of a home modem with four indicator lights. Tapping a light cycles its state (simulation). */
export function ModemFront({ leds, onToggle, scanning, className }: { leds: Leds; onToggle?: (k: LedKey) => void; scanning?: boolean; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-[28px] bg-card p-4 shadow-card", className)}>
      {scanning && <div className="scan-line pointer-events-none absolute inset-x-0 top-0 h-full" aria-hidden />}
      <div className="mx-auto h-3 w-24 rounded-full bg-muted" aria-hidden />
      <p className="mt-3 text-center text-[11px] font-bold uppercase tracking-[0.25em] text-muted-foreground">TürkNet Modem</p>
      <div className="mt-4 grid grid-cols-4 gap-2">
        {MODEM_LEDS.map((m) => {
          const st = leds[m.key];
          const El = onToggle ? "button" : "div";
          return (
            <El
              key={m.key}
              {...(onToggle ? { type: "button" as const, onClick: () => onToggle(m.key), "aria-label": `${m.name}: ${LED_STATE_LABEL[st]}. Değiştirmek için dokunun` } : {})}
              className={cn("flex flex-col items-center gap-1.5 rounded-2xl py-2", onToggle && "border border-dashed border-primary/20 active:scale-95")}
            >
              <span className={cn("h-4 w-4 rounded-full", DOT[st])} />
              <span className="text-[11px] font-semibold text-foreground">{m.name}</span>
              <span className="text-[10px] text-muted-foreground">{LED_STATE_LABEL[st]}</span>
            </El>
          );
        })}
      </div>
    </div>
  );
}
