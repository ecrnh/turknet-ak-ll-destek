import { Link } from "@tanstack/react-router";
import { CalendarCheck, ChevronRight } from "lucide-react";
import { useWorkflowStore } from "../store";

/** Home card for a booked technical-team visit (relocation has its own card). */
export function AppointmentHomeCard() {
  const appointments = useWorkflowStore((s) => s.appointments);
  const workflows = useWorkflowStore((s) => s.workflows);
  const appt = [...appointments].reverse().find((a) => a.status === "booked" && workflows.find((w) => w.id === a.workflowId)?.type !== "relocation");
  if (!appt) return null;
  return (
    <Link to="/surec/$id" params={{ id: appt.workflowId }} className="block rounded-card bg-card p-4 shadow-card" aria-label="Teknik ekip randevusunu gör">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-icon-box text-primary"><CalendarCheck className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-primary">Teknik ekip randevun</p>
          <p className="truncate text-xs text-muted-foreground">{appt.label}</p>
        </div>
        <ChevronRight className="size-5 text-muted-foreground" />
      </div>
    </Link>
  );
}
