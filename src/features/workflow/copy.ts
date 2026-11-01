/**
 * Customer-facing language for the workflow platform. Every screen reads status
 * wording from here so the same state always reads the same way (UX writing §14).
 * Technical terms stay in the audit log / "Teknik detayları gör".
 */
import { TEAMS } from "@/data/mock";
import { STATUS_LABEL } from "./rules";
import type { Workflow, WorkflowStatus, WorkflowType } from "./types";

export { STATUS_LABEL };

/** Long form: "Şu an ne oluyor?" */
export const STATUS_SENTENCE: Record<WorkflowStatus, string> = {
  pending: "İşleminiz sırada",
  in_progress: "İşleminiz devam ediyor",
  waiting_for_customer: "Kararınızı bekliyoruz",
  waiting_for_external_system: "İlgili ekipten yanıt bekliyoruz",
  blocked: "İşleminiz şu an ilerleyemiyor",
  escalated: "Konuyu uzman ekibimize ilettik",
  completed: "İşleminiz tamamlandı",
  failed: "İşlem tamamlanamadı",
};

const EXTERNAL_PARTY: Partial<Record<WorkflowType, string>> = {
  relocation: "Altyapı ekibinden yanıt bekliyoruz",
  billing_check: "Ödeme kuruluşundan yanıt bekliyoruz",
};

export function statusSentence(wf: Pick<Workflow, "status" | "type">): string {
  if (wf.status === "waiting_for_external_system") return EXTERNAL_PARTY[wf.type] ?? STATUS_SENTENCE.waiting_for_external_system;
  return STATUS_SENTENCE[wf.status];
}

/** "Benim bir şey yapmam gerekiyor mu?" */
export function customerAction(wf: Pick<Workflow, "status" | "decision">): { needed: boolean; text: string } {
  if (wf.decision) return { needed: true, text: "Aşağıdaki seçimi yapmanız gerekiyor." };
  if (wf.status === "waiting_for_customer") return { needed: true, text: "Devam etmemiz için onayınızı bekliyoruz." };
  if (wf.status === "completed") return { needed: false, text: "Yapmanız gereken bir şey kalmadı." };
  if (wf.status === "failed") return { needed: true, text: "İsterseniz tekrar deneyebilir veya destek ekibimize ulaşabilirsiniz." };
  return { needed: false, text: "Şu an sizden bir işlem yapmanız gerekmiyor." };
}

/** "Bundan sonra ne olacak?" */
export function whatsNext(wf: Pick<Workflow, "status" | "decision" | "nextStep" | "handoff" | "outcome">): string {
  if (wf.status === "completed") return wf.outcome?.summary ?? "Süreç kapandı.";
  if (wf.decision) return "Seçiminize göre süreci sizin için sürdüreceğiz.";
  if (wf.handoff) return `${wf.handoff.team} konuyu inceliyor. Gelişme olduğunda size haber vereceğiz.`;
  if (wf.status === "waiting_for_external_system") return "Yanıt geldiğinde sizi bilgilendireceğiz.";
  if (wf.nextStep) return `Sıradaki adım: ${wf.nextStep}. Gelişme olduğunda size haber vereceğiz.`;
  return "Gelişme olduğunda size haber vereceğiz.";
}

/** Most recent finished step (for "Son gerçekleşen adım"). */
export function lastDoneStep(wf: Pick<Workflow, "steps">): string | null {
  const done = wf.steps.filter((s) => s.status === "done" && s.at).sort((a, b) => (b.at ?? 0) - (a.at ?? 0));
  return done[0]?.label ?? null;
}

export const TYPE_LABEL: Record<WorkflowType, string> = {
  relocation: "Taşınma",
  temp_internet: "Geçici internet",
  outage_recovery: "Kesinti",
  billing_check: "Fatura Kalkanı",
  ai_usta: "AI Usta",
  proactive_fault: "Proaktif kontrol",
  speed_optimize: "Hız kontrolü",
};

/** Which product area a workflow belongs to (3 ana ürün alanı). */
export const AREA_OF: Record<WorkflowType, "process" | "support" | "connection"> = {
  relocation: "process",
  billing_check: "process",
  temp_internet: "connection",
  outage_recovery: "connection",
  proactive_fault: "connection",
  speed_optimize: "connection",
  ai_usta: "support",
};

export const TEAM_FOR: Record<WorkflowType, string> = {
  relocation: TEAMS.relocation,
  temp_internet: TEAMS.logistics,
  outage_recovery: TEAMS.tech,
  billing_check: TEAMS.finance,
  ai_usta: TEAMS.tech,
  proactive_fault: TEAMS.tech,
  speed_optimize: TEAMS.tech,
};
