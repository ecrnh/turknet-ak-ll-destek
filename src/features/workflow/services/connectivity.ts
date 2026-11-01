/**
 * ConnectivityService + TemporaryInternetService: fixed line status, TürkNet Box
 * (SIM-based temporary internet, separate device), hybrid backup (same modem
 * fails over automatically) and the "sabit internet kesintisi" recovery workflow.
 * Box and hybrid are distinct products with distinct technical/commercial terms.
 * No real SIM, operator API or device exists: everything goes through mocks.
 */
import { HYBRID_OFFER, SUBSCRIPTION, TEAMS, TEMP_MOBILE_OFFER } from "@/data/mock";
import { useAppStore } from "@/features/core/appStore";
import { ask, chain, complete, createWorkflow, getWf, log, notify, registerDecision, registerOp, schedule, setData, setStatus, setWorkOrder, step, stepStatus, workOrder } from "../engine";
import { MockLogisticsAPI, MockNetworkAPI } from "../mockServices";
import { canToggleBox } from "../rules";
import { useWorkflowStore as W } from "../store";
import type { BoxDevice, ConnectivityStatus, TempKind, TempStatus } from "../types";

/* ---------------- Connectivity status ---------------- */
export function setConnectivity(p: Partial<ConnectivityStatus>, historyLabel?: string) {
  W.setState((s) => ({
    connectivity: {
      ...s.connectivity,
      ...p,
      lastCheckAt: Date.now(),
      history: historyLabel ? [...s.connectivity.history, { at: Date.now(), label: historyLabel }].slice(-30) : s.connectivity.history,
    },
  }));
  syncNet();
}

/** Mirrors connectivity onto the app-wide internet status pill. */
function syncNet() {
  const c = W.getState().connectivity;
  const app = useAppStore.getState();
  if (c.fixed === "up") app.setNet({ status: "online", speed: c.metric.speed ?? 96, ping: 8 });
  else if (c.fixed === "degraded") app.setNet({ status: "slow", speed: c.metric.speed ?? 24, ping: 41 });
  else if (c.mobile === "active") app.setNet({ status: "mobile", speed: 38, ping: 34 });
  else app.setNet({ status: "down", speed: 0 });
}

/* ---------------- TürkNet Box ---------------- */
function patchBox(p: Partial<BoxDevice>) {
  W.setState((s) => (s.box ? { box: { ...s.box, ...p, updatedAt: Date.now() } } : {}));
}

/** Customer switches the Box on/off from the app. Only possible once the SIM is active. */
export function toggleBox(on?: boolean): boolean {
  const box = W.getState().box;
  if (!box || !canToggleBox(box)) return false;
  const next = on ?? box.power === "off";
  if ((next ? "on" : "off") === box.power) return false;
  patchBox({ power: next ? "on" : "off", toggles: box.toggles + 1, usedGb: next ? Math.round((box.usedGb + 0.3) * 10) / 10 : box.usedGb });
  const c = W.getState().connectivity;
  if (next) setConnectivity({ mobile: "active", mode: c.fixed === "up" ? c.mode : "temp_mobile" }, "Box açıldı · mobil internet aktif");
  else setConnectivity({ mobile: "off", mode: c.fixed === "up" ? "fixed" : c.mode }, "Box kapatıldı");
  log(box.tempWfId, "customer", "info", `Box uygulamadan ${next ? "açıldı" : "kapatıldı"} (demo cihaz komutu)`, "Müşteri cihazını uygulamadan yönetebilir; gerçek cihaz bağlantısı yoktur");
  return true;
}

/* ---------------- Temporary internet / hybrid ---------------- */
export const offerFor = (kind: TempKind) => (kind === "hybrid" ? HYBRID_OFFER : TEMP_MOBILE_OFFER);

export const tempOfWorkflow = (parentId: string | null | undefined) =>
  parentId ? W.getState().workflows.find((w) => w.type === "temp_internet" && w.relatedIds.includes(parentId)) : undefined;

function setTemp(tempWfId: string, status: TempStatus) {
  W.setState((s) => ({ temp: s.temp.map((t) => (t.workflowId === tempWfId ? { ...t, status, updatedAt: Date.now() } : t)) }));
}

