import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { uid } from "@/lib/format";
import { defaultScopes, MANAGED_ACCOUNTS, SCOPES, USER, type ScopeKey } from "@/data/mock";

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
  /** invited: waiting for the family member to accept the SMS invitation (demo). */
  status: "invited" | "active" | "revoked";
}

export interface FamilyLog {
  id: string;
  text: string;
  kind: "grant" | "revoke" | "restore" | "access" | "edit" | "invite";
  time: number;
  /** Who initiated the operation. */
  by?: string;
}

export type ManagedAccount = (typeof MANAGED_ACCOUNTS)[number];

interface FamilyState {
  delegates: Delegate[];
  managed: ManagedAccount[];
  log: FamilyLog[];
  actingAs: string | null;
  addDelegate: (d: Omit<Delegate, "id" | "createdAt" | "expiresAt" | "status">) => Delegate;
  revoke: (id: string) => void;
  acceptInvite: (id: string) => void;
  updateScopes: (id: string, scopes: Record<ScopeKey, boolean>) => void;
  restore: (id: string) => void;
  switchTo: (id: string | null) => void;
  reset: () => void;
}

const T = (iso: string) => new Date(iso).getTime();
const OWNER = `${USER.firstName} (abonelik sahibi)`;
const scopeNames = (sc: Record<ScopeKey, boolean>) => SCOPES.filter((s) => sc[s.key]).map((s) => s.label).join(", ") || "yetki yok";

const initial = () => ({
  delegates: [
    {
      id: "elif",
      name: "Elif Koyuncu",
      phone: "0544 210 33 81",
      relation: "Eş",
      scopes: { view: true, ticket: true, video: true, appointment: true, bills: true, plan: false, payment: false, cancel: false },
      duration: "unlimited" as Duration,
      createdAt: T("2026-08-02T21:00:00+03:00"),
      expiresAt: null,
      status: "active" as const,
    },
  ],
  managed: MANAGED_ACCOUNTS,
  log: [
    { id: "l1", text: "Ayşe Koyuncu seni hesabına yetkili olarak ekledi", kind: "grant" as const, time: T("2026-09-14T10:20:00+03:00"), by: "Ayşe Koyuncu (abonelik sahibi)" },
    { id: "l2", text: "Elif Koyuncu (Eş) yetkilendirildi · süresiz", kind: "grant" as const, time: T("2026-08-02T21:00:00+03:00"), by: OWNER },
  ],
  actingAs: null as string | null,
});

const DAY = 86_400_000;

export const useFamilyStore = create<FamilyState>()(
  persist(
    (set, get) => ({
      ...initial(),
      addDelegate: (d) => {
        const now = Date.now();
        const del: Delegate = {
          ...d,
          id: uid(),
          createdAt: now,
          expiresAt: d.duration === "unlimited" ? null : now + Number(d.duration) * DAY,
          status: "invited",
        };
        set((s) => ({
          delegates: [del, ...s.delegates],
          log: [{ id: uid(), text: `${d.name} (${d.relation}) davet edildi · ${d.duration === "unlimited" ? "süresiz" : d.duration + " gün"} · ${scopeNames(d.scopes)}`, kind: "invite", time: now, by: OWNER }, ...s.log],
        }));
        return del;
      },
      acceptInvite: (id) => {
        const d = get().delegates.find((x) => x.id === id);
        if (!d || d.status !== "invited") return;
        set((s) => ({
          delegates: s.delegates.map((x) => (x.id === id ? { ...x, status: "active" } : x)),
          log: [{ id: uid(), text: `${d.name} daveti kabul etti; yetkiler aktif`, kind: "grant", time: Date.now(), by: d.name }, ...s.log],
        }));
      },
      updateScopes: (id, scopes) => {
        const d = get().delegates.find((x) => x.id === id);
        if (!d) return;
        set((s) => ({
          delegates: s.delegates.map((x) => (x.id === id ? { ...x, scopes } : x)),
          log: [{ id: uid(), text: `${d.name} için yetkiler güncellendi · ${scopeNames(scopes)}`, kind: "edit", time: Date.now(), by: OWNER }, ...s.log],
        }));
      },
      revoke: (id) => {
        const d = get().delegates.find((x) => x.id === id);
        set((s) => ({
          delegates: s.delegates.map((x) => (x.id === id ? { ...x, status: "revoked" } : x)),
          log: [{ id: uid(), text: `${d?.name ?? "Kişi"} için yetki iptal edildi`, kind: "revoke", time: Date.now(), by: OWNER }, ...s.log],
        }));
      },
      restore: (id) => {
        const d = get().delegates.find((x) => x.id === id);
        set((s) => ({
          delegates: s.delegates.map((x) => (x.id === id ? { ...x, status: "active" } : x)),
          log: [{ id: uid(), text: `${d?.name ?? "Kişi"} için iptal geri alındı`, kind: "restore", time: Date.now(), by: OWNER }, ...s.log],
        }));
      },
      switchTo: (id) => {
        const acc = get().managed.find((m) => m.id === id);
        set((s) => ({
          actingAs: id,
          log: acc ? [{ id: uid(), text: `${acc.name} hesabına geçiş yapıldı`, kind: "access", time: Date.now(), by: `${USER.firstName} (yetkili aile üyesi)` }, ...s.log] : s.log,
        }));
      },
      reset: () => set(initial()),
    }),
    {
      name: "tn-family",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      version: 1,
      /** v0 had no "view"/"appointment" permissions: fill the defaults. */
      migrate: (persisted) => {
        const p = persisted as Partial<FamilyState>;
        return {
          ...initial(),
          ...p,
          delegates: (p.delegates ?? initial().delegates).map((d) => ({ ...d, scopes: { ...defaultScopes(), view: true, ...d.scopes } })),
          managed: MANAGED_ACCOUNTS,
        } as FamilyState;
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
