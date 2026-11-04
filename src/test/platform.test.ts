import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "@/features/core/appStore";
import {
  acceptTempInternet,
  activateHybrid,
  activateTemp,
  checkHybrid,
  requestHybridDevice,
  restoreMain,
  setOutageElapsed,
  startOutage,
  decide,
  flushOps,
  getWf,
  notify,
  openUstaSms,
  provisionTemp,
  runBillingShield,
  seedPaidButDebt,
  startSpeedCheck,
  startUstaCall,
  stepStatus,
  toggleBox,
  useWorkflowStore,
} from "@/features/workflow";
import { canToggleBox, connectionHealth, isSpeedProblem } from "@/features/workflow/rules";
import { customerAction, statusSentence } from "@/features/workflow/copy";
import { buildCtx, cursorOf, next, startScenario, visibleSteps } from "@/features/scenario/player";
import { SCENARIOS } from "@/features/scenario/scenarios";
import { useScenarioStore } from "@/features/scenario/store";

const W = useWorkflowStore;
const drain = () => {
  for (let i = 0; i < 30 && W.getState().ops.length; i++) flushOps();
};

beforeEach(() => {
  W.getState().reset();
  W.setState({ autoFollowUp: true });
});

describe("Akıllı bildirim katmanı", () => {
  it("rutin gelişme push göndermez, önemli gelişme gönderir", () => {
    useAppStore.getState().reset();
    const before = useAppStore.getState().notifications.length;
    seedPaidButDebt(false);
    const { wfId } = runBillingShield();
    notify(wfId!, "Rutin", "x", "quiet");
    const pushes = W.getState().messages.filter((m) => m.level !== "quiet").length;
    const added = useAppStore.getState().notifications.length - before;
    // Updates about the same process are combined, never more than the pushes sent.
    expect(added).toBeLessThanOrEqual(pushes);
    expect(W.getState().messages.some((m) => m.level === "quiet")).toBe(true);
  });
});

describe("Kullanıcı dostu durum dili", () => {
  it("dış sistem beklemesini işlem türüne göre sade anlatır", () => {
    expect(statusSentence({ status: "waiting_for_external_system", type: "relocation" })).toBe("Altyapı ekibinden yanıt bekliyoruz");
    expect(statusSentence({ status: "escalated", type: "ai_usta" })).toBe("Konuyu uzman ekibimize ilettik");
    expect(customerAction({ status: "in_progress", decision: null }).needed).toBe(false);
  });
});

describe("Fatura Kalkanı onayı", () => {
  it("müşteri onayı olmadan mutabakat başlamaz; “Daha Sonra” hiçbir kaydı değiştirmez", () => {
    seedPaidButDebt(false);
    const { wfId } = runBillingShield();
    drain();
    expect(getWf(wfId)!.decision?.key).toBe("billing_start");
    expect(stepStatus(wfId, "reconcile")).toBe("pending");
    decide(wfId!, "later");
    drain();
    expect(stepStatus(wfId, "reconcile")).toBe("pending");
    expect(W.getState().bills[0]!.shownDebt).toBe(749.9);
  });
});

describe("AI Usta sesli triyaj", () => {
  it("SMS açılınca çağrıdaki bağlam devralınır, sorun tekrar sorulmaz", () => {
    const id = startUstaCall();
    expect(getWf(id)!.decision?.key).toBe("usta_ivr_menu");
    decide(id, "no_internet");
    drain();
    expect(getWf(id)!.data["issue"]).toBe("İnternet hiç çalışmıyor");
    expect(getWf(id)!.decision?.key).toBe("usta_ivr");
    decide(id, "sms");
    expect(W.getState().sms).toHaveLength(1);
    expect(openUstaSms(id)).toBe(true);
    expect(openUstaSms(id)).toBe(false);
    expect(stepStatus(id, "report")).toBe("done");
    for (let i = 0; i < 4; i++) drain();
    expect(stepStatus(id, "repair")).toBe("done");
    expect(getWf(id)!.decision?.key).toBe("usta_more");
  });
});

