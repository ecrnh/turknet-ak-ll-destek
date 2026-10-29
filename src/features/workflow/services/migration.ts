/**
 * MigrationService: "Otonom Taşınma ve Nakil Yöneticisi".
 * Branches on the infrastructure answer: eligible / eligible via external
 * provider / no port / no response. Never invents a successful answer.
 */
import { APPOINTMENT_SLOTS, CURRENT_ADDRESS, SUBSCRIPTION, TEAMS, TEMP_MOBILE_OFFER, type DemoAddress } from "@/data/mock";
import { ask, book, chain, complete, createWorkflow, escalate, getWf, log, notify, plan, registerDecision, registerOp, schedule, setData, setStatus, setWorkOrder, step, stepStatus, workOrder } from "../engine";
import { MockInfraAPI, MockProviderAPI } from "../mockServices";
import { relocationPlan, shouldEscalateAfterRetry, type EligibilityResult } from "../rules";
import { useWorkflowStore as W } from "../store";
import { acceptTempInternet, setConnectivity, switchBackFromTemp, tempOfWorkflow } from "./connectivity";

export const RELOCATION_LABELS: Record<string, string> = {
  context: "Abonelik ve adres kontrolü",
  eligibility: "Yeni adres altyapı sorgusu",
  infra_followup: "Altyapı / port takip talebi",
  temp_offer: "Geçici internet kararı",
  external: "Altyapı sağlayıcı yanıtı",
  transfer: "Nakil talebi ve iş emri",
  appointment: "Kurulum randevusu",
  install: "Kurulum ve aktivasyon",
  verify: "Yeni bağlantı doğrulaması",
  old_line: "Eski adres hizmet sonlandırma",
};

export interface RelocationInput {
  address: DemoAddress;
  moveDate: string;
  wantsTemp: boolean;
}

export function startRelocation(input: RelocationInput): string {
  const { wf, created } = createWorkflow({
    type: "relocation",
    title: `Taşınma · ${input.address.district}`,
    dedupeKey: `relocation:${SUBSCRIPTION.id}`,
    steps: [
      { key: "context", label: RELOCATION_LABELS["context"]! },
      { key: "eligibility", label: RELOCATION_LABELS["eligibility"]! },
    ],
    data: { address: `${input.address.line}, ${input.address.district}/${input.address.city}`, district: input.address.district, moveDate: input.moveDate, wantsTemp: input.wantsTemp, oldPort: CURRENT_ADDRESS.port },
    why: "Müşteri “Taşınacağım” talebini yeni adres ve tarih ile gönderdi",
  });
  if (!created) return wf.id;
  step(wf.id, "context", "done", `${SUBSCRIPTION.packageName} · borç yok · taahhüt ${SUBSCRIPTION.commitmentEnd} · mevcut port ${CURRENT_ADDRESS.port}`, "Nakil öncesi abonelik, borç ve mevcut port bilgisi doğrulanır; müşteriden tekrar istenmez");
  notify(wf.id, "Taşınma talebini aldım", "Yeni adresinin altyapısını kontrol ediyorum. Her adımda seni bilgilendireceğim.");
  checkEligibility(wf.id);
  return wf.id;
}

export function checkEligibility(id: string) {
  const s = stepStatus(id, "eligibility");
  if (s === "in_progress" || s === "done") return;
  step(id, "eligibility", "in_progress", `Sorgu gönderildi: ${MockInfraAPI.name}`);
  setStatus(id, "in_progress", { blocker: null });
  schedule("relocation.eligibility", id, 1600);
}

registerOp("relocation.eligibility", (id) => {
  const wf = getWf(id);
  if (!wf) return;
  const r = MockInfraAPI.checkAddress({ id: "", line: String(wf.data["address"]), district: String(wf.data["district"]), city: "" });
  log(id, "external", "external", `${MockInfraAPI.name} yanıtı: ${r.result}`, r.reason);
  if (r.result === "no_response") {
    const retries = wf.retries + 1;
    W.setState((st) => ({ workflows: st.workflows.map((w) => (w.id === id ? { ...w, retries } : w)) }));
    step(id, "eligibility", "waiting", `Yanıt yok (${retries}. deneme)`);
    setStatus(id, "waiting_for_external_system", { blocker: "Altyapı sorgu servisi yanıt vermiyor", eta: "Otomatik yeniden kontrol planlandı (demo)" });
    if (retries === 1) notify(id, "Altyapı sorgusu gecikiyor", "Sorgu servisinden yanıt alamadım. Sonucu tahmin etmiyorum; takip ediyorum ve tekrar deneyeceğim.");
    if (shouldEscalateAfterRetry(retries)) escalate(id, TEAMS.infra, `Altyapı sorgusu ${retries} denemede yanıt vermedi`);
    else chain("relocation.retryEligibility", id, 8000);
    return;
  }
  applyEligibility(id, r.result, r.reason);
});

