/** In-memory (per session) proactive GIGA state: pending offer + dedupe. Not persisted on purpose. */
import { create } from "zustand";
import { COOLDOWN_MS, SHOW_DELAY_MS, shouldShow, signalKey, type Signal } from "./rules";
import { track } from "@/lib/analytics";

interface ProactiveState {
  pending: Signal | null;
  visible: boolean;
  seen: Set<string>;
  cooldownUntil: number;
  lastSignal: Signal | null;
  emit: (s: Signal) => boolean;
  close: (accepted: boolean) => void;
  reset: () => void;
}

let timer: ReturnType<typeof setTimeout> | null = null;

export const useProactive = create<ProactiveState>((set, get) => ({
  pending: null, visible: false, seen: new Set(), cooldownUntil: 0, lastSignal: null,
  emit: (s) => {
    const st = get();
    if (st.pending || !shouldShow(s, st.seen, st.cooldownUntil)) return false;
    const seen = new Set(st.seen).add(signalKey(s));
    set({ pending: s, seen, cooldownUntil: s.at + COOLDOWN_MS, lastSignal: s });
    console.info("[proactive] signal", s);
    timer = setTimeout(() => {
      if (get().pending !== s) return;
      set({ visible: true });
      track("proactive_shown", s.feature, { type: s.type });
    }, SHOW_DELAY_MS);
    return true;
  },
  close: (accepted) => {
    const s = get().pending;
    if (s) track(accepted ? "proactive_accepted" : "proactive_dismissed", s.feature, { type: s.type });
    set({ pending: null, visible: false });
  },
  reset: () => {
    if (timer) clearTimeout(timer);
    set({ pending: null, visible: false, seen: new Set(), cooldownUntil: 0, lastSignal: null });
  },
}));