/** Customer accepted the offer: create the linked temp-internet workflow and order (idempotent). */
export function acceptTempInternet(parentId: string, kind: TempKind): string {
  const offer = offerFor(kind);
  const { wf, created } = createWorkflow({
    type: "temp_internet",
    title: kind === "hybrid" ? "Hibrit yedek bağlantı" : "TürkNet Box · geçici internet",
    dedupeKey: `temp:${parentId}`,
    relatedIds: [parentId],
    steps: [
      { key: "terms", label: "Koşullar gösterildi ve onaylandı" },
      { key: "provision", label: kind === "hybrid" ? "Yedek bağlantı hazırlanıyor" : "Box siparişi ve teslimat" },
      { key: "active", label: kind === "hybrid" ? "Yedek bağlantı aktif" : "Box ile internet aktif" },
      { key: "switch_back", label: "Sabit internete geri geçiş" },
    ],
    data: { kind, parentId },
    why: "Müşteri koşulları görüp açıkça onay verdi; onay olmadan sipariş oluşturulmaz",
  });
  if (!created) return wf.id;
  const t = Date.now();
  W.setState((s) => ({
    temp: [...s.temp, { id: `GCT-${wf.id.slice(4)}`, workflowId: wf.id, parentWorkflowId: parentId, kind, status: "accepted", price: offer.price, device: offer.device, createdAt: t, updatedAt: t }],
  }));
  step(wf.id, "terms", "done", `${offer.price} · ${offer.quota}`);
  notify(wf.id, kind === "hybrid" ? "Yedek bağlantı talebiniz alındı" : "Box talebiniz alındı", kind === "hybrid" ? "Modeminiz için yedek bağlantıyı hazırlıyoruz." : "Box'ınızı hazırlıyoruz. Teslimatı sizin için takip edeceğiz.");
  chain("temp.provision", wf.id, 1200);
  return wf.id;
}

export function provisionTemp(tempWfId: string) {
  const wf = getWf(tempWfId);
  if (!wf || stepStatus(tempWfId, "provision") !== "pending") return;
  const kind = wf.data["kind"] as TempKind;
  if (kind === "temp_mobile") {
    workOrder(tempWfId, { kind: "device_delivery", title: "TürkNet Box gönderimi", team: TEAMS.logistics }, "Geçici internet için cihaz teslimatı gerekiyor");
    W.setState({
      box: { id: `BOX-${tempWfId.slice(4)}`, tempWfId, model: "TürkNet Box 4.5G (SIM kartlı)", sim: "shipping", power: "off", usedGb: 0, quotaGb: 100, toggles: 0, signal: "İyi · 4 çubuk (demo)", updatedAt: Date.now() },
    });
  }
  setTemp(tempWfId, "ordered");
  step(tempWfId, "provision", "in_progress", kind === "hybrid" ? "eSIM profili modeme gönderiliyor (demo)" : "Kurye ataması yapıldı (demo)");
  schedule("temp.provisioned", tempWfId, 1600);
}
registerOp("temp.provision", provisionTemp);
registerOp("temp.provisioned", (id) => {
  const wf = getWf(id);
  if (!wf) return;
  const kind = wf.data["kind"] as TempKind;
  if (kind === "temp_mobile") {
    setWorkOrder(id, "device_delivery", "done");
    setTemp(id, "shipped");
    patchBox({ sim: "ready" });
    step(id, "provision", "done", `Box teslim edildi · takip no ${MockLogisticsAPI.trackingNo()} (demo)`);
  } else step(id, "provision", "done", "eSIM tanımlandı, modem yedek moda hazır (demo)");
  chain("temp.activate", id, 1200);
});

export function activateTemp(tempWfId: string) {
  const wf = getWf(tempWfId);
  if (!wf || stepStatus(tempWfId, "provision") !== "done" || stepStatus(tempWfId, "active") !== "pending") return;
  const kind = wf.data["kind"] as TempKind;
  setTemp(tempWfId, "active");
  step(tempWfId, "active", "done", kind === "hybrid" ? "Sabit hat kesik → yedek bağlantı devrede" : "Box SIM'i aktif, mobil internet bağlı");
  if (kind === "hybrid") setConnectivity({ mobile: "active", mode: "hybrid_backup", hybridEnabled: true }, "Yedek internet bağlantısına geçildi");
  else {
    patchBox({ sim: "active", power: "on", usedGb: 0.2 });
    setConnectivity({ mobile: "active", mode: "temp_mobile" }, "Box ile mobil internet aktif");
  }
  notify(tempWfId, kind === "hybrid" ? "Yedek internet bağlantısına geçildi" : "Box'ınız aktif", kind === "hybrid" ? "Sabit hattınız dönene kadar modeminiz mobil ağ üzerinden çalışıyor." : "Sabit internetiniz hazır olana kadar Box ile internete bağlısınız. Box'ı uygulamadan açıp kapatabilirsiniz.");
}
registerOp("temp.activate", activateTemp);

