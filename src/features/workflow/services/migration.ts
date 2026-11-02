/**
 * MigrationService: "Otonom Taşınma ve Nakil Yöneticisi".
 * Branches on the infrastructure answer: eligible / eligible via external
 * provider / no port / no response. Never invents a successful answer.
 */
import { APPOINTMENT_SLOTS, CURRENT_ADDRESS, FIELD_TEAMS, SUBSCRIPTION, TEAMS, TEMP_MOBILE_OFFER, type DemoAddress } from "@/data/mock";
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
  appointment: "Randevu talebi",
  team: "Ekip eşleştirme ve randevu onayı",
  install: "Kurulum ve aktivasyon",
  verify: "Yeni bağlantı doğrulaması",
  old_line: "Eski adres hizmet sonlandırma",
};

export interface RelocationInput {
  address: DemoAddress;
  moveDate: string;
  wantsTemp: boolean;
  initiatedBy?: string;
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
    data: { address: `${input.address.line}, ${input.address.district}/${input.address.city}`, district: input.address.district, moveDate: input.moveDate, wantsTemp: input.wantsTemp, oldPort: CURRENT_ADDRESS.port, ...(input.initiatedBy ? { initiatedBy: input.initiatedBy } : {}) },
    why: "Müşteri “Taşınacağım” talebini yeni adres ve tarih ile gönderdi",
  });
  if (!created) return wf.id;
  step(wf.id, "context", "done", `${SUBSCRIPTION.packageName} · borç yok · taahhüt ${SUBSCRIPTION.commitmentEnd} · mevcut port ${CURRENT_ADDRESS.port}`, "Nakil öncesi abonelik, borç ve mevcut port bilgisi doğrulanır; müşteriden tekrar istenmez");
  notify(wf.id, "Yeni adresiniz için altyapı kontrolü başladı", "Taşınma sürecinizi sizin için takip ediyoruz. Önemli bir gelişme olduğunda size haber vereceğiz.");
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
    if (retries === 1) notify(id, "Altyapı kontrolü gecikiyor", "Altyapı sisteminden henüz yanıt alamadık. Sonucu tahmin etmiyoruz; tekrar kontrol edip size haber vereceğiz.");
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
    notify(id, "Yeni adresinizde şu an boş internet portu bulunmuyor", "Binadaki fiber kutusu dolu; sizin için altyapı durumunu takip edeceğiz.", "quiet");
    chain("relocation.infraFollowup", id, 1400);
  } else {
    step(id, "eligibility", "done", result === "eligible" ? "Uygun: fiber ve boş port var" : "Uygun: port tahsisi dış sağlayıcıdan istenecek");
    setStatus(id, "in_progress", { blocker: null, eta: null });
    notify(id, "Yeni adresiniz uygun", result === "eligible" ? "Nakil sürecinizi başlattık." : "Altyapı sağlayıcısından port istedik; süreci sizin için takip ediyoruz.");
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
  const ownDevice = W.getState().config.hybridDevice;
  setData(id, { ownDevice });
  step(id, "temp_offer", "waiting");
  ask(
    id,
    {
      key: "relocation_temp",
      prompt: wf?.data["eligibility"] === "no_port" ? "Yeni adresinizde boş port yok. Hazır olana kadar geçici internet ister misiniz?" : "Sabit internetiniz hazır olana kadar geçici internet ister misiniz?",
      detail: ownDevice
        ? `Evinizde uyumlu bir Hibrit Box var; yeni adreste geçici internet için onu kullanabilirsiniz, cihaz gönderimi gerekmez. ${TEMP_MOBILE_OFFER.coverage}.`
        : `Evinizde uyumlu bir cihaz görünmüyor; size SIM kartlı bir cihaz gönderebiliriz. ${TEMP_MOBILE_OFFER.coverage}. Onay verirseniz sipariş oluşturulur.`,
      options: [
        { id: "accept", label: "Geçici İnterneti Başlat", desc: ownDevice ? `Mevcut Hibrit Box'ınız · ${TEMP_MOBILE_OFFER.price} · ${TEMP_MOBILE_OFFER.quota}` : `${TEMP_MOBILE_OFFER.device} · ${TEMP_MOBILE_OFFER.price} · ${TEMP_MOBILE_OFFER.quota}`, primary: true, terms: TEMP_MOBILE_OFFER.terms },
        { id: "decline", label: "Daha Sonra", desc: "Kurulum gününe kadar beklerim" },
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
  notify(id, "Başvurunuzu ilgili ekibe ilettik", "Şimdi yanıt bekliyoruz. Gelişme olduğunda size haber vereceğiz.", "quiet");
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
    notify(id, "Altyapı yanıtı gecikiyor", "Başvurunuzu ilgili ekibe ilettik. Şimdi yanıt bekliyoruz. Gelişme olduğunda size haber vereceğiz.");
    if (wf.data["eligibility"] === "eligible_external" && stepStatus(id, "temp_offer") === "pending") chain("relocation.offerTemp", id, 1400);
    else chain("relocation.checkExternal", id, 8000);
    return;
  }
  setWorkOrder(id, kind, "done");
  step(id, "external", "done", kind === "external_operator" ? "Port tahsis edildi" : "Altyapı genişletildi, port açıldı (demo)");
  setStatus(id, "in_progress", { blocker: null, eta: null });
  notify(id, "Yeni adresinizde altyapı hazır", "Sıradaki adım kurulum randevusu.", "quiet");
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
      prompt: "Kurulum için size uygun zamanı seçin",
      detail: "Tarih ve saat aralığını seçin; adresinize uygun ekibi biz bulalım. Birden fazla ekibi aramanıza gerek yok.",
      options: APPOINTMENT_SLOTS.map((s, i) => ({ id: s.id, label: s.label, primary: i === 0 })),
    },
    "Kurulum fiziksel ziyaret gerektirir; zamanı müşteri seçer, ekip eşleştirmesini sistem yapar",
  );
}
registerOp("relocation.offerAppointment", offerAppointment);

