/**
 * Proactive fault detection + Speed Optimisation Agent.
 * Compares demo connection metrics against normal ranges, assesses scope
 * (single line vs. region), analyses speed vs. package, runs safe reversible
 * remote actions, re-measures, and opens a field work order only when needed.
 * Never claims a speed above the physical line capacity.
 */
import { SUBSCRIPTION, TEAMS } from "@/data/mock";
import { chain, complete, createWorkflow, getWf, log, notify, registerOp, schedule, setData, setStatus, setWorkOrder, step, stepStatus, workOrder } from "../engine";
import { MockNetworkAPI } from "../mockServices";
import { useWorkflowStore as W } from "../store";
import { setConnectivity } from "./connectivity";

export const NORMAL = { optic: -19.2, drops: 0 };
export const isAnomalous = (m: { optic: number; drops: number }) => m.optic < -26 || m.drops > 5;

/** Demo causes the analysis may surface. They are possibilities, never a certain diagnosis. */
export const SPEED_CAUSES = ["Optik sinyal seviyesi düşük", "Hat profili güncel değil", "Wi-Fi kanalında yoğunluk"];

const SPEED_STEPS = [
  { key: "speed", label: "Hız ve bağlantı analizi" },
  { key: "remote", label: "Güvenli uzaktan iyileştirme" },
  { key: "retest", label: "Yeniden hız ölçümü" },
  { key: "field", label: "Teknik ekip müdahalesi" },
  { key: "verify", label: "Sonuç doğrulaması" },
];

export function injectAnomaly() {
  setConnectivity({ fixed: "degraded", metric: { optic: -27.8, drops: 14, speed: 21 } }, "Anormal sinyal: optik -27.8 dBm, 14 kopma/saat");
  log(null, "system", "info", "İzleme: optik güç ve kopma sayısı normal aralığın dışında", `Normal: ${NORMAL.optic} dBm, ${NORMAL.drops} kopma`);
  chain("proactive.detect", "monitor", 1500);
}

export function detectAnomaly(): string | null {
  const m = W.getState().connectivity.metric;
  if (!isAnomalous(m)) return null;
  const { wf, created } = createWorkflow({
    type: "proactive_fault",
    title: "Bağlantı sorunu · proaktif kontrol",
    dedupeKey: `proactive:${SUBSCRIPTION.id}`,
    steps: [{ key: "signal", label: "Bağlantıda dalgalanma tespit edildi" }, { key: "scope", label: "Sorunun kapsamı değerlendiriliyor" }, ...SPEED_STEPS],
    data: { pkg: SUBSCRIPTION.speed },
    why: "Müşteri şikâyet etmeden izleme verisinde eşik aşımı görüldü",
  });
  if (!created) return wf.id;
  step(wf.id, "signal", "done", `Optik ${m.optic} dBm (normal ${NORMAL.optic}) · ${m.drops} kopma/saat`);
  notify(wf.id, "Bağlantınızda bir sorun olabilir", "Bağlantınızda bir sorun olabileceğine dair işaretler tespit ettik ve kontrol ediyoruz. Şu an sizin bir şey yapmanız gerekmiyor.");
  chain("proactive.scope", wf.id, 1200);
  return wf.id;
}
registerOp("proactive.detect", () => detectAnomaly());

/** Customer says "İnternetim çok yavaş": the Speed Optimisation Agent starts with a measurement. */
export function startSpeedCheck(): string {
  const measured = 20;
  setConnectivity({ fixed: "degraded", metric: { optic: -27.1, drops: 3, speed: measured } }, `Hız ölçümü: ${measured} Mbps`);
  const { wf, created } = createWorkflow({
    type: "speed_optimize",
    title: "İnternet hızı kontrolü",
    dedupeKey: `speed:${SUBSCRIPTION.id}`,
    steps: [{ key: "measure", label: "Hız ölçümü" }, ...SPEED_STEPS],
    data: { pkg: SUBSCRIPTION.speed },
    why: "Müşteri internetinin yavaş olduğunu bildirdi",
  });
  if (!created) return wf.id;
  setData(wf.id, { speedBefore: measured });
  step(wf.id, "measure", "done", `Paketiniz ${SUBSCRIPTION.speed} Mbps · ölçülen ${measured} Mbps (demo ölçüm)`, "Ölçülen hız paketin %60'ının altında: anlamlı fark");
  notify(wf.id, "Hızınızdaki düşüşü inceliyoruz", "Sorunun kaynağını anlayabilmek için bağlantınızla ilgili gerekli kontrolleri yapıyoruz. Sonuçlandığında size haber vereceğiz.");
  chain("proactive.speed", wf.id, 1200);
  return wf.id;
}

