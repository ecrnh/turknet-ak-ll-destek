import { beforeEach, describe, expect, it } from "vitest";
import {
  createWorkflow,
  decide,
  escalate,
  flushOps,
  getWf,
  complete,
  runBillingShield,
  seedPaidButDebt,
  startRelocation,
  workOrder,
  step,
  useWorkflowStore,
} from "@/features/workflow";
import { canComplete, canTransition, compareBilling, detectIntent, relocationPlan, shouldEscalateAfterRetry } from "@/features/workflow/rules";
import { DEMO_MOVE_DATE, DEMO_NEW_ADDRESS } from "@/data/mock";
import type { BillingRecord, PaymentRecord } from "@/features/workflow/types";

const W = useWorkflowStore;
const drain = () => {
  for (let i = 0; i < 20 && W.getState().ops.length; i++) flushOps();
};

beforeEach(() => {
  W.getState().reset();
});

describe("Durum kuralları", () => {
  it("tamamlanan veya başarısız işlem başka duruma geçemez", () => {
    expect(canTransition("completed", "in_progress")).toBe(false);
    expect(canTransition("failed", "completed")).toBe(false);
    expect(canTransition("blocked", "waiting_for_customer")).toBe(true);
  });
  it("açık adım, bekleyen karar veya dış sistem beklerken tamamlanmaz", () => {
    const base = { status: "in_progress" as const, decision: null, steps: [{ key: "a", label: "A", status: "done" as const }] };
    expect(canComplete(base).ok).toBe(true);
    expect(canComplete({ ...base, steps: [{ key: "a", label: "A", status: "pending" }] }).ok).toBe(false);
    expect(canComplete({ ...base, status: "waiting_for_external_system" }).ok).toBe(false);
    expect(canComplete({ ...base, decision: { key: "k", prompt: "?", options: [], askedAt: 0 } }).ok).toBe(false);
  });
  it("dış sistem 2 kontrolde yanıt vermezse insan desteğine aktarılır", () => {
    expect(shouldEscalateAfterRetry(1)).toBe(false);
    expect(shouldEscalateAfterRetry(2)).toBe(true);
  });
});

describe("Talep algılama", () => {
  it("örnek cümleleri doğru akışa yönlendirir", () => {
    expect(detectIntent("Taşınacağım")).toBe("relocation");
    expect(detectIntent("Ödememi yaptım ama borç görünüyor")).toBe("billing");
    expect(detectIntent("Modemimde internet ışığı yanmıyor")).toBe("ai_usta");
    expect(detectIntent("geçici internet istiyorum")).toBe("temp_internet");
    expect(detectIntent("Taşınacağım, internetimi yeni adresime taşımak istiyorum")).toBe("relocation");
    expect(detectIntent("İnternetim çok yavaş")).toBe("speed");
    expect(detectIntent("Faturamda bir tutarsızlık olduğunu düşünüyorum")).toBe("billing");
    expect(detectIntent("İnternetim kesildi")).toBe("ai_usta");
    expect(detectIntent("Devam eden işlemimin durumunu öğrenmek istiyorum")).toBe("track");
    expect(detectIntent("merhaba")).toBeNull();
    expect(detectIntent("")).toBeNull();
  });
});

describe("Fatura Kalkanı karşılaştırması", () => {
  const bill: BillingRecord = { id: "B1", period: "Ekim", amount: 749.9, due: "", status: "unpaid", shownDebt: 749.9 };
  const pay = (id: string): PaymentRecord => ({ id, billId: "B1", amount: 749.9, at: "", channel: "", ref: "", status: "success" });
  it("ödeme varken borç görünürse olası tutarsızlık bulur", () => {
    expect(compareBilling(bill, [pay("P1")]).map((f) => f.code)).toEqual(["paid_but_debt"]);
  });
  it("aynı fatura için iki tahsilatı mükerrer olarak işaretler", () => {
    expect(compareBilling({ ...bill, shownDebt: 0 }, [pay("P1"), pay("P2")]).map((f) => f.code)).toEqual(["duplicate_payment"]);
  });
  it("ödeme yoksa veya borç güncelse bulgu yok", () => {
    expect(compareBilling(bill, [])).toEqual([]);
    expect(compareBilling({ ...bill, shownDebt: 0 }, [pay("P1")])).toEqual([]);
  });
});

describe("Taşınma planı dallanması", () => {
  it("port yoksa önce takip talebi ve geçici internet, sonra dış yanıt", () => {
    const p = relocationPlan("no_port");
    expect(p.indexOf("infra_followup")).toBeLessThan(p.indexOf("temp_offer"));
    expect(p.indexOf("temp_offer")).toBeLessThan(p.indexOf("external"));
  });
  it("uygun adreste altyapı takibi yok", () => {
    expect(relocationPlan("eligible")).not.toContain("infra_followup");
  });
});

