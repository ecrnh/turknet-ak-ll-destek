import { describe, expect, it } from "vitest";
import { modemGuide } from "@/features/qrSupport/setupGuide";

describe("QR modem kurulumu", () => {
  it("mevcut ZTE GPON modem fiber PON kurulumu gösterir", () => {
    const guide = modemGuide("zte");
    expect(guide.modem.model).toBe("F6640 GPON");
    expect(guide.steps[0]?.body).toContain("PON girişine");
    expect(guide.steps[2]?.body).toContain("LOS ışığı kapalı");
    expect(guide.steps).toHaveLength(4);
  });
  it("TP-Link seçilince rehber DSL portuna ve seçilen modele geçer", () => {
    const guide = modemGuide("tplink");
    expect(guide.steps[0]?.body).toContain("TP-Link Archer VR400");
    expect(guide.steps[0]?.body).toContain("DSL girişine");
    expect(guide.steps[2]?.body).toContain("DSL ışıkları sabit");
    expect(guide.steps).toHaveLength(4);
  });
  it("Zyxel seçilince rehber seçilen modelin DSL kurulumu olur", () => {
    const guide = modemGuide("zyxel");
    expect(guide.steps[0]?.body).toContain("Zyxel VMG3625-T50B");
    expect(guide.steps[0]?.body).toContain("DSL girişine");
    expect(guide.steps).toHaveLength(4);
  });
});