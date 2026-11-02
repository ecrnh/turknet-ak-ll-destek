import { describe, expect, it } from "vitest";
import { canActivateHybrid, HYBRID_OFFER_AFTER_H, hybridBlocker, hybridOfferOpen, outageElapsedH } from "@/features/workflow/rules";

describe("Ücretsiz Hibrit İnternet · 24 saat kuralı", () => {
  it("teklif 24 saatten önce açılmaz, 24 saatte açılır", () => {
    expect(HYBRID_OFFER_AFTER_H).toBe(24);
    expect(hybridOfferOpen(23.9)).toBe(false);
    expect(hybridOfferOpen(24)).toBe(true);
    // Estimated duration over 24 h opens the offer early; 24 h or less does not.
    expect(hybridOfferOpen(0.5, 36)).toBe(true);
    expect(hybridOfferOpen(0.5, 24)).toBe(false);
  });
  it("geçen süre başlangıç zamanından hesaplanır", () => {
    const start = Date.UTC(2026, 10, 1, 10);
    expect(outageElapsedH(start, start + 25 * 3_600_000)).toBe(25);
  });
});

describe("Ücretsiz Hibrit İnternet · uygunluk", () => {
  it("uyumlu cihaz veya aktif SIM yoksa cihaz gerekir", () => {
    expect(hybridBlocker({ device: false, sim: false, coverage: true })).toBe("no_device");
    expect(hybridBlocker({ device: true, sim: false, coverage: true })).toBe("no_device");
  });
  it("kapsama yetersizse yedek bağlantı açılamaz", () => {
    expect(hybridBlocker({ device: true, sim: true, coverage: false })).toBe("no_coverage");
  });
  it("cihaz, SIM ve kapsama uygunsa engel yok", () => {
    expect(hybridBlocker({ device: true, sim: true, coverage: true })).toBeNull();
  });
  it("etkinleştirme yalnızca 24 saati aşan, sürmekte olan kesintide ve kontrol geçtikten sonra yapılır", () => {
    expect(canActivateHybrid({ elapsedH: 25, fixed: "down", status: "ready" })).toBe(true);
    expect(canActivateHybrid({ elapsedH: 25, fixed: "down", status: "failed" })).toBe(true);
    expect(canActivateHybrid({ elapsedH: 10, fixed: "down", status: "ready" })).toBe(false);
    expect(canActivateHybrid({ elapsedH: 25, fixed: "up", status: "ready" })).toBe(false);
    expect(canActivateHybrid({ elapsedH: 25, fixed: "down", status: "no_device" })).toBe(false);
  });
});
