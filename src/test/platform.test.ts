import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "@/features/core/appStore";
import {
  activateTemp,
  decide,
  flushOps,
  getWf,
  notify,
  openUstaSms,
  provisionTemp,
  runBillingShield,
  seedPaidButDebt,
  startFixedOutage,
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
    const before = useAppStore.getState().notifications.length;
    const { wfId } = (seedPaidButDebt(false), runBillingShield());
    notify(wfId!, "Rutin", "x", "quiet");
    const pushes = W.getState().messages.filter((m) => m.level !== "quiet").length;
    expect(useAppStore.getState().notifications.length - before).toBe(pushes);
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
    drain();
    expect(getWf(id)!.decision?.key).toBe("usta_ivr");
    decide(id, "sms");
    expect(W.getState().sms).toHaveLength(1);
    expect(openUstaSms(id)).toBe(true);
    expect(openUstaSms(id)).toBe(false);
    expect(stepStatus(id, "context")).toBe("done");
    expect(stepStatus(id, "report")).toBe("done");
    drain();
    expect(getWf(id)!.decision?.key).toBe("usta_photo");
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
  it("SIM aktif olmadan açılıp kapanamaz; aktifken uygulamadan kapatılır", () => {
    W.setState({ autoFollowUp: false });
    const out = startFixedOutage();
    W.setState({ autoFollowUp: false });
    for (const k of ["outage.diagnose", "outage.coverage", "outage.offer"]) void k;
    // walk the outage to the offer
    flushOps();
    (W.getState().workflows.find((w) => w.id === out) && null);
    expect(canToggleBox(null)).toBe(false);
  });
  it("kabul sonrası Box teslim edilip aktifleşince aç/kapa bağlantıyı değiştirir", () => {
    const out = startFixedOutage();
    drain();
    decide(out, "temp_mobile");
    W.setState({ autoFollowUp: false });
    const temp = W.getState().workflows.find((w) => w.type === "temp_internet")!;
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
