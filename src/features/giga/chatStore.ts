/**
 * The current GIGA conversation (in memory only, not persisted). Lives outside
 * the screen so leaving to a process page and coming back keeps the context:
 * GIGA never asks again what it already heard in this session.
 */
import { create } from "zustand";
import type { Intent } from "@/features/workflow/rules";
import type { GigaAction } from "./assistant";

export interface ChatMsg {
  id: number;
  from: "user" | "bot";
  text: string;
  actions?: GigaAction[] | undefined;
  /** Streams Hız Koruyucu steps. */
  agent?: boolean | undefined;
  /** Shows this process live inside the chat. */
  wfId?: string | undefined;
}

interface ChatState {
  msgs: ChatMsg[];
  /** What GIGA proposed last, so "evet" / "başlat" can start it. */
  lastOffer: Intent | null;
  add: (m: Omit<ChatMsg, "id">) => void;
  setOffer: (i: Intent | null) => void;
  clear: () => void;
}

let seq = 0;

export const useGigaChat = create<ChatState>((set) => ({
  msgs: [],
  lastOffer: null,
  add: (m) => set((s) => ({ msgs: [...s.msgs, { ...m, id: ++seq }] })),
  setOffer: (lastOffer) => set({ lastOffer }),
  clear: () => set({ msgs: [], lastOffer: null }),
}));
