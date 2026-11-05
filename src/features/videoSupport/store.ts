import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { uid } from "@/lib/format";

export interface CallSummary {
  id: string;
  recordId: string;
  startedAt: number;
  durationSec: number;
  participants: string[];
  steps: string[];
  topic: string;
  resolved: boolean | null;
  finding?: string;
  actions?: string[];
  connectionTest?: string;
}

export interface Appointment {
  id: string;
  date: string;
  slot: string;
  createdAt: number;
}

interface VideoState {
  topic: string | null;
  invitees: string[];
  lastCall: CallSummary | null;
  workflowId: string | null;
  appointments: Appointment[];
  setTopic: (t: string | null) => void;
  setInvitees: (n: string[]) => void;
  setLastCall: (c: CallSummary | null) => void;
  setWorkflowId: (id: string | null) => void;
  resolveLast: (v: boolean) => void;
  addAppointment: (date: string, slot: string) => Appointment;
  reset: () => void;
}

const initial = () => ({ topic: null as string | null, invitees: [] as string[], lastCall: null as CallSummary | null, workflowId: null as string | null, appointments: [] as Appointment[] });

export const useVideoStore = create<VideoState>()(
  persist(
    (set) => ({
      ...initial(),
      setTopic: (topic) => set({ topic }),
      setInvitees: (invitees) => set({ invitees }),
      setLastCall: (lastCall) => set({ lastCall }),
      setWorkflowId: (workflowId) => set({ workflowId }),
      resolveLast: (v) => set((s) => ({ lastCall: s.lastCall ? { ...s.lastCall, resolved: v } : null })),
      addAppointment: (date, slot) => {
        const a = { id: uid(), date, slot, createdAt: Date.now() };
        set((s) => ({ appointments: [a, ...s.appointments] }));
        return a;
      },
      reset: () => set(initial()),
    }),
    { name: "tn-video", storage: createJSONStorage(() => localStorage), skipHydration: true },
  ),
);