/** Fixed line ready: return to fixed and close the temp workflow. */
export function switchBackFromTemp(parentId: string) {
  const t = tempOfWorkflow(parentId);
  if (!t || t.status === "completed") return;
  if (stepStatus(t.id, "active") !== "done") {
    // Never activated: close the remaining steps honestly.
    ["provision", "active"].forEach((k) => stepStatus(t.id, k) === "pending" && step(t.id, k, "skipped", "Sabit internet önce hazır oldu"));
  }
  const kind = t.data["kind"] as TempKind;
  setTemp(t.id, "ended");
  step(t.id, "switch_back", "done", kind === "hybrid" ? "Sabit hat geri geldi, yedek bağlantı beklemede" : "Box kapatıldı, iade için kurye planlandı (demo)");
  if (kind === "hybrid") setConnectivity({ mobile: "standby", mode: "fixed" }, "Sabit bağlantıya geri dönüldü · yedek beklemede");
  else {
    patchBox({ power: "off", sim: "returning" });
    setConnectivity({ mobile: "off", mode: "fixed" }, "Sabit internete geri geçildi");
  }
  notify(t.id, "Sabit internetinize geri geçtiniz", kind === "hybrid" ? "Yedek bağlantı beklemeye alındı; bir sonraki kesintide yine otomatik devreye girer." : "Box hizmeti sona erdi. Cihaz iadesi için kurye sizi arayacak (demo).", "quiet");
  complete(t.id, { resolved: true, summary: "Geçici bağlantı süreci kapandı", results: [kind === "hybrid" ? "Yedek bağlantı kullanıldı" : "TürkNet Box kullanıldı", "Sabit internete geri dönüldü"] });
}

/* ---------------- Sabit internet kesintisi ---------------- */
const OUTAGE_STEPS = [
  { key: "signal", label: "Bağlantı kesintisi algılandı" },
  { key: "diagnose", label: "Kesinti nedeni inceleniyor" },
  { key: "coverage", label: "Alternatif internet uygunluğu" },
  { key: "offer", label: "Geçici internet kararı" },
  { key: "repair", label: "Onarım" },
  { key: "restore", label: "Sabit bağlantı geri geldi" },
  { key: "verify", label: "Çözüm doğrulaması" },
];

export function startFixedOutage(): string {
  setConnectivity({ fixed: "down", metric: { optic: -40, drops: 1, speed: 0 } }, "Sabit bağlantı kesildi");
  const { wf, created } = createWorkflow({
    type: "outage_recovery",
    title: "Sabit internet kesintisi",
    dedupeKey: `outage:${SUBSCRIPTION.id}`,
    steps: OUTAGE_STEPS,
    why: "Ağ izleme servisi sabit hatta oturum kaybı bildirdi",
  });
  if (!created) return wf.id;
  step(wf.id, "signal", "done", "Modem oturumu 2 dk'dır yok (demo izleme verisi)");
  notify(wf.id, "Sabit internetinizde kesinti tespit ettik", "Nedenini inceliyoruz. Şu an sizden bir işlem yapmanız gerekmiyor.");
  chain("outage.diagnose", wf.id, 1200);
  return wf.id;
}

export function diagnoseOutage(id: string) {
  if (stepStatus(id, "diagnose") !== "pending") return;
  step(id, "diagnose", "in_progress", `Sorgu: ${MockNetworkAPI.name}`);
  schedule("outage.diagnosed", id, 1500);
}
registerOp("outage.diagnose", diagnoseOutage);
registerOp("outage.diagnosed", (id) => {
  const d = MockNetworkAPI.diagnoseOutage();
  setData(id, { outageType: d.type });
  step(id, "diagnose", "done", d.detail, d.type === "regional" ? "Bölgesel arızada müşteriye özel arıza varmış gibi yönlendirme yapılmaz" : "Sorun tek hatla sınırlı görünüyor");
  setStatus(id, "in_progress", { blocker: d.type === "regional" ? "Bölgenizde olası bir altyapı arızası" : "Hattınızda sinyal kaybı görünüyor", eta: d.type === "regional" ? "Tahmini düzelme 4 saat (demo, kesin değil)" : "Teknik ekip bugün 16:00–18:00 (demo)" });
  notify(id, d.type === "regional" ? "Bölgenizde olası bir arıza değerlendiriliyor" : "Hattınızda sinyal kaybı görünüyor", d.type === "regional" ? "Sorun sizden kaynaklı görünmüyor; modeminize dokunmanıza gerek yok. Ekiplerimiz çalışıyor." : "Sorun büyük olasılıkla bina içi fiber hattında. Teknik ekip sürecini başlatacağız.", "quiet");
  chain("outage.coverage", id, 1200);
});

export function checkCoverage(id: string) {
  if (stepStatus(id, "coverage") !== "pending") return;
  step(id, "coverage", "done", `Kapsama: ${TEMP_MOBILE_OFFER.coverage} · modem hibrit uyumlu: ${SUBSCRIPTION.hybridReady ? "evet" : "hayır"}`, "Alternatif bağlantı ancak kapsama ve cihaz uygunsa önerilir");
  chain("outage.offer", id, 1000);
}
registerOp("outage.coverage", checkCoverage);

