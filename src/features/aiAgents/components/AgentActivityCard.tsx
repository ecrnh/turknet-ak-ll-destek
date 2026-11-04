import { Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, ChevronRight, Loader2, Mic, SendHorizontal } from "lucide-react";
import { useVoiceInput } from "@/features/giga/useVoiceInput";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useAgentsStore } from "../store";
import { useWorkflowStore } from "@/features/workflow/store";
import { isActive } from "@/features/workflow/rules";
import { useAppStore } from "@/features/core/appStore";
import { GigaAvatar, GigaName } from "@/features/giga/GigaAvatar";
import { GIGA, SPEED_FIX_STEPS, USER } from "@/data/mock";
import { useActingAccount } from "@/features/family/store";
import { fmtRelative } from "@/lib/format";
import { Progress } from "@/components/ui/progress";

/** A Hız Koruyucu fix is mentioned on the home card only while it is recent. */
const RECENT_FIX_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * The single support entry on the home page: GIGA greets the customer and takes
 * the request right here; sending opens the GIGA screen with it. No separate
 * support tiles on home.
 */
export function AgentActivityCard() {
  const run = useAgentsStore((s) => s.speedRun);
  const actions = useAgentsStore((s) => s.actions);
  const workflows = useWorkflowStore((s) => s.workflows);
  const openHelp = useAppStore((s) => s.openHelp);
  const acting = useActingAccount();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const voice = useVoiceInput((t) => openHelp(t));
  const running = run.status === "running";
  const fix = actions.find((a) => a.agent === "speed" && !a.undone);
  const recentFix = fix && Date.now() - fix.time < RECENT_FIX_MS ? fix : null;
  const activeCount = workflows.filter(isActive).length;
  const name = acting ? acting.short : USER.firstName;

  return (
    <section aria-label="GIGA" className="rounded-card bg-plum px-4 py-3.5 text-primary-foreground shadow-float">
      <Link to={running ? "/ajanlar/hiz" : "/ajanlar"} className="flex items-start gap-3">
        <GigaAvatar size={36} mood={running ? "working" : "idle"} label={false} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary-foreground/70">
            <GigaName />
          </p>
          <p className="text-sm font-semibold leading-snug">
            {running ? "Hızını düzeltmeye çalışıyorum…" : GIGA.homeGreeting.replace("{name}", name)}
          </p>
        </div>
        <ChevronRight className="mt-1 size-5 shrink-0" />
      </Link>

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

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const t = text.trim();
          setText("");
          if (t) openHelp(t);
          else navigate({ to: "/ajanlar" });
        }}
        className="mt-3 flex items-center gap-1.5 rounded-full bg-card p-1 pl-4"
      >
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={voice.listening ? "Dinliyorum…" : GIGA.placeholder} aria-label="GIGA'ya yaz" className="h-10 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground" />
        <button type="button" onClick={voice.toggle} aria-label={voice.listening ? "Dinlemeyi durdur" : "Sesli anlat"} aria-pressed={voice.listening} className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", voice.listening ? "animate-pulse bg-magenta text-magenta-foreground" : "text-primary hover:bg-muted")}>
          <Mic className="size-5" />
        </button>
        <button type="submit" aria-label="GIGA'ya gönder" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-magenta text-magenta-foreground">
          <SendHorizontal className="size-4" />
        </button>
      </form>

      {activeCount > 0 && (
        <Link to="/ajanlar" className="mt-2 flex items-center justify-between px-1 text-xs font-semibold text-primary-foreground/85">
          <span>{activeCount} devam eden işlemin var</span>
          <span className="flex items-center gap-0.5">Gör <ChevronRight className="size-3.5" /></span>
        </Link>
      )}
    </section>
  );
}
