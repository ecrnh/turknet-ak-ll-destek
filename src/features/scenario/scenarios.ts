/**
 * DemoScenario definitions (A–F). Every step's status is *derived* from the real
 * workflow state, and every `run` calls a real service function — the panel
 * never fakes progress by changing text.
 */
import { DEMO_MOVE_DATE, DEMO_NEW_ADDRESS } from "@/data/mock";
import {
  activateHybrid,
  activateTemp,
  checkHybrid,
  analyzeSpeed,
  applyBillingUpdate,
  askConfirm,
  assessScope,
  checkExternal,
  closeOldLine,
  detectAnomaly,
  explainBilling,
  fieldDone,
  financeResolve,
  giveStep,
  hasOp,
  informBilling,
  injectAnomaly,
  ivrCheck,
  openUstaSms,
  offerAppointment,
  offerTemp,
  openFieldOrder,
  openInfraFollowup,
  provisionTemp,
  requestExternal,
  requestHybridDevice,
  startRepair,
  askInspect,
  restoreMain,
  retestSpeed,
  runBillingShield,
  runInstall,
  seedPaidButDebt,
  setConnectivity,
  setOutageElapsed,
  startBillingReview,
  startOutage,
  startReconcile,
  startRelocation,
  startTransfer,
  startUstaCall,
  tryRemoteFix,
  verifyProactive,
  verifyRelocation,
  flushOps,
} from "@/features/workflow";
import { useWorkflowStore as W, type WorkflowState } from "@/features/workflow/store";
import type { Actor, DemoConfig, StepStatus, Workflow } from "@/features/workflow/types";
import { useScenarioStore as S, type ScenarioState } from "./store";

export type StepState = "pending" | "running" | "waiting" | "done" | "failed" | "skipped";

export interface Ctx {
  w: WorkflowState;
  s: ScenarioState;
  main?: Workflow | undefined;
  temp?: Workflow | undefined;
  outcomeId: string;
}

export interface ScenarioStep {
  id: string;
  label: string;
  why: string;
  actor: Actor;
  status: (c: Ctx) => StepState;
  run?: (c: Ctx) => void;
  decisionKey?: string;
  decisionWf?: (c: Ctx) => Workflow | undefined;
  screen?: (c: Ctx) => string | null;
  only?: string[];
}

export interface ScenarioOutcome {
  id: string;
  label: string;
  desc: string;
  config: Partial<DemoConfig>;
  choices: Record<string, string>;
}

export interface DemoScenario {
  id: string;
  title: string;
  summary: string;
  features: string[];
  outcomes: ScenarioOutcome[];
  steps: ScenarioStep[];
}

/* ---------------- helpers ---------------- */
const main = (c: Ctx) => c.main;
const temp = (c: Ctx) => c.temp;
const setId = (key: string, id: string | null) => id && S.setState((s) => ({ ids: { ...s.ids, [key]: id } }));
const flag = (key: string) => S.setState((s) => ({ flags: { ...s.flags, [key]: true } }));
const setConfig = (p: Partial<DemoConfig>) => W.setState((s) => ({ config: { ...s.config, ...p } }));
const closed = (wf?: Workflow) => !!wf && ["completed", "failed", "escalated"].includes(wf.status);

function mapStep(wf: Workflow | undefined, st: StepStatus | undefined): StepState {
  if (!wf || !st) return closed(wf) ? "skipped" : "pending";
  if (st === "in_progress") return hasOp(wf.id) ? "running" : "waiting";
  return st;
}

/** Status mirrors one workflow step. */
const wfStep = (pick: (c: Ctx) => Workflow | undefined, key: string) => (c: Ctx) => {
  const wf = pick(c);
  return mapStep(wf, wf?.steps.find((s) => s.key === key)?.status);
};

/** Done as soon as the workflow step has started (for long-running steps). */
const reached = (pick: (c: Ctx) => Workflow | undefined, key: string) => (c: Ctx): StepState => {
  const wf = pick(c);
  const st = wf?.steps.find((s) => s.key === key)?.status;
  if (!st || st === "pending") return closed(wf) ? "skipped" : "pending";
  return st === "skipped" ? "skipped" : "done";
};

const offered = (pick: (c: Ctx) => Workflow | undefined, key: string) => (c: Ctx): StepState => {
  const wf = pick(c);
  if (wf?.decision?.key === key || wf?.decisions.some((d) => d.key === key)) return "done";
  return closed(wf) ? "skipped" : "pending";
};

export const decisionState = (pick: (c: Ctx) => Workflow | undefined, key: string) => (c: Ctx): StepState => {
  const wf = pick(c);
  if (!wf) return "pending";
  if (wf.decisions.some((d) => d.key === key)) return "done";
  if (wf.decision?.key === key) return "waiting";
  return closed(wf) ? "skipped" : "pending";
};

const declined = (c: Ctx, key: string) => c.main?.decisions.some((d) => d.key === key && d.optionId === "decline");
const tempStep = (key: string, decision: string) => (c: Ctx): StepState => {
  if (declined(c, decision)) return "skipped";
  if (!c.temp) return closed(c.main) ? "skipped" : "pending";
  return wfStep(temp, key)(c);
};

const detail = (c: Ctx) => (c.main ? `/surec/${c.main.id}` : null);

