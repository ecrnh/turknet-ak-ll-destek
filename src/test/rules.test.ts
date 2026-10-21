import { describe, expect, it } from "vitest";
import { clampShare, giftForOutage } from "@/features/giftData/gift";
import { detectOperator } from "@/data/mock";

describe("Kesinti telafisi eşikleri", () => {
  it("6 saatin altında hediye yok", () => {
    expect(giftForOutage(5)).toBe(0);
  });
  it("6 saat → 5 GB", () => {
    expect(giftForOutage(6)).toBe(5);
    expect(giftForOutage(10)).toBe(5);
  });
  it("24 saat → 10 GB", () => {
    expect(giftForOutage(24)).toBe(10);
  });
  it("72 saat ve üzeri → 20 GB", () => {
    expect(giftForOutage(72)).toBe(20);
    expect(giftForOutage(96)).toBe(20);
  });
});

describe("GB paylaşımı", () => {
  it("kalan GB'den fazlası paylaşılamaz", () => {
    expect(clampShare(8, 3.6)).toBe(3.6);
  });
  it("10 GB'nin 3'ü anneye verilebilir", () => {
    expect(clampShare(3, 8.6)).toBe(3);
  });
});

describe("Operatör otomatik tespiti", () => {
  it("053x Turkcell, 054x Vodafone, 050x/055x Türk Telekom", () => {
    expect(detectOperator("0532 418 22 17")).toBe("Turkcell");
    expect(detectOperator("0544 210 33 81")).toBe("Vodafone");
    expect(detectOperator("0505 111 22 33")).toBe("Türk Telekom");
  });
});