const slotOf = (slotId: unknown) => APPOINTMENT_SLOTS.find((s) => s.id === slotId) ?? APPOINTMENT_SLOTS[0]!;

registerDecision("relocation_slot", (id, opt) => {
  const slot = slotOf(opt);
  step(id, "appointment", "done", `İstenen zaman: ${slot.label}`);
  setData(id, { slotReq: slot.id, teamIdx: 0, teamAttempt: 1, match: "searching" });
  step(id, "team", "in_progress", "Adresinizdeki uygun ekipler kontrol ediliyor");
  schedule("relocation.teamFind", id, 1400);
});

/** Simulated field-team matching: finds a team, sends the request, waits for its answer. */
registerOp("relocation.teamFind", (id) => {
  const wf = getWf(id);
  if (!wf || stepStatus(id, "team") !== "in_progress") return;
  const team = FIELD_TEAMS[Number(wf.data["teamIdx"] ?? 0)] ?? FIELD_TEAMS[0];
  setData(id, { match: "requested", team });
  step(id, "team", "in_progress", `${team} ekibine randevu talebi gönderildi`);
  log(id, "system", "external", `Saha ekip planlama (mock): ${team} için ${slotOf(wf.data["slotReq"]).label} talebi`, "Müşterinin tek tek ekip araması gerekmez");
  schedule("relocation.teamAnswer", id, 1600);
});

registerOp("relocation.teamAnswer", (id) => {
  const wf = getWf(id);
  if (!wf || stepStatus(id, "team") !== "in_progress") return;
  const attempt = Number(wf.data["teamAttempt"] ?? 1);
  const slot = slotOf(wf.data["slotReq"]);
  const team = String(wf.data["team"] ?? FIELD_TEAMS[0]);
  if (W.getState().config.teamMatch === "decline_first" && attempt === 1) {
    setData(id, { match: "declined" });
    step(id, "team", "waiting", `${team} bu saati kabul edemedi; başka ekip arandı`);
    log(id, "external", "external", `${team}: ${slot.label} uygun değil (demo yanıt)`, "Ekip uygunluğu değişti; sistem bir sonraki uygun ekip ve saati arar");
    const i = APPOINTMENT_SLOTS.findIndex((s) => s.id === slot.id);
    const alts = [APPOINTMENT_SLOTS[(i + 1) % APPOINTMENT_SLOTS.length]!, APPOINTMENT_SLOTS[(i + 3) % APPOINTMENT_SLOTS.length]!];
    ask(
      id,
      {
        key: "relocation_alt",
        prompt: "Bu saat için ekip uygunluğu değişti",
        detail: "Sizin için başka bir ekip aradık. Aşağıdaki zamanlardan birini seçmeniz yeterli; ekip bu saatler için uygun görünüyor (demo).",
        options: alts.map((s, k) => ({ id: `${s.id}|${k + 1}`, label: s.label, desc: `${FIELD_TEAMS[k + 1]} · uygun`, primary: k === 0 })),
      },
      "İlk ekip talebi kabul etmedi; müşteriye yeni zaman ve ekip sunulur",
    );
    return;
  }
  setData(id, { match: "accepted" });
  const wo = workOrder(id, { kind: "installation", title: "Yeni adres kurulum iş emri", team: `${TEAMS.field} · ${team}` }, "Ekip randevuyu kabul etti; kurulum iş emri randevuya bağlanır");
  book(id, { id: slot.id, label: `${slot.label} · ${team}` }, wo.id);
  step(id, "team", "done", `${team} randevuyu kabul etti · ${slot.label}`);
  notify(id, "Randevunuz onaylandı!", `${slot.label} · ${team}. Ekip yola çıkmadan önce size haber vereceğiz (demo).`);
  chain("relocation.install", id, 4000);
});

registerDecision("relocation_alt", (id, opt) => {
  const [slotId, teamIdx] = opt.split("|");
  setData(id, { slotReq: slotId ?? null, teamIdx: Number(teamIdx ?? 1), teamAttempt: 2, match: "requested", team: FIELD_TEAMS[Number(teamIdx ?? 1)] ?? FIELD_TEAMS[1] });
  step(id, "team", "in_progress", `${slotOf(slotId).label} için ${FIELD_TEAMS[Number(teamIdx ?? 1)]} ekibine talep gönderildi`);
  schedule("relocation.teamAnswer", id, 1400);
});

export function runInstall(id: string) {
  if (stepStatus(id, "install") !== "pending" || stepStatus(id, "appointment") !== "done" || (stepStatus(id, "team") ?? "done") !== "done") return;
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
  const slot = W.getState().appointments.find((a) => a.workflowId === id);
  const woCount = getWf(id)?.workOrderIds.length ?? 0;
  notify(id, "İnternetiniz kullanıma hazır", "Yeni adresinizde internetiniz aktif. İyi günlerde kullanın!");
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
