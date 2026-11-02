/**
 * OutageService + HybridService: "Ücretsiz Hibrit İnternet".
 *
 * Product rule: Hibrit İnternet is included in every TürkNet subscription at no
 * extra cost. It is offered only when an outage is still unresolved after 24 h,
 * the customer activates it from the app, and it works only with a compatible
 * backup device, an active SIM and enough mobile coverage.
 *
 * No real modem, SIM, coverage or operator system exists: every answer comes
 * from MockHybridAPI / MockLogisticsAPI and is labelled as demo data.
 */
import { SUBSCRIPTION, TEAMS } from "@/data/mock";
import { complete, createWorkflow, getWf, log, notify, registerOp, schedule, setWorkOrder, step, stepStatus, workOrder } from "../engine";
import { MockHybridAPI, MockLogisticsAPI } from "../mockServices";
import { canActivateHybrid, hybridBlocker, hybridOfferOpen, hybridUsageMb, isActive, outageElapsedH } from "../rules";
import { initialHybrid, useWorkflowStore as W } from "../store";
import type { DeviceRequest, HybridService, OutageState } from "../types";
import { setConnectivity } from "./connectivity";

const now = () => Date.now();
const H = 3_600_000;

const OUTAGE_STEPS = [
  { key: "signal", label: "Kesinti tespit edildi" },
  { key: "repair", label: "Teknik ekip çözüm üzerinde çalışıyor" },
  { key: "hybrid_offer", label: "Ücretsiz Hibrit İnternet hakkı (24 saat sonra)" },
  { key: "hybrid", label: "Hibrit İnternet etkinleştirme" },
  { key: "restore", label: "Ana bağlantı geri geldi" },
  { key: "switch_back", label: "Yedek bağlantıdan ana bağlantıya dönüş" },
  { key: "verify", label: "Bağlantı doğrulaması" },
];

const patchOutage = (p: Partial<OutageState>) => W.setState((s) => (s.outage ? { outage: { ...s.outage, ...p } } : {}));
const patchHybrid = (p: Partial<HybridService>) => W.setState((s) => ({ hybrid: { ...s.hybrid, ...p } }));
const patchDevice = (p: Partial<DeviceRequest>) => W.setState((s) => (s.hybrid.device ? { hybrid: { ...s.hybrid, device: { ...s.hybrid.device, ...p, updatedAt: now() } } } : {}));

/** The outage currently being tracked (not yet restored), if any. */
export function openOutage(): OutageState | null {
  const o = W.getState().outage;
  return o && !o.restoredAt && isActive(getWf(o.wfId) ?? { status: "completed" }) ? o : null;
}

export const outageHours = (o: Pick<OutageState, "startedAt"> | null | undefined, at = now()) => (o ? outageElapsedH(o.startedAt, at) : 0);

function repairNoteFor(hours: number, regional: boolean): string {
  if (regional) return hours < 24 ? "Bölgenizdeki altyapı arızası için ekiplerimiz çalışıyor" : "Bölgesel onarım sürüyor; ek ekipler görevlendirildi";
  if (hours < 1) return "Arıza tespit edildi, teknik ekip yönlendirildi";
  if (hours < 24) return "Teknik ekibimiz arıza noktasında çalışıyor";
  return "Onarım sürüyor; ek teknik ekip görevlendirildi";
}

