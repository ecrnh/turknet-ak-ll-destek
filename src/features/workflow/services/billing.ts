/**
 * BillingService: "Fatura Kalkanı". Compares bill, payment and subscription data,
 * flags *possible* inconsistencies and routes corrections through authorised
 * processes only. Refunds, debt deletion or record edits never happen without
 * customer consent and a finance-team approval.
 */
import { BILLING_CHECKS, BILLING_REVIEW_ISSUES, BILLING_SEED, TEAMS, type BillingReviewIssueId } from "@/data/mock";
import { fmtTL } from "@/lib/format";
import { ask, chain, choiceOf, complete, createWorkflow, decide, escalate, getWf, log, notify, registerDecision, registerOp, schedule, setData, setWorkOrder, setStatus, step, stepStatus, teamResolve, workOrder } from "../engine";
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
      { key: "match", label: "Ödeme ve fatura eşleştirildi" },
      { key: "detect", label: "Olası farklılık tespit edildi" },
      { key: "explain", label: "Size karşılaştırmalı açıklama" },
      { key: "consent", label: "İnceleme onayınız" },
      { key: "reconcile", label: "Ödeme ve fatura bilgileri karşılaştırılıyor" },
      { key: "update", label: "Borç bilgisi yetkili süreçle güncellendi" },
      { key: "review", label: "İnceleme talebi" },
      { key: "inform", label: "Sonuç bilgilendirmesi" },
    ],
    data: { findings: findings.map((f) => f.code).join(","), billId: bill.id },
    why: "Müşteri destek kaydı açmadan önce fatura/ödeme verilerinde uyuşmazlık arandı",
  });
  if (!created) return { wfId: wf.id, findings: findings.length };
  step(wf.id, "match", "done", payments.map((p) => `${p.id} ${fmtTL(p.amount)}`).join(" + ") + ` ↔ ${bill.id} ${fmtTL(bill.amount)}`);
  step(wf.id, "detect", "done", findings.map((f) => f.title).join(" · "), "Bu bir kesin hata değil, olasılıktır; doğrulanmadan kayıt değiştirilmez");
  notify(wf.id, "Faturanızı kontrol ettik", "Son ödemeniz ile borç bilginiz arasında güncelleme gerektiren bir farklılık olabilir.", "quiet");
  chain("billing.explain", wf.id, 1200);
  return { wfId: wf.id, findings: findings.length };
}

/** A direct customer request for human review, even when automated checks find no mismatch. */
export function requestBillingReview(issueId: BillingReviewIssueId, notes = ""): { wfId: string; findings: number; summary: string } {
  const { bills, payments } = W.getState();
  const bill = bills[0]!;
  const selectedIssue = BILLING_REVIEW_ISSUES.find((issue) => issue.id === issueId)!;
  const findings = compareBilling(bill, payments);
  const summary = findings.length
    ? findings.map((finding) => finding.detail).join(" · ")
    : `${BILLING_CHECKS.length} otomatik kontrol uyumlu; müşteri yine de fatura incelemesi istedi`;
  const { wf, created } = createWorkflow({
    type: "billing_check",
    title: `Fatura inceleme talebi · ${bill.period}`,
    dedupeKey: `billing-review:${bill.id}`,
    steps: [
      { key: "match", label: "Fatura ve ödeme bilgileri karşılaştırıldı" },
      { key: "detect", label: "Otomatik kontrollerin sonucu hazırlandı" },
      { key: "review", label: "Finans ekibi incelemesi" },
    ],
    data: {
      billId: bill.id,
      findings: findings.map((finding) => finding.code).join(","),
      findingsCount: findings.length,
      findingsSummary: summary,
      customerReviewRequested: true,
      requestType: issueId,
      customerDescription: selectedIssue.label,
      customerNotes: notes.trim(),
    },
    why: `Müşteri fatura incelemesi istedi: ${selectedIssue.label}${notes.trim() ? ` · ${notes.trim()}` : ""}`,
  });
  if (!created) return { wfId: wf.id, findings: findings.length, summary: String(wf.data["findingsSummary"] ?? summary) };

  step(wf.id, "match", "done", `${bill.period} faturası ${fmtTL(bill.amount)} · ödeme toplamı ${fmtTL(payments.filter((payment) => payment.billId === bill.id && payment.status !== "pending").reduce((total, payment) => total + payment.amount, 0))}`);
  step(wf.id, "detect", "done", findings.length ? `${findings.length} olası farklılık: ${summary}` : `${BILLING_CHECKS.length} kontrolde tutarsızlık görünmedi`);
  step(wf.id, "review", "in_progress", "Müşterinin inceleme talebi yetkili ekibe iletiliyor");
  workOrder(wf.id, { kind: "billing_review", title: `Fatura inceleme · ${bill.period}`, team: TEAMS.finance }, "Müşteri talebiyle yetkili finans ekibinin kontrolü gerekiyor");
  setStatus(wf.id, wf.status, { eta: "İlk değerlendirme hedefi: 1 iş günü içinde (demo)" });
  escalate(wf.id, TEAMS.finance, `Müşteri fatura incelemesi istedi: ${selectedIssue.label}${notes.trim() ? ` · ${notes.trim()}` : ""}. Otomatik kontrol özeti: ${summary}`);
  return { wfId: wf.id, findings: findings.length, summary };
}

