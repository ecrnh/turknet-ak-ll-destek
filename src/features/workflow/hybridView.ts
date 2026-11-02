import type { ConnectivityStatus, HybridStatus } from "./types";

/**
 * What the Hibrit İnternet page says, derived from one snapshot of the real
 * connection state. Pure so the "never say normal while the main line is down"
 * rule is testable. The automatic-switch preference is NOT part of the status
 * text; it lives in its own settings card.
 */
export type HybridPhase = "normal" | "slow" | "restored" | "down_waiting" | "down_open" | "activating" | "backup";
export type HybridTone = "ok" | "warn" | "down" | "info";

export interface HybridViewInput {
  fixed: ConnectivityStatus["fixed"];
  /** An outage record is open (not restored). */
  outageOngoing: boolean;
  /** The last outage was restored recently and verified/being verified. */
  restored: boolean;
  restoredVerified: boolean;
  /** Elapsed outage hours (0 when unknown). */
  hours: number;
  /** The 24-hour rule allows opening the backup now. */
  offerOpen: boolean;
  status: HybridStatus;
  paused: boolean;
  activatedBy?: "auto" | "customer" | null | undefined;
  autoFailover: boolean;
  hasDevice: boolean;
}

export interface HybridView {
  phase: HybridPhase;
  tone: HybridTone;
  title: string;
  lines: string[];
  main: string;
  box: string;
  mobile: string;
  /** Show the "Hibrit Box'ı Aç" button. */
  showOpen: boolean;
  /** The button can be tapped now. */
  canOpen: boolean;
  /** Short reason under the button when it cannot be tapped yet. */
  openHint: string | null;
  /** Show "you return to the main line automatically" (only while the backup carries traffic). */
  failbackNote: boolean;
}

const LIMIT = 24;

