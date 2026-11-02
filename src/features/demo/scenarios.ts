import { useGigaChat } from "@/features/giga/chatStore";
import { useAppStore } from "@/features/core/appStore";
import { useAgentsStore } from "@/features/aiAgents/store";
import { useFamilyStore } from "@/features/family/store";
import { useQrStore } from "@/features/qrSupport/store";
import { useVideoStore } from "@/features/videoSupport/store";
import { SPEED_FIX_STEPS } from "@/data/mock";
import { track } from "@/lib/analytics";
import { useWorkflowStore } from "@/features/workflow/store";
import { useScenarioStore } from "@/features/scenario/store";
import { initialScenario } from "@/features/scenario/store";

const app = () => useAppStore.getState();
const agents = () => useAgentsStore.getState();

let timers: ReturnType<typeof setTimeout>[] = [];
const later = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));

export function clearScenarioTimers() {
  timers.forEach(clearTimeout);
  timers = [];
}

/** GIGA Hız Koruyucu: detect → analyse → fix → verify. Step index streams to UI. */
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
      channel: "GIGA",
      title: "Hız düşüşü otomatik düzeltildi",
      summary: "Hız Koruyucu hızını 20 → 98 Mbps'e çıkardı.",
      status: "Çözüldü",
      details: SPEED_FIX_STEPS,
      to: "/ajanlar/hiz",
      fieldVisitAvoided: true,
    });
    app().addHistory("Hız Koruyucu", "Hız 20 → 98 Mbps'e yükseltildi");
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
    app().notify({ kind: "agent", title: "Hızın düştü (20 Mbps)", body: "Hız Koruyucu kapalı. Açarsan hız belirgin düştüğünde güvenli uzaktan düzeltme yapabilirim.", to: "/ajanlar/kontroller" });
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
  useFamilyStore.getState().reset();
  useQrStore.getState().reset();
  useVideoStore.getState().reset();
  useWorkflowStore.getState().reset();
  useScenarioStore.setState(initialScenario());
  useGigaChat.getState().clear();
}

export async function rehydrateAll() {
  await Promise.all([
    useAppStore.persist.rehydrate(),
    useAgentsStore.persist.rehydrate(),
    useFamilyStore.persist.rehydrate(),
    useQrStore.persist.rehydrate(),
    useVideoStore.persist.rehydrate(),
    useWorkflowStore.persist.rehydrate(),
    useScenarioStore.persist.rehydrate(),
  ]);
}