export function explainBilling(id: string) {
  if (stepStatus(id, "explain") !== "pending") return;
  step(id, "explain", "done", "Ödeme ve borç yan yana gösterildi; hiçbir kayıt değiştirilmedi");
  step(id, "consent", "waiting");
  ask(
    id,
    {
      key: "billing_start",
      prompt: "Sizin için inceleme başlatalım mı?",
      detail: "Faturanızı kontrol ettik. Son ödemeniz ile mevcut borç bilginiz arasında güncelleme gerektiren bir farklılık olabilir. Tekrar ödeme yapmanıza gerek yok.",
      options: [
        { id: "start", label: "İncelemeyi Başlat", desc: "Ödeme ve fatura bilgileriniz karşılaştırılır; kayıtlar yalnızca yetkili süreçle güncellenir.", primary: true },
        { id: "later", label: "Daha Sonra", desc: "Hiçbir kayıt değiştirilmez." },
      ],
    },
    "Fatura incelemesi müşterinin onayıyla başlatılır",
  );
}
registerOp("billing.explain", explainBilling);

registerDecision("billing_start", (id, opt) => {
  if (opt === "later") {
    step(id, "consent", "waiting", "Müşteri daha sonra başlatmak istedi");
    setStatus(id, "waiting_for_customer", { blocker: "İncelemeyi siz başlattığınızda devam edeceğiz" });
    return;
  }
  step(id, "consent", "done", "Müşteri incelemeyi onayladı");
  chain("billing.reconcile", id, 1000);
});

/** "İncelemeyi Başlat" after the customer chose "Daha Sonra". */
export function resumeBillingReview(id: string) {
  if (stepStatus(id, "consent") !== "waiting" || choiceOf(id, "billing_start") !== "later") return;
  step(id, "consent", "done", "Müşteri incelemeyi sonradan başlattı");
  setStatus(id, "in_progress", { blocker: null });
  startReconcile(id);
}

export function startReconcile(id: string) {
  if (stepStatus(id, "reconcile") !== "pending") return;
  const consent = stepStatus(id, "consent");
  if (consent && consent !== "done") return;
  step(id, "reconcile", "in_progress", `Sorgu: ${MockBillingAPI.name} · ref ${BILLING_SEED.payment.ref}`);
  setStatus(id, "waiting_for_external_system", { blocker: "Ödeme kuruluşundan yanıt bekleniyor", eta: "Genellikle birkaç dakika (demo)" });
  notify(id, "Faturanız için inceleme başlattık", "Ödemenizi kontrol ediyoruz. Sonuçlandığında size haber vereceğiz.");
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
      detail: "Onayınız olmadan hiçbir iade veya mahsup yapılmaz. Talebiniz yetkili finans ekibine iletilir.",
      options: [
        { id: "refund", label: "Kartıma İade Edilsin", desc: "Finans onayından sonra 3–7 iş günü (demo)", primary: true },
        { id: "offset", label: "Sonraki Faturamdan Düşülsün", desc: "Kasım faturasına mahsup (finans onayıyla)" },
        { id: "wait", label: "Daha Sonra", desc: "Kayıt değiştirilmez" },
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
  notify(id, "Ödemeniz doğrulandı", `${BILLING_SEED.bill.period} ödemeniz teyit edildi, güncel borcunuz ${fmtTL(0)}. Sonuç işlem geçmişinize eklendi.`);
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
  if (wf.data["customerReviewRequested"] === true) {
    setWorkOrder(id, "billing_review", "done");
    const hasFindings = Number(wf.data["findingsCount"] ?? 0) > 0;
    teamResolve(id, {
      resolved: true,
      summary: "Finans ekibi fatura incelemesini tamamladı",
      results: [
        hasFindings ? `Otomatik kontrolde görülen bulgular değerlendirildi: ${String(wf.data["findingsSummary"] ?? "")}` : "Ön kontrollerde belirgin bir tutarsızlık görülmedi; müşteri talebi finans ekibince ayrıca incelendi",
        "Fatura ve ödeme kayıtlarında müşteri onayı olmadan değişiklik yapılmadı",
        "Gerekli bir düzeltme bulunursa ayrıca müşteri onayı istenir",
      ],
    });
    notify(id, "Fatura incelemen tamamlandı", "Finans ekibinin değerlendirmesini işlem detaylarında görebilirsin.");
    return;
  }
  const choice = wf.decisions.find((d) => d.key === "billing_refund");
  teamResolve(id, {
    resolved: true,
    summary: `Finans ekibi ${choice?.optionId === "offset" ? "mahsubu" : "iadeyi"} onayladı (demo)`,
    results: ["Borç görünümü düzeltildi", `Fazla tahsilat: ${fmtTL(BILLING_SEED.duplicate.amount)} → ${choice?.label ?? "—"}`, "Onay: Finans · Tahsilat Mutabakat Ekibi (demo)"],
  });
  notify(id, choice?.optionId === "offset" ? "Mahsup talebiniz onaylandı" : "İade talebiniz onaylandı", `${fmtTL(BILLING_SEED.duplicate.amount)} ${choice?.optionId === "offset" ? "Kasım faturanızdan düşülecek" : "3–7 iş günü içinde kartınıza yansıyacak"} (demo).`);
}

/** "Benim için incele": the customer's consent from the Fatura Kalkanı screen. Same rules as the decision card. */
export function consentBillingReview(id: string): boolean {
  const wf = getWf(id);
  if (!wf || wf.type !== "billing_check") return false;
  if (choiceOf(id, "billing_start") === "later") {
    resumeBillingReview(id);
    return true;
  }
  if (stepStatus(id, "explain") === "pending") explainBilling(id);
  if (getWf(id)?.decision?.key !== "billing_start") return false;
  return decide(id, "start", "customer");
}

