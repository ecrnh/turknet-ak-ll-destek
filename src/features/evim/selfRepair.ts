/** Pure Self Servis Onarım rules: where a QR scan lands and how the guided repair steps advance (tested in src/test/self-repair.test.ts). */

export type RepairSource = "kisisel" | "genel";
export type RepairProblem = "slow" | "down";
export type RepairStep = "verify" | "choose" | "analyze" | "diagnosis" | "camera" | "guide" | "check" | "solved" | "unsolved" | "ticket" | "ticketDone";

/** After any QR scan the user lands in self-service repair, never in the assistant chat. */
export const QR_REPAIR_PATH = "/onarim" as const;

/** Visible progress stages (the user always sees where they are). */
export const STAGES = ["Doğrulama", "Sorun", "Analiz", "Çözüm", "Sonuç"] as const;
export function stageOf(step: RepairStep): number {
  if (step === "verify") return 0;
  if (step === "choose") return 1;
  if (step === "analyze" || step === "diagnosis") return 2;
  if (step === "camera" || step === "guide" || step === "check") return 3;
  return 4;
}

/** A personal (modem) QR already knows the line, so it skips straight to the slow-speed repair; a general QR asks first. */
export function afterVerify(source: RepairSource): RepairStep {
  return source === "kisisel" ? "analyze" : "choose";
}
export function defaultProblem(source: RepairSource): RepairProblem | null {
  return source === "kisisel" ? "slow" : null;
}

/** Slow speed found a physical cable problem → visual support; no connection → remote modem restart. */
export function afterDiagnosis(problem: RepairProblem): RepairStep {
  return problem === "slow" ? "camera" : "check";
}

export function afterCheck(works: boolean): RepairStep {
  return works ? "solved" : "unsolved";
}

/** "Yeniden deneyelim" repeats the hands-on part of the chosen problem. */
export function retryStep(problem: RepairProblem): RepairStep {
  return problem === "slow" ? "guide" : "diagnosis";
}

export const SOLVE_POINTS = 15;

export const ANALYSIS: Record<RepairProblem, { checks: string[]; finding: string; detail: string; solution: string }> = {
  slow: {
    checks: ["Modem bağlantı kontrolü", "İnternet bağlantı durumu", "Hız kontrolü", "Olası bağlantı problemi"],
    finding: "Wi-Fi kablolarının doğru bağlanmadığını fark ettik.",
    detail: "Hattın sağlam, ancak modeme ulaşan hız beklenenin altında (ölçülen 21 Mbps / paket 100 Mbps).",
    solution: "Bu işi beraber 2 dakika içerisinde çözebiliriz.",
  },
  down: {
    checks: ["Modem bağlantı kontrolü", "Fiber hat sinyali", "İnternet oturumu", "Olası bağlantı problemi"],
    finding: "Modemin internet oturumu düşmüş görünüyor.",
    detail: "Fiber hattında sinyal var; modemin yeniden başlatılması oturumu genellikle düzeltir.",
    solution: "Modemini uzaktan yeniden başlatabiliriz.",
  },
};
