import { Link } from "@tanstack/react-router";
import { ListChecks, MapPinned, ScanEye, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/headers";
import { SectionTitle } from "@/components/tn/primitives";
import { useWorkflowStore } from "@/features/workflow";
import { isActive } from "../rules";
import { AuditList, DemoNote, WorkflowCard } from "../components/ui";
import { ConnectivityPanel } from "../components/panels";
import { IntentBox } from "../components/IntentBox";

/** "Benim İçin Takip Et": every workflow, decision and dependency in one place. */
export function TrackHubScreen() {
  const workflows = useWorkflowStore((s) => s.workflows);
  const audit = useWorkflowStore((s) => s.audit);
  const ops = useWorkflowStore((s) => s.ops);
  const workOrders = useWorkflowStore((s) => s.workOrders);
  const active = [...workflows].filter(isActive).sort((a, b) => b.updatedAt - a.updatedAt);
  const done = workflows.filter((w) => !isActive(w)).sort((a, b) => b.updatedAt - a.updatedAt);
  const decisions = active.filter((w) => w.decision);
  const external = active.filter((w) => w.status === "waiting_for_external_system");
  const openWo = workOrders.filter((o) => o.status !== "done" && o.status !== "cancelled");
  const timeline = [...audit].filter((e) => e.workflowId).reverse().slice(0, 14);

  return (
    <div>
      <PageHeader title="Benim İçin Takip Et" />
      <div className="space-y-4 px-4">
        <div className="rounded-card bg-plum p-5 text-primary-foreground shadow-float">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary-foreground/70">Otonom süreç yöneticisi</p>
          <p className="mt-1 text-xl font-semibold leading-snug">Sen talebini söyle. TurkNet süreci senin için yönetsin.</p>
          <IntentBox onDark className="mt-4" />
        </div>

        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            ["Aktif", active.length],
            ["Karar", decisions.length],
            ["Dış sistem", external.length],
            ["Açık iş emri", openWo.length],
          ].map(([l, v]) => (
            <div key={l} className="rounded-2xl bg-card px-1 py-3 shadow-card">
              <p className="text-xl font-bold text-primary">{v}</p>
              <p className="text-[10px] font-semibold text-muted-foreground">{l}</p>
            </div>
          ))}
        </div>

        {decisions.length > 0 && (
          <>
            <SectionTitle className="mt-5">Senden beklenenler</SectionTitle>
            {decisions.map((w) => (
              <Link key={w.id} to="/surec/$id" params={{ id: w.id }} className="block rounded-card border-2 border-magenta/30 bg-card p-4 shadow-card">
                <p className="text-[11px] font-bold uppercase tracking-widest text-magenta">{w.title}</p>
                <p className="mt-1 font-semibold text-primary">{w.decision!.prompt}</p>
                <p className="mt-2 text-sm font-semibold text-magenta">Karar ver →</p>
              </Link>
            ))}
          </>
        )}

        <SectionTitle className="mt-5">Aktif süreçler</SectionTitle>
        {active.length ? (
          <div className="space-y-3">
            {active.map((w) => (
              <WorkflowCard key={w.id} wf={w} />
            ))}
            <p className="px-1 text-[11px] text-muted-foreground">
              Otomatik takip açık · {ops.length} planlı kontrol · bekleyen dış yanıtlar düzenli olarak yeniden sorgulanır.
            </p>
          </div>
        ) : (
          <div className="rounded-card bg-card p-5 text-center shadow-card">
            <ListChecks className="mx-auto size-9 text-magenta" strokeWidth={1.5} />
            <p className="mt-2 font-semibold text-primary">Şu an takip edilen süreç yok</p>
            <p className="mt-1 text-sm text-muted-foreground">Bir talep başlattığında burada adım adım göreceksin.</p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-xs font-semibold text-primary">
              <Link to="/tasinma" className="flex flex-col items-center gap-1.5 rounded-2xl bg-icon-box p-3"><MapPinned className="size-5" />Taşınma</Link>
              <Link to="/ai-usta" className="flex flex-col items-center gap-1.5 rounded-2xl bg-icon-box p-3"><ScanEye className="size-5" />AI Usta</Link>
              <Link to="/fatura-kalkani" className="flex flex-col items-center gap-1.5 rounded-2xl bg-icon-box p-3"><ShieldCheck className="size-5" />Fatura</Link>
            </div>
          </div>
        )}

        <ConnectivityPanel compact />

        {timeline.length > 0 && (
          <>
            <SectionTitle className="mt-5">Tüm süreçlerin zaman çizelgesi</SectionTitle>
            <div className="rounded-card bg-card p-4 shadow-card">
              <AuditList events={timeline} showWf />
            </div>
          </>
        )}

        {done.length > 0 && (
          <>
            <SectionTitle className="mt-5">Tamamlanan / kapanan</SectionTitle>
            <div className="space-y-3">
              {done.map((w) => (
                <WorkflowCard key={w.id} wf={w} />
              ))}
            </div>
          </>
        )}
        <DemoNote className="pb-2" />
      </div>
    </div>
  );
}