/** Re-reads the elapsed time and applies the 24-hour rule (offer appears / disappears). */
function evaluate(wfId: string) {
  const o = W.getState().outage;
  if (!o || o.restoredAt) return;
  const hours = outageHours(o);
  const note = repairNoteFor(hours, getWf(wfId)?.data["outageType"] === "regional");
  patchOutage({ repairNote: note, lastUpdateAt: now() });
  step(wfId, "repair", "in_progress", note);
  const status = W.getState().hybrid.status;
  if (hybridOfferOpen(hours, o.etaH)) {
    if (status !== "unavailable") return;
    const early = hours < 24;
    patchHybrid({ status: "offered" });
    step(
      wfId,
      "hybrid_offer",
      "done",
      early ? `Tahmini çözüm süresi ${o.etaH} saat · ücretsiz Hibrit İnternet sunuldu` : "Kesinti 24 saati aştı · ücretsiz Hibrit İnternet sunuldu",
      "Kural: 24 saatten uzun süren ya da sürmesi beklenen kesintide aboneliğe dahil yedek bağlantı sunulur",
    );
    notify(
      wfId,
      early ? "Kesintinin 24 saatten uzun sürmesi bekleniyor" : "İnternet kesintiniz 24 saati aştı",
      "Bağlantınızı sürdürmeniz için ücretsiz Hibrit İnternet desteğinizi etkinleştirebilirsiniz.",
      early ? "quiet" : "push",
      "/hibrit",
    );
    if (W.getState().hybrid.autoFailover) {
      log(wfId, "system", "info", "Otomatik geçiş izni var: uygunluk kontrolü başlatıldı", "Müşteri, 24 saati aşan kesintide yedek bağlantıya otomatik geçişi önceden onayladı");
      checkHybrid();
    }
  } else if (status === "offered") {
    patchHybrid({ status: "unavailable" });
    step(wfId, "hybrid_offer", "pending");
    log(wfId, "presenter", "info", "Demo: kesinti süresi 24 saatin altına alındı; Hibrit İnternet teklifi gizlendi");
  }
}

/** Network monitoring reports an outage. Idempotent: an open outage is never duplicated. */
export function startOutage(hours = 0.2, opts: { etaH?: number; regional?: boolean; relatedIds?: string[]; why?: string } = {}): string {
  const open = openOutage();
  if (open) {
    log(open.wfId, "system", "info", "Kesinti zaten takipte; yeni kayıt oluşturulmadı.", "Mükerrer işlem önleme");
    return open.wfId;
  }
  setConnectivity({ fixed: "down", metric: { optic: -40, drops: 1, speed: 0 } }, "Ana bağlantı kesildi");
  const { wf } = createWorkflow({
    type: "outage_recovery",
    title: "İnternet kesintisi takibi",
    dedupeKey: `outage:${SUBSCRIPTION.id}`,
    steps: OUTAGE_STEPS,
    data: { outageType: opts.regional ? "regional" : W.getState().config.outageType },
    why: opts.why ?? "Ağ izleme servisi ana bağlantıda oturum kaybı bildirdi (demo izleme verisi)",
    ...(opts.relatedIds ? { relatedIds: opts.relatedIds } : {}),
  });
  const t = now();
  W.setState({ outage: { wfId: wf.id, startedAt: t - hours * H, lastUpdateAt: t, repairNote: "", restoredAt: null, dismissed: false, etaH: opts.etaH ?? null }, hybrid: initialHybrid(W.getState().hybrid.autoFailover) });
  step(wf.id, "signal", "done", "Modem oturumu yok · komşu hatlar kontrol edildi (demo)");
  notify(wf.id, "İnternet bağlantınızda kesinti tespit ettik", "Teknik ekibimiz sorunun çözümü için çalışıyor. Gelişmeleri sizin için takip ediyoruz.", "push", "/");
  evaluate(wf.id);
  return wf.id;
}

/** Demo control: how long the outage has been going on. Starts one if needed. */
export function setOutageElapsed(hours: number): string {
  const open = openOutage();
  if (!open) return startOutage(hours);
  patchOutage({ startedAt: now() - hours * H });
  log(open.wfId, "presenter", "info", `Demo: kesinti süresi ${Math.round(hours)} saat olarak ayarlandı`);
  evaluate(open.wfId);
  return open.wfId;
}

const CHECKABLE = ["offered", "ready", "no_device", "no_coverage", "failed"];

