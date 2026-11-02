import { describe, expect, it } from "vitest";
import { hybridView, type HybridViewInput } from "@/features/workflow/hybridView";

const base: HybridViewInput = {
  fixed: "up",
  outageOngoing: false,
  restored: false,
  restoredVerified: false,
  hours: 0,
  offerOpen: false,
  status: "unavailable",
  paused: false,
  activatedBy: null,
  autoFailover: true,
  hasDevice: true,
};

describe("Hibrit İnternet ekranı · durum tutarlılığı", () => {
  it("ana internet bağlıyken 'Bağlantın normal' der ve mobil yedek beklemede olur", () => {
    const v = hybridView(base);
    expect(v.title).toBe("Bağlantın normal");
    expect([v.main, v.box, v.mobile]).toEqual(["Bağlı", "Hazır", "Beklemede"]);
    expect(v.showOpen).toBe(false);
    expect(v.failbackNote).toBe(false);
  });

  it("ana internet kesikken (kesinti kaydı olmasa bile) asla 'Bağlantın normal' demez", () => {
    const v = hybridView({ ...base, fixed: "down" });
    expect(v.title).toBe("Ana internet bağlantın kesildi");
    expect(v.main).toBe("Kesik");
  });

  it("kesinti 24 saati doldurmadıysa Hibrit Box hazır, mobil yedek beklemede ve buton henüz açılamaz", () => {
    const v = hybridView({ ...base, fixed: "down", outageOngoing: true, hours: 3 });
    expect([v.main, v.box, v.mobile]).toEqual(["Kesik", "Hazır", "Beklemede"]);
    expect(v.showOpen).toBe(true);
    expect(v.canOpen).toBe(false);
    expect(v.openHint).toContain("24 saati");
  });

  it("24 saat sonrası otomatik açılan yedek 'Yedek bağlantı aktif' ve Kesik/Aktif/Bağlı gösterir", () => {
    const v = hybridView({ ...base, fixed: "down", outageOngoing: true, hours: 25, offerOpen: true, status: "active", activatedBy: "auto" });
    expect(v.title).toBe("Yedek bağlantı aktif");
    expect([v.main, v.box, v.mobile]).toEqual(["Kesik", "Aktif", "Bağlı"]);
    expect(v.failbackNote).toBe(true);
    expect(v.showOpen).toBe(false);
  });

  it("otomatik ve manuel açılış farklı açıklanır", () => {
    const auto = hybridView({ ...base, fixed: "down", outageOngoing: true, hours: 25, offerOpen: true, status: "active", activatedBy: "auto" });
    const manual = hybridView({ ...base, fixed: "down", outageOngoing: true, hours: 25, offerOpen: true, status: "active", activatedBy: "customer" });
    expect(auto.lines.join(" ")).toContain("otomatik");
    expect(manual.lines[0]).toBe("Hibrit Box'ı açtın.");
  });

  it("24 saat dolduğunda izin yoksa buton açılabilir olur", () => {
    const v = hybridView({ ...base, fixed: "down", outageOngoing: true, hours: 25, offerOpen: true, status: "ready", autoFailover: false });
    expect(v.canOpen).toBe(true);
  });

  it("ana internet dönünce yedek kapanmış olarak gösterilir", () => {
    const v = hybridView({ ...base, restored: true, restoredVerified: true, status: "ended" });
    expect(v.title).toBe("Ana bağlantına döndün");
    expect([v.main, v.mobile]).toEqual(["Bağlı", "Beklemede"]);
  });
});
