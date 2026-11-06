import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore, type AppNotification } from "@/features/core/appStore";
import { addToLockScreen, mergeNotification, pushAllowed } from "@/features/core/notifications";
import {
  announceCollection,
  approveCollection,
  bookFieldVisit,
  decide,
  flushOps,
  getWf,
  isValidIban,
  maskIban,
  openLiveChat,
  runCollection,
  setupAutoPay,
  startRelocation,
  startUstaCall,
  useWorkflowStore,
} from "@/features/workflow";
import { isUnusualBill } from "@/features/workflow/rules";
import { DEMO_MOVE_DATE, DEMO_NEW_ADDRESS } from "@/data/mock";

const W = useWorkflowStore;
const drain = () => {
  for (let i = 0; i < 40 && W.getState().ops.length; i++) flushOps();
};
const cfg = (p: Partial<ReturnType<typeof W.getState>["config"]>) => W.setState((s) => ({ config: { ...s.config, ...p } }));

beforeEach(() => {
  W.getState().reset();
  W.setState({ autoFollowUp: true });
});

describe("Taşınma · saha ekibi eşleştirme", () => {
  const toSlot = () => {
    cfg({ addressCheck: "eligible" });
    const id = startRelocation({ address: DEMO_NEW_ADDRESS, moveDate: DEMO_MOVE_DATE, wantsTemp: false });
    drain();
    expect(getWf(id)!.decision?.key).toBe("relocation_slot");
    decide(id, "slot-1");
    return id;
  };

  it("ilk ekip kabul ederse randevu o ekiple onaylanır", () => {
    cfg({ teamMatch: "first" });
    const id = toSlot();
    drain();
    const wf = getWf(id)!;
    expect(wf.data["match"]).toBe("accepted");
    expect(wf.data["team"]).toBe("Kadıköy Saha Ekibi 7");
    expect(W.getState().appointments.find((a) => a.workflowId === id)?.label).toBe("3 Kas Salı · 16:00–18:00");
  });

  it("ilk ekip kabul etmezse müşteri aramadan ikinci ekip bulunur; randevu kabulden önce onaylanmaz", () => {
    const id = (cfg({ teamMatch: "second" }), toSlot());
    flushOps(); // request → team 1
    flushOps(); // team 1 declines
    expect(getWf(id)!.data["match"]).toBe("declined");
    expect(W.getState().appointments.some((a) => a.workflowId === id)).toBe(false);
    drain();
    expect(getWf(id)!.data["team"]).toBe("Kadıköy Saha Ekibi 12");
    expect(getWf(id)!.data["match"]).toBe("accepted");
  });
});

describe("Akıllı Otomatik Ödeme", () => {
  it("normalin %30'undan fazla yüksek fatura olağan dışıdır", () => {
    expect(isUnusualBill(749.9 * 1.31, 749.9)).toBe(true);
    expect(isUnusualBill(749.9 * 1.2, 749.9)).toBe(false);
  });
  it("talimat onay olmadan oluşturulmaz", () => {
    expect(setupAutoPay({ kind: "card", label: "Kart •••• 4417" }, true, false)).toBe(false);
    expect(W.getState().autoPay.status).toBe("off");
  });
  it("yüksek tutar onaya alınır; onaysız tahsil edilmez", () => {
    setupAutoPay({ kind: "card", label: "Kart •••• 4417" }, true, true);
    announceCollection(true);
    expect(W.getState().autoPay.cycle?.status).toBe("held_for_approval");
    expect(runCollection()).toBe(false);
    approveCollection();
    expect(runCollection()).toBe(true);
    expect(W.getState().autoPay.cycle?.status).toBe("paid");
  });
  it("tahsilat başarısızsa başarılı gösterilmez", () => {
    cfg({ autoPayResult: "fail" });
    setupAutoPay({ kind: "card", label: "Kart •••• 4417" }, true, true);
    announceCollection(false);
    runCollection();
    expect(W.getState().autoPay.cycle?.status).toBe("failed");
  });
  it("IBAN doğrulanır ve yalnızca son 4 hanesi gösterilir", () => {
    expect(isValidIban("TR33 0006 1005 1978 6457 8413 26")).toBe(true);
    expect(isValidIban("TR12 345")).toBe(false);
    expect(maskIban("TR330006100519786457841326")).toBe("TR•• •••• •••• 1326");
  });
});