/** Device / SIM / coverage eligibility check (mock). */
export function checkHybrid(): boolean {
  const o = openOutage();
  const h = W.getState().hybrid;
  if (!o || !hybridOfferOpen(outageHours(o), o.etaH) || !CHECKABLE.includes(h.status)) return false;
  if (h.status === "no_device" && h.device && h.device.status !== "delivered" && h.device.status !== "cancelled") return false;
  patchHybrid({ status: "checking" });
  step(o.wfId, "hybrid", "in_progress", "Cihaz, SIM ve mobil kapsama kontrol ediliyor (demo)");
  schedule("hybrid.checked", o.wfId, 1200);
  return true;
}
registerOp("hybrid.checked", (id) => {
  if (W.getState().hybrid.status !== "checking") return;
  const checks = MockHybridAPI.checks();
  const block = hybridBlocker(checks);
  patchHybrid({ status: block ?? "ready", checks });
  if (block === "no_device") {
    step(id, "hybrid", "waiting", "Uyumlu yedek cihaz veya aktif SIM bulunamadı", "Cihaz olmadan yedek bağlantı çalışmaz; aktif gösterilmez");
  } else if (block === "no_coverage") {
    step(id, "hybrid", "waiting", "Adreste yedek bağlantı için yeterli mobil kapsama yok (demo)", "Kapsama yetersizken yedek bağlantı açılmaz; ana arıza takibi sürer");
    notify(id, "Yedek bağlantı şu an kullanılamıyor", "Bulunduğunuz konumda yedek bağlantı için yeterli mobil kapsama bulunamadı. Arıza takibiniz devam ediyor.", "quiet");
  } else {
    step(id, "hybrid", "waiting", "Cihaz, SIM ve kapsama uygun · onayınız bekleniyor");
    if (W.getState().hybrid.autoFailover) activateHybrid("auto");
  }
});

/** Customer consent: "Ücretsiz Olarak Etkinleştir" (also used for "Tekrar Dene"). */
export function activateHybrid(by: "auto" | "customer" = "customer"): boolean {
  const s = W.getState();
  const o = openOutage();
  if (!o || !canActivateHybrid({ elapsedH: outageHours(o), etaH: o.etaH, fixed: s.connectivity.fixed, status: s.hybrid.status })) return false;
  const attempt = s.hybrid.attempts + 1;
  patchHybrid({ status: "activating", attempts: attempt, activatedBy: by });
  log(o.wfId, "customer", "decision", by === "auto" ? "Otomatik yedek geçişi: müşterinin önceden verdiği izinle Hibrit Box açılıyor" : attempt === 1 ? "Müşteri onayı: Hibrit Box'ı Aç" : `Müşteri tekrar denedi (${attempt}. deneme)`, "Hibrit İnternet yalnızca müşterinin onayıyla etkinleşir");
  step(o.wfId, "hybrid", "in_progress", `Yedek bağlantı etkinleştiriliyor (${attempt}. deneme)`);
  schedule("hybrid.activated", o.wfId, 1500);
  return true;
}
registerOp("hybrid.activated", (id) => {
  if (W.getState().hybrid.status !== "activating") return;
  if (!MockHybridAPI.activationSucceeds()) {
    patchHybrid({ status: "failed" });
    step(id, "hybrid", "failed", "Yedek cihaz mobil ağa bağlanamadı (demo)");
    log(id, "external", "error", "Hibrit İnternet etkinleştirme yanıtı: başarısız (demo)", "Başarısız etkinleştirme aktif gibi gösterilmez; müşteriye tekrar deneme sunulur");
    return;
  }
  patchHybrid({ status: "active", activatedAt: now() });
  step(id, "hybrid", "done", "Yedek bağlantı aktif · cihaz mobil ağa bağlı (demo)");
  setConnectivity({ mobile: "active", mode: "hybrid_backup", hybridEnabled: true }, "Hibrit İnternet: yedek bağlantı aktif");
  notify(id, "Yedek internetiniz aktif!", "Ana bağlantınız düzelene kadar internet erişiminizi yedek bağlantınız üzerinden sürdürebilirsiniz.", "push", "/hibrit");
});

/** Customer left the activation screen without activating. Outage tracking continues. */
export function declineHybrid() {
  const o = openOutage();
  const h = W.getState().hybrid;
  if (!o || h.declinedAt || h.status === "active") return;
  patchHybrid({ declinedAt: now() });
  log(o.wfId, "customer", "decision", "Müşteri Hibrit İnternet'i şimdilik etkinleştirmedi; arıza takibi sürüyor", "Hizmet isteğe bağlıdır; teklif ana ekranda açık kalır");
}