describe("Mükerrer işlem önleme", () => {
  it("aynı anahtarla ikinci süreç açılmaz", () => {
    const a = createWorkflow({ type: "relocation", title: "T", dedupeKey: "k1", steps: [], why: "test" });
    const b = createWorkflow({ type: "relocation", title: "T", dedupeKey: "k1", steps: [], why: "test" });
    expect(b.created).toBe(false);
    expect(b.wf.id).toBe(a.wf.id);
    expect(W.getState().workflows).toHaveLength(1);
  });
  it("aynı iş emri iki kez oluşturulmaz", () => {
    const { wf } = createWorkflow({ type: "relocation", title: "T", dedupeKey: "k2", steps: [], why: "test" });
    workOrder(wf.id, { kind: "relocation", title: "Nakil", team: "X" }, "test");
    workOrder(wf.id, { kind: "relocation", title: "Nakil", team: "X" }, "test");
    expect(W.getState().workOrders).toHaveLength(1);
  });
  it("aynı aktarım iki kez yapılmaz", () => {
    const { wf } = createWorkflow({ type: "ai_usta", title: "T", dedupeKey: "k3", steps: [{ key: "a", label: "A" }], why: "test" });
    escalate(wf.id, "Ekip", "neden");
    const first = getWf(wf.id)!.handoff!.id;
    escalate(wf.id, "Ekip", "neden");
    expect(getWf(wf.id)!.handoff!.id).toBe(first);
  });
  it("açık adım varken süreç tamamlandı sayılmaz", () => {
    const { wf } = createWorkflow({ type: "ai_usta", title: "T", dedupeKey: "k4", steps: [{ key: "a", label: "A" }], why: "test" });
    expect(complete(wf.id, { resolved: true, summary: "", results: [] })).toBe(false);
    step(wf.id, "a", "done");
    expect(complete(wf.id, { resolved: true, summary: "", results: [] })).toBe(true);
  });
});

describe("Taşınma akışı (port yok)", () => {
  it("engeli bildirir, geçici interneti onaysız açmaz, tekrar seçim mükerrer sipariş oluşturmaz", () => {
    W.setState((s) => ({ config: { ...s.config, addressCheck: "no_port" } }));
    const id = startRelocation({ address: DEMO_NEW_ADDRESS, moveDate: DEMO_MOVE_DATE, wantsTemp: true });
    drain();
    const wf = getWf(id)!;
    expect(wf.data["eligibility"]).toBe("no_port");
    expect(wf.decision?.key).toBe("relocation_temp");
    expect(W.getState().temp).toHaveLength(0);
    expect(decide(id, "accept")).toBe(true);
    expect(decide(id, "accept")).toBe(false);
    expect(W.getState().temp).toHaveLength(1);
  });
  it("dış sistem yanıt vermiyorsa başarı uydurmaz", () => {
    W.setState((s) => ({ config: { ...s.config, addressCheck: "no_response" }, autoFollowUp: false }));
    const id = startRelocation({ address: DEMO_NEW_ADDRESS, moveDate: DEMO_MOVE_DATE, wantsTemp: true });
    flushOps();
    expect(getWf(id)!.status).toBe("waiting_for_external_system");
    expect(getWf(id)!.data["eligibility"]).toBeUndefined();
  });
});

describe("Fatura Kalkanı güvenlik sınırı", () => {
  it("tespit anında borç kaydı değiştirilmez ve tekrar çalıştırma yeni süreç açmaz", () => {
    seedPaidButDebt(false);
    W.setState({ autoFollowUp: false });
    const a = runBillingShield();
    const b = runBillingShield();
    expect(a.wfId).toBe(b.wfId);
    expect(W.getState().bills[0]!.shownDebt).toBe(749.9);
  });
  it("mükerrer tahsilatta iade yalnızca müşteri onayı sonrası finans ekibine gider", () => {
    seedPaidButDebt(true);
    W.setState((s) => ({ config: { ...s.config, reconciliation: "duplicate" } }));
    const { wfId } = runBillingShield();
    drain();
    expect(getWf(wfId)!.decision?.key).toBe("billing_start");
    decide(wfId!, "start");
    drain();
    const wf = getWf(wfId)!;
    expect(wf.decision?.key).toBe("billing_refund");
    expect(W.getState().workOrders.some((o) => o.kind === "billing_review")).toBe(false);
    decide(wf.id, "refund");
    expect(getWf(wf.id)!.status).toBe("escalated");
    expect(W.getState().workOrders.filter((o) => o.kind === "billing_review")).toHaveLength(1);
  });
});
