/**
 * WorkflowEngine: the only place that mutates workflow state.
 * Includes AuditLogService (log), NotificationService (notify) and a
 * persisted job queue (schedule/runDueOps) so in-flight checks survive reloads.
 */
import { CUSTOMER, SUBSCRIPTION } from "@/data/mock";
import { useAppStore, type NotifKind } from "@/features/core/appStore";
import { uid } from "@/lib/format";
import { canComplete, canTransition, findOpenByKey, mergePlan, nextOpenStep, TERMINAL } from "./rules";
import { useWorkflowStore as W } from "./store";
import type { Actor, AuditEvent, Decision, Outcome, StepStatus, WorkOrder, WorkOrderKind, WorkOrderStatus, Workflow, WorkflowStatus, WorkflowType } from "./types";

const now = () => Date.now();
const newId = (p: string) => `${p}-${uid().slice(0, 6).toUpperCase()}`;
export const getWf = (id: string | null | undefined) => (id ? W.getState().workflows.find((w) => w.id === id) : undefined);

function patchWf(id: string, fn: (wf: Workflow) => Partial<Workflow>) {
  W.setState((s) => ({
    workflows: s.workflows.map((w) => {
      if (w.id !== id) return w;
      const next = { ...w, ...fn(w), updatedAt: now() };
      next.nextStep = nextOpenStep(next.steps)?.label ?? null;
      return next;
    }),
  }));
}

/* ---------------- AuditLogService ---------------- */
export function log(workflowId: string | null, actor: Actor, kind: AuditEvent["kind"], message: string, why?: string) {
  const ev: AuditEvent = { id: newId("EV"), workflowId, at: now(), actor, kind, message, ...(why ? { why } : {}) };
  W.setState((s) => ({ audit: [...s.audit, ev].slice(-400) }));
}

/* ---------------- NotificationService ---------------- */
const KIND_FOR: Record<WorkflowType, NotifKind> = {
  relocation: "support",
  temp_internet: "support",
  outage_recovery: "support",
  billing_check: "bill",
  ai_usta: "agent",
  proactive_fault: "agent",
};

export function notify(workflowId: string, title: string, body: string) {
  const wf = getWf(workflowId);
  W.setState((s) => ({ messages: [...s.messages, { id: newId("MSG"), workflowId, title, body, at: now() }] }));
  useAppStore.getState().notify({ kind: wf ? KIND_FOR[wf.type] : "support", title, body, to: `/surec/${workflowId}` });
  log(workflowId, "system", "notify", `Müşteriye bildirim: “${title}”`);
}

/* ---------------- Workflows ---------------- */
export function createWorkflow(input: {
  type: WorkflowType;
  title: string;
  dedupeKey: string;
  steps: { key: string; label: string }[];
  data?: Workflow["data"];
  relatedIds?: string[];
  why: string;
}): { wf: Workflow; created: boolean } {
  const existing = findOpenByKey(W.getState().workflows, input.dedupeKey, TERMINAL);
  if (existing) {
    log(existing.id, "system", "info", "Aynı talep zaten açık; yeni kayıt oluşturulmadı.", "Mükerrer işlem önleme");
    return { wf: existing, created: false };
  }
  const t = now();
  const wf: Workflow = {
    id: newId(input.type === "relocation" ? "NKL" : input.type === "billing_check" ? "FTR" : input.type === "temp_internet" ? "GCI" : input.type === "ai_usta" ? "USTA" : input.type === "proactive_fault" ? "PRO" : "ARZ"),
    customerId: CUSTOMER.id,
    subscriptionId: SUBSCRIPTION.id,
    type: input.type,
    title: input.title,
    status: "in_progress",
    steps: input.steps.map((s) => ({ ...s, status: "pending" as StepStatus })),
    nextStep: input.steps[0]?.label ?? null,
    createdAt: t,
    updatedAt: t,
    decision: null,
    decisions: [],
    blocker: null,
    eta: null,
    outcome: null,
    handoff: null,
    relatedIds: input.relatedIds ?? [],
    workOrderIds: [],
    dedupeKey: input.dedupeKey,
    retries: 0,
    data: input.data ?? {},
  };
  W.setState((s) => ({
    workflows: [...s.workflows.map((w) => (input.relatedIds?.includes(w.id) ? { ...w, relatedIds: [...new Set([...w.relatedIds, wf.id])] } : w)), wf],
  }));
  log(wf.id, "system", "plan", `İşlem oluşturuldu: ${wf.title} (${wf.id})`, input.why);
  return { wf, created: true };
}