describe("Bağlamı koruyan canlı destek", () => {
  it("aktarım olmadan canlı sohbet açılmaz; aktarımda temsilci bağlamla başlar", () => {
    cfg({ aiFix: "not_fixed" });
    const id = startUstaCall();
    expect(openLiveChat(id)).toBe(false);
    decide(id, "no_internet");
    drain();
    decide(id, "agent");
    expect(getWf(id)!.handoff).not.toBeNull();
    expect(openLiveChat(id)).toBe(true);
    const chat = W.getState().chats.find((c) => c.workflowId === id)!;
    expect(chat.messages.some((m) => m.from === "agent" && m.text.includes("konusundaki talebini aldım"))).toBe(true);
    expect(bookFieldVisit(id, "slot-3")).toBe(true);
    expect(bookFieldVisit(id, "slot-3")).toBe(false);
    expect(W.getState().appointments.find((a) => a.workflowId === id)?.label).toBe("4 Kas Çarşamba · 13:00–17:00");
    expect(W.getState().workOrders.filter((o) => o.workflowId === id && o.kind === "field_repair")).toHaveLength(1);
  });
});

describe("Akıllı bildirimler", () => {
  const n = (id: string, to: string | undefined, read = false): AppNotification => ({ id, kind: "support", title: id, body: "", time: 0, read, ...(to ? { to } : {}) });
  it("aynı işlemle ilgili okunmamış güncellemeler birleşir", () => {
    const list = mergeNotification([n("a", "/surec/X")], n("b", "/surec/X"));
    expect(list).toHaveLength(1);
    expect(list[0]!.count).toBe(2);
    expect(list[0]!.title).toBe("b");
  });
  it("okunmuş veya farklı işlem bildirimleri birleşmez", () => {
    expect(mergeNotification([n("a", "/surec/X", true)], n("b", "/surec/X"))).toHaveLength(2);
    expect(mergeNotification([n("a", "/surec/X")], n("b", "/surec/Y"))).toHaveLength(2);
  });
  it("kampanya push'u kapatılabilir, süreç bildirimleri gelmeye devam eder", () => {
    expect(pushAllowed("campaign", { push: true, campaignPush: false })).toBe(false);
    expect(pushAllowed("support", { push: true, campaignPush: false })).toBe(true);
    expect(pushAllowed("support", { push: false })).toBe(false);
    expect(useAppStore.getState().prefs.campaignPush).toBe(true);
  });
});

describe("Kilitli telefon bildirimleri", () => {
  const n = (id: string, kind: AppNotification["kind"] = "support"): AppNotification => ({ id, kind, title: id, body: "", time: 0, read: false });
  it("birleşen güncelleme kilit ekranında eski kartın yerini alır", () => {
    expect(addToLockScreen([n("a"), n("b")], { ...n("a"), title: "yeni" }).map((x) => x.title)).toEqual(["yeni", "b"]);
  });
  it("kilit ekranı en fazla 6 bildirim tutar", () => {
    let list: AppNotification[] = [];
    for (let i = 0; i < 9; i++) list = addToLockScreen(list, n(`x${i}`));
    expect(list).toHaveLength(6);
    expect(list[0]!.id).toBe("x8");
  });
  it("yalnızca telefona giden bildirimler kilit ekranına düşer", () => {
    useAppStore.getState().reset();
    useAppStore.getState().notify({ kind: "support", title: "sessiz", body: "" }, false);
    useAppStore.getState().notify({ kind: "support", title: "önemli", body: "" });
    useAppStore.getState().setPref("campaignPush", false);
    useAppStore.getState().notify({ kind: "campaign", title: "kampanya", body: "" });
    expect(useAppStore.getState().lockScreen.map((x) => x.title)).toEqual(["önemli"]);
  });
});

import { activateNetbox, requestNetboxAtNewAddress } from "@/features/workflow/services/migration";
describe("Taşınma · port yok → NetBox yeni adreste", () => {
  it("talep taşınma adresi ve tarihiyle oluşur, hazır olunca aktif edilir", () => {
    cfg({ addressCheck: "no_port" });
    const id = startRelocation({ address: DEMO_NEW_ADDRESS, moveDate: DEMO_MOVE_DATE, wantsTemp: false });
    drain();
    expect(getWf(id)!.data["eligibility"]).toBe("no_port");
    activateNetbox(id);
    expect(getWf(id)!.data["netbox"]).toBeUndefined();
    requestNetboxAtNewAddress(id);
    expect(getWf(id)!.data["netbox"]).toBe("requested");
    drain();
    expect(getWf(id)!.data["netbox"]).toBe("ready");
    activateNetbox(id);
    expect(getWf(id)!.data["netbox"]).toBe("active");
  });

  it("sunum modunda (otomatik takip kapalı) bile talep hazırlanır ve takılmaz", () => {
    cfg({ addressCheck: "no_port" });
    const id = startRelocation({ address: DEMO_NEW_ADDRESS, moveDate: DEMO_MOVE_DATE, wantsTemp: false });
    drain();
    W.setState({ autoFollowUp: false });
    requestNetboxAtNewAddress(id);
    expect(getWf(id)!.data["netbox"]).toBe("requested");
    drain();
    expect(getWf(id)!.data["netbox"]).toBe("ready");
  });
});
