import { Link } from "@tanstack/react-router";
import { CheckCircle2, ChevronRight, Loader2 } from "lucide-react";
import { useAgentsStore } from "../store";
import { useWorkflowStore } from "@/features/workflow/store";
import { GigaAvatar, GigaName } from "@/features/giga/GigaAvatar";
import { SPEED_FIX_STEPS, USER } from "@/data/mock";
import { useActingAccount } from "@/features/family/store";
import { fmtRelative } from "@/lib/format";
import { Progress } from "@/components/ui/progress";

/** A Hız Koruyucu fix is mentioned on the home card only while it is recent. */
const RECENT_FIX_MS = 3 * 24 * 60 * 60 * 1000;

/** GIGA on the home page: greets the customer by name (replaces the old welcome card), plus a short note when Hız Koruyucu found and fixed something. Chat opens only from the centre GIGA button. */
export function AgentActivityCard() {
  const run = useAgentsStore((s) => s.speedRun);
  const actions = useAgentsStore((s) => s.actions);
  const backupOn = useWorkflowStore((s) => s.hybrid.status === "active");
  const acting = useActingAccount();
  const running = run.status === "running";
  const fix = actions.find((a) => a.agent === "speed" && !a.undone);
  const recentFix = fix && Date.now() - fix.time < RECENT_FIX_MS ? fix : null;

  return (
    <Link to={running ? "/ajanlar/hiz" : backupOn ? "/hibrit" : "/ajanlar"} className="block rounded-card bg-plum px-4 py-3 text-primary-foreground shadow-float">
      <div className="flex items-center gap-3">
        <GigaAvatar size={36} mood={running ? "working" : backupOn ? "listening" : "idle"} label={false} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary-foreground/70">
            <GigaName />
          </p>
          <p className="text-sm font-semibold leading-snug">
            {running ? "Hızını düzeltmeye çalışıyorum…" : backupOn ? "Yedek bağlantıdasın; ana bağlantın düzelince haber vereceğiz" : `Merhaba, hoş geldin ${acting ? acting.short : USER.firstName}, destek için yanındayım!`}
          </p>
        </div>
        <ChevronRight className="size-5 shrink-0" />
      </div>
      {running ? (
        <div className="mt-2.5">
          <p className="flex items-center gap-2 text-xs">
            <Loader2 className="size-3.5 animate-spin" /> {SPEED_FIX_STEPS[Math.max(0, run.stepIndex)]}
          </p>
          <Progress value={((run.stepIndex + 1) / SPEED_FIX_STEPS.length) * 100} className="mt-2 h-1.5 bg-primary-foreground/20 [&>div]:bg-magenta" />
        </div>
      ) : recentFix ? (
        <p className="mt-2 flex items-center gap-1.5 rounded-full bg-primary-foreground/10 px-3 py-1.5 text-xs">
          <CheckCircle2 className="size-3.5 shrink-0 text-neon-lime" />
          <span className="truncate">Hız Koruyucu düşüşü tespit edip düzeltti · {fmtRelative(recentFix.time)}</span>
        </p>
      ) : null}
    </Link>
  );
}
