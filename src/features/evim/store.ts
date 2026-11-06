import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { uid } from "@/lib/format";
import { DEFAULT_PERMS, normalizePerms, type EvimMember, type Perms, type PersonaId } from "./rules";

export interface Persona {
  id: PersonaId;
  name: string;
  phone: string;
}

/** Demo users that can scan the modem QR. */
export const PERSONAS: Persona[] = [
  { id: "owner", name: "Çağrı Koyuncu", phone: "0532 418 22 17" },
  { id: "elif", name: "Elif Koyuncu", phone: "0544 210 33 81" },
  { id: "can", name: "Can Koyuncu", phone: "0555 702 14 90" },
];

export type DeviceKind = "phone" | "laptop" | "tv" | "tablet" | "console" | "other";

export interface HomeDevice {
  id: string;
  name: string;
  kind: DeviceKind;
  online: boolean;
  paused: boolean;
  blocked: boolean;
  supportsPause: boolean;
  band: "2.4 GHz" | "5 GHz" | "Kablolu";
  owner?: string;
}

export interface EvimTicket {
  id: string;
  title: string;
  status: "open" | "closed";
  createdAt: number;
  note: string;
}

export interface EvimEvent {
  id: string;
  text: string;
  time: number;
}

const T = (iso: string) => new Date(iso).getTime();

const initial = () => ({
  appInstalled: false,
  loggedIn: false,
  persona: "owner" as PersonaId,
  /** Persona chosen for the next QR scan before sign-in. */
  members: [
    { id: "elif", name: "Elif Koyuncu", contact: "0544 210 33 81", relation: "Eş", status: "active", perms: { troubleshoot: true, devicesView: true, devicesManage: true, billsView: false }, since: T("2026-08-02T21:00:00+03:00") },
    { id: "mert", name: "Mert Koyuncu", contact: "mert.koyuncu@mail.com", relation: "Çocuk", status: "invited", perms: { ...DEFAULT_PERMS }, since: T("2026-11-03T19:10:00+03:00") },
  ] as EvimMember[],
  devices: [
    { id: "d1", name: "Çağrı'nın iPhone'u", kind: "phone", online: true, paused: false, blocked: false, supportsPause: true, band: "5 GHz", owner: "Çağrı" },
    { id: "d2", name: "Salon TV", kind: "tv", online: true, paused: false, blocked: false, supportsPause: true, band: "5 GHz" },
    { id: "d3", name: "Elif'in MacBook'u", kind: "laptop", online: true, paused: false, blocked: false, supportsPause: true, band: "5 GHz", owner: "Elif" },
    { id: "d4", name: "PlayStation 5", kind: "console", online: false, paused: false, blocked: false, supportsPause: true, band: "Kablolu" },
    { id: "d5", name: "Akıllı Priz", kind: "other", online: true, paused: false, blocked: false, supportsPause: false, band: "2.4 GHz" },
  ] as HomeDevice[],
  ticket: null as EvimTicket | null,
  /** Answer shown to the requester after the owner decides. */
  requestOutcome: {} as Record<string, "approved" | "rejected">,
  events: [] as EvimEvent[],
});

type Data = ReturnType<typeof initial>;

interface EvimState extends Data {
  setDemo: (p: Partial<Pick<Data, "appInstalled" | "loggedIn" | "persona">>) => void;
  invite: (input: { name: string; contact: string; relation: string; perms: Perms }) => EvimMember;
  acceptInvite: (id: string) => void;
  declineInvite: (id: string) => void;
  requestJoin: (persona: PersonaId) => void;
  approveRequest: (id: string, perms: Perms) => void;
  rejectRequest: (id: string) => void;
  removeMember: (id: string) => void;
  setPerms: (id: string, perms: Perms) => void;
  addDevice: (name: string, kind: DeviceKind) => void;
  updateDevice: (id: string, patch: Partial<HomeDevice>) => void;
  removeDevice: (id: string) => void;
  openTicket: (note: string) => EvimTicket;
  closeTicket: () => void;
  reset: () => void;
}