registerOp("relocation.retryEligibility", (id) => {
  step(id, "eligibility", "pending");
  checkEligibility(id);
});

/** Manual or automatic re-check of whatever external answer is outstanding. */
export function recheckRelocation(id: string) {
  if (stepStatus(id, "eligibility") === "waiting") {
    step(id, "eligibility", "pending");
    checkEligibility(id);
  } else if (stepStatus(id, "external") === "waiting") checkExternal(id);
}

function applyEligibility(id: string, result: EligibilityResult, reason: string) {
  setData(id, { eligibility: result });
  const keys = relocationPlan(result);
  plan(
    id,
    keys.map((k) => ({ key: k, label: k === "external" && result === "eligible_external" ? "Dış operatör port tahsisi" : k === "external" ? "Altyapı genişletme sonucu" : RELOCATION_LABELS[k]! })),
    result === "no_port" ? "Port yok: önce altyapı takibi ve müşterinin internetsiz kalmaması planlanır" : result === "eligible_external" ? "Altyapı dış sağlayıcıda: port tahsisi talebi gerekiyor" : "Adres uygun: nakil doğrudan başlatılır",
  );
  if (result === "no_port") {
    step(id, "eligibility", "done", "Uygun değil: dağıtım kutusunda boş port yok");
    setStatus(id, "blocked", { blocker: reason, eta: "Altyapı planlama yanıtı 3–5 iş günü (demo tahmini)" });
    notify(id, "Yeni adresinde şu an boş port yok", "Bu bir hata değil, binadaki fiber kutusu dolu. Altyapı ekibi için takip talebi açıyorum ve internetsiz kalmaman için seçenek sunacağım.");
    chain("relocation.infraFollowup", id, 1400);
  } else {
    step(id, "eligibility", "done", result === "eligible" ? "Uygun: fiber ve boş port var" : "Uygun: port tahsisi dış sağlayıcıdan istenecek");
    setStatus(id, "in_progress", { blocker: null, eta: null });
    notify(id, "Yeni adresin uygun", result === "eligible" ? "Nakil sürecini başlatıyorum." : "Altyapı sağlayıcısından port tahsisi isteyeceğim; süreci ben takip edeceğim.");
    chain("relocation.transfer", id, 1400);
  }
}

export function openInfraFollowup(id: string) {
  if (stepStatus(id, "infra_followup") !== "pending") return;
  const wo = workOrder(id, { kind: "infra_followup", title: "Port / altyapı genişletme talebi", team: TEAMS.infra }, "Port yokluğu müşteri hatası değil; altyapı ekibinin planlaması gerekir");
  step(id, "infra_followup", "done", `${wo.id} · ${TEAMS.infra}`);
  chain("relocation.offerTemp", id, 1400);
}
registerOp("relocation.infraFollowup", openInfraFollowup);

export function offerTemp(id: string) {
  if (stepStatus(id, "temp_offer") !== "pending") return;
  const wf = getWf(id);
  step(id, "temp_offer", "waiting");
  ask(
    id,
    {
      key: "relocation_temp",
      prompt: "Sabit internet hazır olana kadar geçici mobil internet ister misin?",
      detail: `${TEMP_MOBILE_OFFER.coverage}. Otomatik satın alınmaz; onay verirsen sipariş oluşturulur.`,
      options: [
        { id: "accept", label: "Geçici interneti istiyorum", desc: `${TEMP_MOBILE_OFFER.device} · ${TEMP_MOBILE_OFFER.price} · ${TEMP_MOBILE_OFFER.quota}`, primary: true, terms: TEMP_MOBILE_OFFER.terms },
        { id: "decline", label: "İstemiyorum", desc: "Kurulum gününe kadar beklerim" },
      ],
    },
    wf?.data["eligibility"] === "no_port" ? "Port açılana kadar müşteri yeni adreste internetsiz kalabilir" : "Dış sağlayıcı gecikmesi taşınma tarihini aşabilir",
  );
}
registerOp("relocation.offerTemp", offerTemp);

