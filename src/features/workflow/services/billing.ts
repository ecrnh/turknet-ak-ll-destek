/**
 * BillingService: "Fatura Kalkanı". Compares bill, payment and subscription data,
 * flags *possible* inconsistencies and routes corrections through authorised
 * processes only. Refunds, debt deletion or record edits never happen without
 * customer consent and a finance-team approval.
 */
import { BILLING_CHECKS, BILLING_SEED, TEAMS } from "@/data/mock";
import { fmtTL } from "@/lib/format";
import { ask, chain, complete, createWorkflow, escalate, getWf, log, notify, registerDecision, registerOp, schedule, setData, setStatus, step, stepStatus, teamResolve, workOrder } from "../engine";
import { MockBillingAPI } from "../mockServices";
import { compareBilling } from "../rules";
import { useWorkflowStore as W } from "../store";

/** Demo setup: payment went through but the debt screen was not refreshed. */
export function seedPaidButDebt(withDuplicate: boolean) {
  const { bill, payment, duplicate } = BILLING_SEED;
  W.setState({
    bills: [{ ...bill, status: "unpaid", shownDebt: bill.amount }],
    payments: [
      { ...payment, billId: bill.id, status: "success" },
      ...(withDuplicate ? [{ ...duplicate, billId: bill.id, status: "success" as const }] : []),
    ],
  });
  log(null, "presenter", "info", `Demo verisi yüklendi: ${bill.period} ödemesi başarılı, borç ekranı güncellenmedi${withDuplicate ? ", ikinci tahsilat kaydı var" : ""}`);
}

export function runBillingShield(): { wfId: string | null; findings: number } {
  const { bills, payments } = W.getState();
  const bill = bills[0]!;
  const findings = compareBilling(bill, payments);
  log(null, "system", "info", `Fatura Kalkanı ${BILLING_CHECKS.length} kontrol çalıştırdı: ${findings.length} olası tutarsızlık`, "Faturalar, ödemeler, abonelik ve kampanya verileri karşılaştırıldı");
  if (!findings.length) return { wfId: null, findings: 0 };
  const { wf, created } = createWorkflow({
    type: "billing_check",
    title: `Fatura Kalkanı · ${bill.period}`,
    dedupeKey: `billing:${bill.id}`,
    steps: [
      { key: "match", label: "Ödeme ve fatura eşleştirme" },
      { key: "detect", label: "Olası tutarsızlık tespiti" },
      { key: "explain", label: "Müşteriye karşılaştırmalı açıklama" },
      { key: "reconcile", label: "Ödeme mutabakat kontrolü" },
      { key: "update", label: "Borç kaydının yetkili süreçle güncellenmesi" },
      { key: "review", label: "İnceleme talebi" },
      { key: "inform", label: "Sonuç bilgilendirmesi" },
    ],
    data: { findings: findings.map((f) => f.code).join(","), billId: bill.id },
    why: "Müşteri destek kaydı açmadan önce fatura/ödeme verilerinde uyuşmazlık arandı",
  });
  if (!created) return { wfId: wf.id, findings: findings.length };
  step(wf.id, "match", "done", payments.map((p) => `${p.id} ${fmtTL(p.amount)}`).join(" + ") + ` ↔ ${bill.id} ${fmtTL(bill.amount)}`);
  step(wf.id, "detect", "done", findings.map((f) => f.title).join(" · "), "Bu bir kesin hata değil, olasılıktır; doğrulanmadan kayıt değiştirilmez");
  notify(wf.id, "Faturanda olası bir tutarsızlık buldum", "Ödemen görünüyor ama borç ekranın güncellenmemiş olabilir. Kontrol ediyorum, senin bir şey yapmana gerek yok.");
  chain("billing.explain", wf.id, 1200);
  return { wfId: wf.id, findings: findings.length };
}

export function explainBilling(id: string) {
  if (stepStatus(id, "explain") !== "pending") return;
  step(id, "explain", "done", "Ödeme ve borç yan yana gösterildi; hiçbir kayıt değiştirilmedi");
  chain("billing.reconcile", id, 1200);
}
registerOp("billing.explain", explainBilling);

export function startReconcile(id: string) {
  if (stepStatus(id, "reconcile") !== "pending") return;
  step(id, "reconcile", "in_progress", `Sorgu: ${MockBillingAPI.name} · ref ${BILLING_SEED.payment.ref}`);
  setStatus(id, "waiting_for_external_system", { blocker: "Ödeme kuruluşundan mutabakat yanıtı bekleniyor", eta: "Genelde birkaç dakika (demo)" });
  schedule("billing.reconciled", id, 1800);
}
registerOp("billing.reconcile", startReconcile);

registerOp("billing.reconciled", (id) => {
  const res = MockBillingAPI.reconcile();
  setData(id, { reconciliation: res });
  log(id, "external", "external", `${MockBillingAPI.name} yanıtı: ${res === "settled" ? "ödeme hesaba geçmiş" : "aynı fatura için 2 başarılı tahsilat"}`);
  setStatus(id, "in_progress", { blocker: null, eta: null });
  if (res === "settled") {
    step(id, "reconcile", "done", "Ödeme bankadan teyit edildi; borç ekranı senkron değil");
    step(id, "review", "skipped", "Otomatik eşleşme yeterli, manuel inceleme gerekmedi");
  } else {
    step(id, "reconcile", "done", `Mükerrer tahsilat teyit edildi: ${BILLING_SEED.payment.id} + ${BILLING_SEED.duplicate.id}`);
  }
  chain("billing.update", id, 1200);
});

