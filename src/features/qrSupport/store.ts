import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { USER } from "@/data/mock";

export type CheckState = "ok" | "warn" | "fail";

export interface CheckResult {
  key: string;
  label: string;
  state: CheckState;
  value: string;
  note?: string | undefined;
}

export interface ScanResult {
  at: number;
  score: number;
  checks: CheckResult[];
}

export interface Ticket {
  id: string;
  createdAt: number;
  category: string;
  issues: string[];
  tech: [string, string][];
  device: string;
  contactMe: boolean;
  statusIndex: number;
  eta: string;
  recordId: string;
}

interface QrState {
  serial: string;
  labelOrdered: boolean;
  lastScan: ScanResult | null;
  tickets: Ticket[];
  seq: number;
  setScan: (r: ScanResult) => void;
  orderLabel: () => void;
  addTicket: (t: Omit<Ticket, "id" | "createdAt" | "statusIndex">) => Ticket;
  advance: (id: string) => void;
  reset: () => void;
}

const initial = () => ({
  serial: USER.modemSerial,
  labelOrdered: false,
  lastScan: null as ScanResult | null,
  tickets: [] as Ticket[],
  seq: 104552,
});

export const useQrStore = create<QrState>()(
  persist(
    (set, get) => ({
      ...initial(),
      setScan: (r) => set({ lastScan: r }),
      orderLabel: () => set({ labelOrdered: true }),
      addTicket: (t) => {
        const seq = get().seq;
        const ticket: Ticket = { ...t, id: `TKT-2026-${seq}`, createdAt: Date.now(), statusIndex: 0 };
        set((s) => ({ tickets: [ticket, ...s.tickets], seq: seq + 1 }));
        return ticket;
      },
      advance: (id) => set((s) => ({ tickets: s.tickets.map((t) => (t.id === id ? { ...t, statusIndex: Math.min(3, t.statusIndex + 1) } : t)) })),
      reset: () => set(initial()),
    }),
    { name: "tn-qr", storage: createJSONStorage(() => localStorage), skipHydration: true },
  ),
);

/** Builds the mock diagnostic result. Live network state changes the line checks. */
export function buildScan(netStatus: string): ScanResult {
  const outage = netStatus === "outage";
  const checks: CheckResult[] = [
    outage
      ? { key: "line", label: "Hat durumu", state: "fail", value: "Bağlantı yok", note: "Bölgesel kesinti tespit edildi" }
      : { key: "line", label: "Hat durumu", state: "ok", value: "Bağlı (GPON)" },
    { key: "signal", label: "Sinyal gücü", state: outage ? "fail" : "ok", value: outage ? "—" : "Senkron 100/50 Mbps" },
    { key: "optic", label: "Optik güç seviyesi", state: "warn", value: "-27,4 dBm", note: "Optik sinyal seviyesi düşük (ideal: -8 ile -25 dBm)" },
    { key: "dns", label: "DNS / ağ geçidi", state: "ok", value: "12 ms" },
    { key: "wifi", label: "Wi-Fi kanal yoğunluğu", state: "warn", value: "Kanal 6 · %87", note: "Wi-Fi kanal 6 aşırı yoğun" },
    { key: "drops", label: "Son 24 saat kopma geçmişi", state: "warn", value: "3 kopma", note: "Gece 02:14, 02:31, 03:05 kısa kopmalar" },
  ];
  const penalty = checks.reduce((n, c) => n + (c.state === "fail" ? 25 : c.state === "warn" ? 11 : 0), 0);
  return { at: Date.now(), score: Math.max(8, 100 - penalty), checks };
}
