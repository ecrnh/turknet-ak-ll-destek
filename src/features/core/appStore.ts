import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { uid } from "@/lib/format";
import { USER } from "@/data/mock";

export type NetStatus = "online" | "slow" | "down" | "mobile";
export type Channel = "Görüntülü" | "QR" | "Ajan" | "Chat" | "Dijital Onarım" | "Otonom";
export type NotifKind = "agent" | "support" | "family" | "campaign" | "bill";

export interface AppNotification {
  id: string;
  kind: NotifKind;
  title: string;
  body: string;
  time: number;
  read: boolean;
  to?: string;
}

export interface SupportRecord {
  id: string;
  channel: Channel;
  title: string;
  summary: string;
  status: string;
  time: number;
  details?: string[];
  to?: string;
  fieldVisitAvoided?: boolean;
}

export interface HistoryItem {
  id: string;
  title: string;
  desc: string;
  time: number;
}

export interface FeedbackItem {
  id: string;
  op: string;
  text: string;
  time: number;
}

export interface Rating {
  id: string;
  feature: string;
  csat: number;
  nps: number | null;
  comment: string;
  time: number;
}

export interface AnalyticsEvent {
  id: string;
  name: string;
  feature: string;
  time: number;
  props?: Record<string, string | number | boolean> | undefined;
}

interface NetState {
  status: NetStatus;
  speed: number;
  ping: number;
  outageStartedAt: number | null;
  etaAt: number | null;
  lastUpdate: number | null;
}

interface Prefs {
  bigText: boolean;
  simpleMode: boolean;
  push: boolean;
  demoPanel: boolean;
}

interface AppState {
  net: NetState;
  notifications: AppNotification[];
  records: SupportRecord[];
  history: HistoryItem[];
  prefs: Prefs;
  savedFieldVisits: number;
  feedback: FeedbackItem[];
  ratings: Rating[];
  events: AnalyticsEvent[];
  helpOpen: boolean;
  helpPrefill: string | null;
  push: AppNotification | null;

  setNet: (p: Partial<NetState>) => void;
  notify: (n: Omit<AppNotification, "id" | "time" | "read">, asPush?: boolean) => void;
  dismissPush: () => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  addRecord: (r: Omit<SupportRecord, "id" | "time"> & { id?: string }) => string;
  updateRecord: (id: string, p: Partial<SupportRecord>) => void;
  addHistory: (title: string, desc: string) => void;
  setPref: <K extends keyof Prefs>(k: K, v: Prefs[K]) => void;
  addFeedback: (op: string, text: string) => void;
  addRating: (r: Omit<Rating, "id" | "time">) => void;
  logEvent: (e: Omit<AnalyticsEvent, "id" | "time">) => void;
  openHelp: (prefill?: string) => void;
  closeHelp: () => void;
  incSavedVisits: () => void;
  reset: () => void;
}

const T = (iso: string) => new Date(iso).getTime();

const seedNotifications = (): AppNotification[] => [
  { id: "n1", kind: "campaign", title: "12 Ay Peşin Ödeme Fırsatı", body: "Aylık ₺749,90'dan fiyatını sabitle, ₺2.400 tasarruf et.", time: T("2026-10-21T09:10:00+03:00"), read: false, to: "/islem/fiyat-sabitle" },
  { id: "n2", kind: "agent", title: "Modem Sağlık İzleyici", body: "Modem sıcaklığın normal. Son 7 günde kopma yok.", time: T("2026-10-21T08:00:00+03:00"), read: false, to: "/ajanlar" },
  { id: "n3", kind: "family", title: "Aile yetkisi aktif", body: "Ayşe Koyuncu hesabında işlem yapma yetkin 14 Eylül'den beri aktif.", time: T("2026-10-20T19:22:00+03:00"), read: false, to: "/aile" },
  { id: "n4", kind: "bill", title: "Ekim faturan hazır", body: "Ödenmemiş faturan yok. Teşekkürler!", time: T("2026-10-20T10:00:00+03:00"), read: false, to: "/faturalar" },
  { id: "n5", kind: "support", title: "Destek kaydın tamamlandı", body: "Dijital Onarım ile hat profilin yenilendi.", time: T("2026-10-02T15:40:00+03:00"), read: false, to: "/destek-kayitlari" },
  { id: "n6", kind: "campaign", title: "1.000 Mbps Fiber adresinde!", body: "Hızını tek dokunuşla yükselt.", time: T("2026-10-01T12:00:00+03:00"), read: false, to: "/islem/hiz-yukseltme" },
  { id: "n7", kind: "agent", title: "Fatura Asistanı", body: "Eylül faturan otomatik ödendi: ₺749,90", time: T("2026-09-05T09:00:00+03:00"), read: false, to: "/faturalar/gecmis" },
  { id: "n8", kind: "campaign", title: "Arkadaşını Getir", body: "Sayende 1 kişi Turknet'li oldu. 1 ay ücretsiz internet kazandın.", time: T("2026-09-03T18:00:00+03:00"), read: false, to: "/islem/arkadasini-getir" },
  { id: "n9", kind: "support", title: "Yeni: QR ile Destek", body: "Modemindeki QR'ı okut, arızanı form doldurmadan bildir.", time: T("2026-09-02T10:00:00+03:00"), read: false, to: "/qr" },
  { id: "n10", kind: "support", title: "Yeni: Görüntülü Destek", body: "Uzmanımız kameradan modemini görsün, birlikte çözelim.", time: T("2026-09-01T10:00:00+03:00"), read: false, to: "/goruntulu-destek" },
  { id: "n11", kind: "support", title: "Yeni: Ücretsiz Hibrit İnternet", body: "Kesinti 24 saati aşarsa aboneliğinize dahil yedek bağlantınızı uygulamadan etkinleştirebilirsiniz.", time: T("2026-08-30T10:00:00+03:00"), read: false, to: "/hibrit" },
  { id: "n12", kind: "agent", title: "AI Ajanların hazır", body: "Hız Koruyucu ve Kesinti Takibi ajanların aktif.", time: T("2026-08-29T10:00:00+03:00"), read: false, to: "/ajanlar" },
];