export function hybridView(i: HybridViewInput): HybridView {
  const mainDown = i.fixed === "down" || i.outageOngoing;
  const backupOn = i.status === "active" && !i.paused;
  const box = !i.hasDevice ? "Cihaz yok" : backupOn ? "Aktif" : i.status === "activating" ? "Açılıyor" : "Hazır";
  const mobile = backupOn ? "Bağlı" : i.status === "activating" ? "Bağlanıyor" : "Beklemede";
  const base = { box, mobile, showOpen: false, canOpen: false, openHint: null, failbackNote: false };

  if (!mainDown) {
    if (i.restored) {
      return {
        ...base,
        phase: "restored",
        tone: i.restoredVerified ? "ok" : "info",
        title: i.restoredVerified ? "Ana bağlantına döndün" : "Ana bağlantın doğrulanıyor",
        lines: i.status === "ended" ? ["Ana internetin yeniden bağlandı.", "Hibrit Box mobil bağlantısı otomatik olarak kapatıldı."] : ["Ana internetin yeniden bağlandı.", "Şu anda sabit internetini kullanıyorsun."],
        main: "Bağlı",
        box: i.hasDevice ? "Hazır" : "Cihaz yok",
        mobile: "Beklemede",
      };
    }
    if (i.fixed === "degraded") {
      return {
        ...base,
        phase: "slow",
        tone: "warn",
        title: "Ana internetin yavaş",
        lines: ["Bağlantın açık ama beklenenden yavaş çalışıyor.", "Hibrit Box yalnızca ana internetin kesilirse devreye girer."],
        main: "Yavaş",
      };
    }
    return {
      ...base,
      phase: "normal",
      tone: "ok",
      title: "Bağlantın normal",
      lines: ["Ana internetin aktif.", i.hasDevice ? "Şu anda sabit internetini kullanıyorsun. Hibrit Box olası kesintiler için hazır bekliyor." : "Şu anda sabit internetini kullanıyorsun. Kesinti olursa Hibrit Box'ı ücretsiz gönderebiliriz."],
      main: "Bağlı",
    };
  }

  // Main line is down from here on.
  if (backupOn) {
    return {
      ...base,
      phase: "backup",
      tone: "info",
      title: "Yedek bağlantı aktif",
      lines:
        i.activatedBy === "auto"
          ? ["İnternet bağlantını yeniden sağladık.", `Kesinti ${LIMIT} saati aştığı ve önceden izin verdiğin için Hibrit Box mobil bağlantısı otomatik devreye girdi.`]
          : ["Hibrit Box'ı açtın.", "Ana internetindeki kesinti devam ettiği için mobil bağlantı üzerinden internete bağlısın."],
      main: "Kesik",
      failbackNote: true,
    };
  }
  if (i.status === "activating") {
    return {
      ...base,
      phase: "activating",
      tone: "info",
      title: "Hibrit Box açılıyor…",
      lines: [i.activatedBy === "auto" ? "Önceden verdiğin izinle mobil yedek bağlantın otomatik açılıyor." : "Mobil yedek bağlantın birkaç saniye içinde hazır olacak."],
      main: "Kesik",
    };
  }
  if (i.offerOpen) {
    const lines =
      i.status === "no_device"
        ? ["Hibrit Box için uyumlu cihaz veya aktif SIM bulunamadı.", "Cihazı ücretsiz gönderebiliriz."]
        : i.status === "no_coverage"
          ? ["Adresinde mobil yedek için yeterli kapsama yok.", "Arıza takibin sürüyor; gelişmeleri sana bildireceğiz."]
          : i.status === "failed"
            ? ["Hibrit Box mobil ağa bağlanamadı.", "Tekrar açmayı deneyebilirsin."]
            : i.paused
              ? ["Mobil yedek bağlantıyı duraklattın.", "Hibrit Box'ı yeniden açarak internete bağlı kalabilirsin."]
              : ["Ana internetindeki kesinti devam ediyor.", "Hibrit Box'ı açarak internete bağlı kalabilirsin."];
    const blocked = i.status === "no_device" || i.status === "no_coverage";
    return {
      ...base,
      phase: "down_open",
      tone: "warn",
      title: i.hours >= LIMIT ? `Kesinti ${LIMIT} saati aştı` : `Kesintinin ${LIMIT} saatten uzun sürmesi bekleniyor`,
      lines,
      main: "Kesik",
      showOpen: !blocked,
      canOpen: !blocked,
    };
  }
  return {
    ...base,
    phase: "down_waiting",
    tone: "down",
    title: "Ana internet bağlantın kesildi",
    lines: [
      "Bağlantı kesintisi tespit ettik.",
      !i.hasDevice
        ? `Kesinti ${LIMIT} saati aşarsa Hibrit Box'ı ücretsiz gönderebiliriz.`
        : i.autoFailover
          ? "Hibrit Box hazır. Otomatik yedek geçişi için kesinti süresini takip ediyoruz."
          : "Hibrit Box hazır. Kesinti süresini takip ediyoruz.",
    ],
    main: "Kesik",
    showOpen: i.hasDevice,
    canOpen: false,
    openHint: `Mobil yedek, kesinti ${LIMIT} saati aştığında açılabilir.`,
  };
}

/**
 * Estimated hours until the outage is fixed. Uses the known estimate when there is one;
 * otherwise a demo estimate that always leaves a few hours ahead (never "0 saat").
 * Returns null once a known estimate has passed (the estimate is being updated).
 */
export function outageRemainingH(hours: number, etaH: number | null | undefined, regional: boolean): number | null {
  if (etaH != null) {
    const left = etaH - hours;
    return left > 0 ? Math.max(1, Math.ceil(left)) : null;
  }
  const total = Math.max(regional ? 12 : 6, Math.floor(hours) + 4);
  return Math.max(1, Math.ceil(total - hours));
}

/** Customer wording of the remaining time, e.g. "Yaklaşık 4 saat içinde". */
export function fmtRemaining(left: number | null): string {
  if (left == null) return "Tahmini süre güncelleniyor";
  return left >= 24 ? `Yaklaşık ${Math.round(left / 24) === 1 ? "1 gün" : `${Math.round(left / 24)} gün`} içinde` : `Yaklaşık ${left} saat içinde`;
}
