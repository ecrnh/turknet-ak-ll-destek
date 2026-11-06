import { motion } from "framer-motion";

/** Looping illustration: the green fiber connector slides into the modem's PON port. */
export function CablePlugAnimation() {
  return (
    <div className="mt-4 overflow-hidden rounded-2xl bg-muted p-3" aria-label="Fiber kablonun modemin arkasına takılışını gösteren animasyon">
      <svg viewBox="0 0 320 170" className="w-full">
        {/* modem back panel */}
        <rect x="20" y="30" width="200" height="110" rx="14" className="fill-card stroke-border" strokeWidth="2" />
        <text x="34" y="52" className="fill-muted-foreground" fontSize="10" fontWeight="600">ZTE F6640 · arka yüz</text>
        {/* LAN ports */}
        {[0, 1, 2].map((i) => (
          <rect key={i} x={40 + i * 26} y="92" width="18" height="16" rx="2" className="fill-muted stroke-border" />
        ))}
        {/* power */}
        <circle cx="140" cy="100" r="9" className="fill-muted stroke-border" />
        {/* PON port, highlighted */}
        <motion.rect x="174" y="88" width="30" height="24" rx="4" className="fill-background stroke-magenta" strokeWidth="2.5"
          animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
        <text x="176" y="128" className="fill-magenta" fontSize="10" fontWeight="700">PON</text>
        {/* status light turns on after plugging */}
        <motion.circle cx="200" cy="48" r="5" animate={{ fill: ["var(--muted-foreground)", "var(--muted-foreground)", "var(--success)", "var(--success)"] }} transition={{ duration: 3.2, times: [0, 0.55, 0.62, 1], repeat: Infinity }} />
        {/* cable + connector */}
        <motion.g animate={{ x: [80, 80, 0, 0] }} transition={{ duration: 3.2, times: [0, 0.2, 0.55, 1], repeat: Infinity, ease: "easeInOut" }}>
          <path d="M224 100 C 260 100, 270 150, 330 150" className="stroke-success" strokeWidth="5" fill="none" strokeLinecap="round" />
          <rect x="196" y="92" width="30" height="16" rx="3" className="fill-success" />
          <rect x="188" y="96" width="10" height="8" rx="1" className="fill-success" opacity="0.7" />
        </motion.g>
      </svg>
      <p className="text-center text-xs font-medium text-muted-foreground">Yeşil ucu “PON” yuvasına düz it, “klik” sesini duy.</p>
    </div>
  );
}
