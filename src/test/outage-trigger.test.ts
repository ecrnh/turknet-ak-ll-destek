import { beforeEach, describe, expect, it } from "vitest";
import { startAiUsta, startUstaCall, finishGigaVideoSupport } from "@/features/workflow/services/aiUsta";
import { setOutageElapsed, startOutage } from "@/features/workflow/services/hybrid";
import { useWorkflowStore as W } from "@/features/workflow/store";
import { useScenarioStore as S, initialScenario } from "@/features/scenario/store";
import { useAppStore } from "@/features/core/appStore";
import { decide, flushOps } from "@/features/workflow/engine";
import { bookFieldVisit, offerHybridFromLive } from "@/features/workflow/services/liveSupport";
import { setConnectivity, syncNet } from "@/features/workflow/services/connectivity";

beforeEach(() => {
  W.getState().reset();
  useAppStore.getState().reset();
  S.setState(initialScenario());
});

describe("Kesinti yalnızca açık bir simülasyonla başlar", () => {
  it("bölgesel teşhis ayarı destek tamamlanınca bile kesinti yaratmaz", () => {
    W.setState((s) => ({ config: { ...s.config, ustaDiag: "regional" } }));
    const id = startAiUsta("no_internet");
    decide(id, "no_connect");
    for (let i = 0; i < 30 && W.getState().ops.length; i++) flushOps();
    expect(W.getState().connectivity.fixed).toBe("up");
    expect(useAppStore.getState().net.status).toBe("online");
    expect(W.getState().outage).toBeNull();
  });

  it("canlı destek randevusu ve NetBox isteği interneti kesmez", () => {
    const id = startAiUsta("no_internet");
    decide(id, "no_connect");
    for (let i = 0; i < 30 && W.getState().ops.length; i++) flushOps();
    decide(id, "video");
    finishGigaVideoSupport(id, false);
    decide(id, "live");
    expect(bookFieldVisit(id, "slot-2")).toBe(true);
    expect(offerHybridFromLive(id)).toBeNull();
    expect(W.getState().outage).toBeNull();
    expect(useAppStore.getState().net.status).toBe("online");
  });

  it("demo kesintisi yokken bağlantı kesme isteği yok sayılır", () => {
    setConnectivity({ fixed: "down" });
    expect(W.getState().connectivity.fixed).toBe("up");
  });

  it("önceki sürümden kalan kesinti yüklemede temizlenir", async () => {
    startOutage();
    const { demoOutage: _legacy, ...state } = W.getState();
    localStorage.setItem("tn-workflow", JSON.stringify({ state, version: 4 }));
    await W.persist.rehydrate();
    syncNet();
    expect(W.getState().outage).toBeNull();
    expect(W.getState().connectivity.fixed).toBe("up");
    expect(useAppStore.getState().net.status).toBe("online");
  });

  it("demo panelinde açıkça başlatılmış kesinti yenilemede korunur", async () => {
    const id = startOutage();
    await W.persist.rehydrate();
    expect(W.getState().demoOutage).toBe(true);
    expect(W.getState().outage?.wfId).toBe(id);
    expect(W.getState().connectivity.fixed).toBe("down");
  });
  it.each(["no_internet", "modem"] as const)("%s desteğini açmak sağlıklı bağlantıyı kesmez", (issue) => {
    startAiUsta(issue);
    expect(W.getState().connectivity.fixed).toBe("up");
    expect(useAppStore.getState().net.status).toBe("online");
    expect(W.getState().outage).toBeNull();
  });

  it("telefon desteği başlatmak bağlantıyı kesmez", () => {
    startUstaCall();
    expect(W.getState().connectivity.fixed).toBe("up");
    expect(W.getState().outage).toBeNull();
  });

  it("süreyi değiştirmek kesinti oluşturmaz", () => {
    expect(setOutageElapsed(25)).toBeNull();
    expect(W.getState().connectivity.fixed).toBe("up");
    expect(W.getState().workflows).toHaveLength(0);
    expect(W.getState().outage).toBeNull();
  });

  it("açıkça başlatılan kesintinin süresi değiştirilebilir", () => {
    const id = startOutage(0.3);
    expect(setOutageElapsed(25)).toBe(id);
    expect(W.getState().connectivity.fixed).toBe("down");
    expect(W.getState().outage?.wfId).toBe(id);
    expect(Date.now() - (W.getState().outage?.startedAt ?? 0)).toBeGreaterThanOrEqual(25 * 3600000);
  });

  it("eski kayıttaki otomatik oynatma yüklemede duraklatılır", async () => {
    localStorage.setItem("tn-scenario", JSON.stringify({ state: { ...initialScenario(), activeId: "B", playing: true, nav: "/hibrit" }, version: 0 }));
    await S.persist.rehydrate();
    expect(S.getState().activeId).toBe("B");
    expect(S.getState().playing).toBe(false);
    expect(S.getState().nav).toBeNull();
  });
});