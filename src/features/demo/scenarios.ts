import { useAppStore } from "@/features/core/appStore";
import { useAgentsStore } from "@/features/aiAgents/store";
import { useGiftStore } from "@/features/giftData/store";
import { useFamilyStore } from "@/features/family/store";
import { useQrStore } from "@/features/qrSupport/store";
import { useVideoStore } from "@/features/videoSupport/store";
import { BACKUP_POP, SPEED_FIX_STEPS, USER } from "@/data/mock";
import { track } from "@/lib/analytics";

const app = () => useAppStore.getState();
const agents = () => useAgentsStore.getState();
const gift = () => useGiftStore.getState();

let timers: ReturnType<typeof setTimeout>[] = [];
const later = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));

export function clearScenarioTimers() {
  timers.forEach(clearTimeout);
  timers = [];
}

/** Hız Koruyucu Ajan: detect → analyse → fix → verify. Step index streams to UI. */
export function runSpeedAgent() {
  const a = agents();
  if (a.speedRun.status === "running") return;
  a.setSpeedRun({ status: "running", stepIndex: 0, before: 20, after: 98, at: Date.now() });
  SPEED_FIX_STEPS.forEach((_, i) => {
    if (i === 0) return;
    later(i * 1400, () => agents().setSpeedRun({ stepIndex: i }));
  });
  later(SPEED_FIX_STEPS.length * 1400, () => {
    agents().setSpeedRun({ status: "done", stepIndex: SPEED_FIX_STEPS.length - 1 });
    app().setNet({ status: "online", speed: 98 });
    agents().addAction({ agent: "speed", title: "Hızını 20 Mbps'ten 98 Mbps'e yükselttim", detail: "Wi-Fi kanal 6 → 11 · hat profili yenilendi · uzaktan yeniden başlatma" });
    agents().addStats(1, 25, 1);
    app().addRecord({
      channel: "Ajan",
      title: "Hız düşüşü otomatik düzeltildi",
      summary: "Hız Koruyucu Ajan hızını 20 → 98 Mbps'e çıkardı.",
      status: "Çözüldü",
      details: SPEED_FIX_STEPS,
      to: "/ajanlar/hiz",
      fieldVisitAvoided: true,
    });
    app().addHistory("Hız Koruyucu Ajan", "Hız 20 → 98 Mbps'e yükseltildi");
    app().notify({ kind: "agent", title: "Hızını 20 Mbps'ten 98 Mbps'e yükselttim", body: "Wi-Fi kanalını değiştirdim ve hat profilini yeniledim. Dokun, detayları gör.", to: "/ajanlar/hiz" });
    track("flow_completed", "ai_speed_agent");
  });
}

export function simulateSpeedDrop() {
  clearScenarioTimers();
  app().setNet({ status: "slow", speed: 20 });
  agents().setSpeedRun({ status: "idle", stepIndex: -1 });
  if (agents().enabled.speed) {
    app().notify({ kind: "agent", title: "Hız düşüşü fark ettim", body: "Paketin 100 Mbps, ölçülen 20 Mbps. Hemen düzeltiyorum…", to: "/ajanlar/hiz" });
    later(1500, runSpeedAgent);
  } else {
    app().notify({ kind: "agent", title: "Hızın düştü (20 Mbps)", body: "Hız Koruyucu Ajan kapalı. Açarsan otomatik düzeltirim.", to: "/ajanlar" });
  }
}

export function switchToBackup() {
  const net = app().net;
  if (net.status !== "outage" && net.status !== "backup") {
    startOutage(Math.max(gift().outageHours, 10));
  }
  app().setNet({ status: "backup", speed: 92, ping: 8 + BACKUP_POP.pingDelta });
  agents().setBackup({ active: true, since: Date.now(), returning: false });
  agents().addAction({ agent: "backup", title: `Seni ${BACKUP_POP.region} altyapısından bağladım`, detail: `${USER.location} hattında arıza var. Ping +${BACKUP_POP.pingDelta} ms, ana hat düzelince geri döneceğim.` });
  agents().addStats(1, 40, 1);
  app().addRecord({
    channel: "Ajan",
    title: "Yedek altyapıya geçici bağlantı",
    summary: `Kesinti süresince ${BACKUP_POP.name} üzerinden bağlandın.`,
    status: "Aktif",
    details: [`Bağlanılan: ${BACKUP_POP.name}`, `Ping farkı: +${BACKUP_POP.pingDelta} ms`, "Otomatik geri dönüş: açık"],
    to: "/ajanlar/yedek",
  });
  app().notify({ kind: "agent", title: "Geçici bağlantı aktif", body: `İnternetin ${BACKUP_POP.region} altyapısından çalışıyor. Ana hat düzelince otomatik geri döneceğim.`, to: "/ajanlar/yedek" });
}

