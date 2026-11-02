import { Link } from "@tanstack/react-router";
import { ListChecks, MapPinned, ScanEye, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/headers";
import { SectionTitle } from "@/components/tn/primitives";
import { useWorkflowStore } from "@/features/workflow";
import { isActive } from "../rules";
import { AuditList, DemoNote, TechDetails, WorkflowCard } from "../components/ui";
import { ConnectivityPanel } from "../components/panels";
import { IntentBox } from "../components/IntentBox";
import { GigaAvatar } from "@/features/giga/GigaAvatar";

/** "Benim İçin Takip Et": every workflow, decision and dependency in one place. */
export function TrackHubScreen() {
  const workflows = useWorkflowStore((s) => s.workflows);
  const audit = useWorkflowStore((s) => s.audit);
  const ops = useWorkflowStore((s) => s.ops);
  const workOrders = useWorkflowStore((s) => s.workOrders);
  const temp = useWorkflowStore((s) => s.temp);
  const active = [...workflows].filter(isActive).sort((a, b) => b.updatedAt - a.updatedAt);
  const done = workflows.filter((w) => !isActive(w)).sort((a, b) => b.updatedAt - a.updatedAt);
  const decisions = active.filter((w) => w.decision);
  const running = active.filter((w) => !w.decision);
  const external = active.filter((w) => w.status === "waiting_for_external_system");
  const openWo = workOrders.filter((o) => o.status !== "done" && o.status !== "cancelled");
  const timeline = [...audit].filter((e) => e.workflowId).reverse().slice(0, 14);

  const chips: [string, number][] = [
    ["Kararınızı bekleyen", decisions.length],
    ["Yanıt beklenen", external.length],
    ["Teknik iş emri", openWo.length],
    ["Taşınma", active.filter((w) => w.type === "relocation").length],
    ["Fatura incelemesi", active.filter((w) => w.type === "billing_check").length],
    ["Geçici internet", temp.filter((t) => t.status !== "ended" && t.status !== "declined").length],
  ];

  return (
    <div>
      <PageHeader title="İşlemlerim" />
      <div className="space-y-4 px-4">
        <div className="rounded-card bg-plum p-5 text-primary-foreground shadow-float">
          <div className="flex items-center gap-3">
            <GigaAvatar size={44} mood={decisions.length ? "listening" : active.length ? "working" : "idle"} />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary-foreground/70">GIGA Takip · Benim İçin Takip Et</p>
              <p className="text-xl font-semibold leading-snug">Senin için takip ettiğim işlemler</p>
            </div>
          </div>
          <p className="mt-1 text-sm text-primary-foreground/80">
            {active.length ? `${active.length} işlem takipte${decisions.length ? ` · ${decisions.length} tanesi kararınızı bekliyor` : ""}` : "Şu an takip ettiğim bir işlem yok."}
          </p>
          <IntentBox onDark className="mt-4" />
        </div>

        {active.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {chips
              .filter(([, v]) => v > 0)
              .map(([l, v]) => (
                <span key={l} className="rounded-full bg-card px-3 py-1.5 text-xs font-semibold text-primary shadow-card">
                  {l} · {v}
                </span>
              ))}
          </div>
        )}

        {decisions.length > 0 && (
          <>
            <SectionTitle className="mt-5">Kararınızı bekleyenler</SectionTitle>
            <div className="space-y-3">
              {decisions.map((w) => (
                <WorkflowCard key={w.id} wf={w} />
              ))}
            </div>
          </>
        )}

        {running.length > 0 && (
          <>
            <SectionTitle className="mt-5">Devam eden işlemler</SectionTitle>
            <div className="space-y-3">
              {running.map((w) => (
                <WorkflowCard key={w.id} wf={w} />
              ))}
            </div>
          </>
        )}

        {!active.length && (
          <div className="rounded-card bg-card p-5 text-center shadow-card">
            <ListChecks className="mx-auto size-9 text-magenta" strokeWidth={1.5} />
            <p className="mt-2 font-semibold text-primary">Takip edilen işlem yok</p>
            <p className="mt-1 text-sm text-muted-foreground">Bir talep başlattığınızda adımlarını burada göreceksiniz.</p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-xs font-semibold text-primary">
              <Link to="/tasinma" className="flex flex-col items-center gap-1.5 rounded-2xl bg-icon-box p-3">
                <MapPinned className="size-5" />
                Taşınma
              </Link>
              <Link to="/ai-usta" className="flex flex-col items-center gap-1.5 rounded-2xl bg-icon-box p-3">
                <ScanEye className="size-5" />
                GIGA Teknik
              </Link>
              <Link to="/fatura-kalkani" className="flex flex-col items-center gap-1.5 rounded-2xl bg-icon-box p-3">
                <ShieldCheck className="size-5" />
                Fatura
              </Link>
            </div>
          </div>
        )}

        {done.length > 0 && (
          <>
            <SectionTitle className="mt-5">Tamamlananlar</SectionTitle>
            <div className="space-y-3">
              {done.map((w) => (
                <WorkflowCard key={w.id} wf={w} />
              ))}
            </div>
          </>
        )}

        {timeline.length > 0 && (
          <TechDetails title="Tüm işlemlerin zaman çizelgesi">
            <p className="text-[11px] text-muted-foreground">Otomatik takip açık · {ops.length} planlı kontrol. Bekleyen yanıtları düzenli olarak yeniden kontrol ediyoruz.</p>
            <AuditList events={timeline} showWf />
            <ConnectivityPanel compact />
            <DemoNote />
          </TechDetails>
        )}
        <div className="pb-2" />
      </div>
    </div>
  );
}
