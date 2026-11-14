import { motion, useReducedMotion } from "framer-motion";
import { useEffect } from "react";
import { QR_SCAN_WELCOME } from "@/data/mock";
import { GigaAvatar } from "@/features/giga/GigaAvatar";

export function QrScanWelcome({ onComplete }: { onComplete: () => void }) {
  const reduced = useReducedMotion();
  useEffect(() => {
    const timer = window.setTimeout(onComplete, QR_SCAN_WELCOME.durationMs);
    return () => window.clearTimeout(timer);
  }, [onComplete]);

  return (
    <section role="status" aria-live="polite" aria-busy="true" className="relative flex min-h-full flex-1 flex-col items-center justify-center overflow-hidden bg-background px-6 pb-24 text-center text-foreground">
      <motion.div
        initial={reduced ? { opacity: 0 } : { y: -390, x: 240, rotate: -35, opacity: 0, scale: 0.65 }}
        animate={reduced ? { opacity: 1 } : {
          y: [-390, -215, -115, -35, 8, 0],
          x: [240, 90, -115, -70, 12, 0],
          rotate: [-35, -40, 25, 18, -6, 0],
          opacity: [0, 1, 1, 1, 1, 1],
          scale: [0.65, 0.85, 0.95, 1, 1.04, 1],
        }}
        transition={{ duration: reduced ? 0.2 : 1.4, times: [0, 0.26, 0.5, 0.7, 0.88, 1], ease: "easeInOut" }}
        className="relative mb-8 flex size-32 items-center justify-center"
      >
        {!reduced && (
          <motion.svg aria-hidden="true" viewBox="0 0 220 320" className="pointer-events-none absolute bottom-14 left-1/2 h-72 w-48 origin-bottom"
            initial={{ opacity: 0, rotate: 35, scaleY: 0.5 }}
            animate={{ opacity: [0, 0.85, 0.75, 0.6, 0], rotate: [35, 35, -45, -50, -50], scaleY: [0.5, 1, 0.9, 0.7, 0.1] }}
            transition={{ duration: 1.4, times: [0, 0.2, 0.5, 0.76, 1], ease: "easeInOut" }}>
            <path d="M 8 312 Q 0 215 195 0 Q 96 203 46 312 Z" className="fill-magenta/15" />
            <path d="M 14 312 Q 18 230 170 45 Q 78 222 36 312 Z" className="fill-magenta/30" />
            <path d="M 20 312 Q 37 255 128 112 Q 62 253 29 312 Z" className="fill-magenta/60" />
            <path d="M 54 252 Q 90 176 182 78 M 64 274 Q 101 220 155 177" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-primary/20" />
          </motion.svg>
        )}
        <GigaAvatar size={144} mood="thinking" className="z-10" />
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reduced ? 0 : 0.8, duration: 0.3 }}>
        <h1 className="text-xl font-semibold leading-snug text-primary">{QR_SCAN_WELCOME.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{QR_SCAN_WELCOME.subtitle}</p>
      </motion.div>
      <div aria-hidden="true" className="mt-6 h-1 w-24 overflow-hidden rounded-full bg-muted">
        <motion.div className="h-full origin-left rounded-full bg-magenta" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: QR_SCAN_WELCOME.durationMs / 1000, ease: "linear" }} />
      </div>
    </section>
  );
}