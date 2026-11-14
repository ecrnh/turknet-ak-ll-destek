import { Link } from "@tanstack/react-router";
import { ChevronRight, Truck, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";
import { isActive, STATUS_LABEL } from "../rules";
import { useWorkflowStore } from "../store";

/** Home tracker for an open relocation; disappears once the move is completed. */
export function RelocationHomeCard() {
  const workflows = useWorkflowStore((s) => s.workflows);
  const wf = workflows.find((w) => w.type === "relocation" && isActive(w));
  if (!wf) return null;
  const noPort = wf.data["eligibility"] === "no_port";
  const netboxActive = wf.data["netbox"] === "active";
  const done = wf.steps.filter((s) => s.status === "done" || s.status === "skipped").length;
  const pct = wf.steps.length ? Math.round((done / wf.steps.length) * 100) : 0;
  return (
    <Link to="/surec/$id" params={{ id: wf.id }} className="block rounded-card bg-card p-4 shadow-card" aria-label="Taşınma sürecini takip et">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-icon-box text-primary"><Truck className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-primary">Taşınma sürecin</p>
          <p className="truncate text-xs text-muted-foreground">{String(wf.data["address"] ?? "")} · {String(wf.data["moveDate"] ?? "")}</p>
        </div>
        <ChevronRight className="size-5 text-muted-foreground" />
      </div>
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className={cn("font-semibold", noPort ? "text-orange-deep" : "text-primary")}>{noPort ? "Port bekleniyor · GIGA takip ediyor" : STATUS_LABEL[wf.status]}</span>
        <span className="text-muted-foreground">%{pct}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-magenta transition-all" style={{ width: `${pct}%` }} />
      </div>
      {noPort && (
        <p className="mt-3 flex items-center gap-2 rounded-xl bg-success-soft px-3 py-2 text-xs font-semibold text-success">
          <Wifi className="size-4" /> {netboxActive ? "NetBox yeni adresinde aktif" : "NetBox kullanıma hazır"}
        </p>
      )}
    </Link>
  );
}
