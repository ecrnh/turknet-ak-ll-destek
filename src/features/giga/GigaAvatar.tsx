import { motion, useReducedMotion } from "framer-motion";
import { Check, Hand, Headset, Zap } from "lucide-react";
import { GIGA } from "@/data/mock";
import { cn } from "@/lib/utils";
import gigaBot from "@/assets/giga-white-fiber-clean-bot.png";
import gigaHead from "@/assets/giga-white-fiber-front-head.png";

export type GigaMood = "idle" | "listening" | "thinking" | "working" | "done";

const MOOD_LABEL: Record<GigaMood, string> = {
  idle: "",
  listening: "dinliyor",
  thinking: "düşünüyor",
  working: "çalışıyor",
  done: "tamamladı",
};

/** Shared welcoming mascot; activity motion preserves the same identity everywhere. */
export function GigaAvatar({ size = 40, mood = "idle", className, label = true, headOnly = false }: { size?: number; mood?: GigaMood; className?: string; label?: boolean; headOnly?: boolean }) {
  const reduce = useReducedMotion();
  const ariaLabel = MOOD_LABEL[mood] ? `${GIGA.name} ${MOOD_LABEL[mood]}` : GIGA.name;
  return (
    <span role={label ? "img" : undefined} aria-label={label ? ariaLabel : undefined} aria-hidden={label ? undefined : true} className={cn("relative inline-block shrink-0", className)} style={{ width: size, height: size }}>
      {mood === "working" && <motion.span className="giga-orbit absolute inset-0 rounded-full" animate={reduce ? false : { rotate: 360 }} transition={{ repeat: Infinity, duration: 1.3, ease: "linear" }} />}
      {mood === "listening" && !reduce && <motion.span className="absolute inset-1 rounded-full border border-magenta" animate={{ scale: [1, 1.25], opacity: [0.6, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} />}
      <motion.img src={headOnly ? gigaHead : gigaBot} alt="" width={768} height={768} className="h-full w-full object-contain"
        animate={reduce || headOnly ? false : mood === "thinking" ? { rotate: [-4, 4, -4] } : mood === "listening" ? { scale: [1, 1.04, 1] } : { y: [0, -size * 0.035, 0] }}
        transition={{ repeat: Infinity, duration: mood === "thinking" ? 1.6 : 3.4, ease: "easeInOut" }} />
      {mood === "done" && <motion.span initial={reduce ? false : { scale: 0 }} animate={{ scale: 1 }} className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full bg-success text-success-foreground ring-2 ring-card" style={{ width: size * 0.36, height: size * 0.36 }}><Check style={{ width: size * 0.22, height: size * 0.22 }} strokeWidth={3} /></motion.span>}
    </span>
  );
}

/** The GIGA wordmark, always set the same way. */
export function GigaName({ className, suffix }: { className?: string; suffix?: string }) {
  return (
    <span className={cn("font-extrabold tracking-[0.08em]", className)}>
      GIGA{suffix ? <span className="font-semibold tracking-normal"> {suffix}</span> : null}
    </span>
  );
}

export type GigaActionMode = "auto" | "approval" | "human";

const MODE_STYLE: Record<GigaActionMode, { icon: typeof Zap; cls: string }> = {
  auto: { icon: Zap, cls: "bg-success-soft text-success" },
  approval: { icon: Hand, cls: "bg-warning-soft text-warning" },
  human: { icon: Headset, cls: "bg-icon-box text-primary" },
};

/** Tells the customer whether GIGA does it, needs their approval, or hands over to a person. */
export function ActionModeTag({ mode, className }: { mode: GigaActionMode; className?: string }) {
  // Actions GIGA does itself carry no tag; only approval and hand-over are labelled.
  if (mode === "auto") return null;
  const m = MODE_STYLE[mode];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold", m.cls, className)}>
      <m.icon className="size-3" /> {GIGA.modes[mode]}
    </span>
  );
}

/** GIGA speaking inside an AI-powered experience (chat, troubleshooting, diagnosis). The face is enough; the name is not repeated. */
export function GigaNote({ children, mood = "idle", onDark, className }: { children: React.ReactNode; mood?: GigaMood; onDark?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-start gap-2.5", className)} role="note">
      <GigaAvatar size={34} mood={mood} label={false} className="mt-0.5" />
      <div className={cn("flex-1 rounded-2xl rounded-tl-md px-3.5 py-2.5 text-sm leading-relaxed", onDark ? "bg-primary-foreground/12 text-primary-foreground" : "bg-card text-foreground shadow-card")}>
        {children}
      </div>
    </div>
  );
}
