/**
 * DemoScenario definitions (A–F). Every step's status is *derived* from the real
 * workflow state, and every `run` calls a real service function — the panel
 * never fakes progress by changing text.
 */
import { DEMO_MOVE_DATE, DEMO_NEW_ADDRESS } from "@/data/mock";
import {
  activateTemp,
  analyzeSpeed,
  applyBillingUpdate,
  askConfirm,
  assessScope,
  checkCoverage,
  checkExternal,
  closeOldLine,
  detectAnomaly,
  diagnoseOutage,
  explainBilling,
  fieldDone,
  financeResolve,
  giveStep,
  hasOp,
  informBilling,
  injectAnomaly,
  ivrCheck,
  offerAlternative,
  openUstaSms,
  offerAppointment,
  offerTemp,
  openFieldOrder,
  openInfraFollowup,
  provisionTemp,
  requestExternal,
  requestPhoto,
  restoreFixed,
  retestSpeed,
  runBillingShield,
  runInstall,
  seedPaidButDebt,
  setConnectivity,
  startBillingReview,
  startFixedOutage,
  startReconcile,
  startRelocation,
  startRepair,
  startTransfer,
  startUstaCall,
  toggleBox,
  tryRemoteFix,
  verifyOutage,
  verifyProactive,
  verifyRelocation,
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
    title: "Kesinti ve geçici Box",
    summary: "Sabit hat kesilir. Sistem kesinti nedenini inceler, mobil internet uygunluğunu kontrol eder, TürkNet Box sunar; müşteri Box'ı uygulamadan açıp kapatır.",
    features: ["Geçici İnternet / Box", "Hibrit", "Takip"],
    outcomes: [
      { id: "line_temp", label: "Box kabul edilir", desc: "Müşteri Box'ı kabul eder; teslimat, aktivasyon ve uygulamadan aç/kapa gösterilir.", config: { outageType: "line" }, choices: { outage_alt: "temp_mobile" } },
      { id: "line_hybrid", label: "Hibrit yedek seçilir", desc: "Uyumlu modemde yedek bağlantı açılır; sabit hat dönünce otomatik geri geçilir.", config: { outageType: "line" }, choices: { outage_alt: "hybrid" } },
      { id: "regional", label: "Bölgesel arıza · teklif reddedilir", desc: "Bölgesel arıza; müşteriye bireysel arıza varmış gibi yönlendirme yapılmaz.", config: { outageType: "regional" }, choices: { outage_alt: "decline" } },
    ],
    steps: [
      { id: "signal", label: "Arıza sinyali: sabit bağlantı kesildi", why: "Ağ izleme oturum kaybını bildirdi; müşteri şikâyeti beklenmez", actor: "presenter", status: wfStep(main, "signal"), run: () => setId("main", startFixedOutage()), screen: () => "/baglanti" },
      { id: "diagnose", label: "Kesinti türü teşhisi (bireysel / bölgesel)", why: "Bölgesel arızada müşteriye yanlış yönlendirme yapılmaması için kapsam belirlenir", actor: "system", status: wfStep(main, "diagnose"), run: (c) => c.main && diagnoseOutage(c.main.id) },
      { id: "coverage", label: "Adres kapsaması ve modem uygunluğu", why: "Alternatif bağlantı ancak kapsama ve cihaz uygunsa önerilir", actor: "system", status: wfStep(main, "coverage"), run: (c) => c.main && checkCoverage(c.main.id) },
      { id: "offer", label: "Box / hibrit yedek teklifi", why: "İki ürünün teknik ve ticari koşulları farklı; ayrı ayrı gösterilir", actor: "system", status: offered(main, "outage_alt"), run: (c) => c.main && offerAlternative(c.main.id), screen: detail },
      { id: "decision", label: "Müşteri kararı", why: "Onay olmadan hiçbir hizmet aktifleşmez", actor: "customer", status: decisionState(main, "outage_alt"), decisionKey: "outage_alt" },
      { id: "provision", label: "Box teslimatı / eSIM tanımlama", why: "Kabul edilen alternatif hazırlanır ve durumu takip edilir", actor: "system", status: tempStep("provision", "outage_alt"), run: (c) => c.temp && provisionTemp(c.temp.id) },
      { id: "active", label: "Box / yedek bağlantı aktif", why: "Sabit hat dönene kadar müşteri bağlı kalır", actor: "system", status: tempStep("active", "outage_alt"), run: (c) => c.temp && activateTemp(c.temp.id), screen: () => "/baglanti" },
      { id: "box_off", label: "Müşteri Box'ı uygulamadan kapatır", why: "Cihaz yönetimi uygulamadan yapılır (demo cihaz komutu)", actor: "customer", status: (c) => ((c.w.box?.toggles ?? 0) >= 1 ? "done" : "pending"), run: () => toggleBox(false), only: ["line_temp"] },
      { id: "box_on", label: "Müşteri Box'ı tekrar açar", why: "Mobil internet yeniden bağlanır, kullanım takip edilir", actor: "customer", status: (c) => ((c.w.box?.toggles ?? 0) >= 2 ? "done" : "pending"), run: () => toggleBox(true), only: ["line_temp"] },
      { id: "repair", label: "Onarım süreci başlar (saha / bölgesel ekip)", why: "Bireysel arızada saha iş emri açılır; bölgesel arızada açılmaz", actor: "team", status: reached(main, "repair"), run: (c) => c.main && startRepair(c.main.id) },
      { id: "restore", label: "Sabit bağlantı geri döner, yedekten çıkılır", why: "Sabit hat geri geldiğinde uygun koşulda otomatik geri dönüş yapılır", actor: "system", status: wfStep(main, "restore"), run: (c) => c.main && restoreFixed(c.main.id), screen: () => "/baglanti" },
      { id: "verify", label: "Çözüm doğrulanır, müşteri bilgilendirilir", why: "Doğrulama olmadan arıza kapatılmaz", actor: "system", status: wfStep(main, "verify"), run: (c) => c.main && verifyOutage(c.main.id), screen: detail },
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
    title: "AI Usta ile modem sorunu",
    summary: "Müşteri çağrı merkezini arar. Sesli asistan tanır ve ilk kontrolleri yapar, SMS ile AI Usta'ya geçirir; görsel kontrol ve güvenli adımlarla çözülür ya da bağlamıyla canlı desteğe aktarılır.",
    features: ["Sesli Triyaj", "AI Usta", "Takip"],
    outcomes: [
      { id: "fixed", label: "Self-servis çözülür", desc: "İlk güvenli adım sonrası bağlantı gelir, müşteri doğrular.", config: { aiFix: "fixed" }, choices: { usta_ivr: "sms", usta_photo: "demo_photo", usta_step1: "done", usta_confirm: "yes" } },
      { id: "not_fixed", label: "Canlı desteğe aktarım", desc: "İki güvenli adım sonuç vermez; kontrollerle birlikte uzmana aktarılır.", config: { aiFix: "not_fixed" }, choices: { usta_ivr: "sms", usta_photo: "demo_photo", usta_step1: "persist", usta_step2: "persist" } },
    ],
    steps: [
      { id: "call", label: "Müşteri çağrı merkezini arar, numarasından tanınır", why: "Sesli yanıt sistemi abonelik bilgisini numaradan bulur; kimlik tekrar sorulmaz", actor: "customer", status: wfStep(main, "call"), run: () => setId("main", startUstaCall()), screen: () => "/" },
      { id: "ivr_check", label: "Sesli asistan ilk kontrolleri yapar", why: "Telefonda çözülebilecek bir durum mu diye bakılır; bölgesel arıza varsa müşteriye adım yaptırılmaz", actor: "system", status: wfStep(main, "ivr_check"), run: (c) => c.main && ivrCheck(c.main.id) },
      { id: "ivr_choice", label: "Müşteri 1'e basar: AI Usta SMS'i istenir", why: "Görsel destek için kanal değiştirme müşterinin seçimidir", actor: "customer", status: decisionState(main, "usta_ivr"), decisionKey: "usta_ivr" },
      { id: "sms_open", label: "SMS'teki “AI Usta'yı Aç” ile uygulamaya geçilir", why: "Çağrıdaki bağlam aktarılır; müşteri sorunu yeniden yazmaz (simüle SMS)", actor: "customer", status: wfStep(main, "sms"), run: (c) => c.main && openUstaSms(c.main.id), screen: (c) => (c.main ? `/surec/${c.main.id}` : null) },
      { id: "photo_req", label: "AI Usta modem ışıklarının fotoğrafını ister", why: "Işık durumları teknik soru sormadan sorunu daraltır", actor: "agent", status: offered(main, "usta_photo"), run: (c) => c.main && requestPhoto(c.main.id) },
      { id: "photo", label: "Fotoğraf yüklenir", why: "Müşteri kendi fotoğrafını veya örnek fotoğrafı kullanır", actor: "customer", status: decisionState(main, "usta_photo"), decisionKey: "usta_photo" },
      { id: "analysis", label: "Görsel analiz (simülasyon): Internet ışığı kapalı", why: "Gerçek model yok; sonuç açıkça simülasyon olarak işaretlenir", actor: "agent", status: wfStep(main, "analysis") },
      { id: "step1", label: "Güvenli adım 1: güç ve kablo kontrolü", why: "En güvenli ve geri alınabilir adımdan başlanır", actor: "agent", status: offered(main, "usta_step1"), run: (c) => c.main && giveStep(c.main.id, 1) },
      { id: "step1_done", label: "Müşteri “Uyguladım” / “Sorun devam ediyor” der", why: "Müşteri her adımda sonucu bildirir", actor: "customer", status: decisionState(main, "usta_step1"), decisionKey: "usta_step1" },
      { id: "recheck1", label: "Bağlantı yeniden kontrol edilir", why: "Çözüm ölçümle doğrulanır", actor: "system", status: wfStep(main, "recheck1") },
      { id: "confirm", label: "Müşteri çözümü doğrular", why: "Çözüm müşteri onayı olmadan kapatılmaz", actor: "customer", status: decisionState(main, "usta_confirm"), decisionKey: "usta_confirm", run: (c) => c.main && askConfirm(c.main.id), only: ["fixed"] },
      { id: "reward", label: "Doğrulanmış self-servis rozeti, kayıt kapanır", why: "Ödül göstergesi yalnızca doğrulanmış çözümde gösterilir (örnek)", actor: "system", status: (c) => (c.main?.status === "completed" ? "done" : "pending"), screen: detail, only: ["fixed"] },
      { id: "step2", label: "Güvenli adım 2: modemi yeniden başlat", why: "İlk adım yetmedi; sıradaki güvenli kontrol", actor: "agent", status: decisionState(main, "usta_step2"), decisionKey: "usta_step2", run: (c) => c.main && giveStep(c.main.id, 2), only: ["not_fixed"] },
      { id: "recheck2", label: "Yeniden kontrol: bağlantı yok", why: "Deneme sınırına ulaşıldı", actor: "system", status: wfStep(main, "recheck2"), only: ["not_fixed"] },
      { id: "handoff", label: "Canlı teknik desteğe bağlamıyla aktarım", why: "Müşteri aynı sorunu baştan anlatmaz; tüm kontroller aktarılır", actor: "system", status: (c) => (c.main?.handoff ? "done" : "pending"), screen: detail, only: ["not_fixed"] },
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
      { id: "baseline", label: "Bağlantı normal (izleme aktif)", why: "Normal değerler referans alınır: optik -19 dBm, 0 kopma", actor: "system", status: (c) => (c.s.flags["baseline"] ? "done" : "pending"), run: () => { setConnectivity({ fixed: "up", metric: { optic: -19.2, drops: 0 } }, "İzleme: bağlantı normal"); flag("baseline"); }, screen: () => "/baglanti" },
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
];

export const scenarioById = (id: string | null | undefined) => SCENARIOS.find((s) => s.id === id);