export function assessScope(id: string) {
  if (stepStatus(id, "scope") !== "pending") return;
  step(id, "scope", "in_progress", "Aynı dağıtım kutusundaki hatlar sorgulanıyor");
  schedule("proactive.scoped", id, 1400);
}
registerOp("proactive.scope", assessScope);
registerOp("proactive.scoped", (id) => {
  const healthy = MockNetworkAPI.neighboursHealthy();
  step(id, "scope", "done", healthy ? "Komşu 24 hat normal → sorun büyük olasılıkla yalnızca bu hatta (kesin teşhis değil)" : "Birden çok hat etkilenmiş → bölgesel olabilir", "Bölgesel sorunlarda müşteriye özel arıza varmış gibi yönlendirme yapılmaz");
  chain("proactive.speed", id, 1200);
});

export function analyzeSpeed(id: string) {
  if (stepStatus(id, "speed") !== "pending") return;
  step(id, "speed", "in_progress", "Hız, modem ve hat verileri inceleniyor");
  schedule("proactive.speeded", id, 1500);
}
registerOp("proactive.speed", analyzeSpeed);
registerOp("proactive.speeded", (id) => {
  const before = getWf(id)?.data["speedBefore"] ?? W.getState().connectivity.metric.speed ?? 21;
  setData(id, { speedBefore: before, causes: SPEED_CAUSES.join("|") });
  step(id, "speed", "done", `Paket ${SUBSCRIPTION.speed} Mbps · ölçülen ${before} Mbps. Olası nedenler: ${SPEED_CAUSES.join(", ")} (kesin teşhis değil)`);
  chain("proactive.remote", id, 1200);
});

export function tryRemoteFix(id: string) {
  if (stepStatus(id, "remote") !== "pending") return;
  if (stepStatus(id, "speed") && stepStatus(id, "speed") !== "done") return;
  step(id, "remote", "in_progress", "Hat profili yenileme, Wi-Fi kanal değişimi ve uzaktan yeniden başlatma (güvenli, geri alınabilir)");
  schedule("proactive.remoted", id, 2000);
}
registerOp("proactive.remote", tryRemoteFix);
registerOp("proactive.remoted", (id) => {
  const ok = MockNetworkAPI.remoteFixWorks();
  setData(id, { remoteOk: ok });
  step(id, "remote", "done", ok ? "Uzaktan iyileştirme uygulandı" : "Uzaktan işlemler yeterli olmadı; yapılan değişiklikler geri alındı");
  chain("proactive.retest", id, 1200);
});

export function retestSpeed(id: string) {
  if (stepStatus(id, "retest") !== "pending" || stepStatus(id, "remote") !== "done") return;
  step(id, "retest", "in_progress", "Hız testi yapılıyor");
  schedule("proactive.retested", id, 1500);
}
registerOp("proactive.retest", retestSpeed);
registerOp("proactive.retested", (id) => {
  const wf = getWf(id);
  if (!wf) return;
  const ok = wf.data["remoteOk"] === true;
  const before = Number(wf.data["speedBefore"] ?? 21);
  // Never above the package / physical capacity.
  const after = ok ? Math.min(94, SUBSCRIPTION.speed) : 23;
  setData(id, { speedAfter: after });
  if (ok) {
    step(id, "retest", "done", `${before} → ${after} Mbps (paket ${SUBSCRIPTION.speed} Mbps)`);
    step(id, "field", "skipped", "Uzaktan çözüldü, teknik ekip ziyareti gerekmedi");
    setConnectivity({ fixed: "up", metric: { optic: -19.3, drops: 0, speed: after } }, `Uzaktan iyileştirme sonrası ${after} Mbps`);
    chain("proactive.verify", id, 1200);
  } else {
    step(id, "retest", "done", `${before} → ${after} Mbps · uzaktan iyileşme sağlanamadı`, "Hız, fiziksel hat sorunu giderilmeden artırılamaz");
    chain("proactive.field", id, 1200);
  }
});

