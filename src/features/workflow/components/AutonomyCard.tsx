import { Link } from "@tanstack/react-router";
import { ChevronRight, ListChecks } from "lucide-react";
import { useWorkflowStore } from "../store";
import { isActive } from "../rules";
import { IntentBox } from "./IntentBox";
import { StatusPill } from "./ui";

/** Home entry point for the autonomous platform: intent box + live process summary. */
export function AutonomyCard() {
  const workflows = useWorkflowStore((s) => s.workflows);
  const active = workflows.filter(isActive).sort((a, b) => b.updatedAt - a.updatedAt);
  const waiting = active.filter((w) => w.decision);
  const top = waiting[0] ?? active[0];

  return (
    <div className="rounded-card bg-plum p-5 text-primary-foreground shadow-float">
      <Link to="/takip" className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-foreground/15">
          <ListChecks className="size-6" />
        </span>
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/70">Benim İçin Takip Et</p>
          <p className="font-semibold leading-snug">Sen talebini söyle, süreci biz yönetelim</p>
        </div>
        <ChevronRight className="size-5" />
      </Link>
      {top ? (
        <Link to="/surec/$id" params={{ id: top.id }} className="mt-4 block rounded-2xl bg-primary-foreground/10 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">{top.title}</p>
            <StatusPill status={top.status} />
          </div>
          <p className="mt-1 text-xs text-primary-foreground/80">{top.decision ? `Kararın bekleniyor: ${top.decision.prompt}` : `Sıradaki: ${top.nextStep ?? "—"}`}</p>
          {active.length > 1 && <p className="mt-1 text-[11px] text-primary-foreground/70">+{active.length - 1} süreç daha takipte</p>}
        </Link>
      ) : null}
      <IntentBox onDark className="mt-4" />
    </div>
  );
}
