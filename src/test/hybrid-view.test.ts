import { describe, expect, it } from "vitest";
import { hybridView, outageInfo, type HybridViewInput } from "@/features/workflow/hybridView";

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

import { fmtRemaining, outageRemainingH } from "@/features/workflow/hybridView";

describe("Ana sayfa kesinti kartı · tahmini çözüm süresi", () => {
  it("bilinen tahmin varsa kalan süreyi ondan hesaplar", () => {
    expect(outageRemainingH(10, 36, true)).toBe(26);
    expect(fmtRemaining(26)).toBe("Yaklaşık 1 gün içinde");
  });
  it("bilinen tahmin geçtiyse 'güncelleniyor' der, uydurma süre göstermez", () => {
    expect(outageRemainingH(40, 36, true)).toBeNull();
    expect(fmtRemaining(null)).toBe("Tahmini süre güncelleniyor");
  });
  it("tahmin yoksa her zaman ileride birkaç saat gösterir", () => {
    expect(outageRemainingH(0.3, null, false)).toBe(6);
    expect(outageRemainingH(25, null, false)).toBe(4);
  });
});

import { hybridSwitchView } from "@/features/workflow/hybridView";

describe("Hibrit İnternet anahtarı ve ana buton aynı durumu gösterir", () => {
  const sw = { status: "offered" as const, paused: false, switching: null, openRequested: false, offerOpen: true };

  it("kapalıyken anahtar kapalı, etiket 'Kapalı', buton 'Hibrit Box'ı Aç'", () => {
    const v = hybridSwitchView(sw);
    expect([v.on, v.label, v.cta, v.canToggle, v.ctaEnabled]).toEqual([false, "Kapalı", "Hibrit Box'ı Aç", true, true]);
  });

  it("aktivasyon sürerken buton 'Aktive Ediliyor...' der ve ikisi de kilitlenir", () => {
    for (const v of [hybridSwitchView({ ...sw, status: "activating" }), hybridSwitchView({ ...sw, status: "checking", openRequested: true }), hybridSwitchView({ ...sw, status: "active", paused: true, switching: "on" })]) {
      expect(v.cta).toBe("Aktive Ediliyor...");
      expect(v.busy).toBe("opening");
      expect(v.canToggle).toBe(false);
      expect(v.ctaEnabled).toBe(false);
    }
  });

  it("aktifken anahtar açık, etiket 'Aktif', buton 'Hibrit İnternet Aktif'; anahtar kapatılabilir", () => {
    const v = hybridSwitchView({ ...sw, status: "active" });
    expect([v.on, v.label, v.cta, v.canToggle, v.ctaEnabled]).toEqual([true, "Aktif", "Hibrit İnternet Aktif", true, false]);
  });

  it("kapatma sürerken kilitlenir; kapatıldıktan sonra yeniden açılabilir", () => {
    expect(hybridSwitchView({ ...sw, status: "active", switching: "off" })).toMatchObject({ busy: "closing", canToggle: false, label: "Kapatılıyor…" });
    expect(hybridSwitchView({ ...sw, status: "active", paused: true })).toMatchObject({ on: false, label: "Kapalı", canToggle: true, cta: "Hibrit Box'ı Aç" });
  });

  it("ilk 24 saatte ve kapsama/cihaz yokken anahtar açılamaz", () => {
    expect(hybridSwitchView({ ...sw, offerOpen: false })).toMatchObject({ canToggle: false, cta: null });
    expect(hybridSwitchView({ ...sw, status: "no_coverage" })).toMatchObject({ canToggle: false, cta: null });
    expect(hybridSwitchView({ ...sw, status: "no_device" })).toMatchObject({ canToggle: false, cta: null });
  });
});

describe("Hibrit İnternet ekranı · arıza bilgisi", () => {
  it("bağlantı çalışırken arıza bilgisi göstermez", () => {
    expect(outageInfo({ fixed: "up", outageOngoing: false, regional: false, hours: 0 })).toBeNull();
  });
  it("hat arızasında sebep ve tahmini çözüm süresini verir", () => {
    expect(outageInfo({ fixed: "down", outageOngoing: true, regional: false, hours: 25, etaH: 29 })).toEqual({ cause: "Hattınızda bağlantı kesintisi", remaining: "Yaklaşık 4 saat içinde" });
  });
  it("bölgesel arızada sebebi bölgesel altyapı olarak gösterir", () => {
    expect(outageInfo({ fixed: "down", outageOngoing: true, regional: true, hours: 2 })?.cause).toBe("Bölgenizdeki altyapı arızası");
  });
  it("arıza kaydı yokken ana hat kesikse yine bilgi kartı çıkar", () => {
    expect(outageInfo({ fixed: "down", outageOngoing: false, regional: false, hours: 0 })).not.toBeNull();
  });
});
