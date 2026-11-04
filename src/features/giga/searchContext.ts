import { create } from "zustand";
import type { SearchIntentId } from "./smartSearch";

export interface SearchMsg { from: "user" | "giga"; text: string }

/** In-memory context from the home smart search, kept while visiting the destination screen. */
interface SearchCtx {
  query: string | null;
  intent: SearchIntentId | null;
  to: string | null;
  msgs: SearchMsg[];
  set: (query: string, intent: SearchIntentId, to: string, reply: string) => void;
  push: (m: SearchMsg) => void;
  clear: () => void;
}

export const useSearchCtx = create<SearchCtx>((set) => ({
  query: null, intent: null, to: null, msgs: [],
  set: (query, intent, to, reply) => set({ query, intent, to, msgs: [{ from: "user", text: query }, { from: "giga", text: reply }] }),
  push: (m) => set((s) => ({ msgs: [...s.msgs, m] })),
  clear: () => set({ query: null, intent: null, to: null, msgs: [] }),
}));
