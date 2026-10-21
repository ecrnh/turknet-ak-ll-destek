import { useEffect, useRef } from "react";

export interface Mark {
  type: "ring" | "arrow";
  x: number; // 0..1 of width
  y: number; // 0..1 of height
  r?: number; // ring radius as fraction of width
  fromX?: number;
  fromY?: number;
  label?: string;
}

/**
 * Canvas overlay where the expert's "İşaretle" tool draws pink rings and arrows on the
 * customer's camera feed. Draw-in animation, then a gentle pulse.
 */
export function MarkCanvas({ marks }: { marks: Mark[] }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const color = getComputedStyle(document.documentElement).getPropertyValue("--magenta").trim() || "deeppink";
    let raf = 0;
    const start = performance.now();

    const draw = (now: number) => {
      const dpr = window.devicePixelRatio || 1;
      const { width, height } = canvas.getBoundingClientRect();
      if (canvas.width !== width * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const t = Math.min(1, (now - start) / 700);
      const pulse = 1 + Math.sin((now - start) / 260) * 0.05 * (t >= 1 ? 1 : 0);

      for (const m of marks) {
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.shadowColor = color;
        ctx.shadowBlur = 14;
        const cx = m.x * width;
        const cy = m.y * height;
        if (m.type === "ring") {
          const r = (m.r ?? 0.09) * width * pulse;
          ctx.beginPath();
          ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * t);
          ctx.stroke();
        } else {
          const fx = (m.fromX ?? m.x + 0.1) * width;
          const fy = (m.fromY ?? m.y + 0.2) * height;
          const ex = fx + (cx - fx) * t;
          const ey = fy + (cy - fy) * t;
          ctx.beginPath();
          ctx.moveTo(fx, fy);
          ctx.lineTo(ex, ey);
          ctx.stroke();
          if (t >= 1) {
            const ang = Math.atan2(cy - fy, cx - fx);
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx - 16 * Math.cos(ang - 0.5), cy - 16 * Math.sin(ang - 0.5));
            ctx.lineTo(cx - 16 * Math.cos(ang + 0.5), cy - 16 * Math.sin(ang + 0.5));
            ctx.closePath();
            ctx.fill();
          }
        }
        if (m.label && t >= 1) {
          ctx.shadowBlur = 0;
          ctx.font = "600 12px 'Plus Jakarta Sans', sans-serif";
          const w = ctx.measureText(m.label).width + 16;
          const lx = Math.min(Math.max(8, cx - w / 2), width - w - 8);
          const ly = cy + (m.type === "ring" ? (m.r ?? 0.09) * width + 10 : 14);
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.roundRect(lx, ly, w, 24, 12);
          ctx.fill();
          ctx.fillStyle = "white";
          ctx.fillText(m.label, lx + 8, ly + 16);
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [marks]);

  return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden />;
}