describe("Hız optimizasyonu", () => {
  it("uzaktan çözülemezse hız uydurulmaz ve teknik iş emri açılır", () => {
    W.setState((s) => ({ config: { ...s.config, proactive: "field" } }));
    const id = startSpeedCheck();
    for (let i = 0; i < 4; i++) drain();
    const wf = getWf(id)!;
    expect(Number(wf.data["speedAfter"])).toBeLessThan(100);
    expect(W.getState().workOrders.some((o) => o.workflowId === id && o.kind === "field_repair")).toBe(true);
  });
  it("paketin %60 altı anlamlı hız farkıdır", () => {
    expect(isSpeedProblem(20, 100)).toBe(true);
    expect(isSpeedProblem(80, 100)).toBe(false);
  });
});

describe("TürkNet Box", () => {
  it("SIM aktif olmadan açılıp kapanamaz", () => {
    expect(canToggleBox(null)).toBe(false);
    expect(canToggleBox({ sim: "shipping" })).toBe(false);
    expect(canToggleBox({ sim: "active" })).toBe(true);
  });
  it("kabul sonrası Box teslim edilip aktifleşince aç/kapa bağlantıyı değiştirir", () => {
    W.setState({ autoFollowUp: false });
    const temp = getWf(acceptTempInternet("NKL-TEST", "temp_mobile"))!;
    provisionTemp(temp.id);
    expect(toggleBox(false)).toBe(false);
    flushOps();
    activateTemp(temp.id);
    expect(W.getState().box!.power).toBe("on");
    expect(toggleBox(false)).toBe(true);
    expect(W.getState().connectivity.mobile).toBe("off");
    expect(toggleBox(true)).toBe(true);
    expect(W.getState().connectivity.mobile).toBe("active");
  });
});