const seedRecords = (): SupportRecord[] => [
  {
    id: "r-seed-1",
    channel: "Dijital Onarım",
    title: "Hat profili yenilendi",
    summary: "Dijital Onarım ile hat profili yenilendi, bağlantı düzeldi.",
    status: "Tamamlandı",
    time: T("2026-10-02T15:40:00+03:00"),
    details: ["Hat testi: Normal", "Profil yenileme: Başarılı", "Süre: 2 dk"],
    fieldVisitAvoided: true,
  },
  {
    id: "r-seed-2",
    channel: "Chat",
    title: "Modem ışığı kırmızı yanıyor",
    summary: "Asistandan canlı chat'e aktarıldı, saha ekibi yönlendirildi.",
    status: "Tamamlandı",
    time: T("2026-09-12T11:05:00+03:00"),
    details: ["Asistan → canlı chat aktarımı", "Bekleme: 14 dk", "Saha ziyareti: 13 Eyl"],
  },
];

const seedHistory = (): HistoryItem[] => [
  { id: "h1", title: "Fatura ödendi", desc: "Eylül 2026 · ₺749,90 · Otomatik ödeme", time: T("2026-09-05T09:00:00+03:00") },
  { id: "h2", title: "Aile yetkisi alındı", desc: "Ayşe Koyuncu (Anne) hesabı için yetkili oldun", time: T("2026-09-14T10:20:00+03:00") },
  { id: "h3", title: "12 Ay Fiyat Sabitleme", desc: "Peşin ödeme · ₺8.998,80 · 3 taksit", time: T("2026-07-01T14:00:00+03:00") },
];

const initial = () => ({
  net: { status: "online" as NetStatus, speed: USER.packageSpeed - 4, ping: 8, outageStartedAt: null, etaAt: null, lastUpdate: null },
  notifications: seedNotifications(),
  records: seedRecords(),
  history: seedHistory(),
  prefs: { bigText: false, simpleMode: false, push: true, demoPanel: true },
  savedFieldVisits: 0,
  feedback: [] as FeedbackItem[],
  ratings: [] as Rating[],
  events: [] as AnalyticsEvent[],
  helpOpen: false,
  helpPrefill: null,
  push: null,
});

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initial(),
      setNet: (p) => set((s) => ({ net: { ...s.net, ...p } })),
      notify: (n, asPush = true) => {
        const item: AppNotification = { ...n, id: uid(), time: Date.now(), read: false };
        set((s) => ({ notifications: [item, ...s.notifications], push: asPush && s.prefs.push ? item : s.push }));
      },
      dismissPush: () => set({ push: null }),
      markRead: (id) => set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
      markAllRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
      addRecord: (r) => {
        const id = r.id ?? `r-${uid()}`;
        set((s) => ({ records: [{ ...r, id, time: Date.now() }, ...s.records] }));
        return id;
      },
      updateRecord: (id, p) => set((s) => ({ records: s.records.map((r) => (r.id === id ? { ...r, ...p } : r)) })),
      addHistory: (title, desc) => set((s) => ({ history: [{ id: uid(), title, desc, time: Date.now() }, ...s.history] })),
      setPref: (k, v) => set((s) => ({ prefs: { ...s.prefs, [k]: v } })),
      addFeedback: (op, text) => set((s) => ({ feedback: [{ id: uid(), op, text, time: Date.now() }, ...s.feedback] })),
      addRating: (r) => set((s) => ({ ratings: [{ ...r, id: uid(), time: Date.now() }, ...s.ratings] })),
      logEvent: (e) => set((s) => ({ events: [{ ...e, id: uid(), time: Date.now() }, ...s.events].slice(0, 300) })),
      openHelp: (prefill) => set({ helpOpen: true, helpPrefill: prefill ?? null }),
      closeHelp: () => set({ helpOpen: false, helpPrefill: null }),
      incSavedVisits: () => set({ savedFieldVisits: get().savedFieldVisits + 1 }),
      reset: () => set(initial()),
    }),
    {
      name: "tn-app",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      version: 1,
      /** v0 demos saved gift-internet notifications and old outage states; drop them. */
      migrate: (persisted) => {
        const p = persisted as Partial<AppState> & { prefs?: Record<string, unknown> };
        const legacy = (to?: string) => !!to && (to.startsWith("/hediye") || to === "/ajanlar/yedek");
        const status = p.net?.status as string | undefined;
        return {
          ...p,
          net: p.net && (status === "outage" || status === "backup") ? { ...p.net, status: "online" } : p.net,
          notifications: (p.notifications ?? []).filter((n) => (n.kind as string) !== "gift" && !legacy(n.to)),
          records: (p.records ?? []).filter((r) => !legacy(r.to)),
        } as AppState;
      },
      partialize: (s) => {
        const { helpOpen: _h, helpPrefill: _p, push: _push, ...rest } = s;
        return rest;
      },
    },
  ),
);

export const unreadCount = (s: AppState) => s.notifications.filter((n) => !n.read).length;
