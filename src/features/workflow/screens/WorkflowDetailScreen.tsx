import { Link } from "@tanstack/react-router";
import { AlertTriangle, Clock3, Link2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/headers";
import { EmptyState, SectionTitle } from "@/components/tn/primitives";
import { Button } from "@/components/ui/button";
import { fmtDateTime } from "@/lib/format";
import { recheck, runDueOps, useWorkflowStore } from "@/features/workflow";
import { isActive } from "../rules";
import { customerAction, statusSentence, whatsNext } from "../copy";
import { AiUstaPanel, BillingPanel, ConnectivityPanel, HealthCard, RelocationPanel, SpeedPanel, TempPanel, UstaIntro, UstaWelcome } from "../components/panels";
import { AuditList, DecisionCard, DemoNote, HandoffCard, OutcomeCard, RecordsList, StatusPill, StepTimeline, TechDetails, TYPE_ICON, TYPE_LABEL } from "../components/ui";

export function WorkflowDetailScreen({ id }: { id: string }) {
  const wf = useWorkflowStore((s) => s.workflows.find((w) => w.id === id));
  const related = useWorkflowStore((s) => s.workflows).filter((w) => wf?.relatedIds.includes(w.id));
  const audit = useWorkflowStore((s) => s.audit).filter((e) => e.workflowId === id);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (wf?.type !== "relocation") return;
    runDueOps();
    const timer = window.setInterval(() => runDueOps(), 1000);
    return () => window.clearInterval(timer);
  }, [wf?.id, wf?.type]);

  if (!wf)
    return (
      <div>
        <PageHeader title="İşlem" />
        <EmptyState icon={AlertTriangle} title="İşlem bulunamadı" text="Demo sıfırlanmış olabilir." action={<Link to="/takip" className="font-semibold text-magenta">Tüm işlemlerim</Link>} />
      </div>
    );

  const Icon = TYPE_ICON[wf.type];
  const events = [...audit].reverse();
  const action = customerAction(wf);
  const isConn = wf.type === "outage_recovery" || wf.type === "proactive_fault" || wf.type === "speed_optimize";
  const simpleProgress = wf.type === "ai_usta" || wf.type === "speed_optimize";

  return (
    <div>
      <PageHeader title={TYPE_LABEL[wf.type]} right={<StatusPill status={wf.status} className="mr-2" />} />
      <div className="space-y-4 px-4">
        {!simpleProgress && <section className="rounded-card bg-plum p-5 text-primary-foreground shadow-float" aria-live="polite">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-foreground/15">
              <Icon className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold leading-tight">{wf.title}</p>
              <p className="text-xs text-primary-foreground/70">Başlangıç {fmtDateTime(wf.createdAt)}</p>
            </div>
          </div>
          <h2 className="mt-4 text-xl font-semibold leading-snug">{statusSentence(wf)}</h2>
          {wf.type === "relocation" && wf.nextStep && isActive(wf) && (
            <div className="mt-3 rounded-2xl bg-primary-foreground/10 px-3.5 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-primary-foreground/65">Sıradaki adım</p>
              <p className="mt-0.5 text-sm font-semibold text-primary-foreground">{wf.nextStep}</p>
            </div>
          )}
          {wf.blocker && isActive(wf) && wf.status !== "escalated" && <p className="mt-1 text-sm text-primary-foreground/85">{wf.blocker}</p>}
          {wf.type !== "relocation" && (
            <dl className="mt-4 space-y-2 rounded-2xl bg-primary-foreground/10 p-3 text-sm">
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-wider text-primary-foreground/60">Sizden beklenen</dt>
                <dd className={action.needed ? "font-semibold text-primary-foreground" : "text-primary-foreground/90"}>{action.text}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-wider text-primary-foreground/60">{wf.status === "completed" ? "Sonuç" : "Bundan sonra"}</dt>
                <dd className="text-primary-foreground/90">{whatsNext(wf)}</dd>
              </div>
              {wf.eta && wf.status !== "completed" && (
                <div className="flex items-center gap-1.5 pt-1 text-xs text-primary-foreground/80">
                  <Clock3 className="size-3.5" /> {wf.eta}
                </div>
              )}
            </dl>
          )}
        </section>}

        <UstaWelcome wf={wf} />
        <UstaIntro wf={wf} />
        <DecisionCard key={wf.decision?.key ?? "none"} wf={wf} />
        <HandoffCard wf={wf} />
        {wf.type !== "speed_optimize" && <OutcomeCard wf={wf} />}

        {wf.type === "outage_recovery" && (
          <Link to="/hibrit" className="flex min-h-12 items-center justify-center rounded-full border border-primary/20 bg-card text-sm font-semibold text-primary">
            Hibrit İnternet Durumunu Gör
          </Link>
        )}
        {wf.type === "relocation" && <RelocationPanel wf={wf} />}
        {wf.type === "temp_internet" && <TempPanel wf={wf} />}
        {wf.type === "billing_check" && <BillingPanel wf={wf} />}
        {wf.type === "ai_usta" && <AiUstaPanel wf={wf} />}
        {(wf.type === "proactive_fault" || wf.type === "speed_optimize") && <SpeedPanel wf={wf} />}
        {isConn && wf.type !== "speed_optimize" && <HealthCard />}

        {isActive(wf) && (
          <div className="flex flex-wrap gap-2">
            {wf.status === "waiting_for_external_system" && wf.type === "relocation" && (
              <Button variant="outline" className="flex-1" onClick={() => recheck(wf.id)}>
                <RefreshCw /> Tekrar Kontrol Et
              </Button>
            )}
          </div>
        )}

        {!simpleProgress && wf.type !== "relocation" && (
          <>
            <SectionTitle className="mt-5">Aşamalar</SectionTitle>
            <div className="rounded-card bg-card p-5 shadow-card">
              <StepTimeline wf={wf} />
            </div>
          </>
        )}

        {related.length > 0 && (
          <div className="rounded-card bg-card p-4 shadow-card">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-primary">
              <Link2 className="size-4" /> İlişkili işlemler
            </p>
            {related.map((r) => (
              <Link key={r.id} to="/surec/$id" params={{ id: r.id }} className="flex items-center justify-between rounded-xl px-2 py-2 text-sm hover:bg-accent">
                <span className="font-semibold text-foreground">{r.title}</span>
                <StatusPill status={r.status} />
              </Link>
            ))}
          </div>
        )}

        {wf.type !== "relocation" && (
          <TechDetails>
            {!simpleProgress && (
              <div>
                <p className="mb-2 text-xs font-semibold text-foreground">Yapılan kontroller ve sonuçları</p>
                <StepTimeline wf={wf} detailed />
              </div>
            )}
            <RecordsList wf={wf} />
            {isConn && wf.type !== "speed_optimize" && <ConnectivityPanel compact />}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground">İşlem geçmişi · {wf.id}</p>
                {events.length > 6 && (
                  <button className="text-xs font-semibold text-magenta" onClick={() => setShowAll((v) => !v)}>
                    {showAll ? "Daha az" : "Tümü"}
                  </button>
                )}
              </div>
              <AuditList events={showAll ? events : events.slice(0, 6)} />
            </div>
            {wf.type !== "ai_usta" && <DemoNote />}
          </TechDetails>
        )}
        <div className="pb-2" />
      </div>
    </div>
  );
}

