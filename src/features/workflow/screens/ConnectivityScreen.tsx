import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Gauge, Router, ScanEye } from "lucide-react";
import { PageHeader } from "@/components/layout/headers";
import { SectionTitle } from "@/components/tn/primitives";
import { startSpeedCheck, useWorkflowStore } from "@/features/workflow";
import { isActive } from "../rules";
import { BoxCard, ConnectivityPanel, HealthCard } from "../components/panels";
import { DemoNote, TechDetails, WorkflowCard } from "../components/ui";
import { FreeBadge } from "../components/hybrid";
import { HYBRID_COPY } from "../copy";

const TYPES = ["outage_recovery", "proactive_fault", "speed_optimize", "temp_internet", "ai_usta"];

/** Bağlantım: health, speed, outage state, Hibrit İnternet entry and the relocation Box in one place. */
export function ConnectivityScreen() {
  const navigate = useNavigate();
  const workflows = useWorkflowStore((s) => s.workflows);
  const hybrid = useWorkflowStore((s) => s.hybrid);
  const outage = useWorkflowStore((s) => s.outage);
  const related = workflows.filter((w) => TYPES.includes(w.type) && isActive(w)).sort((a, b) => b.updatedAt - a.updatedAt);
  const relocationOffer = workflows.find((w) => isActive(w) && w.decision?.key === "relocation_temp");
  const ongoing = !!outage && !outage.restoredAt;
  const hybridLine =
    hybrid.status === "active"
      ? HYBRID_COPY.active.title
      : ongoing && hybrid.status !== "unavailable"
        ? "Kesintiniz 24 saati aştı. Ücretsiz yedek bağlantınızı etkinleştirebilirsiniz."
        : ongoing
          ? "Kesinti 24 saati aşarsa ücretsiz yedek bağlantınızı buradan etkinleştirebilirsiniz."
          : "Kesinti 24 saati aşarsa aboneliğinize dahil yedek bağlantınızla internete bağlı kalırsınız.";

  return (
    <div>
      <PageHeader title="Bağlantım" />
      <div className="space-y-4 px-4">
        <HealthCard />

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              const id = startSpeedCheck();
              navigate({ to: "/surec/$id", params: { id } });
            }}
            className="flex min-h-[96px] flex-col justify-between rounded-card bg-card p-4 text-left shadow-card"
          >
            <Gauge className="size-6 text-magenta" />
            <span className="font-semibold leading-tight text-primary">Hızımı Kontrol Et</span>
          </button>
          <Link to="/ai-usta" className="flex min-h-[96px] flex-col justify-between rounded-card bg-card p-4 shadow-card">
            <ScanEye className="size-6 text-magenta" />
            <span className="font-semibold leading-tight text-primary">Sorunu AI Usta ile Çöz</span>
          </Link>
        </div>

        {related.length > 0 && (
          <>
            <SectionTitle className="mt-5">Bağlantı işlemleriniz</SectionTitle>
            <div className="space-y-3">
              {related.map((w) => (
                <WorkflowCard key={w.id} wf={w} />
              ))}
            </div>
          </>
        )}

        <BoxCard />

        <SectionTitle className="mt-5">İnternetsiz kalmayın</SectionTitle>
        <Link to="/hibrit" className="block rounded-card bg-card p-5 shadow-card">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-icon-box text-primary">
              <Router className="size-6" strokeWidth={1.5} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-primary">Hibrit İnternet</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{hybridLine}</p>
              <FreeBadge className="mt-2" />
            </div>
            <ChevronRight className="mt-1 size-5 text-muted-foreground" />
          </div>
        </Link>

        {relocationOffer && (
          <Link to="/surec/$id" params={{ id: relocationOffer.id }} className="flex min-h-12 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-float">
            Taşınma İçin Geçici İnternet Teklifini İnceleyin
          </Link>
        )}

        <TechDetails>
          <ConnectivityPanel />
          <DemoNote>Kapsama, cihaz ve hız bilgileri demo verisidir; gerçek operatör anlaşması veya cihaz bağlantısı yoktur.</DemoNote>
        </TechDetails>
        <div className="pb-2" />
      </div>
    </div>
  );
}
