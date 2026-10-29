/**
 * Proactive fault detection: compares demo connection metrics against normal
 * ranges, assesses scope (single line vs. region), runs safe reversible remote
 * actions and opens a field work order only when needed.
 */
import { SUBSCRIPTION, TEAMS } from "@/data/mock";
import { chain, complete, createWorkflow, getWf, log, notify, registerOp, schedule, setData, setStatus, setWorkOrder, step, stepStatus, workOrder } from "../engine";
import { MockNetworkAPI } from "../mockServices";
import { useWorkflowStore as W } from "../store";
import { setConnectivity } from "./connectivity";

export const NORMAL = { optic: -19.2, drops: 0 };
export const isAnomalous = (m: { optic: number; drops: number }) => m.optic < -26 || m.drops > 5;

export function injectAnomaly() {
  setConnectivity({ fixed: "degraded", metric: { optic: -27.8, drops: 14 } }, "Anormal sinyal: optik -27.8 dBm, 14 kopma/saat");
  log(null, "system", "info", "İzleme: optik güç ve kopma sayısı normal aralığın dışında", `Normal: ${NORMAL.optic} dBm, ${NORMAL.drops} kopma`);
  chain("proactive.detect", "monitor", 1500);
}

export function detectAnomaly(): string | null {
  const m = W.getState().connectivity.metric;
  if (!isAnomalous(m)) return null;
  const { wf, created } = createWorkflow({
    type: "proactive_fault",
    title: "Proaktif arıza tespiti",
    dedupeKey: `proactive:${SUBSCRIPTION.id}`,
    steps: [
      { key: "signal", label: "Anormal bağlantı sinyali" },
      { key: "scope", label: "Kapsam değerlendirmesi" },
      { key: "remote", label: "Uzaktan güvenli çözüm denemesi" },
      { key: "field", label: "Teknik müdahale (iş emri)" },
      { key: "verify", label: "Çözüm doğrulaması" },
    ],
    why: "Müşteri şikâyet etmeden izleme verisinde eşik aşımı görüldü",
  });
  if (!created) return wf.id;
  step(wf.id, "signal", "done", `Optik ${m.optic} dBm (normal ${NORMAL.optic}) · ${m.drops} kopma/saat`);
  notify(wf.id, "Bağlantında olası bir sorun fark ettim", "Sen bir şey fark etmeden kontrol etmeye başladım. Gerekirse haber vereceğim.");
  chain("proactive.scope", wf.id, 1200);
  return wf.id;
}
registerOp("proactive.detect", () => detectAnomaly());

export function assessScope(id: string) {
  if (stepStatus(id, "scope") !== "pending") return;
  step(id, "scope", "in_progress", "Aynı dağıtım kutusundaki hatlar sorgulanıyor");
  schedule("proactive.scoped", id, 1400);
}
registerOp("proactive.scope", assessScope);
registerOp("proactive.scoped", (id) => {
  const healthy = MockNetworkAPI.neighboursHealthy();
  step(id, "scope", "done", healthy ? "Komşu 24 hat normal → sorun büyük olasılıkla yalnızca bu hatta (kesin teşhis değil)" : "Birden çok hat etkilenmiş → bölgesel olabilir", "Bölgesel sorunlarda müşteriye özel arıza varmış gibi yönlendirme yapılmaz");
  chain("proactive.remote", id, 1200);
});

export function tryRemoteFix(id: string) {
  if (stepStatus(id, "remote") !== "pending") return;
  step(id, "remote", "in_progress", "Hat profili yenileme + modem uzaktan yeniden başlatma (güvenli, geri alınabilir)");
  schedule("proactive.remoted", id, 2000);
}
registerOp("proactive.remote", tryRemoteFix);
registerOp("proactive.remoted", (id) => {
  const ok = MockNetworkAPI.remoteFixWorks();
  setData(id, { remoteOk: ok });
  if (ok) {
    step(id, "remote", "done", "Sinyal normale döndü");
    step(id, "field", "skipped", "Uzaktan çözüldü, saha ziyareti gerekmedi");
    setConnectivity({ fixed: "up", metric: { optic: -19.3, drops: 0 } }, "Uzaktan çözüm sonrası bağlantı normal");
    chain("proactive.verify", id, 1200);
  } else {
    step(id, "remote", "done", "Uzaktan işlemler sorunu gidermedi; yapılan değişiklikler geri alındı");
    chain("proactive.field", id, 1200);
  }
});

export function openFieldOrder(id: string) {
  if (stepStatus(id, "field") !== "pending") return;
  const wo = workOrder(id, { kind: "field_repair", title: "Optik sinyal zayıflığı · saha kontrolü", team: TEAMS.field }, "Uzaktan çözüm başarısız; fiziksel kablo/konnektör kontrolü gerekiyor");
  setWorkOrder(id, "field_repair", "in_progress");
  step(id, "field", "in_progress", `${wo.id} · tahmini ziyaret yarın 09:00–12:00 (demo)`);
  setStatus(id, "in_progress", { eta: "Teknisyen yarın 09:00–12:00 (demo)" });
  notify(id, "Teknik ekip yönlendirdim", "Uzaktan düzeltemedim. Teknisyen yarın 09:00–12:00 arası gelecek; senin arıza kaydı açmana gerek yok.");
  chain("proactive.fieldDone", id, 5000);
}
registerOp("proactive.field", openFieldOrder);

export function fieldDone(id: string) {
  if (stepStatus(id, "field") !== "in_progress") return;
  setWorkOrder(id, "field_repair", "done");
  step(id, "field", "done", "Hasarlı fiber patch kablosu değiştirildi (demo)");
  setConnectivity({ fixed: "up", metric: { optic: -19.1, drops: 0 } }, "Saha onarımı sonrası bağlantı normal");
  chain("proactive.verify", id, 1200);
}
registerOp("proactive.fieldDone", fieldDone);

export function verifyProactive(id: string) {
  const wf = getWf(id);
  if (!wf || stepStatus(id, "verify") !== "pending" || W.getState().connectivity.fixed !== "up") return;
  step(id, "verify", "done", "30 dk izleme: kopma yok, optik -19.1 dBm (demo)");
  notify(id, "Bağlantı sorunun giderildi", wf.data["remoteOk"] ? "Uzaktan düzelttim, sen fark etmeden çözüldü." : "Saha ekibi onarımı tamamladı, bağlantın doğrulandı.");
  complete(id, {
    resolved: true,
    summary: wf.data["remoteOk"] ? "Arıza müşteri fark etmeden uzaktan çözüldü" : "Arıza saha ekibiyle çözüldü, müşteri kayıt açmadı",
    results: ["Anormal sinyal otomatik tespit edildi", wf.data["remoteOk"] ? "Uzaktan çözüm başarılı" : "Saha iş emri açıldı ve kapandı", "Doğrulama: 30 dk kesintisiz (demo)"],
  });
}
registerOp("proactive.verify", verifyProactive);