/** "Cihaz Talep Et": one device request per subscription, tracked to delivery. */
export function requestHybridDevice(): boolean {
  const o = openOutage();
  const h = W.getState().hybrid;
  if (!o || h.status !== "no_device" || (h.device && h.device.status !== "cancelled")) return false;
  const wo = workOrder(o.wfId, { kind: "device_delivery", title: "Hibrit İnternet yedek cihaz gönderimi", team: TEAMS.logistics, key: `hybrid-device:${SUBSCRIPTION.id}` }, "Uyumlu cihaz olmadan yedek bağlantı çalışmaz; cihaz müşteri talebiyle gönderilir");
  const t = now();
  patchHybrid({ device: { id: wo.id, status: "requested", trackingNo: MockLogisticsAPI.trackingNo(), createdAt: t, updatedAt: t } });
  step(o.wfId, "hybrid", "waiting", "Yedek cihaz talep edildi");
  log(o.wfId, "customer", "decision", "Müşteri yedek internet cihazı talep etti");
  notify(o.wfId, "Cihaz talebiniz alındı", "Yedek internet cihazınızı hazırlıyoruz. Teslimatı sizin için takip edeceğiz.", "quiet");
  schedule("hybrid.device", o.wfId, 1500, "preparing");
  return true;
}
registerOp("hybrid.device", (id, stage) => {
  const d = W.getState().hybrid.device;
  if (!d || d.status === "cancelled" || d.status === "delivered") return;
  if (stage === "preparing") {
    patchDevice({ status: "preparing" });
    setWorkOrder(id, "device_delivery", "in_progress");
    step(id, "hybrid", "waiting", "Yedek cihaz hazırlanıyor");
    schedule("hybrid.device", id, 1500, "on_the_way");
  } else if (stage === "on_the_way") {
    patchDevice({ status: "on_the_way" });
    step(id, "hybrid", "waiting", `Yedek cihaz yolda · takip no ${d.trackingNo} (demo)`);
    notify(id, "Yedek cihazınız yola çıktı", `Kurye bugün teslim edecek (demo). Takip no: ${d.trackingNo}`, "quiet");
    schedule("hybrid.device", id, 1500, "delivered");
  } else {
    patchDevice({ status: "delivered" });
    setWorkOrder(id, "device_delivery", "done");
    W.setState((s) => ({ config: { ...s.config, hybridDevice: true } }));
    log(id, "external", "external", "Kurye: yedek cihaz ve SIM teslim edildi (demo)");
    notify(id, "Yedek cihazınız teslim edildi", "Uygunluğu sizin için yeniden kontrol ediyoruz. Ardından ücretsiz Hibrit İnternet'i etkinleştirebilirsiniz.", "push", "/hibrit");
    checkHybrid();
  }
});

