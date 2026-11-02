import { Link } from "@tanstack/react-router";
import { useWorkflowStore } from "@/features/workflow/store";
import { isActive, STATUS_LABEL } from "@/features/workflow/rules";
import { whatsNext } from "@/features/workflow/copy";
import { StatusPill } from "@/features/workflow/components/ui";
import { cn } from "@/lib/utils";

/** "Devam Eden İşlemlerim": the most relevant active processes (decisions first). */
export function OngoingProcesses() {
  const workflows = useWorkflowStore((s) => s.workflows);
  const active = workflows.filter(isActive).sort((a, b) => Number(!!b.decision) - Number(!!a.decision) || b.updatedAt - a.updatedAt);
  if (!active.length) return null;
  return (
    <section aria-labelledby="ongoing">
      <div className="mb-2 flex items-center justify-between">
        <h2 id="ongoing" className="text-[1.15rem] font-semibold text-primary">Devam Eden İşlemlerim</h2>
        <Link to="/takip" className="text-sm font-semibold text-magenta">Tümü</Link>
      </div>
      <div className="space-y-2">
        {active.slice(0, 2).map((w) => (
          <Link key={w.id} to="/surec/$id" params={{ id: w.id }} className="block rounded-card bg-card p-4 shadow-card">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate font-semibold text-foreground">{w.title}</p>
              <StatusPill status={w.status} />
            </div>
            <p className={cn("mt-1 text-xs", w.decision ? "font-semibold text-warning" : "text-muted-foreground")}>
              {w.decision ? "Senden onay bekliyoruz" : `${STATUS_LABEL[w.status]} · ${whatsNext(w)}`}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
