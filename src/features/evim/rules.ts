/** Pure TürkNet Evim rules: QR routing, role resolution and permission checks (tested in src/test/evim.test.ts). */

export type EvimPerm = "troubleshoot" | "devicesView" | "devicesManage" | "billsView";
export type Perms = Record<EvimPerm, boolean>;
export type PersonaId = "owner" | string;
export type EvimRole = "owner" | "member" | "unauthorized";
export type MemberStatus = "active" | "invited" | "requested";

export interface EvimMember {
  id: string;
  name: string;
  contact: string;
  relation: string;
  status: MemberStatus;
  perms: Perms;
  since: number;
}

export const PERMS: { key: EvimPerm; label: string; desc: string }[] = [
  { key: "troubleshoot", label: "Bağlantı sorunlarını görüntüleme ve giderme", desc: "Self servis onarım ve AI Usta" },
  { key: "devicesView", label: "Bağlı cihazları görüntüleme", desc: "Modem ve ağdaki cihaz listesi" },
  { key: "devicesManage", label: "Cihazları yönetme", desc: "Cihaz ekleme, duraklatma, interneti kapatma" },
  { key: "billsView", label: "Fatura bilgilerini görüntüleme", desc: "Fatura tutarı ve geçmişi" },
];

export const DEFAULT_PERMS: Perms = { troubleshoot: true, devicesView: true, devicesManage: false, billsView: false };
export const NO_PERMS: Perms = { troubleshoot: false, devicesView: false, devicesManage: false, billsView: false };
export const OWNER_PERMS: Perms = { troubleshoot: true, devicesView: true, devicesManage: true, billsView: true };

/** Owner always has the subscription; a persona is a member only while their membership is active. */
export function resolveRole(persona: PersonaId, members: EvimMember[]): EvimRole {
  if (persona === "owner") return "owner";
  return members.find((m) => m.id === persona)?.status === "active" ? "member" : "unauthorized";
}

export function permsFor(persona: PersonaId, members: EvimMember[]): Perms {
  const role = resolveRole(persona, members);
  if (role === "owner") return OWNER_PERMS;
  if (role === "unauthorized") return NO_PERMS;
  return members.find((m) => m.id === persona)!.perms;
}

/** Managing devices implies seeing them. */
export function normalizePerms(p: Perms): Perms {
  return { ...p, devicesView: p.devicesView || p.devicesManage };
}

export type QrStep = "install" | "login" | "evim";

/** Ordered QR checks: app installed → signed in → role-aware TürkNet Evim. */
export function qrNextStep(s: { appInstalled: boolean; loggedIn: boolean }): QrStep {
  if (!s.appInstalled) return "install";
  if (!s.loggedIn) return "login";
  return "evim";
}

export const ROLE_LABEL: Record<EvimRole, string> = {
  owner: "Ana kullanıcı",
  member: "Yetkili aile üyesi",
  unauthorized: "Bağlı değil",
};