/** The technical team fixed the line. Hybrid (if used) switches back after verification. */
export function restoreMain(): boolean {
  const o = openOutage();
  if (!o) return false;
  const id = o.wfId;
  const t = now();
  step(id, "repair", "done", "Arıza giderildi (demo)");
  setConnectivity({ fixed: "up", metric: { optic: -19.4, drops: 0, speed: 96 } }, "Ana bağlantı geri geldi");
  step(id, "restore", "done", "Ana bağlantı oturumu açıldı");
  patchOutage({ restoredAt: t, lastUpdateAt: t, repairNote: "Arıza giderildi" });
  const h = W.getState().hybrid;
  if (h.status === "active") {
    step(id, "switch_back", "in_progress", "Ana bağlantı doğrulanıyor; yedekten dönüş hazırlanıyor", "Ana bağlantı kararlı çalışmadan yedekten çıkılmaz");
  } else {
    W.setState((s) => ({ ops: s.ops.filter((op) => !(op.workflowId === id && op.op.startsWith("hybrid."))) }));
    if (stepStatus(id, "hybrid_offer") === "pending") step(id, "hybrid_offer", "skipped", "Kesinti 24 saat dolmadan çözüldü");
    if (stepStatus(id, "hybrid") !== "skipped") step(id, "hybrid", "skipped", "Yedek bağlantı kullanılmadı");
    step(id, "switch_back", "skipped", "Yedek bağlantı kullanılmadı");
    if (h.device && h.device.status !== "delivered" && h.device.status !== "cancelled") {
      patchDevice({ status: "cancelled" });
      setWorkOrder(id, "device_delivery", "cancelled");
    }
    patchHybrid({ status: "unavailable" });
  }
  schedule("outage.verify", id, 1500);
  return true;
}
registerOp("outage.verify", (id) => {
  const wf = getWf(id);
  const o = W.getState().outage;
  if (!wf || !o || stepStatus(id, "restore") !== "done" || stepStatus(id, "verify") === "done") return;
  const h = W.getState().hybrid;
  const used = h.status === "active";
  const usageMb = hybridUsageMb(h.activatedAt, now());
  if (used) {
    setConnectivity({ mobile: "off", mode: "fixed", hybridEnabled: false }, "Yedek bağlantıdan ana bağlantıya dönüldü");
    patchHybrid({ status: "ended", endedAt: now(), pausedAt: null });
    step(id, "switch_back", "done", "Yedek bağlantı kapatıldı, ana bağlantıya dönüldü");
  }
  step(id, "verify", "done", "10 dk kesintisiz bağlantı, ölçüm 96 Mbps (demo)");
  notify(
    id,
    used ? "Ana bağlantınız geri geldi" : "İnternetiniz normale döndü",
    used ? "Bağlantınızı doğruladık ve yedek bağlantıdan ana bağlantınıza geri geçtik. Sizin bir şey yapmanız gerekmiyor." : "Kesinti giderildi ve bağlantınızı doğruladık. Anlayışınız için teşekkür ederiz.",
    "push",
    "/hibrit",
  );
  const hours = Math.round(outageElapsedH(o.startedAt, o.restoredAt ?? now()));
  complete(id, {
    resolved: true,
    summary: used ? "Kesinti giderildi; Hibrit İnternet ile bağlı kalındı" : "Kesinti giderildi, bağlantı doğrulandı",
    results: [`Kesinti süresi: yaklaşık ${hours} saat (demo)`, used ? `Hibrit İnternet kullanıldı · ${(usageMb / 1024).toFixed(1).replace(".", ",")} GB (demo)` : "Hibrit İnternet kullanılmadı", "Ana bağlantı 96 Mbps ile doğrulandı (demo)"],
  });
});

/** Customer switches the active backup off from the app; the service stays theirs to switch on again. */
export function pauseHybrid(): boolean {
  const o = openOutage();
  const h = W.getState().hybrid;
  if (!o || h.status !== "active" || h.pausedAt) return false;
  patchHybrid({ pausedAt: now() });
  setConnectivity({ mobile: "standby" }, "Yedek bağlantı müşteri tarafından kapatıldı");
  log(o.wfId, "customer", "info", "Müşteri yedek bağlantıyı uygulamadan kapattı (demo cihaz komutu)");
  return true;
}

export function resumeHybrid(): boolean {
  const o = openOutage();
  const h = W.getState().hybrid;
  if (!o || h.status !== "active" || !h.pausedAt) return false;
  patchHybrid({ pausedAt: null });
  setConnectivity({ mobile: "active", mode: "hybrid_backup" }, "Yedek bağlantı müşteri tarafından açıldı");
  log(o.wfId, "customer", "info", "Müşteri yedek bağlantıyı uygulamadan açtı (demo cihaz komutu)");
  return true;
}

/** Customer preference: switch to the backup automatically once the 24-hour rule opens it. */
export function setAutoFailover(on: boolean) {
  patchHybrid({ autoFailover: on });
  log(W.getState().outage?.wfId ?? null, "customer", "info", on ? "Otomatik yedek bağlantı geçişine izin verildi" : "Otomatik yedek bağlantı geçişi kapatıldı", "Geçiş yine yalnızca 24 saati aşan kesintide ve uygunluk kontrolünden sonra yapılır");
  const o = openOutage();
  if (on && o && W.getState().hybrid.status === "offered") checkHybrid();
  else if (on && o && W.getState().hybrid.status === "ready") activateHybrid("auto");
}

/** Customer closes the "internet is back" card. */
export function dismissOutage() {
  patchOutage({ dismissed: true });
}
