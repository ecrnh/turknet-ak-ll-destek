import { beforeEach, describe, expect, it } from "vitest";
import { decide, flushOps, getWf, startAiUsta, stepStatus, useWorkflowStore } from "@/features/workflow";
import { setInspection } from "@/features/workflow/services/aiUsta";
import { handoffSummary } from "@/features/workflow/services/liveSupport";

const W = useWorkflowStore;
const drain = () => {
  for (let r = 0; r < 6; r++) for (let i = 0; i < 30 && W.getState().ops.length; i++) flushOps();
};
const cfg = (c: Partial<ReturnType<typeof W.getState>["config"]>) => W.setState((s) => ({ config: { ...s.config, ...c } }));

beforeEach(() => {
  W.getState().reset();
  W.setState({ autoFollowUp: true });
});

describe("GIGA Teknik · önce dijital onarım", () => {
  it("“İnternetim çalışmıyor” önce sorun türünü sorar, fotoğraf istemez", () => {
    const id = startAiUsta("no_internet");
    expect(getWf(id)!.decision?.key).toBe("usta_issue");
    expect(getWf(id)!.decision?.options.map((o) => o.label)).toEqual(["İnternete hiç bağlanamıyorum.", "İnternetim yavaş.", "Bağlantım sürekli kopuyor.", "Wi-Fi ağıma bağlanamıyorum."]);
    expect(stepStatus(id, "inspect")).toBe("pending");
  });

  it("seçilen sorun oturum boyunca korunur ve dijital onarım fotoğraftan önce çalışır", () => {
    const id = startAiUsta("no_internet");
    decide(id, "wifi");
    expect(stepStatus(id, "repair")).toBe("in_progress");
    expect(getWf(id)!.decision).toBeNull();
    drain();
    expect(getWf(id)!.data["issue"]).toBe("Wi-Fi ağına bağlanamıyor");
    expect(String(getWf(id)!.data["repair"]).split("|")).toHaveLength(5);
    expect(getWf(id)!.decision?.key).toBe("usta_more");
  });

  it("sorun yoksa ön/arka modem kontrolüne geçer; kablo gevşekse ilk adım kablo kontrolüdür", () => {
    const id = startAiUsta("no_internet");
    decide(id, "no_connect");
    drain();
    decide(id, "yes");
    expect(getWf(id)!.decision?.key).toBe("usta_inspect");
    setInspection(id, { light: "red", cable: "loose" });
    decide(id, "done");
    drain();
    expect(getWf(id)!.decision?.key).toBe("usta_step1");
    expect(getWf(id)!.decision?.prompt).toBe("Modeminin kablo bağlantılarını kontrol edelim");
  });

  it("sorun bulunursa önce uzaktan düzeltir; çözülürse fotoğraf istenmez ve kayıt açılmaz", () => {
    cfg({ ustaDiag: "issue", aiFix: "fixed" });
    const id = startAiUsta("no_internet");
    decide(id, "no_connect");
    drain();
    expect(stepStatus(id, "remote")).toBe("done");
    expect(stepStatus(id, "inspect")).toBe("skipped");
    expect(getWf(id)!.decision?.key).toBe("usta_confirm");
    decide(id, "yes");
    expect(getWf(id)!.status).toBe("completed");
    expect(getWf(id)!.handoff).toBeFalsy();
  });

  it("uzaktan düzeltme sonuç vermezse aktarım sunulur", () => {
    cfg({ ustaDiag: "issue", aiFix: "not_fixed" });
    const id = startAiUsta("no_internet");
    decide(id, "drops");
    drain();
    expect(getWf(id)!.decision?.key).toBe("usta_remote_failed");
    decide(id, "handoff");
    expect(getWf(id)!.status).toBe("escalated");
  });

  it("canlı destek seçilince tüm kontrollerle aktarılır ve sohbet açılır", () => {
    const id = startAiUsta("no_internet");
    decide(id, "no_connect");
    drain();
    decide(id, "live");
    const wf = getWf(id)!;
    expect(wf.handoff).toBeTruthy();
    expect(W.getState().chats.some((c) => c.workflowId === id)).toBe(true);
    const labels = handoffSummary(wf, W.getState().connectivity).map((x) => x.label);
    expect(labels).toEqual(expect.arrayContaining(["Sorun", "Dijital onarım", "Tespit edilen sorun", "Modem ışıkları", "Kablo kontrolü", "Yapılan adımlar", "Mevcut durum"]));
  });
});

