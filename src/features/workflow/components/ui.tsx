import { Link, useNavigate } from "@tanstack/react-router";
import {
  BadgeCheck,
  Bot,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Clock3,
  ChevronDown,
  CloudOff,
  Gauge,
  Headset,
  Hourglass,
  Loader2,
  MapPinned,
  Package,
  Radar,
  ScanEye,
  ShieldCheck,
  Smartphone,
  User,
  Users,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { fmtDateTime, fmtRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { decide, WO_LABEL } from "../engine";
import { STATUS_LABEL } from "../rules";
import { customerAction, lastDoneStep, TYPE_LABEL } from "../copy";
import { useWorkflowStore } from "../store";
import type { Actor, AuditEvent, Decision, StepStatus, Workflow, WorkflowStatus, WorkflowType } from "../types";
import { ModemInspectCard } from "./modem";

export const TYPE_ICON: Record<WorkflowType, LucideIcon> = {
  relocation: MapPinned,
  temp_internet: Smartphone,
  outage_recovery: CloudOff,
  billing_check: ShieldCheck,
  ai_usta: ScanEye,
  proactive_fault: Radar,
  speed_optimize: Gauge,
};

export { TYPE_LABEL };

const STATUS_STYLE: Record<WorkflowStatus, string> = {
  pending: "bg-icon-box text-primary",
  in_progress: "bg-icon-box text-primary",
  waiting_for_customer: "bg-magenta-soft text-magenta",
  waiting_for_external_system: "bg-warning-soft text-warning",
  blocked: "bg-orange-soft text-orange-deep",
  escalated: "bg-primary text-primary-foreground",
  completed: "bg-success-soft text-success",
  failed: "bg-destructive-soft text-destructive",
};

export function StatusPill({ status, className }: { status: WorkflowStatus; className?: string }) {
  return <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold", STATUS_STYLE[status], className)}>{STATUS_LABEL[status]}</span>;
}

export function StepIcon({ status, className }: { status: StepStatus | "running"; className?: string }) {
  const c = cn("size-5 shrink-0", className);
  if (status === "done") return <CheckCircle2 className={cn(c, "text-success")} aria-label="Tamamlandı" />;
  if (status === "in_progress" || status === "running") return <Loader2 className={cn(c, "animate-spin text-magenta")} aria-label="Devam ediyor" />;
  if (status === "waiting") return <Hourglass className={cn(c, "text-warning")} aria-label="Bekliyor" />;
  if (status === "failed") return <XCircle className={cn(c, "text-destructive")} aria-label="Başarısız" />;
  if (status === "skipped") return <CircleDashed className={cn(c, "text-muted-foreground/60")} aria-label="Atlandı" />;
  return <span className={cn("m-0.5 size-4 shrink-0 rounded-full border-2 border-border", className)} aria-label="Sırada" />;
}

/** Simple mode (default) shows only meaningful stages; `detailed` adds skipped steps and technical notes. */
export function StepTimeline({ wf, detailed }: { wf: Workflow; detailed?: boolean }) {
  const visible = wf.data["eligibilityPrechecked"] === true ? wf.steps.filter((s) => s.key !== "eligibility") : wf.steps;
  const steps = detailed ? visible : visible.filter((s) => s.status !== "skipped");
  return (
    <ol className="space-y-0">
      {steps.map((s, i) => (
        <li key={s.key} className="relative flex gap-3 pb-4 last:pb-0">
          {i < steps.length - 1 && <span className="absolute left-[9px] top-6 h-[calc(100%-18px)] w-0.5 bg-border" aria-hidden />}
          <StepIcon status={s.status} />
          <div className="min-w-0 flex-1">
            <p className={cn("text-sm font-semibold", s.status === "pending" || s.status === "skipped" ? "text-muted-foreground" : "text-foreground")}>{s.label}</p>
            {detailed && s.note && <p className="mt-0.5 text-xs text-muted-foreground">{s.note}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Second information level: "Teknik detayları gör". Closed by default. */
export function TechDetails({ title = "Teknik detayları gör", children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn("rounded-card bg-card shadow-card", className)}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex min-h-12 w-full items-center justify-between px-5 text-sm font-semibold text-primary">
        {title}
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="space-y-4 border-t border-border px-5 pb-5 pt-4">{children}</div>}
    </div>
  );
}

export function DecisionCard({ wf }: { wf: Workflow }) {
  const navigate = useNavigate();
  const stored = wf.decision;
  const d: Decision | null | undefined = stored?.key === "usta_more"
    ? { ...stored, prompt: "Sorunun hâlâ devam ediyor mu?", detail: "", options: [{ id: "yes", label: "Evet, devam ediyor", primary: true }, { id: "fixed", label: "Hayır, düzeldi" }] }
    : stored?.key === "usta_support"
      ? { ...stored, prompt: "Bağlantı sorunun sürüyorsa birlikte deneyelim.", detail: "Modem kısa süreli takılmış olabilir. Bağlantıyı uzaktan yenilemek modemin yeniden ağa bağlanmasını sağlar; evindeki modemi kapatıp açmana gerek kalmaz.", options: [{ id: "restart", label: "Bağlantıyı uzaktan yenile", desc: "Modemini yeniden ağa bağlamayı deneyelim.", primary: true }, { id: "video", label: "GIGA ile görüntülü destek almak istiyorum", desc: "Modemle ilgili bir problem olduğunu düşünüyorsan ideal seçenek." }] }
      : stored?.key === "usta_remote_failed"
        ? { ...stored, prompt: "Bağlantı sorunun sürüyor. Nasıl devam etmek istersin?", detail: "", options: [{ id: "video", label: "GIGA ile görüntülü destek almak istiyorum", desc: "Modemle ilgili bir problem olduğunu düşünüyorsan ideal seçenek.", primary: true }] }
        : stored;
    if (!d) return null;
  if (d.key === "usta_final_support" && d.options.length === 0) return (
    <div className="rounded-card border-2 border-magenta/30 bg-card p-5 shadow-card">
      <p className="text-[11px] font-bold uppercase tracking-widest text-magenta">Sonraki adım</p>
      <h3 className="mt-1 text-lg font-semibold leading-snug text-primary">{d.prompt}</h3>
      {d.detail && <p className="mt-1.5 text-sm text-muted-foreground">{d.detail}</p>}
    </div>
  );
  if (d.key === "usta_inspect") return <ModemInspectCard wf={wf} />;
  const options = d.options;
  return (
    <div className="rounded-card border-2 border-magenta/30 bg-card p-5 shadow-card" role="group" aria-label="Karar bekleniyor">
      <p className="text-[11px] font-bold uppercase tracking-widest text-magenta">Sizden bir karar bekleniyor</p>
      <h3 className="mt-1 text-lg font-semibold leading-snug text-primary">{d.prompt}</h3>
      {d.detail && <p className="mt-1.5 text-sm text-muted-foreground">{d.detail}</p>}
      <div className="mt-4 space-y-2.5">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => {
              decide(wf.id, o.id, "customer");
              // "Canlı destekle görüşmek istiyorum" opens the live chat that the handover created.
              if (o.id === "live" && (wf.type === "ai_usta" || wf.type === "speed_optimize")) navigate({ to: "/canli-destek/$id", params: { id: wf.id } });
              if (o.id === "video" && wf.type === "ai_usta") navigate({ to: "/goruntulu-destek" });
            }}
            className={cn(
              "w-full rounded-2xl border p-3.5 text-left transition-transform active:scale-[0.99]",
              o.primary ? "border-primary bg-primary text-primary-foreground shadow-float" : "border-primary/20 bg-card text-primary hover:bg-accent",
            )}
          >
            <span className="flex items-center gap-2 font-semibold">
              <span className="flex-1">{o.label}</span>
              <ChevronRight className="size-4 shrink-0 opacity-70" />
            </span>
            {o.desc && <span className={cn("mt-0.5 block text-xs", o.primary ? "text-primary-foreground/85" : "text-muted-foreground")}>{o.desc}</span>}
            {o.terms && (
              <ul className={cn("mt-2 space-y-0.5 text-[11px]", o.primary ? "text-primary-foreground/80" : "text-muted-foreground")}>
                {o.terms.map((t) => (
                  <li key={t}>• {t}</li>
                ))}
              </ul>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

const ACTOR: Record<Actor, { label: string; icon: LucideIcon; cls: string }> = {
  system: { label: "Sistem", icon: Bot, cls: "bg-icon-box text-primary" },
  customer: { label: "Müşteri", icon: User, cls: "bg-magenta-soft text-magenta" },
  external: { label: "Dış sistem", icon: Package, cls: "bg-warning-soft text-warning" },
  agent: { label: "GIGA", icon: ScanEye, cls: "bg-icon-box text-primary" },
  presenter: { label: "Sunum", icon: Users, cls: "bg-muted text-muted-foreground" },
  team: { label: "Ekip", icon: Headset, cls: "bg-success-soft text-success" },
};

export function ActorChip({ actor }: { actor: Actor }) {
  const a = ACTOR[actor];
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold", a.cls)}>
      <a.icon className="size-3" /> {a.label}
    </span>
  );
}

const clock = (t: number) => new Date(t).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export function AuditList({ events, showWf, dense }: { events: AuditEvent[]; showWf?: boolean; dense?: boolean }) {
  const workflows = useWorkflowStore((s) => s.workflows);
  if (!events.length) return <p className="py-3 text-center text-xs text-muted-foreground">Henüz kayıt yok.</p>;
  return (
    <ol className="space-y-2.5">
      {events.map((e) => {
        const wf = showWf && e.workflowId ? workflows.find((w) => w.id === e.workflowId) : undefined;
        return (
          <li key={e.id} className={cn("flex gap-2", dense ? "text-[11px]" : "text-xs")}>
            <span className="w-[52px] shrink-0 pt-0.5 font-mono text-[10px] text-muted-foreground">{clock(e.at)}</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1">
                <ActorChip actor={e.actor} />
                {wf && <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">{TYPE_LABEL[wf.type]}</span>}
                {e.kind === "error" && <span className="rounded-full bg-destructive-soft px-1.5 py-0.5 text-[10px] font-bold text-destructive">Engellendi</span>}
              </div>
              <p className="mt-0.5 text-foreground">{e.message}</p>
              {e.why && <p className="mt-0.5 italic text-muted-foreground">Neden: {e.why}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Track-hub card: name, start, status, last step, next step, what the customer must do, ETA, details. */
export function WorkflowCard({ wf }: { wf: Workflow }) {
  const Icon = TYPE_ICON[wf.type];
  const action = customerAction(wf);
  const last = lastDoneStep(wf);
  const closed = wf.status === "completed" || wf.status === "failed";
  return (
    <Link to="/surec/$id" params={{ id: wf.id }} className="block rounded-card bg-card p-4 shadow-card transition-transform active:scale-[0.99]">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-icon-box-border bg-icon-box text-primary">
          <Icon className="size-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold leading-tight text-primary">{wf.title}</p>
            <StatusPill status={wf.status} />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Başlangıç {fmtDateTime(wf.createdAt)}</p>
        </div>
      </div>
      {closed ? (
        <p className="mt-3 text-sm text-success">{wf.outcome?.summary ?? "Süreç kapandı"}</p>
      ) : (
        <dl className="mt-3 space-y-1.5 text-xs">
          {last && (
            <div className="flex gap-2">
              <dt className="w-20 shrink-0 text-muted-foreground">Son adım</dt>
              <dd className="text-foreground">{last}</dd>
            </div>
          )}
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 text-muted-foreground">Sıradaki</dt>
            <dd className="text-foreground">{wf.decision ? "Sizin kararınız" : (wf.nextStep ?? (wf.handoff ? `${wf.handoff.team} inceliyor` : "—"))}</dd>
          </div>
          {wf.eta && (
            <div className="flex gap-2">
              <dt className="w-20 shrink-0 text-muted-foreground">Tahmini</dt>
              <dd className="flex items-center gap-1 text-foreground">
                <Clock3 className="size-3" /> {wf.eta}
              </dd>
            </div>
          )}
        </dl>
      )}
      {!closed && <p className={cn("mt-3 rounded-xl px-3 py-2 text-xs font-semibold", action.needed ? "bg-magenta-soft text-magenta" : "bg-muted text-muted-foreground")}>{action.needed && wf.decision ? `Sizden beklenen: ${wf.decision.prompt}` : action.text}</p>}
      <p className="mt-2 flex items-center justify-end gap-1 text-xs font-semibold text-magenta">
        Detayları Gör <ChevronRight className="size-3.5" />
      </p>
    </Link>
  );
}

export function HandoffCard({ wf }: { wf: Workflow }) {
  if (!wf.handoff) return null;
  return (
    <div className="rounded-card bg-plum p-5 text-primary-foreground shadow-float">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-foreground/15">
          <Headset className="size-5" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/70">Uzman ekibimize iletildi · {wf.handoff.id}</p>
          <p className="font-semibold">{wf.handoff.team}</p>
        </div>
      </div>
      {wf.type === "ai_usta" && wf.steps.some((st) => st.key === "recheck" && st.status === "failed") && (
        <p className="mt-3 font-semibold">Bu adımlara rağmen bağlantın düzelmedi. Sorunu daha detaylı inceleyelim.</p>
      )}
      <p className="mt-3 text-sm text-primary-foreground/90">{wf.handoff.reason}</p>
      <p className="mt-3 text-xs font-semibold text-primary-foreground/70">Ekibe ilettiğimiz bilgiler (sorunu baştan anlatmanız gerekmez):</p>
      <ul className="mt-1.5 space-y-1 text-xs text-primary-foreground/90">
        {wf.handoff.context.map((c, i) => (
          <li key={`${i}-${c}`}>{c}</li>
        ))}
      </ul>
      <Link to="/canli-destek/$id" params={{ id: wf.id }} className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-full bg-card text-sm font-semibold text-primary">
        <Headset className="size-4" /> Canlı desteğe bağlan
      </Link>
    </div>
  );
}

export function OutcomeCard({ wf }: { wf: Workflow }) {
  if (wf.status !== "completed" || !wf.outcome) return null;
  return (
    <div className="rounded-card border border-success/25 bg-success-soft p-5">
      <div className="flex items-center gap-2 font-semibold text-success">
        <BadgeCheck className="size-5" /> İşleminiz tamamlandı
      </div>
      <p className="mt-1 font-semibold text-foreground">{wf.outcome.summary}</p>
      <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
        {wf.outcome.results.map((r, i) => (
          <li key={`${i}-${r}`}>✓ {r}</li>
        ))}
      </ul>
    </div>
  );
}

export function RecordsList({ wf }: { wf: Workflow }) {
  const workOrders = useWorkflowStore((s) => s.workOrders).filter((o) => o.workflowId === wf.id);
  const appts = useWorkflowStore((s) => s.appointments).filter((a) => a.workflowId === wf.id);
  const temps = useWorkflowStore((s) => s.temp).filter((t) => t.parentWorkflowId === wf.id || t.workflowId === wf.id);
  if (!workOrders.length && !appts.length && !temps.length) return null;
  return (
    <div className="divide-y divide-border rounded-card bg-card px-5 shadow-card">
      {workOrders.map((o) => (
        <div key={o.id} className="flex items-center gap-3 py-3">
          <Package className="size-5 shrink-0 text-primary" strokeWidth={1.75} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">{o.title}</p>
            <p className="text-[11px] text-muted-foreground">
              İş emri {o.id} · {o.team}
            </p>
          </div>
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", o.status === "done" ? "bg-success-soft text-success" : o.status === "waiting_external" ? "bg-warning-soft text-warning" : "bg-icon-box text-primary")}>{WO_LABEL[o.status]}</span>
        </div>
      ))}
      {appts.map((a) => (
        <div key={a.id} className="flex items-center gap-3 py-3">
          <CalendarCheck className="size-5 shrink-0 text-primary" strokeWidth={1.75} />
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Randevu: {a.label}</p>
            <p className="text-[11px] text-muted-foreground">
              {a.id}
              {a.workOrderId ? ` · iş emri ${a.workOrderId}` : ""}
            </p>
          </div>
        </div>
      ))}
      {temps.map((t) => (
        <Link key={t.id} to="/surec/$id" params={{ id: t.workflowId }} className="flex items-center gap-3 py-3">
          <Smartphone className="size-5 shrink-0 text-primary" strokeWidth={1.75} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">TürkNet Box</p>
            <p className="text-[11px] text-muted-foreground">
              {t.id} · {t.price}
            </p>
          </div>
          <span className="rounded-full bg-icon-box px-2 py-0.5 text-[10px] font-bold text-primary">{TEMP_LABEL[t.status]}</span>
        </Link>
      ))}
    </div>
  );
}

export const TEMP_LABEL: Record<string, string> = { offered: "Teklif", accepted: "Onaylandı", declined: "İstenmedi", ordered: "Hazırlanıyor", shipped: "Teslim edildi", active: "Aktif", ended: "Sona erdi" };

export function DemoNote({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <p className={cn("flex items-start gap-1.5 text-[11px] text-muted-foreground", className)}>
      <span className="rounded bg-warning-soft px-1 font-bold text-warning">DEMO</span>
      <span>{children ?? "Altyapı, operatör, fatura ve ağ yanıtları örnek verilerdir; gerçek sistem bağlantısı yoktur."}</span>
    </p>
  );
}

