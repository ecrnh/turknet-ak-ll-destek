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
    for (const id of ["tip_slow", "tip_drops", "tip_wifi", "tip_restart", "tip_power"] as StepId[]) expect(QR_STEPS[id].options.some((o) => "done" in o.next)).toBe(true);
  });
});