export function plan(wfId: string, steps: { key: string; label: string }[], why: string) {
  patchWf(wfId, (w) => ({ steps: mergePlan(w.steps, steps) }));
  log(wfId, "system", "plan", `İş planı güncellendi: ${steps.map((s) => s.label).join(" → ") || "—"}`, why);
}

export function step(wfId: string, key: string, status: StepStatus, note?: string, why?: string) {
  const wf = getWf(wfId);
  if (!wf || TERMINAL.includes(wf.status)) return;
  const cur = wf.steps.find((s) => s.key === key);
  if (cur && cur.status === status && cur.note === note) return;
  patchWf(wfId, (w) => ({
    steps: w.steps.map((s) => (s.key === key ? { ...s, status, at: now(), ...(note !== undefined ? { note } : {}) } : s)),
  }));
  if (status !== "pending") log(wfId, "system", "step", `${cur?.label ?? key}: ${STEP_VERB[status]}${note ? ` — ${note}` : ""}`, why);
}

const STEP_VERB: Record<StepStatus, string> = {
  pending: "sırada",
  in_progress: "başladı",
  waiting: "bekliyor",
  done: "tamamlandı",
  failed: "başarısız",
  skipped: "gerekmedi, atlandı",
};

export function stepStatus(wfId: string | null | undefined, key: string): StepStatus | undefined {
  return getWf(wfId)?.steps.find((s) => s.key === key)?.status;
}

export function setStatus(wfId: string, status: WorkflowStatus, opts: { blocker?: string | null; eta?: string | null } = {}) {
  const wf = getWf(wfId);
  if (!wf) return;
  if (!canTransition(wf.status, status)) {
    log(wfId, "system", "error", `Geçersiz durum geçişi engellendi: ${wf.status} → ${status}`);
    return;
  }
  patchWf(wfId, () => ({ status, ...(opts.blocker !== undefined ? { blocker: opts.blocker } : {}), ...(opts.eta !== undefined ? { eta: opts.eta } : {}) }));
}

export function setData(wfId: string, data: Workflow["data"]) {
  patchWf(wfId, (w) => ({ data: { ...w.data, ...data } }));
}

/* ---------------- Decisions ---------------- */
type DecisionHandler = (wfId: string, optionId: string) => void;
const decisionHandlers: Record<string, DecisionHandler> = {};
export const registerDecision = (key: string, fn: DecisionHandler) => {
  decisionHandlers[key] = fn;
};

export function ask(wfId: string, d: Omit<Decision, "askedAt">, why: string) {
  const wf = getWf(wfId);
  if (!wf || wf.decision?.key === d.key || wf.decisions.some((x) => x.key === d.key)) return;
  patchWf(wfId, () => ({ decision: { ...d, askedAt: now() }, status: "waiting_for_customer" }));
  log(wfId, "system", "decision", `Müşteriden karar istendi: ${d.prompt}`, why);
}

export function decide(wfId: string, optionId: string, by: Actor = "customer"): boolean {
  const wf = getWf(wfId);
  const d = wf?.decision;
  if (!wf || !d) return false;
  const opt = d.options.find((o) => o.id === optionId);
  if (!opt) return false;
  patchWf(wfId, (w) => ({
    decision: null,
    status: w.status === "waiting_for_customer" ? "in_progress" : w.status,
    decisions: [...w.decisions, { key: d.key, optionId, label: opt.label, by, at: now() }],
  }));
  log(wfId, by === "presenter" ? "presenter" : "customer", "decision", `Karar: ${opt.label}${by === "presenter" ? " (demo panelinden, müşteri adına)" : ""}`);
  decisionHandlers[d.key]?.(wfId, optionId);
  return true;
}