export function applyBillingUpdate(id: string) {
  if (stepStatus(id, "update") !== "pending" || stepStatus(id, "reconcile") !== "done") return;
  const bill = W.getState().bills[0]!;
  W.setState((s) => ({ bills: s.bills.map((b) => ({ ...b, status: "paid" as const, shownDebt: 0 })) }));
  step(id, "update", "done", `Borç: ${fmtTL(bill.shownDebt)} → ${fmtTL(0)} (mutabakat servisi kaydı)`, "Düzeltme uygulama tarafından değil, yetkili mutabakat süreci tarafından yapılır");
  const wf = getWf(id);
  chain(wf?.data["reconciliation"] === "duplicate" ? "billing.review" : "billing.inform", id, 1200);
}
registerOp("billing.update", applyBillingUpdate);

export function startBillingReview(id: string) {
  if (stepStatus(id, "review") !== "pending") return;
  step(id, "review", "waiting");
  ask(
    id,
    {
      key: "billing_refund",
      prompt: `Fazladan çekilen ${fmtTL(BILLING_SEED.duplicate.amount)} için ne yapalım?`,
      detail: "Onayın olmadan hiçbir iade veya mahsup yapılmaz. Talebin yetkili finans ekibine gider.",
      options: [
        { id: "refund", label: "Kartıma iade edilsin", desc: "Finans onayından sonra 3–7 iş günü (demo)", primary: true },
        { id: "offset", label: "Sonraki faturamdan düşülsün", desc: "Kasım faturasına mahsup (finans onayıyla)" },
        { id: "wait", label: "Şimdilik bir şey yapma", desc: "Kayıt değiştirilmez" },
      ],
    },
    "Para iadesi müşteri onayı ve yetkili işlem olmadan yapılmaz",
  );
}
registerOp("billing.review", startBillingReview);

registerDecision("billing_refund", (id, opt) => {
  if (opt === "wait") {
    step(id, "review", "done", "Müşteri beklemeyi seçti; finansal kayıt değiştirilmedi");
    chain("billing.inform", id, 1000);
    return;
  }
  const wo = workOrder(id, { kind: "billing_review", title: opt === "refund" ? "Mükerrer tahsilat iade incelemesi" : "Mükerrer tahsilat mahsup incelemesi", team: TEAMS.finance }, "İade/mahsup yalnızca finans ekibi onayıyla yapılır");
  W.setState((s) => ({ payments: s.payments.map((p) => (p.id === BILLING_SEED.duplicate.id ? { ...p, status: "refund_review" as const } : p)) }));
  step(id, "review", "done", `${wo.id} · ${TEAMS.finance}`);
  step(id, "inform", "done", "Müşteriye inceleme süreci ve tahmini süre bildirildi");
  escalate(id, TEAMS.finance, `${opt === "refund" ? "İade" : "Mahsup"} talebi müşteri onayıyla oluşturuldu; yetkili finans onayı gerekiyor`);
});

export function informBilling(id: string) {
  const wf = getWf(id);
  if (!wf || stepStatus(id, "inform") !== "pending" || stepStatus(id, "update") !== "done") return;
  step(id, "inform", "done", "Sonuç ve yapılan kontroller müşteriye iletildi");
  if (stepStatus(id, "review") === "pending") step(id, "review", "skipped", "Gerekmedi");
  notify(id, "Borç ekranın düzeltildi", `${BILLING_SEED.bill.period} ödemen teyit edildi, borcun ${fmtTL(0)}. Kayıt işlem geçmişine eklendi.`);
  complete(id, {
    resolved: true,
    summary: "Ödeme teyit edildi, borç görünümü düzeltildi",
    results: [`Ödeme ${BILLING_SEED.payment.id} bankadan teyit edildi`, `Borç ${fmtTL(BILLING_SEED.bill.amount)} → ${fmtTL(0)}`, "Hiçbir kayıt müşteri onayı/yetkili süreç dışında değiştirilmedi"],
  });
}
registerOp("billing.inform", informBilling);

/** Demo: the finance team records its decision. */
export function financeResolve(id: string) {
  const wf = getWf(id);
  if (!wf || wf.status !== "escalated") return;
  const choice = wf.decisions.find((d) => d.key === "billing_refund");
  teamResolve(id, {
    resolved: true,
    summary: `Finans ekibi ${choice?.optionId === "offset" ? "mahsubu" : "iadeyi"} onayladı (demo)`,
    results: ["Borç görünümü düzeltildi", `Fazla tahsilat: ${fmtTL(BILLING_SEED.duplicate.amount)} → ${choice?.label ?? "—"}`, "Onay: Finans · Tahsilat Mutabakat Ekibi (demo)"],
  });
  notify(id, choice?.optionId === "offset" ? "Mahsup talebin onaylandı" : "İade talebin onaylandı", `${fmtTL(BILLING_SEED.duplicate.amount)} ${choice?.optionId === "offset" ? "Kasım faturandan düşülecek" : "3–7 iş günü içinde kartına yansıyacak"} (demo).`);
}