registerDecision("relocation_temp", (id, opt) => {
  step(id, "temp_offer", "done", opt === "accept" ? "Kabul edildi" : "Müşteri geçici interneti istemedi");
  if (opt === "accept") acceptTempInternet(id, "temp_mobile");
  const elig = getWf(id)?.data["eligibility"];
  if (elig === "no_port") {
    setStatus(id, "blocked");
    chain("relocation.requestExternal", id, 1500);
  } else if (stepStatus(id, "external") === "waiting") {
    setStatus(id, "waiting_for_external_system");
    chain("relocation.checkExternal", id, 6000);
  }
});

export function startTransfer(id: string) {
  if (stepStatus(id, "transfer") !== "pending") return;
  const wo = workOrder(id, { kind: "relocation", title: "Nakil iş emri (adres değişikliği)", team: TEAMS.relocation }, "Nakil, adres uygunluğu netleşince başlatılır");
  step(id, "transfer", "done", wo.id);
  const elig = getWf(id)?.data["eligibility"];
  if (elig === "eligible_external" && stepStatus(id, "external") === "pending") chain("relocation.requestExternal", id, 1400);
  else chain("relocation.offerAppointment", id, 1400);
}
registerOp("relocation.transfer", startTransfer);

export function requestExternal(id: string) {
  if (stepStatus(id, "external") !== "pending") return;
  const elig = getWf(id)?.data["eligibility"];
  const kind = elig === "eligible_external" ? "external_operator" : "infra_followup";
  if (kind === "external_operator") workOrder(id, { kind: "external_operator", title: "Dış operatörden port tahsisi", team: "Altyapı sağlayıcı (dış sistem)" }, "Bu adresin altyapısı başka bir sağlayıcıya ait");
  setWorkOrder(id, kind, "waiting_external");
  step(id, "external", "waiting", "Talep iletildi, yanıt bekleniyor");
  setStatus(id, "waiting_for_external_system", { eta: "Dış sistem yanıtı 1–3 iş günü (demo tahmini)" });
  chain("relocation.checkExternal", id, 8000);
}
registerOp("relocation.requestExternal", requestExternal);

export function checkExternal(id: string) {
  const wf = getWf(id);
  if (!wf || stepStatus(id, "external") !== "waiting") return;
  const res = MockProviderAPI.status();
  const kind = wf.data["eligibility"] === "eligible_external" ? "external_operator" : "infra_followup";
  log(id, "external", "external", `${MockProviderAPI.name} yanıtı: ${res === "ready" ? "hazır" : "yanıt yok"}`, "Bekleyen dış talep düzenli olarak yeniden kontrol edilir");
  if (res === "no_response") {
    const retries = wf.retries + 1;
    W.setState((st) => ({ workflows: st.workflows.map((w) => (w.id === id ? { ...w, retries } : w)) }));
    step(id, "external", "waiting", `Yanıt yok · ${retries}. kontrol`);
    if (shouldEscalateAfterRetry(retries)) {
      escalate(id, kind === "external_operator" ? TEAMS.relocation : TEAMS.infra, `Dış sistem ${retries} kontrolde yanıt vermedi; gecikme insan takibine alındı`);
      return;
    }
    notify(id, "Altyapı yanıtı gecikiyor", "Henüz yanıt gelmedi, başarı varsaymıyorum. Takibi sürdürüyorum; bir gelişme olunca haber vereceğim.");
    if (wf.data["eligibility"] === "eligible_external" && stepStatus(id, "temp_offer") === "pending") chain("relocation.offerTemp", id, 1400);
    else chain("relocation.checkExternal", id, 8000);
    return;
  }
  setWorkOrder(id, kind, "done");
  step(id, "external", "done", kind === "external_operator" ? "Port tahsis edildi" : "Altyapı genişletildi, port açıldı (demo)");
  setStatus(id, "in_progress", { blocker: null, eta: null });
  notify(id, "Yeni adresinde altyapı hazır", "Kurulum için randevu seçmeni isteyeceğim.");
  chain(stepStatus(id, "transfer") === "pending" ? "relocation.transfer" : "relocation.offerAppointment", id, 1400);
}
registerOp("relocation.checkExternal", checkExternal);