export const useEvimStore = create<EvimState>()(
  persist(
    (set, get) => {
      const log = (text: string) => ({ id: uid(), text, time: Date.now() });
      return {
        ...initial(),
        setDemo: (p) => set(p),
        invite: ({ name, contact, relation, perms }) => {
          const persona = PERSONAS.find((x) => x.phone.replace(/\s/g, "") === contact.replace(/\s/g, ""));
          const m: EvimMember = { id: persona && persona.id !== "owner" ? persona.id : uid(), name, contact, relation, status: "invited", perms: normalizePerms(perms), since: Date.now() };
          set((s) => ({ members: [m, ...s.members.filter((x) => x.id !== m.id)], events: [log(`${name} davet edildi`), ...s.events] }));
          return m;
        },
        acceptInvite: (id) =>
          set((s) => {
            const m = s.members.find((x) => x.id === id);
            return { members: s.members.map((x) => (x.id === id ? { ...x, status: "active", since: Date.now() } : x)), events: [log(`${m?.name ?? "Üye"} daveti kabul etti`), ...s.events] };
          }),
        declineInvite: (id) =>
          set((s) => ({ members: s.members.filter((x) => x.id !== id), events: [log("Bir aile daveti reddedildi"), ...s.events] })),
        requestJoin: (persona) => {
          const p = PERSONAS.find((x) => x.id === persona);
          if (!p || get().members.some((m) => m.id === persona)) return;
          const { [persona]: _drop, ...rest } = get().requestOutcome;
          set((s) => ({
            requestOutcome: rest,
            members: [...s.members, { id: p.id, name: p.name, contact: p.phone, relation: "Aile üyesi", status: "requested", perms: { ...DEFAULT_PERMS }, since: Date.now() }],
            events: [log(`${p.name} katılım talebi gönderdi`), ...s.events],
          }));
        },
        approveRequest: (id, perms) =>
          set((s) => ({
            members: s.members.map((x) => (x.id === id ? { ...x, status: "active", perms: normalizePerms(perms), since: Date.now() } : x)),
            requestOutcome: { ...s.requestOutcome, [id]: "approved" },
            events: [log("Katılım talebi kabul edildi"), ...s.events],
          })),
        rejectRequest: (id) =>
          set((s) => ({ members: s.members.filter((x) => x.id !== id), requestOutcome: { ...s.requestOutcome, [id]: "rejected" }, events: [log("Katılım talebi reddedildi"), ...s.events] })),
        removeMember: (id) =>
          set((s) => {
            const { [id]: _drop, ...rest } = s.requestOutcome;
            return { members: s.members.filter((x) => x.id !== id), requestOutcome: rest, events: [log("Aile üyesi çıkarıldı"), ...s.events] };
          }),
        setPerms: (id, perms) => set((s) => ({ members: s.members.map((x) => (x.id === id ? { ...x, perms: normalizePerms(perms) } : x)) })),
        addDevice: (name, kind) =>
          set((s) => ({ devices: [...s.devices, { id: uid(), name, kind, online: true, paused: false, blocked: false, supportsPause: kind !== "other", band: "5 GHz" }] })),
        updateDevice: (id, patch) => set((s) => ({ devices: s.devices.map((d) => (d.id === id ? { ...d, ...patch } : d)) })),
        removeDevice: (id) => set((s) => ({ devices: s.devices.filter((d) => d.id !== id) })),
        openTicket: (note) => {
          const t: EvimTicket = { id: `TN-${Math.floor(100000 + Math.random() * 899999)}`, title: "Bağlantı problemi", status: "open", createdAt: Date.now(), note };
          set({ ticket: t });
          return t;
        },
        closeTicket: () => set((s) => ({ ticket: s.ticket ? { ...s.ticket, status: "closed" } : null })),
        reset: () => set(initial()),
      };
    },
    { name: "tn-evim", storage: createJSONStorage(() => localStorage), skipHydration: true, version: 1 },
  ),
);
