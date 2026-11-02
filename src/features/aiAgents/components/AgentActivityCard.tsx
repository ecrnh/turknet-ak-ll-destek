import { Link } from "@tanstack/react-router";
import { ChevronRight, Loader2, MessageCircle } from "lucide-react";
import { useAgentsStore } from "../store";
import { useAppStore } from "@/features/core/appStore";
import { useWorkflowStore } from "@/features/workflow/store";
import { GigaAvatar, GigaName } from "@/features/giga/GigaAvatar";
import { AGENT_DEFS, GIGA, SPEED_FIX_STEPS } from "@/data/mock";
import { fmtRelative } from "@/lib/format";
import { Progress } from "@/components/ui/progress";

/** GIGA's live card on the home page: what GIGA is doing right now, plus a way to talk to it. */
export function AgentActivityCard() {
  const run = useAgentsStore((s) => s.speedRun);
  const actions = useAgentsStore((s) => s.actions);
  const enabled = useAgentsStore((s) => s.enabled);
  const backupOn = useWorkflowStore((s) => s.hybrid.status === "active");
  const stats = useAgentsStore((s) => s.stats);
  const openHelp = useAppStore((s) => s.openHelp);
  const latest = actions.find((a) => !a.undone);
  const running = run.status === "running";
  const on = Object.values(enabled).filter(Boolean).length;

  return (
    <div className="rounded-card bg-plum p-5 text-primary-foreground shadow-float">
      <Link to={running ? "/ajanlar/hiz" : backupOn ? "/hibrit" : "/ajanlar"} className="block">
        <div className="flex items-center gap-3">
          <GigaAvatar size={50} mood={running ? "working" : backupOn ? "listening" : "idle"} />
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/70">
              <GigaName /> · canlı
            </p>
            <p className="font-semibold leading-snug">
              {running ? "Hızını düzeltmeye çalışıyorum…" : backupOn ? "Hibrit İnternet'teyiz; ana hattını izliyorum" : on ? `Hattını izliyorum · ${on} görev açık` : "Otomatik görevlerim kapalı"}
            </p>
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
      <button
        type="button"
        onClick={() => openHelp()}
        className="mt-4 flex min-h-11 w-full items-center gap-2 rounded-full bg-card px-4 text-left text-sm text-muted-foreground"
      >
        <MessageCircle className="size-4 text-magenta" />
        <span className="flex-1">{GIGA.placeholder}</span>
        <span className="text-xs font-semibold text-primary">Sor</span>
      </button>
    </div>
  );
}
