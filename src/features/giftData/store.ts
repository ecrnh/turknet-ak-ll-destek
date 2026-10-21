import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { uid } from "@/lib/format";
import type { Operator } from "@/data/mock";
import { clampShare, giftForOutage } from "./gift";

export interface Share {
  id: string;
  to: string;
  gb: number;
  time: number;
}

interface GiftState {
  outageHours: number;
  giftGB: number;
  overlaySeen: boolean;
  restoredPending: boolean;
  activated: boolean;
  phone: string;
  operator: Operator | null;
  activatedAt: number | null;
  validUntil: number | null;
  totalGB: number;
  usedGB: number;
  freeAppsGB: number;
  shares: Share[];
  remotePriority: boolean;
  setOutage: (hours: number) => { prev: number; next: number };
  seeOverlay: () => void;
  activate: (phone: string, operator: Operator) => void;
  share: (to: string, gb: number) => number;
  setRemotePriority: (v: boolean) => void;
  setRestored: (v: boolean) => void;
  reset: () => void;
}

const initial = () => ({
  outageHours: 0,
  giftGB: 0,
  overlaySeen: true,
  restoredPending: false,
  activated: false,
  phone: "",
  operator: null as Operator | null,
  activatedAt: null as number | null,
  validUntil: null as number | null,
  totalGB: 0,
  usedGB: 0,
  freeAppsGB: 0,
  shares: [] as Share[],
  remotePriority: false,
});

export const useGiftStore = create<GiftState>()(
  persist(
    (set, get) => ({
      ...initial(),
      setOutage: (hours) => {
        const prev = get().giftGB;
        const next = giftForOutage(hours);
        set((s) => ({
          outageHours: hours,
          giftGB: Math.max(next, s.giftGB),
          overlaySeen: next > prev ? false : s.overlaySeen,
          totalGB: s.activated && next > prev ? s.totalGB + (next - prev) : s.totalGB,
        }));
        return { prev, next };
      },
      seeOverlay: () => set({ overlaySeen: true }),
      activate: (phone, operator) => {
        const now = Date.now();
        set((s) => ({
          activated: true,
          phone,
          operator,
          activatedAt: now,
          validUntil: now + 30 * 86_400_000,
          totalGB: s.giftGB,
          usedGB: 1.4,
          freeAppsGB: 3.2,
        }));
      },
      share: (to, gb) => {
        const s = get();
        const remaining = s.totalGB - s.usedGB;
        const amount = clampShare(gb, remaining);
        if (amount <= 0) return 0;
        set({ totalGB: Math.round((s.totalGB - amount) * 10) / 10, shares: [{ id: uid(), to, gb: amount, time: Date.now() }, ...s.shares] });
        return amount;
      },
      setRemotePriority: (v) => set({ remotePriority: v }),
      setRestored: (v) => set({ restoredPending: v }),
      reset: () => set(initial()),
    }),
    { name: "tn-gift", storage: createJSONStorage(() => localStorage), skipHydration: true },
  ),
);
