import { motion, useReducedMotion } from "framer-motion";
import { Check, Hand, Headset, Zap } from "lucide-react";
import { GIGA } from "@/data/mock";
import { cn } from "@/lib/utils";

export type GigaMood = "idle" | "listening" | "thinking" | "working" | "done";

const MOOD_LABEL: Record<GigaMood, string> = {
  idle: "",
  listening: "dinliyor",
  thinking: "düşünüyor",
  working: "çalışıyor",
  done: "tamamladı",
};

/**
 * GIGA's face: a soft rounded plum "screen" with an antenna (signal = internet)
 * and two expressive eyes. Mood drives subtle motion; reduced-motion users get a still face.
 */
export function GigaAvatar({ size = 40, mood = "idle", className, label = true }: { size?: number; mood?: GigaMood; className?: string; label?: boolean }) {
  const reduce = useReducedMotion();
  const head = size * 0.84;
  const eyeW = head * 0.13;
  const eyeH = head * 0.22;
  const still = !!reduce;
  const ariaLabel = MOOD_LABEL[mood] ? `${GIGA.name} ${MOOD_LABEL[mood]}` : GIGA.name;

  const eye = (i: number) =>
    mood === "done" ? (
      <span key={i} className="block rounded-t-full border-solid border-primary-foreground" style={{ width: eyeW * 1.7, height: eyeW * 1.1, borderWidth: `${Math.max(2, size * 0.05)}px ${Math.max(2, size * 0.05)}px 0` }} />
    ) : (
      <motion.span
        key={i}
        className="block rounded-full bg-primary-foreground"
        style={{ width: eyeW, height: eyeH }}
        animate={
          still
            ? false
            : mood === "thinking"
              ? { x: [-eyeW * 0.5, eyeW * 0.5, -eyeW * 0.5] }
              : mood === "listening"
                ? { scaleY: [1, 1.12, 1] }
                : { scaleY: [1, 1, 0.1, 1] }
        }
        transition={
          mood === "thinking"
            ? { repeat: Infinity, duration: 1.4, ease: "easeInOut" }
            : mood === "listening"
              ? { repeat: Infinity, duration: 1.2 }
              : { repeat: Infinity, duration: 4, times: [0, 0.92, 0.96, 1] }
        }
      />
    );

  return (
    <span role={label ? "img" : undefined} aria-label={label ? ariaLabel : undefined} aria-hidden={label ? undefined : true} className={cn("relative inline-block shrink-0", className)} style={{ width: size, height: size }}>
      {/* listening: soft signal rings */}
      {mood === "listening" && !still &&
        [0, 1].map((i) => (
          <motion.span
            key={i}
            className="absolute rounded-[38%] border-2 border-magenta"
            style={{ left: (size - head) / 2, bottom: 0, width: head, height: head }}
            initial={{ opacity: 0.6, scale: 1 }}
            animate={{ opacity: 0, scale: 1.45 }}
            transition={{ repeat: Infinity, duration: 1.8, delay: i * 0.9 }}
          />
        ))}
      {/* working: orbiting ring */}
      {mood === "working" && (
        <motion.span
          className="giga-orbit absolute rounded-full"
          style={{ left: (size - head) / 2 - size * 0.08, bottom: -size * 0.08, width: head + size * 0.16, height: head + size * 0.16 }}
          animate={still ? false : { rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.3, ease: "linear" }}
        />
      )}

      <motion.span
        className="absolute"
        style={{ left: (size - head) / 2, bottom: 0, width: head, height: size }}
        animate={mood === "idle" && !still ? { y: [0, -size * 0.035, 0] } : { y: 0 }}
        transition={{ repeat: Infinity, duration: 3.4, ease: "easeInOut" }}
      >
        {/* antenna */}
        <span className="absolute left-1/2 rounded-full bg-primary/70" style={{ top: size * 0.06, width: Math.max(2, size * 0.045), height: size * 0.14, marginLeft: -Math.max(2, size * 0.045) / 2 }} />
        <motion.span
          className="absolute left-1/2 rounded-full bg-magenta"
          style={{ top: 0, width: size * 0.15, height: size * 0.15, marginLeft: -size * 0.075 }}
          animate={!still && (mood === "thinking" || mood === "working") ? { scale: [1, 1.35, 1], opacity: [1, 0.7, 1] } : { scale: 1, opacity: 1 }}
          transition={{ repeat: Infinity, duration: 0.9 }}
        />
        {/* head */}
        <span className="bg-giga absolute bottom-0 left-0 flex items-center justify-center rounded-[38%] shadow-float" style={{ width: head, height: head }}>
          <span className="flex items-center justify-center rounded-full bg-primary-deep/60" style={{ width: head * 0.74, height: head * 0.44, gap: head * 0.14 }}>
            {[0, 1].map(eye)}
          </span>
        </span>
      </motion.span>

      {mood === "done" && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full bg-success text-success-foreground ring-2 ring-card"
          style={{ width: size * 0.36, height: size * 0.36 }}
        >
          <Check style={{ width: size * 0.22, height: size * 0.22 }} strokeWidth={3} />
        </motion.span>
      )}
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
