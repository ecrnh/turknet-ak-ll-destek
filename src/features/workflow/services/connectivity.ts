/**
 * ConnectivityService: fixed line status, temporary mobile internet, hybrid
 * backup and the "sabit internet kesintisi" recovery workflow.
 * Temporary mobile internet (separate device + SIM) and hybrid backup (same
 * modem fails over automatically) are distinct products with distinct terms.
 */
import { HYBRID_OFFER, SUBSCRIPTION, TEAMS, TEMP_MOBILE_OFFER } from "@/data/mock";
import { useAppStore } from "@/features/core/appStore";
import { ask, chain, complete, createWorkflow, getWf, notify, registerDecision, registerOp, schedule, setData, setStatus, setWorkOrder, step, stepStatus, workOrder } from "../engine";
import { MockLogisticsAPI, MockNetworkAPI } from "../mockServices";
import { useWorkflowStore as W } from "../store";
import type { ConnectivityStatus, TempKind, TempStatus } from "../types";

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
  if (c.fixed === "up") app.setNet({ status: "online", speed: 96, ping: 8 });
  else if (c.fixed === "degraded") app.setNet({ status: "slow", speed: 24, ping: 41 });
  else if (c.mobile === "active") app.setNet({ status: "mobile", speed: 38, ping: 34 });
  else app.setNet({ status: "down", speed: 0 });
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
    title: kind === "hybrid" ? "Hibrit yedek bağlantı" : "Geçici mobil internet",
    dedupeKey: `temp:${parentId}`,
    relatedIds: [parentId],
    steps: [
      { key: "terms", label: "Koşullar gösterildi ve onaylandı" },
      { key: "provision", label: kind === "hybrid" ? "eSIM uzaktan tanımlama" : "Cihaz siparişi ve kurye teslimatı" },
      { key: "active", label: kind === "hybrid" ? "Mobil yedek aktif" : "Geçici internet aktif" },
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
  chain("temp.provision", wf.id, 1200);
  return wf.id;
}

export function provisionTemp(tempWfId: string) {
  const wf = getWf(tempWfId);
  if (!wf || stepStatus(tempWfId, "provision") !== "pending") return;
  const kind = wf.data["kind"] as TempKind;
  if (kind === "temp_mobile") workOrder(tempWfId, { kind: "device_delivery", title: "Geçici 4.5G modem gönderimi", team: TEAMS.logistics }, "Geçici internet için cihaz teslimatı gerekiyor");
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
    step(id, "provision", "done", `Teslim edildi · takip no ${MockLogisticsAPI.trackingNo()} (demo)`);
  } else step(id, "provision", "done", "eSIM tanımlandı, modem yedek moda hazır (demo)");
  chain("temp.activate", id, 1200);
});

export function activateTemp(tempWfId: string) {
  const wf = getWf(tempWfId);
  if (!wf || stepStatus(tempWfId, "provision") !== "done" || stepStatus(tempWfId, "active") !== "pending") return;
  const kind = wf.data["kind"] as TempKind;
  setTemp(tempWfId, "active");
  step(tempWfId, "active", "done", kind === "hybrid" ? "Sabit hat kesik → mobil yedek devrede" : "Geçici modem ile bağlantı kuruldu");
  if (kind === "hybrid") setConnectivity({ mobile: "active", mode: "hybrid_backup", hybridEnabled: true }, "Mobil yedek aktif");
  else setConnectivity({ mobile: "active", mode: "temp_mobile" }, "Geçici mobil internet aktif");
  notify(tempWfId, kind === "hybrid" ? "Mobil yedek bağlantın aktif" : "Geçici internetin aktif", kind === "hybrid" ? "Sabit hat dönene kadar modemin mobil ağ üzerinden çalışıyor." : "Sabit internetin kurulana kadar geçici modemle bağlısın.");
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
  step(t.id, "switch_back", "done", kind === "hybrid" ? "Sabit hat geri geldi, mobil yedek beklemede" : "Geçici internet kapatıldı, cihaz iadesi için kurye planlandı (demo)");
  if (kind === "hybrid") setConnectivity({ mobile: "standby", mode: "fixed" }, "Bağlantı geri döndü · mobil yedek beklemede");
  else setConnectivity({ mobile: "off", mode: "fixed" }, "Sabit internete geri geçildi");
  notify(t.id, "Sabit internetine geri geçtin", kind === "hybrid" ? "Hibrit yedek beklemeye alındı; bir sonraki kesintide yine otomatik devreye girer." : "Geçici internet sona erdi. Cihaz iadesi için kurye seni arayacak (demo).");
  complete(t.id, { resolved: true, summary: "Geçici bağlantı süreci kapandı", results: [kind === "hybrid" ? "Mobil yedek kullanıldı" : "Geçici modem kullanıldı", "Sabit internete geri dönüldü"] });
}

/* ---------------- Sabit internet kesintisi (Senaryo B) ---------------- */
const OUTAGE_STEPS = [
  { key: "signal", label: "Bağlantı kaybı algılandı" },
  { key: "diagnose", label: "Kesinti türü teşhisi" },
  { key: "coverage", label: "Adres ve kapsama kontrolü" },
  { key: "offer", label: "Alternatif bağlantı kararı" },
  { key: "repair", label: "Onarım süreci" },
  { key: "restore", label: "Sabit bağlantı geri geldi" },
  { key: "verify", label: "Çözüm doğrulaması" },
];

