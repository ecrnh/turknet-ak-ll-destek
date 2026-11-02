import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { CheckCircle2, Gauge, Loader2 } from "lucide-react";
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/layout/headers";
import { Csat } from "@/components/tn/Csat";
import { Banner, EmptyState } from "@/components/tn/primitives";
import { Button } from "@/components/ui/button";
import { SPEED_FIX_STEPS } from "@/data/mock";
import { simulateSpeedDrop } from "@/features/demo/scenarios";
import { useAgentsStore } from "../store";
import { useFlow } from "@/lib/analytics";

const SERIES = [
  { t: "19:00", v: 96 }, { t: "19:10", v: 94 }, { t: "19:20", v: 61 }, { t: "19:30", v: 24 }, { t: "19:40", v: 20 },
  { t: "Düzeltme", v: 22 }, { t: "+1 dk", v: 64 }, { t: "+2 dk", v: 91 }, { t: "+3 dk", v: 98 },
];

export function SpeedAgentScreen() {
  useFlow("ai_speed_agent_detail");
  const run = useAgentsStore((s) => s.speedRun);
  const enabled = useAgentsStore((s) => s.enabled.speed);

  if (run.status === "idle")
    return (
      <div>
        <PageHeader title="Hız Koruyucu" />
        <div className="space-y-4 px-4">
          <EmptyState icon={Gauge} title="Hızın paketine uygun" text="Hızın 100 Mbps paketinin altına düşerse kök nedeni bulup otomatik düzelteceğim." action={<Button onClick={simulateSpeedDrop}>Demo: Hız düşüşü simüle et</Button>} />
          {!enabled && <Banner tone="warning" title="Hız Koruyucu kapalı">Otomatik kontroller ekranından açabilirsin.</Banner>}
        </div>
      </div>
    );

  const isDone = run.status === "done";
  return (
    <div>
      <PageHeader title="Hız Koruyucu" />
      <div className="space-y-4 px-4">
        <div className="rounded-card bg-card p-5 shadow-card">
          <p className="text-xl font-semibold leading-tight text-primary">{isDone ? "Hızını 20 Mbps'ten 98 Mbps'e yükselttim" : "Hız düşüşünü düzeltiyorum…"}</p>
          <div className="mt-4 flex items-end justify-around text-center">
            <div>
              <p className="text-xs text-muted-foreground">Önce</p>
              <p className="text-3xl font-bold text-destructive">{run.before}</p>
              <p className="text-xs text-muted-foreground">Mbps</p>
            </div>
            <motion.span animate={{ x: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.4 }} className="pb-5 text-2xl text-magenta">→</motion.span>
            <div>
              <p className="text-xs text-muted-foreground">Sonra</p>
              <p className="text-3xl font-bold text-success">{isDone ? run.after : "…"}</p>
              <p className="text-xs text-muted-foreground">Mbps</p>
            </div>
          </div>
          <div className="mt-4 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={isDone ? SERIES : SERIES.slice(0, 6)} margin={{ left: -24, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="spd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--magenta)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--magenta)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="t" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 110]} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => [`${v} Mbps`, "Hız"]} />
                <ReferenceLine y={100} stroke="var(--primary)" strokeDasharray="4 4" label={{ value: "Paket 100", fontSize: 10, fill: "var(--primary)", position: "insideTopRight" }} />
                <Area type="monotone" dataKey="v" stroke="var(--magenta)" strokeWidth={3} fill="url(#spd)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-card bg-card p-5 shadow-card">
          <p className="font-semibold text-primary">Yaptığım adımlar</p>
          <ol className="mt-3 space-y-3 border-l-2 border-border pl-4">
            {SPEED_FIX_STEPS.map((s, i) => (
              <li key={s} className="relative text-sm">
                <span className="absolute -left-[27px] top-0 flex h-5 w-5 items-center justify-center rounded-full bg-card">
                  {i < run.stepIndex || isDone ? <CheckCircle2 className="size-5 text-success" /> : i === run.stepIndex ? <Loader2 className="size-5 animate-spin text-magenta" /> : <span className="h-3 w-3 rounded-full border-2 border-border" />}
                </span>
                <span className={i <= run.stepIndex ? "text-foreground" : "text-muted-foreground"}>{s}</span>
              </li>
            ))}
          </ol>
        </div>

        {isDone && (
          <>
            <Button asChild size="xl" className="w-full rounded-full">
              <Link to="/hiz-testi">Hız Testi ile doğrula</Link>
            </Button>
            <Csat feature="ai_speed_agent" title="Hızının uzaktan düzeltilmesi nasıldı?" />
          </>
        )}
      </div>
    </div>
  );
}
