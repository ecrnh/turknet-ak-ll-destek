/**
 * ConnectivityService + TemporaryInternetService: fixed line status and the
 * TürkNet Box (SIM-based temporary internet while a relocation waits for
 * installation). Outages and the free Hibrit İnternet live in services/hybrid.ts.
 * No real SIM, operator API or device exists: everything goes through mocks.
 */
import { TEAMS, TEMP_MOBILE_OFFER } from "@/data/mock";
import { useAppStore } from "@/features/core/appStore";
import { chain, complete, createWorkflow, getWf, log, notify, registerOp, schedule, setWorkOrder, step, stepStatus, workOrder } from "../engine";
import { MockLogisticsAPI } from "../mockServices";
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
export const offerFor = (_kind: TempKind) => TEMP_MOBILE_OFFER;

export const tempOfWorkflow = (parentId: string | null | undefined) =>
  parentId ? W.getState().workflows.find((w) => w.type === "temp_internet" && w.relatedIds.includes(parentId)) : undefined;

function setTemp(tempWfId: string, status: TempStatus) {
  W.setState((s) => ({ temp: s.temp.map((t) => (t.workflowId === tempWfId ? { ...t, status, updatedAt: Date.now() } : t)) }));
}

/** Customer accepted the offer: create the linked temp-internet workflow and order (idempotent). */
export function acceptTempInternet(parentId: string, kind: TempKind): string {
  const offer = offerFor(kind);
  const ownDevice = getWf(parentId)?.data["ownDevice"] === true;
  const { wf, created } = createWorkflow({
    type: "temp_internet",
    title: "TürkNet Box · geçici internet",
    dedupeKey: `temp:${parentId}`,
    relatedIds: [parentId],
    steps: [
      { key: "terms", label: "Koşullar gösterildi ve onaylandı" },
      { key: "provision", label: ownDevice ? "Evdeki Hibrit Box'ın hazırlanması" : "Cihaz siparişi ve teslimat" },
      { key: "active", label: "Box ile internet aktif" },
      { key: "switch_back", label: "Sabit internete geri geçiş" },
    ],
    data: { kind, parentId, ownDevice },
    why: "Müşteri koşulları görüp açıkça onay verdi; onay olmadan sipariş oluşturulmaz",
  });
  if (!created) return wf.id;
  const t = Date.now();
  W.setState((s) => ({
    temp: [...s.temp, { id: `GCT-${wf.id.slice(4)}`, workflowId: wf.id, parentWorkflowId: parentId, kind, status: "accepted", price: offer.price, device: offer.device, createdAt: t, updatedAt: t }],
  }));
  step(wf.id, "terms", "done", `${offer.price} · ${offer.quota}`);
  notify(wf.id, "Geçici internet talebiniz alındı", ownDevice ? "Evinizdeki Hibrit Box'ı yeni adreste kullanmanız için hazırlıyoruz. Cihaz gönderimi gerekmiyor." : "Cihazınızı hazırlıyoruz. Teslimatı sizin için takip edeceğiz.");
  chain("temp.provision", wf.id, 1200);
  return wf.id;
}

export function provisionTemp(tempWfId: string) {
  const wf = getWf(tempWfId);
  if (!wf || stepStatus(tempWfId, "provision") !== "pending") return;
  if (wf.data["ownDevice"] === true) {
    W.setState({
      box: { id: `BOX-${tempWfId.slice(4)}`, tempWfId, model: "Evdeki Hibrit Box (SIM kartlı)", sim: "ready", power: "off", usedGb: 0, quotaGb: 100, toggles: 0, signal: "İyi · 4 çubuk (demo)", updatedAt: Date.now() },
    });
    setTemp(tempWfId, "shipped");
    step(tempWfId, "provision", "done", "Evinizdeki uyumlu Hibrit Box kullanılacak · cihaz gönderimi gerekmedi (demo)");
    chain("temp.activate", tempWfId, 1200);
    return;
  }
  {
    workOrder(tempWfId, { kind: "device_delivery", title: "TürkNet Box gönderimi", team: TEAMS.logistics }, "Geçici internet için cihaz teslimatı gerekiyor");
    W.setState({
      box: { id: `BOX-${tempWfId.slice(4)}`, tempWfId, model: "TürkNet Box 4.5G (SIM kartlı)", sim: "shipping", power: "off", usedGb: 0, quotaGb: 100, toggles: 0, signal: "İyi · 4 çubuk (demo)", updatedAt: Date.now() },
    });
  }
  setTemp(tempWfId, "ordered");
  step(tempWfId, "provision", "in_progress", "Kurye ataması yapıldı (demo)");
  schedule("temp.provisioned", tempWfId, 1600);
}
registerOp("temp.provision", provisionTemp);
registerOp("temp.provisioned", (id) => {
  const wf = getWf(id);
  if (!wf) return;
  setWorkOrder(id, "device_delivery", "done");
  setTemp(id, "shipped");
  patchBox({ sim: "ready" });
  step(id, "provision", "done", `Box teslim edildi · takip no ${MockLogisticsAPI.trackingNo()} (demo)`);
  chain("temp.activate", id, 1200);
});

export function activateTemp(tempWfId: string) {
  const wf = getWf(tempWfId);
  if (!wf || stepStatus(tempWfId, "provision") !== "done" || stepStatus(tempWfId, "active") !== "pending") return;
  setTemp(tempWfId, "active");
  step(tempWfId, "active", "done", "Box SIM'i aktif, mobil internet bağlı");
  patchBox({ sim: "active", power: "on", usedGb: 0.2 });
  setConnectivity({ mobile: "active", mode: "temp_mobile" }, "Box ile mobil internet aktif");
  notify(tempWfId, "Box'ınız aktif", "Sabit internetiniz hazır olana kadar Box ile internete bağlısınız. Box'ı uygulamadan açıp kapatabilirsiniz.");
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
  setTemp(t.id, "ended");
  step(t.id, "switch_back", "done", "Box kapatıldı, iade için kurye planlandı (demo)");
  patchBox({ power: "off", sim: "returning" });
  setConnectivity({ mobile: "off", mode: "fixed" }, "Sabit internete geri geçildi");
  notify(t.id, "Sabit internetinize geri geçtiniz", "Box hizmeti sona erdi. Cihaz iadesi için kurye sizi arayacak (demo).", "quiet");
  complete(t.id, { resolved: true, summary: "Geçici bağlantı süreci kapandı", results: ["TürkNet Box kullanıldı", "Sabit internete geri dönüldü"] });
}