describe("GIGA Teknik · sade bağlantı kontrolü", () => {
  it("beş kontrol müşteriye üç aşama olarak gösterilir", async () => {
    const { REPAIR_STAGES, repairStageStates } = await import("@/features/workflow/rules");
    expect(REPAIR_STAGES.map((s) => s.title)).toEqual(["Modem ve bağlantı kontrolü", "Bölgesel arıza kontrolü", "Çözüm seçenekleri"]);
    expect(REPAIR_STAGES.flatMap((s) => s.checks)).toEqual(["modem", "session", "line", "regional", "diag"]);
    expect(repairStageStates(1, null)).toEqual(["running", "pending", "pending"]);
    expect(repairStageStates(3, null)).toEqual(["done", "running", "pending"]);
    expect(repairStageStates(5, "clear")).toEqual(["done", "done", "done"]);
  });

  it("bölgesel arıza bulunursa modem adımı istenmez, kesinti takibi başlar ve 24 saati aşan tahminde Hibrit İnternet sunulur", () => {
    cfg({ ustaDiag: "regional", regionalEtaH: 36 });
    const id = startAiUsta("no_internet");
    decide(id, "no_connect");
    drain();
    const wf = getWf(id)!;
    expect(wf.data["repairOutcome"]).toBe("regional");
    expect(stepStatus(id, "inspect")).toBe("skipped");
    expect(wf.status).toBe("completed");
    expect(W.getState().outage?.etaH).toBe(36);
    expect(W.getState().hybrid.status).toBe("offered");
  });

  it("bölgesel arızanın tahmini süresi 24 saatin altındaysa Hibrit İnternet hemen sunulmaz", () => {
    cfg({ ustaDiag: "regional", regionalEtaH: 6 });
    const id = startAiUsta("no_internet");
    decide(id, "no_connect");
    drain();
    expect(W.getState().outage).toBeTruthy();
    expect(W.getState().hybrid.status).toBe("unavailable");
  });

  it("kontroller tamamlanamazsa sonuç uydurulmaz; tekrar deneme veya aktarım sunulur", () => {
    cfg({ ustaDiag: "incomplete" });
    const id = startAiUsta("no_internet");
    decide(id, "no_connect");
    drain();
    expect(getWf(id)!.data["repairOutcome"]).toBe("incomplete");
    expect(getWf(id)!.decision?.key).toBe("usta_incomplete");
    cfg({ ustaDiag: "clear" });
    decide(id, "retry");
    drain();
    expect(getWf(id)!.data["repairOutcome"]).toBe("clear");
    expect(getWf(id)!.decision?.key).toBe("usta_more");
  });
});

describe("Hibrit Box · otomatik ve manuel açılış ayrı izlenir", () => {
  it("izin verilmişse 24 saati aşan kesintide otomatik açılır; izin yoksa açılmaz", async () => {
    const { setAutoFailover, setOutageElapsed } = await import("@/features/workflow/services/hybrid");
    setAutoFailover(true);
    setOutageElapsed(25);
    drain();
    expect(W.getState().hybrid.status).toBe("active");
    expect(W.getState().hybrid.activatedBy).toBe("auto");

    W.getState().reset();
    setOutageElapsed(25);
    drain();
    expect(W.getState().hybrid.status).toBe("offered");
    expect(W.getState().hybrid.activatedBy ?? null).toBeNull();
  });

  it("müşteri kendisi açarsa manuel olarak kaydedilir", async () => {
    const { activateHybrid, checkHybrid, setOutageElapsed } = await import("@/features/workflow/services/hybrid");
    setOutageElapsed(25);
    checkHybrid();
    drain();
    expect(activateHybrid()).toBe(true);
    drain();
    expect(W.getState().hybrid.activatedBy).toBe("customer");
  });
});
