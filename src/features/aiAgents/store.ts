import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { uid } from "@/lib/format";
import type { AgentId } from "@/data/mock";

export interface AgentAction {
  id: string;
  agent: AgentId;
  title: string;
  detail: string;
  time: number;
  undone?: boolean;
  noRepeat?: boolean;
}

export type SpeedRunStatus = "idle" | "running" | "done";

interface AgentsState {
  enabled: Record<AgentId, boolean>;
  actions: AgentAction[];
  speedRun: { status: SpeedRunStatus; stepIndex: number; before: number; after: number; at: number | null };
  stats: { solved: number; minutesSaved: number; callsPrevented: number };
  toggle: (id: AgentId, v: boolean) => void;
  addAction: (a: Omit<AgentAction, "id" | "time">) => void;
  undo: (id: string) => void;
  noRepeat: (id: string) => void;
  setSpeedRun: (p: Partial<AgentsState["speedRun"]>) => void;
  addStats: (solved: number, minutes: number, calls: number) => void;
  reset: () => void;
}

const T = (iso: string) => new Date(iso).getTime();

const initial = () => ({
  enabled: { speed: true, backup: true, modem: true, bill: true } as Record<AgentId, boolean>,
  actions: [
    { id: "a1", agent: "modem" as AgentId, title: "Modem sağlık kontrolü", detail: "Optik güç -19,8 dBm, sıcaklık 41°C — normal", time: T("2026-10-21T08:00:00+03:00") },
    { id: "a2", agent: "bill" as AgentId, title: "Fatura hatırlatması", detail: "Eylül faturası otomatik ödendi: ₺749,90", time: T("2026-09-05T09:00:00+03:00") },
    { id: "a3", agent: "speed" as AgentId, title: "Wi-Fi kanal optimizasyonu", detail: "Akşam yoğunluğu öncesi kanal 1 → 11", time: T("2026-09-28T19:40:00+03:00") },
  ],
  speedRun: { status: "idle" as SpeedRunStatus, stepIndex: -1, before: 20, after: 98, at: null as number | null },
  stats: { solved: 7, minutesSaved: 96, callsPrevented: 4 },
});

export const useAgentsStore = create<AgentsState>()(
  persist(
    (set) => ({
      ...initial(),
      toggle: (id, v) => set((s) => ({ enabled: { ...s.enabled, [id]: v } })),
      addAction: (a) => set((s) => ({ actions: [{ ...a, id: uid(), time: Date.now() }, ...s.actions] })),
      undo: (id) => set((s) => ({ actions: s.actions.map((a) => (a.id === id ? { ...a, undone: true } : a)) })),
      noRepeat: (id) => set((s) => ({ actions: s.actions.map((a) => (a.id === id ? { ...a, noRepeat: true } : a)) })),
      setSpeedRun: (p) => set((s) => ({ speedRun: { ...s.speedRun, ...p } })),
      addStats: (solved, minutes, calls) =>
        set((s) => ({ stats: { solved: s.stats.solved + solved, minutesSaved: s.stats.minutesSaved + minutes, callsPrevented: s.stats.callsPrevented + calls } })),
      reset: () => set(initial()),
    }),
    { name: "tn-agents", storage: createJSONStorage(() => localStorage), skipHydration: true },
  ),
);