export function startOutage(hours: number) {
  clearScenarioTimers();
  const now = Date.now();
  const wasOut = ["outage", "backup"].includes(app().net.status);
  if (!wasOut) {
    app().setNet({ status: "outage", speed: 0, outageStartedAt: now - hours * 3_600_000, etaAt: now + 4 * 3_600_000, lastUpdate: now });
  } else {
    app().setNet({ outageStartedAt: now - hours * 3_600_000, lastUpdate: now });
  }
  const { prev, next } = gift().setOutage(hours);
  if (next > prev) {
    app().notify({
      kind: "gift",
      title: prev === 0 ? `Sakin ol, farkındayız. Sana ${next} GB hediye ettik` : `Hediyen ${next} GB'a yükseldi`,
      body: prev === 0 ? "Sorunu çözmek için çalışıyoruz. Hediyeni hangi operatörü kullanırsan kullan hattına tanımlayalım." : `Kesinti ${hours} saati geçti, hediye internetine ${next - prev} GB ekledik.`,
      to: "/hediye",
    });
  } else if (!wasOut) {
    app().notify({ kind: "support", title: "Bölgende kesinti var", body: "Ekiplerimiz çalışıyor. Tahmini düzelme: 4 saat.", to: "/hediye" });
  }
  if (!wasOut && agents().enabled.backup) {
    const consent = app().prefs.backupConsent;
    if (consent === true) later(3500, switchToBackup);
    else if (consent === null)
      app().notify({ kind: "agent", title: "Yedek altyapıdan bağlanayım mı?", body: "Kesinti sürerken seni Tekirdağ altyapısından geçici bağlayabilirim. İzin vermek için dokun.", to: "/ajanlar/yedek" }, false);
  }
}

export function restoreLine() {
  clearScenarioTimers();
  const wasBackup = agents().backup.active;
  const wasDown = ["outage", "backup"].includes(app().net.status);
  if (wasBackup) {
    agents().setBackup({ returning: true });
    later(2600, () => agents().setBackup({ active: false, returning: false, since: null }));
    agents().addAction({ agent: "backup", title: "Ana hatta geri döndüm", detail: "Ümraniye hattı düzeldi, yedek bağlantı kapatıldı." });
    const rec = app().records.find((r) => r.title === "Yedek altyapıya geçici bağlantı" && r.status === "Aktif");
    if (rec) app().updateRecord(rec.id, { status: "Tamamlandı" });
  }
  app().setNet({ status: "online", speed: 96, ping: 8, outageStartedAt: null, etaAt: null, lastUpdate: Date.now() });
  if (wasDown) {
    gift().setRestored(true);
    app().notify({ kind: "support", title: "Hizmet geri geldi", body: "Yaşadığın kesinti için özür dileriz. Hediye internetin 30 gün geçerli.", to: "/hediye" });
  }
}

export function elderVideoScenario() {
  useFamilyStore.getState().switchTo("ayse");
  useVideoStore.getState().setTopic("cable");
  useVideoStore.getState().setInvitees(["Ayşe Koyuncu"]);
}

export function qrFaultScenario() {
  useQrStore.getState().setScan({ at: 0, score: 0, checks: [] });
}

export function resetAll() {
  clearScenarioTimers();
  useAppStore.getState().reset();
  useAgentsStore.getState().reset();
  useGiftStore.getState().reset();
  useFamilyStore.getState().reset();
  useQrStore.getState().reset();
  useVideoStore.getState().reset();
}

export async function rehydrateAll() {
  await Promise.all([
    useAppStore.persist.rehydrate(),
    useAgentsStore.persist.rehydrate(),
    useGiftStore.persist.rehydrate(),
    useFamilyStore.persist.rehydrate(),
    useQrStore.persist.rehydrate(),
    useVideoStore.persist.rehydrate(),
  ]);
}
