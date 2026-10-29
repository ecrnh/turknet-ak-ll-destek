/**
 * Pure business rules for the workflow platform. No store access here so they
 * can be unit-tested (src/test/workflow.test.ts).
 */
import { INTENT_KEYWORDS } from "@/data/mock";
import type { BillingRecord, PaymentRecord, StepStatus, Workflow, WorkflowStatus, WorkflowStep } from "./types";

export const STATUS_LABEL: Record<WorkflowStatus, string> = {
  pending: "Sırada",
  in_progress: "İşleniyor",
  waiting_for_customer: "Kararın bekleniyor",
  waiting_for_external_system: "Dış sistem yanıtı bekleniyor",
  blocked: "Engel tespit edildi",
  escalated: "Uzman ekibe aktarıldı",
  completed: "Tamamlandı",
  failed: "Başarısız",
};

export const TERMINAL: WorkflowStatus[] = ["completed", "failed"];

export const isActive = (wf: Pick<Workflow, "status">) => !TERMINAL.includes(wf.status);

/** Terminal workflows never change state. Escalated ones can only be closed by the team. */
export function canTransition(from: WorkflowStatus, to: WorkflowStatus): boolean {
  if (from === to) return true;
  if (TERMINAL.includes(from)) return false;
  if (from === "escalated") return to === "completed" || to === "failed" || to === "in_progress";
  return true;
}

const OPEN_STEP: StepStatus[] = ["pending", "in_progress", "waiting"];

/** A workflow may only be completed when nothing is open, no decision is pending and no external call is in flight. */
export function canComplete(wf: Pick<Workflow, "steps" | "decision" | "status">): { ok: boolean; reason?: string } {
  if (TERMINAL.includes(wf.status)) return { ok: false, reason: "İşlem zaten kapanmış" };
  if (wf.decision) return { ok: false, reason: "Müşteri kararı bekleniyor" };
  if (wf.status === "waiting_for_external_system") return { ok: false, reason: "Dış sistem yanıtı bekleniyor" };
  const open = wf.steps.find((s) => OPEN_STEP.includes(s.status));
  if (open) return { ok: false, reason: `Açık adım var: ${open.label}` };
  if (wf.steps.some((s) => s.status === "failed")) return { ok: false, reason: "Başarısız adım var" };
  return { ok: true };
}

export function nextOpenStep(steps: WorkflowStep[]): WorkflowStep | null {
  return steps.find((s) => OPEN_STEP.includes(s.status)) ?? null;
}

/** Replace the not-yet-started part of a plan, keeping every step that already started or finished. */
export function mergePlan(steps: WorkflowStep[], plan: { key: string; label: string }[]): WorkflowStep[] {
  const kept = steps.filter((s) => s.status !== "pending");
  const keptKeys = new Set(kept.map((s) => s.key));
  return [...kept, ...plan.filter((p) => !keptKeys.has(p.key)).map((p) => ({ ...p, status: "pending" as StepStatus }))];
}

/** Idempotency: find an existing open record for the same dedupe key. */
export function findOpenByKey<T extends { dedupeKey: string; status: string }>(list: T[], key: string, closed: string[]): T | undefined {
  return list.find((x) => x.dedupeKey === key && !closed.includes(x.status));
}

export type Intent = "billing" | "ai_usta" | "relocation" | "temp_internet" | "track";

/** Keyword-based intent detection for "Sen talebini söyle". Order of INTENT_KEYWORDS decides ties. */
export function detectIntent(text: string): Intent | null {
  const t = text.toLocaleLowerCase("tr-TR");
  if (!t.trim()) return null;
  for (const { intent, words } of INTENT_KEYWORDS) if (words.some((w) => t.includes(w))) return intent;
  return null;
}

export interface BillingFinding {
  code: "paid_but_debt" | "duplicate_payment";
  title: string;
  detail: string;
  amount: number;
}

/** Compares bill and payment records. Returns *possible* inconsistencies only, never a confirmed error. */
export function compareBilling(bill: BillingRecord, payments: PaymentRecord[]): BillingFinding[] {
  const paid = payments.filter((p) => p.billId === bill.id && p.status !== "pending");
  const paidTotal = paid.reduce((a, p) => a + p.amount, 0);
  const out: BillingFinding[] = [];
  if (paidTotal >= bill.amount && bill.shownDebt > 0) {
    out.push({
      code: "paid_but_debt",
      title: "Ödeme var, borç hâlâ görünüyor",
      detail: `${bill.period} için ödeme kaydı bulundu ama ekranda ₺${bill.shownDebt.toFixed(2)} borç görünüyor.`,
      amount: bill.shownDebt,
    });
  }
  if (paid.length > 1 && paidTotal > bill.amount) {
    out.push({
      code: "duplicate_payment",
      title: "Olası mükerrer ödeme",
      detail: `${bill.period} faturası için ${paid.length} ödeme kaydı var. Fazla tutar: ₺${(paidTotal - bill.amount).toFixed(2)}.`,
      amount: paidTotal - bill.amount,
    });
  }
  return out;
}

export type EligibilityResult = "eligible" | "eligible_external" | "no_port" | "no_response";

/** Relocation plan for each infrastructure answer. */
export function relocationPlan(r: EligibilityResult): string[] {
  switch (r) {
    case "eligible":
      return ["transfer", "appointment", "install", "verify", "old_line"];
    case "eligible_external":
      return ["transfer", "external", "temp_offer", "appointment", "install", "verify", "old_line"];
    case "no_port":
      return ["infra_followup", "temp_offer", "external", "transfer", "appointment", "install", "verify", "old_line"];
    case "no_response":
      return [];
  }
}

/** Maximum automatic re-checks for an external system before handing over to a human team. */
export const MAX_EXTERNAL_RETRIES = 2;

export function shouldEscalateAfterRetry(retries: number): boolean {
  return retries >= MAX_EXTERNAL_RETRIES;
}

/** AI Usta hands over to live support after this many failed self-service steps. */
export const AI_USTA_MAX_ATTEMPTS = 2;
