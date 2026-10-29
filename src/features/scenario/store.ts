import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { DemoAddress } from "@/data/mock";

export interface RelocationDraft {
  address: DemoAddress;
  moveDate: string;
  wantsTemp: boolean;
}

/** Scenario player state (presenter-only). Persisted so a reload keeps the demo position. */
export interface ScenarioState {
  selectedId: string;
  outcomeId: string;
  activeId: string | null;
  playing: boolean;
  ids: Record<string, string>;
  flags: Record<string, boolean>;
  startedAt: number | null;
  finishedAt: number | null;
  draft: RelocationDraft | null;
  /** Transient: route the phone should open next. */
  nav: string | null;
}

export const initialScenario = (): ScenarioState => ({
  selectedId: "A",
  outcomeId: "success",
  activeId: null,
  playing: false,
  ids: {},
  flags: {},
  startedAt: null,
  finishedAt: null,
  draft: null,
  nav: null,
});

export const useScenarioStore = create<ScenarioState>()(
  persist(() => initialScenario(), {
    name: "tn-scenario",
    storage: createJSONStorage(() => localStorage),
    skipHydration: true,
    partialize: (s) => {
      const { nav: _n, playing: _p, ...rest } = s;
      return rest;
    },
  }),
);