/* ---------------- Hibrit İnternet helpers ---------------- */
const hybridCheck = (c: Ctx): StepState => {
  if (c.w.hybrid.status === "checking") return "running";
  if (c.w.hybrid.checks) return "done";
  return closed(c.main) ? "skipped" : "pending";
};
/** Done once the given activation attempt has an answer. */
const activation = (attempt: number) => (c: Ctx): StepState => {
  const h = c.w.hybrid;
  if (h.attempts < attempt) return closed(c.main) ? "skipped" : "pending";
  if (h.attempts === attempt && h.status === "activating") return "running";
  return "done";
};

/* ---------------- shared relocation steps ---------------- */
const relocationOpen: ScenarioStep = {
  id: "open",
  label: "Müşteri “Taşınacağım” ekranını açar",
  why: "Talep algılama: müşteri sadece ihtiyacını söyler, gerisini platform yönetir",
  actor: "customer",
  status: (c) => (c.s.flags["form"] || c.main ? "done" : "pending"),
  run: () => {
    S.setState({ draft: { address: DEMO_NEW_ADDRESS, moveDate: DEMO_MOVE_DATE, wantsTemp: true } });
    flag("form");
  },
  screen: () => "/tasinma",
};

const relocationSubmit: ScenarioStep = {
  id: "submit",
  label: "Yeni adres ve taşınma tarihi gönderilir",
  why: "Bağlam toplama: abonelik, borç ve mevcut port bilgisi sistemden okunur, müşteriye tekrar sorulmaz",
  actor: "customer",
  status: wfStep(main, "context"),
  run: (c) => setId("main", startRelocation(c.s.draft ?? { address: DEMO_NEW_ADDRESS, moveDate: DEMO_MOVE_DATE, wantsTemp: true })),
  screen: (c) => `/surec/${S.getState().ids["main"] ?? c.main?.id}`,
};

const tempDecision = (label: string): ScenarioStep => ({
  id: "temp_decision",
  label,
  why: "Ücret, cihaz ve kapsama koşulları gösterildi; onay olmadan sipariş verilmez",
  actor: "customer",
  status: decisionState(main, "relocation_temp"),
  decisionKey: "relocation_temp",
});

const tempProvision: ScenarioStep = {
  id: "temp_provision",
  label: "Geçici modem siparişi ve kurye teslimatı",
  why: "Kabul edilen teklif için lojistik iş emri açılır ve teslimat takip edilir",
  actor: "system",
  status: tempStep("provision", "relocation_temp"),
  run: (c) => c.temp && provisionTemp(c.temp.id),
};

const tempActive: ScenarioStep = {
  id: "temp_active",
  label: "Geçici internet aktif",
  why: "Müşteri sabit internet gelene kadar internetsiz kalmaz",
  actor: "system",
  status: tempStep("active", "relocation_temp"),
  run: (c) => c.temp && activateTemp(c.temp.id),
};

const relocationTail = (only: string[], finalScreen: (c: Ctx) => string | null): ScenarioStep[] => [
  {
    id: "slot_offer",
    label: "Kurulum randevu seçenekleri sunulur",
    why: "Fiziksel kurulum gerektiği için zamanı müşteri seçer",
    actor: "system",
    status: offered(main, "relocation_slot"),
    run: (c) => c.main && offerAppointment(c.main.id),
    only,
  },
  { id: "slot_decision", label: "Müşteri randevu seçer", why: "Seçim kaydedilir ve kurulum iş emrine bağlanır", actor: "customer", status: decisionState(main, "relocation_slot"), decisionKey: "relocation_slot", only },
  { id: "team_match", label: "Uygun saha ekibi eşleştirilir, randevu onaylanır", why: "Müşteri ekipleri tek tek aramaz; ilk ekip kabul etmezse sıradaki ekip denenir (demo)", actor: "external", status: wfStep(main, "appointment"), only },
  { id: "install", label: "Kurulum ve aktivasyon", why: "Kurulum iş emri yürütülür", actor: "team", status: wfStep(main, "install"), run: (c) => c.main && runInstall(c.main.id), only },
  {
    id: "verify",
    label: "Yeni bağlantı doğrulanır, geçici internetten dönülür",
    why: "Aktivasyon gerçekten doğrulanmadan süreç tamamlandı sayılmaz",
    actor: "system",
    status: wfStep(main, "verify"),
    run: (c) => c.main && verifyRelocation(c.main.id),
    only,
  },
  {
    id: "old_line",
    label: "Eski hat kapatılır, süreç özeti gösterilir",
    why: "Eski hat yalnızca yeni bağlantı doğrulandıktan sonra kapatılır",
    actor: "system",
    status: wfStep(main, "old_line"),
    run: (c) => c.main && closeOldLine(c.main.id),
    screen: finalScreen,
    only,
  },
];

