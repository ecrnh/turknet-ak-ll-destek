import { create } from "zustand";
import type { ConnectivityStatus } from "@/features/workflow/types";

/** Presenter-chosen result of the connection health check run when the QR is scanned. */
export type QrHealth = "good" | "bad";

/** Presenter-chosen outcome of the AI modem repair after the customer reconnects the cable. */
export type QrRepair = "solved" | "unsolved";

/** Presenter-chosen modem state: "cable" simulates a loose/wrong cable the customer can fix with the camera repair. */
export type QrModem = "ok" | "cable";

export const useQrHealthStore = create<{ health: QrHealth; repair: QrRepair; modem: QrModem }>(() => ({ health: "good", repair: "solved", modem: "ok" }));

/** "Modemim çalışmıyor": only a detected modem fault opens the camera repair; otherwise ask about the lights first. */
export function modemEntryStep(modem: QrModem): "modem_ai" | "lights" {
  return modem === "cable" ? "modem_ai" : "lights";
}

export const HEALTH_CHECKS = ["Modem bağlantısı kontrol ediliyor", "Hat sinyali ölçülüyor", "Wi-Fi kanalı inceleniyor", "Bağlantı kalitesi değerlendiriliyor"];

/** Pure copy for the finished health check. */
export function resolveQrHealth(i: { health: QrHealth; fixed: ConnectivityStatus["fixed"]; outageOngoing: boolean }): QrHealth {
  return i.outageOngoing || i.fixed === "down" ? "bad" : i.health;
}

export function healthResult(h: QrHealth, outage = false): { title: string; body: string } {
  if (outage) return { title: "İnternet bağlantında kesinti tespit ettik", body: "Ana internetindeki kesinti devam ediyor. Bağlantını normal olarak gösteremiyoruz." };
  return h === "good"
    ? { title: "İnternet bağlantın normal görünüyor", body: "Modemin, hattın ve Wi-Fi'ın sorunsuz çalışıyor." }
    : { title: "Bağlantında sorun tespit ettik", body: "Hat sinyalinde zayıflama ve kopmalar var. Birlikte adım adım çözelim." };
}