export function startFixedOutage(): string {
  setConnectivity({ fixed: "down", metric: { optic: -40, drops: 1 } }, "Sabit bağlantı kesildi");
  const { wf, created } = createWorkflow({
    type: "outage_recovery",
    title: "Sabit internet kesintisi",
    dedupeKey: `outage:${SUBSCRIPTION.id}`,
    steps: OUTAGE_STEPS,
    why: "Ağ izleme servisi sabit hatta oturum kaybı bildirdi",
  });
  if (!created) return wf.id;
  step(wf.id, "signal", "done", "Modem oturumu 2 dk'dır yok (demo izleme verisi)");
  notify(wf.id, "Bağlantında kesinti tespit ettim", "Nedenini inceliyorum. Senin bir şey yapmana şimdilik gerek yok.");
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
  setStatus(id, "in_progress", { blocker: d.type === "regional" ? "Bölgesel altyapı arızası" : "Hatta optik sinyal kaybı", eta: d.type === "regional" ? "Tahmini düzelme 4 saat (demo, kesin değil)" : "Saha ekibi bugün 16:00–18:00 (demo)" });
  notify(id, d.type === "regional" ? "Bölgende bir arıza var" : "Hattında sinyal kaybı var", d.type === "regional" ? "Sorun senden kaynaklı değil; modemine dokunmana gerek yok. Ekipler çalışıyor." : "Sorun büyük olasılıkla bina içi fiber hattında. Teknik ekip süreci başlatılacak.");
  chain("outage.coverage", id, 1200);
});

export function checkCoverage(id: string) {
  if (stepStatus(id, "coverage") !== "pending") return;
  step(id, "coverage", "done", `Kapsama: ${HYBRID_OFFER.coverage} · modem hibrit uyumlu: ${SUBSCRIPTION.hybridReady ? "evet" : "hayır"}`, "Alternatif bağlantı ancak kapsama ve cihaz uygunsa önerilir");
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
      prompt: "Onarım sürerken internetsiz kalmamak için bir seçenek ister misin?",
      detail: "Fiyatlar ve kapsama demo verisidir. Onay vermeden hiçbir şey aktifleşmez.",
      options: [
        { id: "hybrid", label: "Hibrit yedeği aç", desc: `${HYBRID_OFFER.price} · ${HYBRID_OFFER.delivery}`, primary: true, terms: HYBRID_OFFER.terms },
        { id: "temp_mobile", label: "Geçici mobil modem gönderin", desc: `${TEMP_MOBILE_OFFER.price} · ${TEMP_MOBILE_OFFER.delivery}`, terms: TEMP_MOBILE_OFFER.terms },
        { id: "decline", label: "Gerek yok, beklerim" },
      ],
    },
    "Kesinti süresi tahmini olarak 1 saatten uzun; internetsiz kalma süresini azaltmak için alternatif sunulur",
  );
}
registerOp("outage.offer", offerAlternative);

registerDecision("outage_alt", (id, opt) => {
  step(id, "offer", "done", opt === "decline" ? "Müşteri alternatif istemedi" : opt === "hybrid" ? "Hibrit yedek kabul edildi" : "Geçici modem kabul edildi");
  if (opt !== "decline") acceptTempInternet(id, opt as TempKind);
  chain("outage.repair", id, 1500);
});

export function startRepair(id: string) {
  const wf = getWf(id);
  if (!wf || stepStatus(id, "repair") !== "pending") return;
  if (wf.data["outageType"] === "regional") {
    step(id, "repair", "in_progress", "Bölgesel onarım ekibi çalışıyor; sana özel saha ziyareti gerekmiyor", "Bölgesel arızada bireysel iş emri açılmaz");
  } else {
    workOrder(id, { kind: "field_repair", title: "Bina içi fiber hat onarımı", team: TEAMS.field }, "Uzaktan çözülemeyen optik sinyal kaybı fiziksel müdahale gerektirir");
    setWorkOrder(id, "field_repair", "in_progress");
    step(id, "repair", "in_progress", "Saha ekibi yönlendirildi · tahmini varış 16:00–18:00 (demo)");
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
  setConnectivity({ fixed: "up", metric: { optic: -19.4, drops: 0 } }, "Sabit bağlantı geri döndü");
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
  notify(id, "İnternetin normale döndü", "Kesinti giderildi ve bağlantın doğrulandı.");
  complete(id, {
    resolved: true,
    summary: wf.data["outageType"] === "regional" ? "Bölgesel kesinti giderildi, bağlantı doğrulandı" : "Hat onarıldı, bağlantı doğrulandı",
    results: [`Teşhis: ${wf.data["outageType"] === "regional" ? "bölgesel arıza" : "bireysel hat arızası"}`, `Alternatif: ${alt?.label ?? "—"}`, "Bağlantı 96 Mbps ile doğrulandı (demo)"],
  });
}
registerOp("outage.verify", verifyOutage);