export function offerAppointment(id: string) {
  if (stepStatus(id, "appointment") !== "pending") return;
  if (stepStatus(id, "transfer") !== "done" || (stepStatus(id, "external") && stepStatus(id, "external") !== "done")) return;
  step(id, "appointment", "waiting");
  ask(
    id,
    {
      key: "relocation_slot",
      prompt: "Kurulum için sana uygun zamanı seç",
      detail: "Teknisyen yeni adreste fiber sonlandırma ve modem kurulumu yapacak (demo slotlar).",
      options: APPOINTMENT_SLOTS.map((s, i) => ({ id: s.id, label: s.label, primary: i === 0 })),
    },
    "Kurulum fiziksel ziyaret gerektirir; zamanı müşteri seçer",
  );
}
registerOp("relocation.offerAppointment", offerAppointment);

registerDecision("relocation_slot", (id, opt) => {
  const slot = APPOINTMENT_SLOTS.find((s) => s.id === opt)!;
  const wo = workOrder(id, { kind: "installation", title: "Yeni adres kurulum iş emri", team: TEAMS.field }, "Randevu seçildi; kurulum iş emri randevuya bağlanır");
  book(id, slot, wo.id);
  step(id, "appointment", "done", slot.label);
  notify(id, "Randevun kaydedildi", `${slot.label} · Teknisyen gelmeden önce SMS alacaksın (demo).`);
  chain("relocation.install", id, 4000);
});

export function runInstall(id: string) {
  if (stepStatus(id, "install") !== "pending" || stepStatus(id, "appointment") !== "done") return;
  setWorkOrder(id, "installation", "in_progress");
  step(id, "install", "in_progress", "Teknisyen yeni adreste kurulum yapıyor");
  schedule("relocation.installed", id, 1800);
}
registerOp("relocation.install", runInstall);
registerOp("relocation.installed", (id) => {
  setWorkOrder(id, "installation", "done");
  step(id, "install", "done", "Fiber sonlandırıldı, modem aktive edildi");
  chain("relocation.verify", id, 1200);
});

export function verifyRelocation(id: string) {
  if (stepStatus(id, "verify") !== "pending" || stepStatus(id, "install") !== "done") return;
  setConnectivity({ fixed: "up", metric: { optic: -18.7, drops: 0 } }, "Yeni adreste sabit bağlantı aktif");
  step(id, "verify", "done", "Yeni adreste oturum açıldı, ölçüm 97 Mbps (demo)", "Aktivasyon doğrulanmadan süreç tamamlandı sayılmaz");
  switchBackFromTemp(id);
  chain("relocation.oldLine", id, 1200);
}
registerOp("relocation.verify", verifyRelocation);

export function closeOldLine(id: string) {
  const wf = getWf(id);
  if (!wf || stepStatus(id, "old_line") !== "pending" || stepStatus(id, "verify") !== "done") return;
  const wo = workOrder(id, { kind: "deprovision", title: "Eski adres hat kapatma", team: TEAMS.relocation }, "Eski hat yalnızca yeni bağlantı doğrulandıktan sonra kapatılır");
  setWorkOrder(id, "deprovision", "done");
  step(id, "old_line", "done", `${CURRENT_ADDRESS.port} kapatıldı (${wo.id}) · ek ücret yok, taahhüt aynen devam`);
  const temp = tempOfWorkflow(id);
  const slot = wf.decisions.find((d) => d.key === "relocation_slot");
  const woCount = getWf(id)?.workOrderIds.length ?? 0;
  notify(id, "Taşınman tamamlandı 🎉", "Yeni adresinde internetin aktif. Eski hattın kapatıldı, ek ücret yansımadı.");
  complete(id, {
    resolved: true,
    summary: "Nakil tamamlandı, yeni adreste internet aktif",
    results: [
      `Altyapı sonucu: ${wf.data["eligibility"] === "no_port" ? "port yoktu → altyapı genişletildi" : wf.data["eligibility"] === "eligible_external" ? "dış sağlayıcıdan port tahsis edildi" : "uygun"}`,
      `Geçici internet: ${temp ? "kullanıldı ve kapatıldı" : "kullanılmadı"}`,
      `Kurulum randevusu: ${slot?.label ?? "—"}`,
      `İş emri: ${woCount} adet, hepsi kapandı`,
      "Eski hat doğrulamadan sonra kapatıldı",
    ],
  });
}
registerOp("relocation.oldLine", closeOldLine);
