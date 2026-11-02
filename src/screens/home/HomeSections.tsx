import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { USER } from "@/data/mock";
import { useAppStore } from "@/features/core/appStore";
import { useActingAccount } from "@/features/family/store";
import { useWorkflowStore } from "@/features/workflow/store";
import { isActive, STATUS_LABEL } from "@/features/workflow/rules";
import { whatsNext } from "@/features/workflow/copy";
import { StatusPill } from "@/features/workflow/components/ui";
import { useNow } from "@/hooks/use-now";
import { cn } from "@/lib/utils";

/** Greeting + a slim connection pill. Speed is a simulated live value. */
export function HomeWelcome() {
  const net = useAppStore((s) => s.net);
  const acting = useActingAccount();
  const tick = useNow(3000);
  const live = net.status === "online" ? net.speed - ((tick / 3000) % 5) : net.speed;
  const down = net.status === "down";
  const label = { online: "İnternetin aktif", slow: "İnternetin yavaş", down: "Kesinti var", mobile: "Yedek bağlantıdasın" }[net.status];
  const to = down || net.status === "mobile" ? "/hibrit" : net.status === "slow" ? "/ai-usta" : "/hiz-testi";
  return (
    <div className="rounded-card bg-card px-5 py-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Merhaba, hoş geldin.</p>
          <p className="text-2xl font-semibold text-primary">{acting ? acting.short : USER.firstName}</p>
        </div>
        <span className="rounded-full bg-success-soft px-2.5 py-1 text-[11px] font-bold text-success">Abonelik aktif</span>
      </div>
      <Link
        to={to as "/"}
        aria-live="polite"
        className={cn("mt-3 inline-flex max-w-full items-center gap-2 rounded-full px-3 py-1.5 text-xs", down ? "bg-destructive-soft text-destructive" : "bg-muted text-foreground")}
      >
        <span className={cn("h-2 w-2 shrink-0 rounded-full", down ? "bg-destructive" : net.status === "online" ? "animate-pulse bg-success" : "bg-warning")} />
        <span className="font-semibold">{label}</span>
        <span className="truncate text-muted-foreground">{down ? "teknik ekip çalışıyor" : `~${Math.max(0, Math.round(live))} Mbps (demo)`}</span>
        <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
      </Link>
    </div>
  );
}

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
