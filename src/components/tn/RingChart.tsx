import { motion } from "framer-motion";
import type { ReactNode } from "react";

/** Animated donut. value 0..max. tone picks the stroke token. */
export function RingChart({
  value,
  max = 100,
  size = 160,
  stroke = 14,
  tone = "magenta",
  children,
  label,
}: {
  value: number;
  max?: number;
  size?: number;
  stroke?: number;
  tone?: "magenta" | "success" | "warning" | "destructive" | "primary";
  children?: ReactNode;
  label?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));
  const color = {
    magenta: "var(--magenta)",
    success: "var(--success)",
    warning: "var(--warning)",
    destructive: "var(--destructive)",
    primary: "var(--primary)",
  }[tone];
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ duration: 1.1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}