export function openFieldOrder(id: string) {
  if (stepStatus(id, "field") !== "pending") return;
  const wo = workOrder(id, { kind: "field_repair", title: "Optik sinyal zayıflığı · saha kontrolü", team: TEAMS.field }, "Uzaktan çözüm başarısız; fiziksel kablo/konnektör kontrolü gerekiyor");
  setWorkOrder(id, "field_repair", "in_progress");
  step(id, "field", "in_progress", `${wo.id} · tahmini ziyaret yarın 09:00–12:00 (demo)`);
  setStatus(id, "in_progress", { eta: "Teknisyen yarın 09:00–12:00 (demo)" });
  notify(id, "Teknik ekip için işlem kaydı oluşturduk", "Sorunu uzaktan çözemedik. Teknisyenimiz yarın 09:00–12:00 arası gelecek; arıza kaydı açmanıza gerek yok.");
  chain("proactive.fieldDone", id, 5000);
}
registerOp("proactive.field", openFieldOrder);

export function fieldDone(id: string) {
  if (stepStatus(id, "field") !== "in_progress") return;
  setWorkOrder(id, "field_repair", "done");
  step(id, "field", "done", "Hasarlı fiber patch kablosu değiştirildi (demo)");
  setData(id, { speedAfter: 95 });
  setConnectivity({ fixed: "up", metric: { optic: -19.1, drops: 0, speed: 95 } }, "Saha onarımı sonrası bağlantı normal");
  chain("proactive.verify", id, 1200);
}
registerOp("proactive.fieldDone", fieldDone);

export function verifyProactive(id: string) {
  const wf = getWf(id);
  if (!wf || stepStatus(id, "verify") !== "pending" || W.getState().connectivity.fixed !== "up") return;
  const after = Number(wf.data["speedAfter"] ?? 94);
  step(id, "verify", "done", `30 dk bağlantı kararlılığı kontrolü: kopma yok, ${after} Mbps (demo)`);
  notify(id, "Bağlantı sorununuz giderildi", wf.data["remoteOk"] ? "Bağlantınızdaki dalgalanmayı uzaktan giderdik. Şu anda bağlantınız normal görünüyor." : "Teknik ekibimiz onarımı tamamladı, bağlantınızı doğruladık.");
  complete(id, {
    resolved: true,
    summary: wf.data["remoteOk"] ? "Sorun uzaktan çözüldü, hız normale döndü" : "Sorun teknik ekiple çözüldü, müşteri kayıt açmadı",
    results: [
      wf.type === "speed_optimize" ? "Müşteri yavaşlık bildirdi, ölçümle doğrulandı" : "Dalgalanma otomatik tespit edildi",
      `Hız: ${wf.data["speedBefore"] ?? "—"} → ${after} Mbps (paket ${SUBSCRIPTION.speed} Mbps)`,
      wf.data["remoteOk"] ? "Uzaktan iyileştirme yeterli oldu" : "Teknik ekip için işlem kaydı açıldı ve kapandı",
    ],
  });
}
registerOp("proactive.verify", verifyProactive);

/**
 * Customer-run diagnostic: "Modeminin yanına yaklaşarak tekrar ölçüm yapalım."
 * Separates Wi-Fi coverage from line performance. Never changes the plan or claims a fix.
 */
export function measureNearModem(id: string): number | null {
  const wf = getWf(id);
  if (!wf || (wf.type !== "speed_optimize" && wf.type !== "proactive_fault") || wf.data["nearSpeed"] != null) return null;
  const before = Number(wf.data["speedBefore"] ?? 20);
  const near = before + 3; // demo: nearly the same speed next to the modem → not a Wi-Fi coverage problem
  setData(id, { nearSpeed: near });
  log(id, "customer", "info", `Modemin yanında ölçüm: ${near} Mbps (demo)`, "Modem yanında da düşükse sorun Wi-Fi kapsaması değil, hat veya modem tarafındadır");
  return near;
}
