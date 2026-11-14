import { describe, expect, it } from "vitest";
import { createRageDetector, detectQuickBack, featureForPath, proactiveMessage, shouldShow, signalKey, type Signal } from "@/features/proactive/rules";

describe("öfkeli tıklama", () => {
  it("2 sn içinde 3 tık → tek sinyal", () => {
    const d = createRageDetector();
    expect([0, 500, 900].map((at) => d({ key: "a", at }))).toEqual([false, false, true]);
  });
  it("aynı dizide 6 tık yine tek sinyal", () => {
    const d = createRageDetector();
    expect([0, 200, 400, 600, 800, 1000].filter((at) => d({ key: "a", at })).length).toBe(1);
  });
  it("yayılmış tıklar sinyal üretmez", () => {
    const d = createRageDetector();
    expect([0, 1500, 2500].some((at) => d({ key: "a", at }))).toBe(false);
  });
  it("farklı butonlara hızlı tıklama sinyal değildir", () => {
    const d = createRageDetector();
    expect(["a", "b", "c", "a"].some((key, i) => d({ key, at: i * 100 }))).toBe(false);
  });
});

describe("hızlı geri dönüş", () => {
  it("A→B (3 sn)→A sinyal", () => {
    expect(detectQuickBack([{ path: "/", at: 0 }, { path: "/faturalar", at: 1000 }, { path: "/", at: 4000 }])).toEqual({ left: "/faturalar", back: "/" });
  });
  it("B'de 8 sn kalınca sinyal yok", () => {
    expect(detectQuickBack([{ path: "/", at: 0 }, { path: "/faturalar", at: 1000 }, { path: "/", at: 9000 }])).toBeNull();
  });
  it("A→B→C sinyal değildir", () => {
    expect(detectQuickBack([{ path: "/", at: 0 }, { path: "/faturalar", at: 1000 }, { path: "/hesabim", at: 2000 }])).toBeNull();
  });
});

describe("mesaj ve tekrar kontrolü", () => {
  const s: Signal = { type: "rage_click", path: "/islem/hiz-yukseltme", feature: featureForPath("/islem/hiz-yukseltme").feature, at: 1000 };
  it("mesaj özellik adını içerir", () => {
    expect(proactiveMessage(s)).toBe("Tarife değiştirme işlemiyle ilgili bir sorun yaşadığınızı fark ettim. Yardım etmemi ister misiniz?");
  });
  it("aynı sorun ikinci kez gösterilmez", () => {
    expect(shouldShow(s, new Set(), 0)).toBe(true);
    expect(shouldShow(s, new Set([signalKey(s)]), 0)).toBe(false);
  });
  it("bekleme süresinde başka sinyal gösterilmez", () => {
    expect(shouldShow({ ...s, feature: "x" }, new Set(), 5000)).toBe(false);
  });
});
