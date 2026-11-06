import { describe, expect, it } from "vitest";
import { QR_STEPS, type StepId } from "@/features/qrSupport/selfService";

describe("QR self servis adımları", () => {
  it("her seçenek var olan bir adıma veya gerçek bir işleme gider", () => {
    for (const s of Object.values(QR_STEPS)) for (const o of s.options) if ("step" in o.next) expect(QR_STEPS[o.next.step as StepId]).toBeDefined();
  });
  it("internet ışığı kırmızıysa modem için GIGA Teknik başlar", () => {
    const red = QR_STEPS.lights.options.find((o) => o.label.startsWith("Kırmızı"))!;
    expect(red.next).toEqual({ intent: "ai_usta", usta: "modem" });
  });
  it("öneri adımları 'düzeldi' cevabıyla biter", () => {
    for (const id of ["tip_slow", "tip_drops", "tip_pages", "tip_wifi", "tip_restart", "tip_power"] as StepId[]) expect(QR_STEPS[id].options.some((o) => "done" in o.next)).toBe(true);
  });
  it("detay sorusu dört yazılı seçeneği doğru akışa götürür", () => {
    expect(QR_STEPS.net_symptom.options.map((o) => [o.label, o.next])).toEqual([
      ["İnternete bağlanamıyorum.", { step: "lights" }],
      ["Bazı sayfalara erişemiyorum.", { step: "tip_pages" }],
      ["İnternete yavaş bağlanıyorum.", { step: "tip_slow" }],
      ["Kablosuz modem kullanıyorum. Evin bazı bölgelerinde internet bağlantım çok yavaş.", { step: "tip_wifi" }],
    ]);
  });
});

import { routeFreeText } from "@/features/qrSupport/selfService";
describe("QR · Diğer serbest metin", () => {
  it("uygulamadaki konu ilgili akışa gider", () => {
    expect(routeFreeText("faturam çok yüksek geldi")).toEqual({ intent: "billing" });
    expect(routeFreeText("yeni eve taşınıyorum")).toEqual({ intent: "relocation" });
  });
  it("alakasız konu canlı desteğe bağlanır", () => {
    expect(routeFreeText("komşumun kedisi kayboldu")).toEqual({ live: true });
  });
});
