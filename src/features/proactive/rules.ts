/** Pure behaviour-signal rules for proactive GIGA (rage click, quick back). Tested in src/test/proactive.test.ts. */
import { PROACTIVE_FEATURES } from "@/data/mock";

export const RAGE_WINDOW_MS = 2000;
export const RAGE_MIN_CLICKS = 3;
export const QUICK_BACK_MS = 7000;
export const SHOW_DELAY_MS = 2500; // always well under the 30 s promise
export const COOLDOWN_MS = 60_000;

export type SignalType = "rage_click" | "quick_back";
export interface Signal { type: SignalType; path: string; feature: string; intent?: string | undefined; left?: string; at: number }
export interface Click { key: string; at: number }
export interface Visit { path: string; at: number }

const norm = (p: string) => (p.length > 1 ? p.replace(/\/+$/, "") : p);

export function featureForPath(path: string) {
  const p = norm(path);
  const hit = [...PROACTIVE_FEATURES].sort((a, b) => b.path.length - a.path.length)
    .find((f) => (f.path === "/" ? p === "/" : p === f.path || p.startsWith(f.path + "/")));
  return hit ?? { path: p, feature: "bu sayfa" };
}

/**
 * Feed clicks in order. Returns true exactly once per streak: when the RAGE_MIN_CLICKS-th
 * click on the same target lands within RAGE_WINDOW_MS. Further clicks of that streak return false.
 */
export function createRageDetector() {
  let clicks: Click[] = [];
  let firedKey: string | null = null;
  return (c: Click): boolean => {
    clicks = clicks.filter((x) => x.key === c.key && c.at - x.at <= RAGE_WINDOW_MS);
    if (clicks.length === 0) firedKey = null; // streak broken
    clicks.push(c);
    if (clicks.length >= RAGE_MIN_CLICKS && firedKey !== c.key) { firedKey = c.key; return true; }
    return false;
  };
}

/** history: oldest → newest, last entry is the page just entered. A→B→A with B shorter than QUICK_BACK_MS. */
export function detectQuickBack(history: Visit[]): { left: string; back: string } | null {
  if (history.length < 3) return null;
  const [a, b, c] = history.slice(-3) as [Visit, Visit, Visit];
  if (norm(a.path) !== norm(c.path) || norm(a.path) === norm(b.path)) return null;
  if (c.at - b.at >= QUICK_BACK_MS) return null;
  return { left: norm(b.path), back: norm(c.path) };
}

export const signalKey = (s: Pick<Signal, "type" | "feature">) => `${s.type}:${s.feature}`;

export function shouldShow(s: Signal, seen: ReadonlySet<string>, cooldownUntil: number) {
  return !seen.has(signalKey(s)) && s.at >= cooldownUntil;
}

export function proactiveMessage(s: Signal) {
  const subject = s.feature === "bu sayfa" || s.feature === "ana sayfa" ? "bu sayfada" : `${s.feature} işlemiyle ilgili`;
  const lead = s.type === "rage_click" ? `${cap(subject)} bir sorun yaşadığınızı fark ettim.` : `${cap(subject)} aradığınızı bulamamış olabilirsiniz.`;
  return `${lead} Yardım etmemi ister misiniz?`;
}
const cap = (t: string) => t.charAt(0).toLocaleUpperCase("tr-TR") + t.slice(1);