describe("Ücretsiz Hibrit İnternet", () => {
  const setCfg = (p: Partial<ReturnType<typeof W.getState>["config"]>) => W.setState((s) => ({ config: { ...s.config, ...p } }));
  const pushes = () => useAppStore.getState().notifications.map((n) => n.title);

  it("ilk 24 saatte teklif ve etkinleştirme yok; kesinti bildirimi gönderilir", () => {
    const id = startOutage(2);
    expect(pushes()[0]).toBe("İnternet bağlantınızda kesinti tespit ettik");
    expect(W.getState().hybrid.status).toBe("unavailable");
    expect(checkHybrid()).toBe(false);
    expect(activateHybrid()).toBe(false);
    expect(stepStatus(id, "hybrid_offer")).toBe("pending");
    expect(startOutage(2)).toBe(id);
  });

  it("24 saati aşınca teklif açılır ve push gönderilir; müşteri onayıyla aktifleşir", () => {
    startOutage(2);
    setOutageElapsed(25);
    expect(W.getState().hybrid.status).toBe("offered");
    expect(pushes()[0]).toBe("İnternet kesintiniz 24 saati aştı");
    expect(activateHybrid()).toBe(false);
    checkHybrid();
    flushOps();
    expect(W.getState().hybrid.status).toBe("ready");
    expect(activateHybrid()).toBe(true);
    flushOps();
    expect(W.getState().hybrid.status).toBe("active");
    expect(W.getState().connectivity.mode).toBe("hybrid_backup");
    expect(useAppStore.getState().net.status).toBe("mobile");
  });

  it("anahtar ve buton tek komutla açar, kapatır, yeniden açar; işlem sürerken ikinci komut yok sayılır", async () => {
    const { setHybridOn } = await import("@/features/workflow/services/hybrid");
    startOutage(25);
    expect(setHybridOn(true)).toBe(true);
    expect(setHybridOn(true)).toBe(true);
    drain();
    expect(W.getState().hybrid.status).toBe("active");
    expect(W.getState().hybrid.attempts).toBe(1);
    expect(setHybridOn(false)).toBe(true);
    expect(W.getState().hybrid.switching).toBe("off");
    expect(setHybridOn(false)).toBe(false);
    expect(setHybridOn(true)).toBe(false);
    drain();
    expect(W.getState().hybrid.pausedAt).not.toBeNull();
    expect(W.getState().connectivity.mobile).toBe("standby");
    expect(setHybridOn(true)).toBe(true);
    drain();
    expect(W.getState().hybrid.pausedAt).toBeNull();
    expect(W.getState().hybrid.switching).toBeNull();
    expect(W.getState().connectivity.mobile).toBe("active");
  });

  it("uyumlu cihaz yoksa yedek bağlantı aktif gösterilmez; cihaz talebi tek kez açılır ve teslimattan sonra etkinleşir", () => {
    setCfg({ hybridDevice: false });
    startOutage(25);
    checkHybrid();
    flushOps();
    expect(W.getState().hybrid.status).toBe("no_device");
    expect(activateHybrid()).toBe(false);
    expect(W.getState().connectivity.mobile).toBe("off");
    expect(requestHybridDevice()).toBe(true);
    expect(requestHybridDevice()).toBe(false);
    expect(W.getState().workOrders.filter((o) => o.kind === "device_delivery")).toHaveLength(1);
    for (let i = 0; i < 4; i++) flushOps();
    expect(W.getState().hybrid.device!.status).toBe("delivered");
    expect(W.getState().hybrid.status).toBe("ready");
    expect(activateHybrid()).toBe(true);
    flushOps();
    expect(W.getState().hybrid.status).toBe("active");
  });

  it("kapsama yetersizse açılmaz; ana arıza takibi sürer", () => {
    setCfg({ hybridCoverage: false });
    const id = startOutage(30);
    checkHybrid();
    flushOps();
    expect(W.getState().hybrid.status).toBe("no_coverage");
    expect(activateHybrid()).toBe(false);
    expect(getWf(id)!.status).toBe("in_progress");
    expect(stepStatus(id, "repair")).toBe("in_progress");
  });

  it("başarısız etkinleştirme aktif sayılmaz, tekrar denenebilir", () => {
    setCfg({ hybridActivation: "fail" });
    startOutage(25);
    checkHybrid();
    flushOps();
    activateHybrid();
    flushOps();
    expect(W.getState().hybrid.status).toBe("failed");
    expect(W.getState().connectivity.mobile).toBe("off");
    setCfg({ hybridActivation: "success" });
    expect(activateHybrid()).toBe(true);
    flushOps();
    expect(W.getState().hybrid.status).toBe("active");
    expect(W.getState().hybrid.attempts).toBe(2);
  });

  it("ana bağlantı düzelince yedekten otomatik dönülür, bilgilendirilir ve süreç kapanır", () => {
    const id = startOutage(25);
    checkHybrid();
    flushOps();
    activateHybrid();
    flushOps();
    restoreMain();
    expect(W.getState().connectivity.mode).toBe("hybrid_backup");
    flushOps();
    expect(W.getState().hybrid.status).toBe("ended");
    expect(W.getState().connectivity).toMatchObject({ fixed: "up", mobile: "off", mode: "fixed" });
    expect(pushes()[0]).toBe("Ana bağlantınız geri geldi");
    expect(getWf(id)!.status).toBe("completed");
  });
});

describe("Bağlantı sağlığı", () => {
  it("bölgesel arızada müşteriye özel sorun varmış gibi göstermez", () => {
    const regional = [{ type: "outage_recovery" as const, status: "in_progress" as const, steps: [], data: { outageType: "regional" }, handoff: null }];
    expect(connectionHealth({ fixed: "down", mobile: "off" }, regional)).toBe("regional");
    expect(connectionHealth({ fixed: "up", mobile: "off" }, [])).toBe("normal");
    expect(connectionHealth({ fixed: "degraded", mobile: "off" }, [])).toBe("degraded");
    expect(connectionHealth({ fixed: "down", mobile: "active" }, [])).toBe("failover");
  });
});

describe("Senaryo demoları uçtan uca", () => {
  for (const sc of SCENARIOS)
    for (const o of sc.outcomes)
      it(`${sc.id} · ${o.label} sonuna kadar oynar`, () => {
        startScenario(sc.id, o.id);
        for (let i = 0; i < 80 && !useScenarioStore.getState().finishedAt; i++) next();
        expect(useScenarioStore.getState().finishedAt).not.toBeNull();
        const c = buildCtx();
        expect(cursorOf(visibleSteps(sc, c))).toBeNull();
        expect(c.main).toBeDefined();
        expect(["completed", "escalated"]).toContain(c.main!.status);
      });
});
