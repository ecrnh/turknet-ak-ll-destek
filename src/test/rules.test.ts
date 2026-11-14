import { describe, expect, it } from "vitest";
import { canActivateHybrid, HYBRID_OFFER_AFTER_H, hybridBlocker, hybridOfferOpen, outageElapsedH } from "@/features/workflow/rules";

describe("Ücretsiz Hibrit İnternet · kesintinin ilk anı kuralı", () => {
  it("teklif kesinti başladığı anda açılır, hiç beklemez", () => {
    expect(HYBRID_OFFER_AFTER_H).toBe(0);
    expect(hybridOfferOpen(0)).toBe(true);
    expect(hybridOfferOpen(0.1)).toBe(true);
    expect(hybridOfferOpen(0, null)).toBe(true);
    expect(hybridOfferOpen(0, 36)).toBe(true);
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
  it("etkinleştirme kesintinin ilk anında, sürmekte olan kesintide ve kontrol geçtikten sonra yapılır", () => {
    expect(canActivateHybrid({ elapsedH: 0, fixed: "down", status: "ready" })).toBe(true);
    expect(canActivateHybrid({ elapsedH: 0.2, fixed: "down", status: "failed" })).toBe(true);
    expect(canActivateHybrid({ elapsedH: 0.2, fixed: "up", status: "ready" })).toBe(false);
    expect(canActivateHybrid({ elapsedH: 0.2, fixed: "down", status: "no_device" })).toBe(false);
  });
});
