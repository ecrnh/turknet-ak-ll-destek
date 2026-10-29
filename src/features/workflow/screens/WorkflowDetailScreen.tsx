import { Link } from "@tanstack/react-router";
import { AlertTriangle, Clock3, Headset, Link2, RefreshCw } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/layout/headers";
import { EmptyState, SectionTitle } from "@/components/tn/primitives";
import { Button } from "@/components/ui/button";
import { TEAMS } from "@/data/mock";
import { fmtDateTime } from "@/lib/format";
import { escalate, recheck, useWorkflowStore } from "@/features/workflow";
import { STATUS_LABEL, isActive } from "../rules";
import type { WorkflowType } from "../types";
import { AiUstaPanel, BillingPanel, ConnectivityPanel, RelocationPanel, TempPanel } from "../components/panels";
import { AuditList, DecisionCard, DemoNote, HandoffCard, OutcomeCard, RecordsList, StatusPill, StepTimeline, TYPE_ICON, TYPE_LABEL } from "../components/ui";

const TEAM_FOR: Record<WorkflowType, string> = {
  relocation: TEAMS.relocation,
  temp_internet: TEAMS.logistics,
  outage_recovery: TEAMS.tech,
  billing_check: TEAMS.finance,
  ai_usta: TEAMS.tech,
  proactive_fault: TEAMS.tech,
};

export function WorkflowDetailScreen({ id }: { id: string }) {
  const wf = useWorkflowStore((s) => s.workflows.find((w) => w.id === id));
  const related = useWorkflowStore((s) => s.workflows).filter((w) => wf?.relatedIds.includes(w.id));
  const audit = useWorkflowStore((s) => s.audit).filter((e) => e.workflowId === id);
  const [showAll, setShowAll] = useState(false);

  if (!wf)
    return (
      <div>
        <PageHeader title="Süreç" />
        <EmptyState icon={AlertTriangle} title="Süreç bulunamadı" text="Demo sıfırlanmış olabilir." action={<Link to="/takip" className="font-semibold text-magenta">Tüm süreçlerim</Link>} />
      </div>
    );

  const Icon = TYPE_ICON[wf.type];
  const events = [...audit].reverse();

  return (
    <div>
      <PageHeader title={TYPE_LABEL[wf.type]} right={<StatusPill status={wf.status} className="mr-2" />} />
      <div className="space-y-4 px-4">
        <div className="rounded-card bg-plum p-5 text-primary-foreground shadow-float">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-foreground/15">
              <Icon className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-primary-foreground/70">
                {wf.id} · {fmtDateTime(wf.createdAt)}
              </p>
              <p className="font-semibold leading-tight">{wf.title}</p>
            </div>
          </div>
          <p className="mt-4 text-[11px] font-bold uppercase tracking-widest text-primary-foreground/70">Şu an</p>
          <p className="text-lg font-semibold">{STATUS_LABEL[wf.status]}</p>
          {wf.status !== "completed" && <p className="mt-0.5 text-sm text-primary-foreground/90">Sıradaki: {wf.decision ? "Senin kararın" : (wf.nextStep ?? (wf.handoff ? `${wf.handoff.team} inceliyor` : "—"))}</p>}
          {wf.eta && wf.status !== "completed" && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-primary-foreground/80">
              <Clock3 className="size-3.5" /> {wf.eta}
            </p>
          )}
          <p className="mt-3 text-xs text-primary-foreground/70">TurkNet bu süreci senin için takip ediyor. Bir şey değişince bildirim alacaksın.</p>
        </div>

        {wf.blocker && wf.status !== "completed" && wf.status !== "escalated" && (
          <div className="flex items-start gap-3 rounded-2xl border border-orange/30 bg-orange-soft p-3.5 text-sm" role="status">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-orange-deep" />
            <div>
              <p className="font-semibold text-foreground">Engel / bekleme nedeni</p>
              <p className="text-muted-foreground">{wf.blocker}</p>
            </div>
          </div>
        )}

        <DecisionCard key={wf.decision?.key ?? "none"} wf={wf} />
        <HandoffCard wf={wf} />
        <OutcomeCard wf={wf} />

        {wf.type === "relocation" && <RelocationPanel wf={wf} />}
        {wf.type === "temp_internet" && <TempPanel wf={wf} />}
        {wf.type === "billing_check" && <BillingPanel wf={wf} />}
        {wf.type === "ai_usta" && <AiUstaPanel wf={wf} />}
        {(wf.type === "outage_recovery" || wf.type === "proactive_fault") && <ConnectivityPanel compact />}

        {isActive(wf) && (
          <div className="grid grid-cols-2 gap-2">
            {wf.status === "waiting_for_external_system" && wf.type === "relocation" ? (
              <Button variant="outline" onClick={() => recheck(wf.id)}>
                <RefreshCw /> Yeniden kontrol et
              </Button>
            ) : (
              <span />
            )}
            {!wf.handoff && (
              <Button variant="outline" onClick={() => escalate(wf.id, TEAM_FOR[wf.type], "Müşteri canlı destek istedi", "customer")}>
                <Headset /> Canlı desteğe aktar
              </Button>
            )}
          </div>
        )}

        <SectionTitle className="mt-5">Adımlar</SectionTitle>
        <div className="rounded-card bg-card p-5 shadow-card">
          <StepTimeline wf={wf} />
        </div>

        <RecordsList wf={wf} />

        {related.length > 0 && (
          <div className="rounded-card bg-card p-4 shadow-card">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-primary">
              <Link2 className="size-4" /> İlişkili süreçler
            </p>
            {related.map((r) => (
              <Link key={r.id} to="/surec/$id" params={{ id: r.id }} className="flex items-center justify-between rounded-xl px-2 py-2 text-sm hover:bg-accent">
                <span className="font-semibold text-foreground">{r.title}</span>
                <StatusPill status={r.status} />
              </Link>
            ))}
          </div>
        )}

        <SectionTitle className="mt-5" action={events.length > 6 && <button className="text-sm font-semibold text-magenta" onClick={() => setShowAll((v) => !v)}>{showAll ? "Daha az" : "Tümü"}</button>}>
          İşlem günlüğü
        </SectionTitle>
        <div className="rounded-card bg-card p-4 shadow-card">
          <AuditList events={showAll ? events : events.slice(0, 6)} />
        </div>
        <DemoNote className="pb-2" />
      </div>
    </div>
  );
}