export function offerAlternative(id: string) {
  if (stepStatus(id, "offer") !== "pending") return;
  step(id, "offer", "waiting");
  ask(
    id,
    {
      key: "outage_alt",
      prompt: "Onarım sürerken internetsiz kalmamak için geçici internet ister misiniz?",
      detail: "İki farklı hizmet; koşulları farklıdır. Fiyat ve kapsama demo verisidir. Onay vermeden hiçbir şey aktifleşmez.",
      options: [
        { id: "temp_mobile", label: "Box ile Geçici İnternet", desc: `${TEMP_MOBILE_OFFER.device} · ${TEMP_MOBILE_OFFER.price} · ${TEMP_MOBILE_OFFER.delivery}`, primary: true, terms: TEMP_MOBILE_OFFER.terms },
        { id: "hybrid", label: "Hibrit Yedeği Aç", desc: `${HYBRID_OFFER.device} · ${HYBRID_OFFER.price}`, terms: HYBRID_OFFER.terms },
        { id: "decline", label: "Daha Sonra", desc: "Onarımı beklerim" },
      ],
    },
    "Kesinti süresi tahmini olarak 1 saatten uzun; internetsiz kalma süresini azaltmak için alternatif sunulur",
  );
}
registerOp("outage.offer", offerAlternative);

registerDecision("outage_alt", (id, opt) => {
  step(id, "offer", "done", opt === "decline" ? "Müşteri geçici internet istemedi" : opt === "hybrid" ? "Hibrit yedek kabul edildi" : "Box kabul edildi");
  if (opt !== "decline") acceptTempInternet(id, opt as TempKind);
  chain("outage.repair", id, 1500);
});

export function startRepair(id: string) {
  const wf = getWf(id);
  if (!wf || stepStatus(id, "repair") !== "pending") return;
  if (wf.data["outageType"] === "regional") {
    step(id, "repair", "in_progress", "Bölgesel onarım ekibi çalışıyor; size özel saha ziyareti gerekmiyor", "Bölgesel arızada bireysel iş emri açılmaz");
  } else {
    workOrder(id, { kind: "field_repair", title: "Bina içi fiber hat onarımı", team: TEAMS.field }, "Uzaktan çözülemeyen optik sinyal kaybı fiziksel müdahale gerektirir");
    setWorkOrder(id, "field_repair", "in_progress");
    step(id, "repair", "in_progress", "Teknik ekip yönlendirildi · tahmini varış 16:00–18:00 (demo)");
    notify(id, "Teknik ekip için işlem kaydı oluşturduk", "Teknisyenimiz bugün 16:00–18:00 arası gelecek (demo).", "quiet");
  }
  chain("outage.restore", id, 4000);
}
registerOp("outage.repair", startRepair);

export function restoreFixed(id: string) {
  const wf = getWf(id);
  if (!wf || stepStatus(id, "restore") !== "pending") return;
  if (stepStatus(id, "repair") === "pending") startRepair(id);
  setWorkOrder(id, "field_repair", "done");
  step(id, "repair", "done", wf.data["outageType"] === "regional" ? "Bölgesel arıza giderildi" : "Teknisyen fiber konnektörünü yeniledi (demo)");
  setConnectivity({ fixed: "up", metric: { optic: -19.4, drops: 0, speed: 96 } }, "Sabit bağlantı geri döndü");
  step(id, "restore", "done", "Sabit hat oturumu açıldı");
  switchBackFromTemp(id);
  chain("outage.verify", id, 1500);
}
registerOp("outage.restore", restoreFixed);

export function verifyOutage(id: string) {
  const wf = getWf(id);
  if (!wf || stepStatus(id, "verify") !== "pending" || stepStatus(id, "restore") !== "done") return;
  step(id, "verify", "done", "10 dk kesintisiz bağlantı, ölçüm 96 Mbps (demo)");
  const alt = wf.decisions.find((d) => d.key === "outage_alt");
  notify(id, "İnternetiniz normale döndü", "Kesinti giderildi ve bağlantınızı doğruladık. İyi günlerde kullanın!");
  complete(id, {
    resolved: true,
    summary: wf.data["outageType"] === "regional" ? "Bölgesel kesinti giderildi, bağlantı doğrulandı" : "Hat onarıldı, bağlantı doğrulandı",
    results: [`Neden: ${wf.data["outageType"] === "regional" ? "bölgesel arıza" : "hatta sinyal kaybı"}`, `Geçici internet: ${alt?.label ?? "—"}`, "Bağlantı 96 Mbps ile doğrulandı (demo)"],
  });
}
registerOp("outage.verify", verifyOutage);
