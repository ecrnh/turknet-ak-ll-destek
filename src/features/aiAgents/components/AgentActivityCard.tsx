import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Bot, ChevronRight, Loader2 } from "lucide-react";
import { useAgentsStore } from "../store";
import { useWorkflowStore } from "@/features/workflow/store";
import { AGENT_DEFS, SPEED_FIX_STEPS } from "@/data/mock";
import { fmtRelative } from "@/lib/format";
import { Progress } from "@/components/ui/progress";

/** Live "Ajan Etkinlik" card on the home page. */
export function AgentActivityCard() {
  const run = useAgentsStore((s) => s.speedRun);
  const actions = useAgentsStore((s) => s.actions);
  const backupOn = useWorkflowStore((s) => s.hybrid.status === "active");
  const stats = useAgentsStore((s) => s.stats);
  const latest = actions.find((a) => !a.undone);
  const running = run.status === "running";

  return (
    <Link to={running ? "/ajanlar/hiz" : backupOn ? "/hibrit" : "/ajanlar"} className="block rounded-card bg-plum p-5 text-primary-foreground shadow-float">
      <div className="flex items-center gap-3">
        <span className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-primary-foreground/15">
          <Bot className="size-6" />
          <motion.span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-success ring-2 ring-primary" animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 2 }} />
        </span>
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/70">Ajan Etkinlik · canlı</p>
          <p className="font-semibold">{running ? "Hız Koruyucu çalışıyor…" : backupOn ? "Hibrit İnternet ile bağlısınız" : "4 ajan hattını izliyor"}</p>
        </div>
        <ChevronRight className="size-5" />
      </div>
      {running ? (
        <div className="mt-4">
          <p className="flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" /> {SPEED_FIX_STEPS[Math.max(0, run.stepIndex)]}
          </p>
          <Progress value={((run.stepIndex + 1) / SPEED_FIX_STEPS.length) * 100} className="mt-3 h-2 bg-primary-foreground/20 [&>div]:bg-magenta" />
        </div>
      ) : latest ? (
        <div className="mt-4 rounded-2xl bg-primary-foreground/10 p-3">
          <p className="text-xs text-primary-foreground/70">
            {AGENT_DEFS.find((d) => d.id === latest.agent)?.name} · {fmtRelative(latest.time)}
          </p>
          <p className="mt-0.5 text-sm font-semibold">{latest.title}</p>
        </div>
      ) : null}
      <p className="mt-3 text-xs text-primary-foreground/75">
        Bu ay senin için {stats.solved} işlem yaptım · {stats.callsPrevented} destek çağrısını önledim
      </p>
    </Link>
  );
}
