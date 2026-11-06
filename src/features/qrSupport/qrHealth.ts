import { create } from "zustand";

/** Presenter-chosen result of the connection health check run when the QR is scanned. */
export type QrHealth = "good" | "bad";

export const useQrHealthStore = create<{ health: QrHealth }>(() => ({ health: "good" }));

export const HEALTH_CHECKS = ["Modem bağlantısı kontrol ediliyor", "Hat sinyali ölçülüyor", "Wi-Fi kanalı inceleniyor", "Bağlantı kalitesi değerlendiriliyor"];

/** Pure copy for the finished health check. */
export function healthResult(h: QrHealth): { title: string; body: string } {
  return h === "good"
    ? { title: "İnternet bağlantın normal görünüyor", body: "Modemin, hattın ve Wi-Fi'ın sorunsuz çalışıyor." }
    : { title: "Bağlantında sorun tespit ettik", body: "Hat sinyalinde zayıflama ve kopmalar var. Birlikte adım adım çözelim." };
}