/* ---------------- Scenarios ---------------- */
export const SCENARIOS: DemoScenario[] = [
  {
    id: "A",
    title: "Taşınma ve port yok",
    summary: "Yeni adreste boş port yok. Sistem engeli açıklar, altyapı takibi açar, geçici internet önerir ve süreci kuruluma kadar yönetir.",
    features: ["Otonom Taşınma", "Geçici İnternet", "Takip"],
    outcomes: [
      { id: "success", label: "Altyapı açılır → kurulum", desc: "Müşteri geçici interneti kabul eder, port açılınca kurulum yapılır.", config: { addressCheck: "no_port", externalResponse: "ready" }, choices: { relocation_temp: "accept", relocation_slot: "slot-1" } },
      { id: "decline", label: "Geçici internet reddedilir", desc: "Müşteri teklifi reddeder; teslimat adımları atlanır.", config: { addressCheck: "no_port", externalResponse: "ready" }, choices: { relocation_temp: "decline", relocation_slot: "slot-2" } },
      { id: "escalate", label: "Altyapı yanıtsız → aktarım", desc: "Altyapı ekibinden 2 kontrolde yanıt gelmez, uzman ekibe bağlamıyla aktarılır.", config: { addressCheck: "no_port", externalResponse: "no_response" }, choices: { relocation_temp: "accept" } },
    ],
    steps: [
      relocationOpen,
      relocationSubmit,
      { id: "eligibility", label: "Altyapı sorgusu → port uygun değil", why: "Yeni adresin hizmet uygunluğu dış altyapı servisinden sorgulanır; sonuç uydurulmaz", actor: "external", status: wfStep(main, "eligibility") },
      { id: "infra", label: "Engel açıklanır, port takip iş emri açılır", why: "Port yokluğu müşteri hatası değil; altyapı ekibinin planlaması için iş emri gerekir", actor: "system", status: wfStep(main, "infra_followup"), run: (c) => c.main && openInfraFollowup(c.main.id) },
      { id: "temp_offer", label: "Geçici internet alternatifi gösterilir", why: "Port açılana kadar müşteri yeni adreste internetsiz kalabilir", actor: "system", status: offered(main, "relocation_temp"), run: (c) => c.main && offerTemp(c.main.id) },
      tempDecision("Müşteri geçici interneti kabul eder / reddeder"),
      tempProvision,
      tempActive,
      { id: "external_req", label: "Altyapı genişletme sonucu beklenir", why: "Dış ekip yanıtı gelene kadar işlem ‘dış sistem bekleniyor’ durumunda tutulur", actor: "system", status: reached(main, "external"), run: (c) => c.main && requestExternal(c.main.id) },
      { id: "external_ok", label: "Altyapı güncellendi: port açıldı", why: "Bekleyen dış talep yeniden kontrol edildi, olumlu yanıt geldi", actor: "external", status: wfStep(main, "external"), run: (c) => c.main && checkExternal(c.main.id), only: ["success", "decline"] },
      { id: "transfer", label: "Nakil iş emri oluşturulur", why: "Adres uygun hale gelince nakil iş emri başlatılır", actor: "system", status: wfStep(main, "transfer"), run: (c) => c.main && startTransfer(c.main.id), only: ["success", "decline"] },
      { id: "ext1", label: "1. kontrol: yanıt yok, müşteri bilgilendirilir", why: "Bekleyen yanıt başarı gibi gösterilmez; gecikme açıkça bildirilir", actor: "external", status: (c) => ((c.main?.retries ?? 0) >= 1 ? "done" : "pending"), run: (c) => c.main && checkExternal(c.main.id), only: ["escalate"] },
      { id: "ext2", label: "2. kontrol: yanıt yok → Altyapı Planlama ekibine aktarım", why: "Otomatik takip sınırı aşıldı; bağlam kaybolmadan insan takibine alınır", actor: "system", status: (c) => (c.main?.handoff ? "done" : "pending"), run: (c) => c.main && checkExternal(c.main.id), screen: detail, only: ["escalate"] },
      ...relocationTail(["success", "decline"], detail),
    ],
  },
  {
    id: "B",
    title: "Kesinti ve ücretsiz Hibrit İnternet",
    summary: "Kesinti tespit edilir, ilk 24 saat yalnızca arıza takibi yapılır. 24 saati aşınca aboneliğe dahil ücretsiz Hibrit İnternet sunulur; müşteri uygunluk kontrolü ve onayıyla etkinleştirir, ana bağlantı düzelince otomatik geri dönülür.",
    features: ["Hibrit İnternet", "Kesinti Takibi", "Takip"],
    outcomes: [
      { id: "success", label: "Etkinleştirilir → ana bağlantıya dönüş", desc: "Cihaz, SIM ve kapsama uygun; müşteri ücretsiz etkinleştirir, arıza giderilince geri dönülür.", config: { hybridDevice: true, hybridCoverage: true, hybridActivation: "success" }, choices: {} },
      { id: "no_device", label: "Uyumlu cihaz yok → Cihaz Talep Et", desc: "Cihaz olmadan yedek bağlantı açılmaz; cihaz gönderilir, teslimattan sonra etkinleştirilir.", config: { hybridDevice: false, hybridCoverage: true, hybridActivation: "success" }, choices: {} },
      { id: "no_coverage", label: "Mobil kapsama yetersiz", desc: "Yedek bağlantı açılamaz; müşteri bilgilendirilir, ana arıza takibi sürer.", config: { hybridDevice: true, hybridCoverage: false, hybridActivation: "success" }, choices: {} },
      { id: "fail_retry", label: "Aktivasyon başarısız → tekrar dene", desc: "İlk deneme başarısız olur; hata ve tekrar deneme gösterilir, ikinci denemede açılır.", config: { hybridDevice: true, hybridCoverage: true, hybridActivation: "fail" }, choices: {} },
      { id: "early", label: "24 saat dolmadan çözülür", desc: "Arıza ilk 24 saatte giderilir; Hibrit İnternet teklifi hiç gösterilmez.", config: { hybridDevice: true, hybridCoverage: true, hybridActivation: "success" }, choices: {} },
    ],
    steps: [
      { id: "signal", label: "Kesinti tespit edilir, push gönderilir", why: "Ağ izleme oturum kaybını bildirdi; müşteri şikâyeti beklenmez", actor: "presenter", status: wfStep(main, "signal"), run: () => setId("main", startOutage(0.3)), screen: () => "/" },
      { id: "track", label: "İlk 24 saat: arıza takibi (teklif yok)", why: "Kural: 24 saatten kısa kesintide Hibrit İnternet CTA'sı gösterilmez", actor: "presenter", status: (c) => (c.s.flags["track"] ? "done" : closed(c.main) ? "skipped" : "pending"), run: () => { setOutageElapsed(6); flag("track"); }, screen: () => "/" },
      { id: "h24", label: "Kesinti 24 saati aşar → ücretsiz teklif ve push", why: "24 saat içinde çözülemeyen kesintide aboneliğe dahil yedek bağlantı sunulur", actor: "presenter", status: wfStep(main, "hybrid_offer"), run: () => setOutageElapsed(25), screen: () => "/", only: ["success", "no_device", "no_coverage", "fail_retry"] },
      { id: "open", label: "Müşteri “Hibrit İnterneti Etkinleştir”e dokunur", why: "Aktivasyon ekranı hizmeti ve ücretsiz olduğunu açıklar", actor: "customer", status: (c) => (c.s.flags["open"] || c.w.hybrid.checks ? "done" : "pending"), run: () => flag("open"), screen: () => "/hibrit", only: ["success", "no_device", "no_coverage", "fail_retry"] },
      { id: "check", label: "Cihaz, SIM ve mobil kapsama kontrolü", why: "Hizmet yalnızca uyumlu cihaz, aktif SIM ve yeterli kapsama varsa çalışır", actor: "system", status: hybridCheck, run: () => checkHybrid(), screen: () => "/hibrit", only: ["success", "no_device", "no_coverage", "fail_retry"] },
      { id: "device_req", label: "Müşteri “Cihaz Talep Et”e dokunur", why: "Cihaz olmadan yedek bağlantı aktifmiş gibi gösterilmez", actor: "customer", status: (c) => (c.w.hybrid.device ? "done" : "pending"), run: () => requestHybridDevice(), only: ["no_device"] },
      { id: "device_ship", label: "Cihaz hazırlanır, yola çıkar, teslim edilir", why: "Lojistik iş emri ve teslimat takip edilir (demo)", actor: "external", status: (c) => (c.w.hybrid.device?.status === "delivered" ? "done" : c.w.hybrid.device && hasOp(c.main?.id, "hybrid.device") ? "running" : "pending"), only: ["no_device"] },
      { id: "recheck", label: "Teslimat sonrası uygunluk yeniden kontrol edilir", why: "Cihaz geldikten sonra kontrol otomatik tekrarlanır", actor: "system", status: (c) => (c.w.hybrid.status === "checking" ? "running" : c.w.hybrid.checks?.device ? "done" : "pending"), run: () => checkHybrid(), only: ["no_device"] },
      { id: "coverage_info", label: "Kapsama yetersiz: müşteri bilgilendirilir, takip sürer", why: "Kapsama olmadan yedek bağlantı açılmaz; ana arıza takibi kesintisiz sürer", actor: "system", status: (c) => (c.w.hybrid.checks?.coverage === false ? "done" : "pending"), run: () => flushOps(), only: ["no_coverage"] },
      { id: "activate", label: "Müşteri “Ücretsiz Olarak Etkinleştir”e dokunur", why: "Hizmet müşterinin onayı olmadan etkinleşmez", actor: "customer", status: activation(1), run: () => activateHybrid(), only: ["success", "no_device", "fail_retry"] },
      { id: "retry", label: "Aktivasyon başarısız → müşteri “Tekrar Dene”ye dokunur", why: "Başarısız etkinleştirme aktif gösterilmez; hata açıklanır ve tekrar deneme sunulur", actor: "customer", status: activation(2), run: () => { setConfig({ hybridActivation: "success" }); activateHybrid(); }, only: ["fail_retry"] },
      { id: "active", label: "Yedek internet aktif: ana kesik, yedek bağlantı açık", why: "Müşteri arıza süresince internete bağlı kalır; kullanım demo verisiyle gösterilir", actor: "system", status: (c) => (c.w.hybrid.activatedAt ? "done" : "pending"), run: () => flushOps(), screen: () => "/hibrit", only: ["success", "no_device", "fail_retry"] },
      { id: "restore", label: "Teknik ekip arızayı giderir, ana bağlantı geri gelir", why: "Onarım tamamlandığında ana bağlantı doğrulamaya alınır", actor: "team", status: wfStep(main, "restore"), run: () => restoreMain() },
      { id: "switch", label: "Yedekten ana bağlantıya otomatik dönüş", why: "Ana bağlantı kararlı çalışınca yedek bağlantı kapatılır ve müşteri bilgilendirilir", actor: "system", status: wfStep(main, "switch_back"), run: () => flushOps(), screen: () => "/hibrit", only: ["success", "no_device", "fail_retry"] },
      { id: "verify", label: "Bağlantı doğrulanır, müşteri bilgilendirilir", why: "Doğrulama olmadan kesinti kapatılmaz", actor: "system", status: wfStep(main, "verify"), run: () => flushOps(), screen: () => "/" },
    ],
  },
  {
    id: "C",
    title: "Ödenmiş borç hâlâ görünüyor",
    summary: "Ödeme başarılı ama borç ekranı güncellenmemiş. Fatura Kalkanı karşılaştırır, mutabakat yapar ve düzeltmeyi yalnızca yetkili süreçle yaptırır.",
    features: ["Fatura Kalkanı", "Takip"],
    outcomes: [
      { id: "settled", label: "Mutabakat başarılı", desc: "Ödeme teyit edilir, borç görünümü yetkili süreçle düzeltilir.", config: { reconciliation: "settled" }, choices: { billing_start: "start" } },
      { id: "duplicate", label: "Mükerrer tahsilat → finans", desc: "İki tahsilat bulunur; iade için müşteri onayı alınır ve finans ekibine aktarılır.", config: { reconciliation: "duplicate" }, choices: { billing_start: "start", billing_refund: "refund" } },
    ],
    steps: [
      { id: "seed", label: "Demo verisi: ödeme yapıldı, borç güncellenmedi", why: "Sunum için örnek fatura ve ödeme kayıtları yüklenir", actor: "presenter", status: (c) => (c.s.flags["seeded"] || c.main ? "done" : "pending"), run: (c) => { seedPaidButDebt(c.outcomeId === "duplicate"); flag("seeded"); }, screen: () => "/faturalar" },
      { id: "match", label: "Ödeme–fatura eşleştirme → olası tutarsızlık", why: "Fatura, ödeme ve abonelik verileri karşılaştırılır; sonuç kesin hata değil olasılıktır", actor: "system", status: wfStep(main, "detect"), run: () => setId("main", runBillingShield().wfId), screen: () => "/fatura-kalkani" },
      { id: "explain", label: "Ödeme ve borç karşılaştırmalı gösterilir", why: "Müşteri hangi kalemin kontrol edildiğini sade dille görür", actor: "system", status: wfStep(main, "explain"), run: (c) => c.main && explainBilling(c.main.id), screen: detail },
      { id: "consent", label: "Müşteri “İncelemeyi Başlat” der", why: "İnceleme müşteri onayıyla başlar; onay olmadan hiçbir kayıt incelemeye alınmaz", actor: "customer", status: decisionState(main, "billing_start"), decisionKey: "billing_start" },
      { id: "reconcile", label: "Ödeme mutabakat kontrolü (ödeme kuruluşu)", why: "Dış sistem yanıtı gelene kadar sonuç varsayılmaz", actor: "external", status: wfStep(main, "reconcile"), run: (c) => c.main && startReconcile(c.main.id) },
      { id: "update", label: "Borç kaydı yetkili mutabakat süreciyle güncellenir", why: "Uygulama borç silmez; düzeltmeyi yetkili mutabakat süreci yapar", actor: "system", status: wfStep(main, "update"), run: (c) => c.main && applyBillingUpdate(c.main.id) },
      { id: "inform", label: "Müşteri bilgilendirilir, kayıt kapanır", why: "Sonuç işlem geçmişine kaydedilir", actor: "system", status: wfStep(main, "inform"), run: (c) => c.main && informBilling(c.main.id), only: ["settled"] },
      { id: "review", label: "Mükerrer tahsilat için müşteri onayı istenir", why: "Para iadesi müşteri onayı olmadan başlatılmaz", actor: "system", status: offered(main, "billing_refund"), run: (c) => c.main && startBillingReview(c.main.id), only: ["duplicate"] },
      { id: "refund_decision", label: "Müşteri iade / mahsup tercihini yapar", why: "Tercih finans ekibine bağlamıyla iletilir", actor: "customer", status: decisionState(main, "billing_refund"), decisionKey: "billing_refund", only: ["duplicate"] },
      { id: "handoff", label: "Finans ekibine aktarım (yetkili onay)", why: "Finansal kayıt değişikliği yalnızca yetkili ekip onayıyla yapılır", actor: "system", status: (c) => (c.main?.handoff || c.main?.status === "completed" ? "done" : "pending"), run: (c) => c.main && informBilling(c.main.id), only: ["duplicate"] },
      { id: "finance", label: "Finans ekibi sonucu işler, müşteri bilgilendirilir", why: "İnceleme sonucu sisteme işlendiğinde müşteri haberdar edilir", actor: "team", status: (c) => (c.main?.status === "completed" ? "done" : "pending"), run: (c) => c.main && financeResolve(c.main.id), screen: detail, only: ["duplicate"] },
    ],
  },
  {
    id: "D",
    title: "Telefondan GIGA Teknik'e",
    summary: "Müşteri TürkNet'i arar. GIGA sesli olarak tanır, sorunu menüden seçtirir ve bölgesel kesintiyi kontrol eder; SMS ile GIGA Teknik'e geçirir. Dijital onarım önce uzaktan kontrol eder; gerekirse modem incelemesi ve güvenli adımlarla çözülür ya da bağlamıyla canlı desteğe aktarılır.",
    features: ["GIGA sesli destek", "SMS", "GIGA Teknik", "Canlı destek"],
    outcomes: [
      { id: "fixed", label: "Self-servis çözülür", desc: "İki güvenli adımdan sonra bağlantı gelir, müşteri doğrular. Destek kaydı açılmaz.", config: { aiFix: "fixed" }, choices: { usta_ivr_menu: "no_internet", usta_ivr: "sms", usta_more: "yes", usta_inspect: "done", usta_step1: "done", usta_step2: "done", usta_confirm: "yes" } },
      { id: "not_fixed", label: "Canlı desteğe aktarım", desc: "Adımlar sonuç vermez; tüm kontrollerle canlı desteğe aktarılır.", config: { aiFix: "not_fixed" }, choices: { usta_ivr_menu: "no_internet", usta_ivr: "sms", usta_more: "yes", usta_inspect: "done", usta_step1: "done", usta_step2: "done" } },
      { id: "no_app", label: "Uygulama yüklü değil", desc: "SMS bağlantısı önce uygulama kurulum ekranını açar; kurulumdan sonra bağlam korunarak devam edilir.", config: { aiFix: "fixed", appInstalled: false }, choices: { usta_ivr_menu: "no_internet", usta_ivr: "sms", usta_more: "yes", usta_inspect: "done", usta_step1: "done", usta_step2: "done", usta_confirm: "yes" } },
      { id: "remote", label: "Dijital onarım sorunu çözer", desc: "Dijital onarım bir sorun bulur, uzaktan düzeltir ve doğrular; modem fotoğrafı istenmez.", config: { aiFix: "fixed", ustaDiag: "issue" }, choices: { usta_ivr_menu: "no_internet", usta_ivr: "sms", usta_confirm: "yes" } },
      { id: "agent", label: "Temsilci istenir", desc: "Müşteri uygulamayı kullanmak istemez; telefonda temsilciye bağlamıyla aktarılır.", config: { aiFix: "fixed" }, choices: { usta_ivr_menu: "no_internet", usta_ivr: "agent" } },
    ],
    steps: [
      { id: "call", label: "Müşteri TürkNet'i arar, GIGA numarasından tanır", why: "Abonelik numaradan bulunur; şifre veya kimlik bilgisi sorulmaz", actor: "customer", status: wfStep(main, "call"), run: () => setId("main", startUstaCall()) },
      { id: "menu", label: "Sesli menü: 1 — İnternetim hiç çalışmıyor", why: "Sorun kategorisi telefonda seçilir; uygulamada tekrar sorulmaz", actor: "customer", status: decisionState(main, "usta_ivr_menu"), decisionKey: "usta_ivr_menu" },
      { id: "ivr_check", label: "Bölgesel kesinti kontrol edilir", why: "Bölgesel arıza varsa müşteriye adım yaptırılmaz", actor: "system", status: wfStep(main, "ivr_check"), run: (c) => c.main && ivrCheck(c.main.id) },
      { id: "ivr_choice", label: "SMS ile devam mı, temsilci mi?", why: "Kanal değişimi müşterinin seçimidir; uygulama zorunlu değildir", actor: "customer", status: decisionState(main, "usta_ivr"), decisionKey: "usta_ivr" },
      { id: "sms_open", label: "SMS bağlantısı açılır (uygulama yoksa önce kurulum)", why: "Çağrıdaki bağlam aktarılır; müşteri sorunu yeniden anlatmaz (simüle SMS)", actor: "customer", status: wfStep(main, "sms"), run: (c) => c.main && openUstaSms(c.main.id), screen: detail, only: ["fixed", "not_fixed", "no_app", "remote"] },
      { id: "repair", label: "Dijital onarım: 5 uzaktan kontrol", why: "Modem fotoğrafı istenmeden önce bağlantı uzaktan kontrol edilir (simülasyon)", actor: "agent", status: wfStep(main, "repair"), run: (c) => c.main && startRepair(c.main.id), only: ["fixed", "not_fixed", "no_app", "remote"] },
      { id: "remote", label: "Sorun bulunur, uzaktan düzeltilir ve doğrulanır", why: "Önce uzaktan çözülebilecek adımlar denenir", actor: "agent", status: (c) => { const v = c.main?.steps.find((x) => x.key === "verify")?.status; return v === "done" ? "done" : c.main && closed(c.main) ? "skipped" : "running"; }, only: ["remote"] },
      { id: "more", label: "Arıza görünmüyor: “Birlikte detaylı inceleyelim mi?”", why: "Kontroller normal görünse de sorun çözülmüş sayılmaz", actor: "customer", status: decisionState(main, "usta_more"), decisionKey: "usta_more", only: ["fixed", "not_fixed", "no_app"] },
      { id: "inspect", label: "Modemin ön/arka yüzü: ışık kırmızı, kablolar takılı", why: "Fotoğraf yoksa ışık ve kablo seçimiyle devam edilir", actor: "customer", status: decisionState(main, "usta_inspect"), decisionKey: "usta_inspect", run: (c) => c.main && askInspect(c.main.id), only: ["fixed", "not_fixed", "no_app"] },
      { id: "analysis", label: "Işık ve kablo değerlendirmesi (simülasyon)", why: "Gerçek model yok; sonuç açıkça simülasyon olarak işaretlenir", actor: "agent", status: wfStep(main, "analysis"), only: ["fixed", "not_fixed", "no_app"] },
      { id: "step1", label: "Adım 1: güç kablosu kontrolü", why: "En güvenli ve geri alınabilir adımdan başlanır", actor: "agent", status: offered(main, "usta_step1"), run: (c) => c.main && giveStep(c.main.id, 1), only: ["fixed", "not_fixed", "no_app"] },
      { id: "step1_done", label: "Müşteri “Kontrol ettim” der", why: "Müşteri her adımda sonucu bildirir", actor: "customer", status: decisionState(main, "usta_step1"), decisionKey: "usta_step1", only: ["fixed", "not_fixed", "no_app"] },
      { id: "step2", label: "Adım 2: modemi kapatıp 20 sn bekle", why: "Sıradaki güvenli kontrol", actor: "agent", status: offered(main, "usta_step2"), run: (c) => c.main && giveStep(c.main.id, 2), only: ["fixed", "not_fixed", "no_app"] },
      { id: "step2_done", label: "Müşteri “Tamam, açtım” der", why: "Modem yeniden başlatıldı", actor: "customer", status: decisionState(main, "usta_step2"), decisionKey: "usta_step2", only: ["fixed", "not_fixed", "no_app"] },
      { id: "reconnect", label: "Bağlantının yeniden kurulması beklenir", why: "Modemin açılması zaman alır", actor: "system", status: wfStep(main, "reconnect"), only: ["fixed", "not_fixed", "no_app"] },
      { id: "recheck", label: "Bağlantı tekrar kontrol edilir", why: "Çözüm ölçümle doğrulanır", actor: "system", status: wfStep(main, "recheck"), only: ["fixed", "not_fixed", "no_app"] },
      { id: "confirm", label: "Müşteri çözümü doğrular", why: "Çözüm müşteri onayı olmadan kapatılmaz", actor: "customer", status: decisionState(main, "usta_confirm"), decisionKey: "usta_confirm", run: (c) => c.main && askConfirm(c.main.id), only: ["fixed", "no_app", "remote"] },
      { id: "reward", label: "Sorun çözüldü, destek kaydı açılmadı", why: "Self-servis çözümde kayıt oluşturulmaz", actor: "system", status: (c) => (c.main?.status === "completed" ? "done" : "pending"), screen: detail, only: ["fixed", "no_app", "remote"] },
      { id: "handoff", label: "Canlı desteğe bağlamıyla aktarım", why: "Müşteri aynı sorunu baştan anlatmaz; tüm kontroller temsilciye gider", actor: "system", status: (c) => (c.main?.handoff ? "done" : "pending"), screen: (c) => (c.main ? `/canli-destek/${c.main.id}` : null), only: ["not_fixed", "agent"] },
    ],
  },
  {
    id: "E",
    title: "Proaktif arıza ve hız",
    summary: "Müşteri fark etmeden anormal sinyal yakalanır; kapsam ve hız analiz edilir, uzaktan güvenli iyileştirme denenir, hız yeniden ölçülür; gerekmezse saha iş emri açılmaz.",
    features: ["Proaktif Arıza", "Hız Optimizasyonu", "Takip"],
    outcomes: [
      { id: "remote_fix", label: "Uzaktan çözülür", desc: "Hat profili yenileme ve uzaktan yeniden başlatma sorunu giderir.", config: { proactive: "remote_fix" }, choices: {} },
      { id: "field", label: "Saha iş emri gerekir", desc: "Uzaktan çözüm yetmez; teknisyen yönlendirilir.", config: { proactive: "field" }, choices: {} },
    ],
    steps: [
      { id: "baseline", label: "Bağlantı normal (teknik kontroller aktif)", why: "Normal değerler referans alınır: optik -19 dBm, 0 kopma", actor: "system", status: (c) => (c.s.flags["baseline"] ? "done" : "pending"), run: () => { setConnectivity({ fixed: "up", metric: { optic: -19.2, drops: 0 } }, "İzleme: bağlantı normal"); flag("baseline"); }, screen: () => "/baglanti" },
      { id: "anomaly", label: "Anormal bağlantı sinyali tetiklenir", why: "Demo: izleme verisine eşik dışı değer enjekte edilir", actor: "presenter", status: (c) => (c.s.flags["anomaly"] ? "done" : "pending"), run: () => { injectAnomaly(); flag("anomaly"); } },
      { id: "detect", label: "Sistem olası arızayı algılar", why: "Müşteri şikâyet etmeden süreç başlar", actor: "system", status: wfStep(main, "signal"), run: () => setId("main", detectAnomaly()) },
      { id: "scope", label: "Kapsam: tek hat mı, bölgesel mi?", why: "Belirsiz durumda kesin teşhis iddiası yapılmaz", actor: "system", status: wfStep(main, "scope"), run: (c) => c.main && assessScope(c.main.id) },
      { id: "speed", label: "Hız ve bağlantı analizi (paket 100 → ölçülen 21 Mbps)", why: "Paket ile ölçülen hız arasındaki anlamlı farkın olası nedenleri değerlendirilir", actor: "system", status: wfStep(main, "speed"), run: (c) => c.main && analyzeSpeed(c.main.id), screen: detail },
      { id: "remote", label: "Uzaktan güvenli iyileştirme denemesi", why: "Yalnızca güvenli ve geri alınabilir işlemler otomatik yapılır", actor: "system", status: wfStep(main, "remote"), run: (c) => c.main && tryRemoteFix(c.main.id) },
      { id: "retest", label: "Hız yeniden ölçülür (önce / sonra)", why: "İyileşme ölçümle doğrulanır; hız fiziksel kapasitenin üzerine çıkarılmaz", actor: "system", status: wfStep(main, "retest"), run: (c) => c.main && retestSpeed(c.main.id) },
      { id: "field", label: "Teknik iş emri açılır, müşteri bilgilendirilir", why: "Uzaktan çözülemeyen sorun fiziksel müdahale gerektirir", actor: "system", status: reached(main, "field"), run: (c) => c.main && openFieldOrder(c.main.id), only: ["field"] },
      { id: "field_done", label: "Teknisyen onarımı tamamlar", why: "Saha iş emri kapanınca doğrulamaya geçilir", actor: "team", status: wfStep(main, "field"), run: (c) => c.main && fieldDone(c.main.id), only: ["field"] },
      { id: "verify", label: "Çözüm doğrulanır, müşteri bilgilendirilir", why: "30 dk izleme ile doğrulanmadan arıza kapanmaz", actor: "system", status: wfStep(main, "verify"), run: (c) => c.main && verifyProactive(c.main.id), screen: detail },
    ],
  },
  {
    id: "F",
    title: "Birden fazla süreç birlikte",
    summary: "Taşınma + dış operatör gecikmesi + geçici internet + iş emri takibi + randevu + aktivasyon. “Benim İçin Takip Et” hepsini tek yerden yönetir.",
    features: ["Benim İçin Takip Et", "Taşınma", "Geçici İnternet"],
    outcomes: [
      { id: "success", label: "Gecikme sonrası başarı", desc: "Dış operatör gecikir, geçici internet devreye girer, port tahsis edilince kurulum tamamlanır.", config: { addressCheck: "eligible_external", externalResponse: "no_response" }, choices: { relocation_temp: "accept", relocation_slot: "slot-2" } },
      { id: "escalate", label: "Gecikme sürer → aktarım", desc: "Dış operatör yanıt vermez; müşteri geçici internetle bağlı kalırken nakil ekibine aktarılır.", config: { addressCheck: "eligible_external", externalResponse: "no_response" }, choices: { relocation_temp: "accept" } },
    ],
    steps: [
      relocationOpen,
      relocationSubmit,
      { id: "eligibility", label: "Altyapı sorgusu: uygun, port dış sağlayıcıda", why: "Bu adresin altyapısı başka bir sağlayıcıya ait", actor: "external", status: wfStep(main, "eligibility") },
      { id: "transfer", label: "Nakil iş emri oluşturulur", why: "Adres uygun; nakil başlatılır", actor: "system", status: wfStep(main, "transfer"), run: (c) => c.main && startTransfer(c.main.id) },
      { id: "external_req", label: "Dış operatöre port tahsis talebi", why: "Dış sistem işlemi gerekiyor; talep oluşturulur ve takibe alınır", actor: "system", status: reached(main, "external"), run: (c) => c.main && requestExternal(c.main.id), screen: () => "/takip" },
      { id: "delay", label: "Dış sistem gecikiyor → müşteri bilgilendirilir", why: "Bekleme durumu açıkça gösterilir, başarı varsayılmaz", actor: "external", status: (c) => ((c.main?.retries ?? 0) >= 1 ? "done" : "pending"), run: (c) => { setConfig({ externalResponse: "no_response" }); if (c.main) checkExternal(c.main.id); } },
      { id: "temp_offer", label: "Geçici internet teklifi", why: "Gecikme taşınma tarihini aşabilir; müşteri internetsiz kalmamalı", actor: "system", status: offered(main, "relocation_temp"), run: (c) => c.main && offerTemp(c.main.id) },
      tempDecision("Müşteri kararı: geçici internet"),
      tempProvision,
      tempActive,
      { id: "external_ok", label: "Dış sistem yanıtı geldi: port tahsis edildi", why: "Yeni durum gelince sonraki adıma geçilir", actor: "external", status: wfStep(main, "external"), run: (c) => { setConfig({ externalResponse: "ready" }); if (c.main) checkExternal(c.main.id); }, screen: () => "/takip", only: ["success"] },
      { id: "ext2", label: "2. kontrol de yanıtsız → Nakil Operasyon ekibine aktarım", why: "Otomatik takip sınırı aşıldı; müşteri geçici internetle bağlı kalır", actor: "system", status: (c) => (c.main?.handoff ? "done" : "pending"), run: (c) => c.main && checkExternal(c.main.id), screen: () => "/takip", only: ["escalate"] },
      ...relocationTail(["success"], () => "/takip"),
    ],
  },
  {
    id: "G",
    title: "Taşınma ve ekip eşleştirme",
    summary: "Yeni adres uygun. Müşteri tarih ve saat aralığı seçer; sistem uygun saha ekibini bulur, randevu isteği gönderir ve onayı takip eder. İlk ekip kabul edemezse başka ekip aranır; müşteri kimseyi aramaz.",
    features: ["Taşınma ve Nakil", "Ekip eşleştirme", "İşlemlerim"],
    outcomes: [
      { id: "first", label: "İlk ekip kabul eder", desc: "Seçilen saat için ilk uygun ekip randevuyu onaylar.", config: { addressCheck: "eligible", teamMatch: "first" }, choices: { relocation_slot: "slot-1" } },
      { id: "second", label: "İlk ekip kabul edemez → başka ekip", desc: "Ekip uygunluğu değişir; başka bir ekip bulunur ve randevu onaylanır.", config: { addressCheck: "eligible", teamMatch: "second" }, choices: { relocation_slot: "slot-1" } },
    ],
    steps: [
      relocationOpen,
      relocationSubmit,
      { id: "eligibility", label: "Adres kontrolü: hizmet sunulabiliyor", why: "Yeni adresin uygunluğu altyapı servisinden sorgulanır; sonuç uydurulmaz", actor: "external", status: wfStep(main, "eligibility") },
      { id: "transfer", label: "Taşınma talebi başlatılır", why: "Adres uygun; nakil iş emri oluşturulur", actor: "system", status: wfStep(main, "transfer"), run: (c) => c.main && startTransfer(c.main.id) },
      ...relocationTail(["first", "second"], detail),
    ],
  },
];

export const scenarioById = (id: string | null | undefined) => SCENARIOS.find((s) => s.id === id);