export const choiceOf = (wfId: string | null | undefined, key: string) => getWf(wfId)?.decisions.find((d) => d.key === key)?.optionId;

/* ---------------- Closing ---------------- */
export function complete(wfId: string, outcome: Outcome): boolean {
  const wf = getWf(wfId);
  if (!wf) return false;
  const check = canComplete(wf);
  if (!check.ok) {
    log(wfId, "system", "error", `Tamamlama engellendi: ${check.reason}`, "Bir işlem tüm adımlar doğrulanmadan tamamlandı sayılmaz");
    return false;
  }
  patchWf(wfId, () => ({ status: "completed", outcome, blocker: null }));
  log(wfId, "system", "info", `İşlem tamamlandı: ${outcome.summary}`);
  const app = useAppStore.getState();
  app.addRecord({ channel: "Otonom", title: wf.title, summary: outcome.summary, status: outcome.resolved ? "Çözüldü" : "Kapandı", details: outcome.results, to: `/surec/${wfId}` });
  app.addHistory(wf.title, outcome.summary);
  return true;
}

export function escalate(wfId: string, team: string, reason: string, actor: Actor = "system") {
  const wf = getWf(wfId);
  if (!wf || TERMINAL.includes(wf.status)) return;
  if (wf.handoff) {
    log(wfId, "system", "info", `Zaten ${wf.handoff.team} ekibine aktarıldı; tekrar aktarım yapılmadı.`, "Mükerrer aktarım önleme");
    return;
  }
  const done = wf.steps.filter((s) => s.status === "done").map((s) => `✓ ${s.label}${s.note ? `: ${s.note}` : ""}`);
  const failed = wf.steps.filter((s) => s.status === "failed").map((s) => `✕ ${s.label}${s.note ? `: ${s.note}` : ""}`);
  const decisions = wf.decisions.map((d) => `Müşteri kararı: ${d.label}`);
  const handoff = { id: newId("AKT"), team, reason, at: now(), context: [...done, ...failed, ...decisions] };
  patchWf(wfId, (w) => ({
    handoff,
    decision: null,
    status: "escalated",
    blocker: reason,
    steps: w.steps.map((s) => (s.status === "pending" || s.status === "in_progress" || s.status === "waiting" ? { ...s, status: "skipped" as StepStatus, note: "Uzman ekip devraldı" } : s)),
  }));
  W.setState((s) => ({ ops: s.ops.filter((o) => o.workflowId !== wfId) }));
  log(wfId, actor === "presenter" ? "presenter" : "system", "escalation", `${team} ekibine aktarıldı (${handoff.id}). ${handoff.context.length} adımlık bağlam aktarıldı.`, reason);
  notify(wfId, "Uzman ekibimize aktardım", `${team} talebini devraldı. Yapılan tüm kontroller aktarıldı, baştan anlatmana gerek yok.`);
  useAppStore.getState().addRecord({ channel: "Otonom", title: `${wf.title} · uzman ekipte`, summary: reason, status: "Uzman ekipte", details: handoff.context, to: `/surec/${wfId}` });
}

/** Closes an escalated or blocked workflow on behalf of the human team (demo). */
export function teamResolve(wfId: string, outcome: Outcome) {
  const wf = getWf(wfId);
  if (!wf || TERMINAL.includes(wf.status)) return;
  patchWf(wfId, () => ({ status: "completed", outcome }));
  log(wfId, "team", "info", `${wf.handoff?.team ?? "Uzman ekip"} işlemi kapattı: ${outcome.summary}`);
}

