import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { uid } from "@/lib/format";
import { MANAGED_ACCOUNTS, SCOPES, type ScopeKey } from "@/data/mock";

export type Duration = "unlimited" | "30" | "7";

export interface Delegate {
  id: string;
  name: string;
  phone: string;
  relation: string;
  scopes: Record<ScopeKey, boolean>;
  duration: Duration;
  createdAt: number;
  expiresAt: number | null;
  /** invited = waiting for the family member to accept the SMS invitation (simulated). */
  status: "invited" | "active" | "revoked";
}

export interface FamilyLog {
  id: string;
  text: string;
  kind: "grant" | "revoke" | "restore" | "access" | "invite" | "edit" | "request" | "action";
  time: number;
}

/** A sensitive action a family member asked for. Only the subscription owner can approve it. */
export interface ApprovalRequest {
  id: string;
  delegateId: string;
  name: string;
  action: string;
  status: "pending" | "approved" | "rejected";
  at: number;
}

export type ManagedAccount = (typeof MANAGED_ACCOUNTS)[number];

interface FamilyState {
  delegates: Delegate[];
  managed: ManagedAccount[];
  log: FamilyLog[];
  requests: ApprovalRequest[];
  actingAs: string | null;
  addDelegate: (d: Omit<Delegate, "id" | "createdAt" | "expiresAt" | "status">) => Delegate;
  acceptInvite: (id: string) => void;
  updateScopes: (id: string, scopes: Record<ScopeKey, boolean>) => void;
  revoke: (id: string) => void;
  restore: (id: string) => void;
  /** Family member performed an allowed action (shown as "who initiated"). */
  recordAction: (delegateId: string, text: string) => void;
  /** Family member asked for a sensitive (financial) action. Returns null if not allowed to ask. */
  requestSensitive: (delegateId: string, action: string) => ApprovalRequest | null;
  resolveRequest: (id: string, approve: boolean) => void;
  switchTo: (id: string | null) => void;
  reset: () => void;
}

const T = (iso: string) => new Date(iso).getTime();
export const defaultScopes = () => Object.fromEntries(SCOPES.map((s) => [s.key, s.default])) as Record<ScopeKey, boolean>;

const initial = () => ({
  delegates: [
    {
      id: "elif",
      name: "Elif Koyuncu",
      phone: "0544 210 33 81",
      relation: "Eş",
      scopes: { view: true, tech: true, appointments: true, bills: true, finance: false },
      duration: "unlimited" as Duration,
      createdAt: T("2026-08-02T21:00:00+03:00"),
      expiresAt: null,
      status: "active" as Delegate["status"],
    },
  ] as Delegate[],
  managed: MANAGED_ACCOUNTS,
  log: [
    { id: "l1", text: "Ayşe Koyuncu sizi hesabına yetkili olarak ekledi", kind: "grant" as const, time: T("2026-09-14T10:20:00+03:00") },
    { id: "l2", text: "Elif Koyuncu (Eş) yetkilendirildi · süresiz", kind: "grant" as const, time: T("2026-08-02T21:00:00+03:00") },
  ] as FamilyLog[],
  requests: [] as ApprovalRequest[],
  actingAs: null as string | null,
});

const DAY = 86_400_000;

/** Pure permission check used by the store and tests. Revoked or invited people can do nothing. */
export function delegateCan(d: Pick<Delegate, "status" | "scopes" | "expiresAt"> | undefined, scope: ScopeKey, at = Date.now()): boolean {
  if (!d || d.status !== "active") return false;
  if (d.expiresAt && d.expiresAt < at) return false;
  return Boolean(d.scopes[scope]);
}

/** Old saved demos used ticket/video/plan/payment/cancel; map them to the new groups. */
function upgradeScopes(s: Record<string, boolean> | undefined): Record<ScopeKey, boolean> {
  if (!s) return defaultScopes();
  if ("view" in s) return { ...defaultScopes(), ...s } as Record<ScopeKey, boolean>;
  return { view: true, tech: Boolean(s["ticket"] || s["video"]), appointments: Boolean(s["ticket"]), bills: Boolean(s["bills"]), finance: Boolean(s["payment"] || s["cancel"] || s["plan"]) };
}

