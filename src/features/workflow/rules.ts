/**
 * Pure business rules for the workflow platform. No store access here so they
 * can be unit-tested (src/test/workflow.test.ts).
 */
import { INTENT_KEYWORDS } from "@/data/mock";
import type { BillingRecord, ConnectivityStatus, PaymentRecord, StepStatus, Workflow, WorkflowStatus, WorkflowStep } from "./types";

/**
 * The single customer-facing wording for every status (short form for pills).
 * Long sentences live in copy.ts and are derived from the same status.
 */
export const STATUS_LABEL: Record<WorkflowStatus, string> = {
  pending: "Sırada",
  in_progress: "Devam ediyor",
  waiting_for_customer: "Kararınız bekleniyor",
  waiting_for_external_system: "Yanıt bekleniyor",
  blocked: "Şu an ilerleyemiyor",
  escalated: "Uzman ekipte",
  completed: "Tamamlandı",
  failed: "Tamamlanamadı",
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

export type Intent = "billing" | "ai_usta" | "relocation" | "temp_internet" | "speed" | "track";

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

/** GIGA Teknik hands over to live support after this many failed self-service steps. */
export const AI_USTA_MAX_ATTEMPTS = 2;


/* ---------------- Connection health (Bağlantım) ---------------- */
export type HealthCode = "normal" | "degraded" | "checking" | "regional" | "field" | "failover" | "down";

export const HEALTH_COPY: Record<HealthCode, { title: string; text: string; tone: "ok" | "warn" | "info" | "bad" }> = {
  normal: { title: "Bağlantınız normal", text: "Bağlantınızın sağlıklı çalışmasına yardımcı olmak için gerekli teknik kontrolleri yapıyoruz. Bir sorun görürsek size haber veririz.", tone: "ok" },
  degraded: { title: "Bağlantınızda performans düşüşü algılandı", text: "Hızınız paketinizin belirgin şekilde altında. Nedenini birlikte bulabiliriz.", tone: "warn" },
  checking: { title: "Teknik kontrol gerçekleştiriliyor", text: "Bağlantınızı uzaktan kontrol ediyoruz. Şu an sizden bir işlem yapmanız gerekmiyor.", tone: "info" },
  regional: { title: "Bölgesel bir kesinti ihtimali değerlendiriliyor", text: "Sorun sizden kaynaklı görünmüyor. Modeminize dokunmanıza gerek yok.", tone: "warn" },
  field: { title: "Teknik ekibin müdahalesi gerekiyor", text: "Uzaktan çözemedik. Teknik ekip için işlem kaydı oluşturduk.", tone: "warn" },
  failover: { title: "Yedek internetiniz aktif", text: "Ana bağlantınız düzelene kadar internete Hibrit İnternet yedek bağlantınız üzerinden bağlısınız.", tone: "info" },
  down: { title: "İnternet bağlantınızda kesinti var", text: "Teknik ekibimiz sorunun çözümü için çalışıyor. Yeni bir gelişme olduğunda sizi bilgilendireceğiz.", tone: "bad" },
};

const CONNECTIVITY_TYPES = ["outage_recovery", "proactive_fault", "speed_optimize", "ai_usta"];

/** Derives the customer-facing health state. Never claims a certain diagnosis. */
export function connectionHealth(c: Pick<ConnectivityStatus, "fixed" | "mobile">, workflows: Pick<Workflow, "type" | "status" | "steps" | "data" | "handoff">[]): HealthCode {
  const open = workflows.filter((w) => CONNECTIVITY_TYPES.includes(w.type) && isActive(w));
  const stepOf = (w: (typeof open)[number], k: string) => w.steps.find((s) => s.key === k)?.status;
  if (open.some((w) => stepOf(w, "field") === "in_progress" || (w.type !== "ai_usta" && !!w.handoff))) return "field";
  if (open.some((w) => w.type === "outage_recovery" && w.data["outageType"] === "regional")) return "regional";
  if (c.fixed === "down" && c.mobile === "active") return "failover";
  if (c.fixed === "down" && open.some((w) => w.type === "outage_recovery")) return "down";
  if (open.length) return "checking";
  if (c.fixed === "degraded") return "degraded";
  if (c.fixed === "down") return "down";
  return "normal";
}

/** Box can only be switched on/off once its SIM is active (delivered and activated). */
export function canToggleBox(box: { sim: string } | null | undefined): boolean {
  return !!box && box.sim === "active";
}

/** Speed is "significantly" below the package when under 60% of it. */
export const isSpeedProblem = (measured: number, pkg: number) => measured < pkg * 0.6;

/* ---------------- Hibrit İnternet ---------------- */
/** The free backup connection is offered only when an outage is still unresolved after this many hours. */
export const HYBRID_OFFER_AFTER_H = 24;

export const outageElapsedH = (startedAt: number, now: number) => Math.max(0, (now - startedAt) / 3_600_000);

export const hybridOfferOpen = (elapsedH: number) => elapsedH >= HYBRID_OFFER_AFTER_H;

/** Hibrit İnternet needs a compatible backup device, an active SIM and enough mobile coverage. */
export function hybridBlocker(c: { device: boolean; sim: boolean; coverage: boolean }): "no_device" | "no_coverage" | null {
  if (!c.device || !c.sim) return "no_device";
  if (!c.coverage) return "no_coverage";
  return null;
}

/** Activation is only possible during an unresolved outage past 24 h, after a passed check. */
export function canActivateHybrid(p: { elapsedH: number; fixed: ConnectivityStatus["fixed"]; status: string }): boolean {
  return p.fixed === "down" && hybridOfferOpen(p.elapsedH) && (p.status === "ready" || p.status === "failed");
}

/** Demo usage of the backup connection (no real meter): a base amount plus ~24 MB per minute. */
export const hybridUsageMb = (activatedAt: number | null, now: number) => (activatedAt ? Math.round(180 + Math.max(0, now - activatedAt) / 60_000 * 24) : 0);

/** Automatic payment: a bill this much above the usual amount waits for the customer's approval. */
export const UNUSUAL_BILL_RATIO = 1.3;
export const isUnusualBill = (amount: number, usual: number) => usual > 0 && amount > usual * UNUSUAL_BILL_RATIO;