/* ---------------- Work orders & appointments ---------------- */
export function workOrder(wfId: string, input: { kind: WorkOrderKind; title: string; team: string; key?: string }, why: string): WorkOrder {
  const key = input.key ?? `${wfId}:${input.kind}`;
  const existing = findOpenByKey(W.getState().workOrders, key, ["done", "cancelled"]);
  if (existing) {
    log(wfId, "system", "info", `İş emri zaten açık (${existing.id}); yeni iş emri oluşturulmadı.`, "Mükerrer iş emri önleme");
    return existing;
  }
  const t = now();
  const wo: WorkOrder = { id: newId("IE"), workflowId: wfId, kind: input.kind, title: input.title, team: input.team, status: "open", dedupeKey: key, createdAt: t, updatedAt: t };
  W.setState((s) => ({ workOrders: [...s.workOrders, wo] }));
  patchWf(wfId, (w) => ({ workOrderIds: [...w.workOrderIds, wo.id] }));
  log(wfId, "system", "workorder", `İş emri oluşturuldu: ${wo.title} → ${wo.team} (${wo.id})`, why);
  return wo;
}

export function setWorkOrder(wfId: string, kind: WorkOrderKind, status: WorkOrderStatus) {
  const wo = W.getState().workOrders.find((o) => o.workflowId === wfId && o.kind === kind && o.status !== "cancelled");
  if (!wo || wo.status === status) return;
  W.setState((s) => ({ workOrders: s.workOrders.map((o) => (o.id === wo.id ? { ...o, status, updatedAt: now() } : o)) }));
  log(wfId, "system", "workorder", `İş emri ${wo.id}: ${WO_LABEL[status]}`);
}

export const WO_LABEL: Record<WorkOrderStatus, string> = { open: "Açık", in_progress: "Yürütülüyor", waiting_external: "Dış sistem bekleniyor", done: "Tamamlandı", cancelled: "İptal" };

export function book(wfId: string, slot: { id: string; label: string }, workOrderId: string | null) {
  const existing = W.getState().appointments.find((a) => a.workflowId === wfId);
  if (existing) {
    W.setState((s) => ({ appointments: s.appointments.map((a) => (a.id === existing.id ? { ...a, slotId: slot.id, label: slot.label } : a)) }));
    return existing;
  }
  const a = { id: newId("RND"), workflowId: wfId, workOrderId, slotId: slot.id, label: slot.label, status: "booked" as const, at: now() };
  W.setState((s) => ({ appointments: [...s.appointments, a] }));
  log(wfId, "system", "workorder", `Randevu kaydedildi: ${slot.label} (${a.id})${workOrderId ? `, iş emri ${workOrderId} güncellendi` : ""}`);
  return a;
}

/* ---------------- Job queue ---------------- */
type OpHandler = (wfId: string, payload?: string) => void;
const opHandlers: Record<string, OpHandler> = {};
export const registerOp = (name: string, fn: OpHandler) => {
  opHandlers[name] = fn;
};

export function schedule(op: string, wfId: string, delayMs: number, payload?: string) {
  const key = `${op}:${wfId}`;
  if (W.getState().ops.some((o) => o.key === key)) return;
  W.setState((s) => ({ ops: [...s.ops, { id: newId("OP"), key, op, workflowId: wfId, dueAt: now() + delayMs, ...(payload ? { payload } : {}) }] }));
}

export const hasOp = (wfId: string | null | undefined, op?: string) => !!wfId && W.getState().ops.some((o) => o.workflowId === wfId && (!op || o.op === op));

function runOps(filter: (o: { dueAt: number; workflowId: string }) => boolean) {
  const due = W.getState().ops.filter(filter);
  if (!due.length) return 0;
  const ids = new Set(due.map((o) => o.id));
  W.setState((s) => ({ ops: s.ops.filter((o) => !ids.has(o.id)) }));
  due.forEach((o) => opHandlers[o.op]?.(o.workflowId, o.payload));
  return due.length;
}

export const runDueOps = (t = now()) => runOps((o) => o.dueAt <= t);
/** Fast-forward: run every queued job of a workflow immediately. */
export const flushOps = (wfId?: string) => runOps((o) => !wfId || o.workflowId === wfId);