export const useFamilyStore = create<FamilyState>()(
  persist(
    (set, get) => {
      const addLog = (text: string, kind: FamilyLog["kind"]) => ({ id: uid(), text, kind, time: Date.now() });
      return {
        ...initial(),
        addDelegate: (d) => {
          const now = Date.now();
          const del: Delegate = { ...d, id: uid(), createdAt: now, expiresAt: d.duration === "unlimited" ? null : now + Number(d.duration) * DAY, status: "invited" };
          set((s) => ({ delegates: [del, ...s.delegates], log: [addLog(`${d.name} (${d.relation}) davet edildi · onay bekleniyor`, "invite"), ...s.log] }));
          return del;
        },
        acceptInvite: (id) => {
          const d = get().delegates.find((x) => x.id === id);
          if (!d || d.status !== "invited") return;
          set((s) => ({
            delegates: s.delegates.map((x) => (x.id === id ? { ...x, status: "active" } : x)),
            log: [addLog(`${d.name} daveti kabul etti · yetki ${d.duration === "unlimited" ? "süresiz" : `${d.duration} gün`} aktif`, "grant"), ...s.log],
          }));
        },
        updateScopes: (id, scopes) => {
          const d = get().delegates.find((x) => x.id === id);
          if (!d) return;
          set((s) => ({ delegates: s.delegates.map((x) => (x.id === id ? { ...x, scopes } : x)), log: [addLog(`${d.name} için yetkiler güncellendi`, "edit"), ...s.log] }));
        },
        revoke: (id) => {
          const d = get().delegates.find((x) => x.id === id);
          set((s) => ({
            delegates: s.delegates.map((x) => (x.id === id ? { ...x, status: "revoked" } : x)),
            requests: s.requests.map((r) => (r.delegateId === id && r.status === "pending" ? { ...r, status: "rejected" } : r)),
            log: [addLog(`${d?.name ?? "Kişi"} için yetki iptal edildi`, "revoke"), ...s.log],
          }));
        },
        restore: (id) => {
          const d = get().delegates.find((x) => x.id === id);
          set((s) => ({ delegates: s.delegates.map((x) => (x.id === id ? { ...x, status: "active" } : x)), log: [addLog(`${d?.name ?? "Kişi"} için iptal geri alındı`, "restore"), ...s.log] }));
        },
        recordAction: (delegateId, text) => {
          const d = get().delegates.find((x) => x.id === delegateId);
          if (!d) return;
          set((s) => ({ log: [addLog(`${d.name}: ${text}`, "action"), ...s.log] }));
        },
        requestSensitive: (delegateId, action) => {
          const d = get().delegates.find((x) => x.id === delegateId);
          if (!delegateCan(d, "finance")) return null;
          const existing = get().requests.find((r) => r.delegateId === delegateId && r.action === action && r.status === "pending");
          if (existing) return existing;
          const r: ApprovalRequest = { id: uid(), delegateId, name: d!.name, action, status: "pending", at: Date.now() };
          set((s) => ({ requests: [r, ...s.requests], log: [addLog(`${d!.name} “${action}” için onayınızı istedi`, "request"), ...s.log] }));
          return r;
        },
        resolveRequest: (id, approve) => {
          const r = get().requests.find((x) => x.id === id);
          if (!r || r.status !== "pending") return;
          set((s) => ({
            requests: s.requests.map((x) => (x.id === id ? { ...x, status: approve ? "approved" : "rejected" } : x)),
            log: [addLog(`“${r.action}” talebi ${approve ? "sizin onayınızla yapıldı" : "reddedildi"} (${r.name})`, approve ? "grant" : "revoke"), ...s.log],
          }));
        },
        switchTo: (id) => {
          const acc = get().managed.find((m) => m.id === id);
          set((s) => ({ actingAs: id, log: acc ? [addLog(`${acc.name} hesabına geçiş yapıldı`, "access"), ...s.log] : s.log }));
        },
        reset: () => set(initial()),
      };
    },
    {
      name: "tn-family",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      version: 2,
      migrate: (p) => {
        const s = (p ?? {}) as Partial<FamilyState>;
        return { ...initial(), ...s, requests: s.requests ?? [], delegates: (s.delegates ?? initial().delegates).map((d) => ({ ...d, scopes: upgradeScopes(d.scopes as unknown as Record<string, boolean>) })) } as FamilyState;
      },
    },
  ),
);

export function useActingAccount() {
  const actingAs = useFamilyStore((s) => s.actingAs);
  const managed = useFamilyStore((s) => s.managed);
  return managed.find((m) => m.id === actingAs) ?? null;
}

/** Returns whether the current profile may perform an action. Own account can do everything. */
export function useCan(scope: ScopeKey) {
  const acc = useActingAccount();
  if (!acc) return true;
  return Boolean(acc.scopes[scope]);
}
