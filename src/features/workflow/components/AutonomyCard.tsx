import { Link } from "@tanstack/react-router";
import { ChevronRight, Sparkles } from "lucide-react";
import { useWorkflowStore } from "../store";
import { isActive } from "../rules";
import { statusSentence } from "../copy";
import { IntentBox } from "./IntentBox";
import { StatusPill } from "./ui";

/** Home entry point: "Size nasıl yardımcı olabilirim?" + the most relevant process in progress. */
export function AutonomyCard() {
  const workflows = useWorkflowStore((s) => s.workflows);
  const active = workflows.filter(isActive).sort((a, b) => b.updatedAt - a.updatedAt);
  const waiting = active.filter((w) => w.decision);
  const top = waiting[0] ?? active[0];

  return (
    <div className="rounded-card bg-plum p-5 text-primary-foreground shadow-float">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-foreground/15">
          <Sparkles className="size-6" />
        </span>
        <div className="flex-1">
          <p className="text-lg font-semibold leading-snug">Size nasıl yardımcı olabilirim?</p>
          <p className="text-xs text-primary-foreground/75">Talebinizi söyleyin, süreci sizin için yönetelim.</p>
        </div>
      </div>
      <IntentBox onDark className="mt-4" />
      {top && (
        <Link to="/surec/$id" params={{ id: top.id }} className="mt-4 block rounded-2xl bg-primary-foreground/10 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">{top.title}</p>
            <StatusPill status={top.status} />
          </div>
          <p className="mt-1 text-xs text-primary-foreground/80">{top.decision ? `Kararınızı bekliyoruz: ${top.decision.prompt}` : statusSentence(top)}</p>
        </Link>
      )}
      <Link to="/takip" className="mt-3 flex items-center justify-between text-sm font-semibold">
        İşlemlerim{active.length ? ` · ${active.length} takipte` : ""}
        <ChevronRight className="size-4" />
      </Link>
    </div>
  );
}
