import { describe, expect, it } from "vitest";
import { QR_STEPS, type StepId } from "@/features/qrSupport/selfService";
import { resolveQrHealth } from "@/features/qrSupport/qrHealth";

describe("QR kesinti kontrolü", () => {
  it("açık kesinti sağlıklı simülasyon sonucunu geçersiz kılar", () => {
    expect(resolveQrHealth({ health: "good", fixed: "up", outageOngoing: true })).toBe("bad");
  });
  it("NetBox kullanılırken de kesik ana hattı sorunlu gösterir", () => {
    expect(resolveQrHealth({ health: "good", fixed: "down", outageOngoing: false })).toBe("bad");
  });
  it("sağlıklı ana hat sağlıklı sonucunu korur", () => {
    expect(resolveQrHealth({ health: "good", fixed: "up", outageOngoing: false })).toBe("good");
  });
  it("başka bir süreçteki yavaşlama sağlıklı QR simülasyonunda sorun uydurmaz", () => {
    expect(resolveQrHealth({ health: "good", fixed: "degraded", outageOngoing: false })).toBe("good");
  });
  it("sorun yalnızca QR sorun simülasyonu açıldığında görünür", () => {
    expect(resolveQrHealth({ health: "bad", fixed: "up", outageOngoing: false })).toBe("bad");
  });
  it("hız sorununa bağlantı başlığının içinden ulaşılır", () => {
    const connection = QR_STEPS.topic.options.find((o) => "step" in o.next && o.next.step === "net_symptom");
    expect(connection?.next).toEqual({ step: "net_symptom" });
    expect(QR_STEPS.topic.options.some((o) => "step" in o.next && o.next.step === "tip_slow")).toBe(false);
    expect(QR_STEPS.net_symptom.options.some((o) => "step" in o.next && o.next.step === "tip_slow")).toBe(true);
  });
});

describe("QR self servis adımları", () => {
  it("her seçenek var olan bir adıma veya gerçek bir işleme gider", () => {
    for (const s of Object.values(QR_STEPS)) for (const o of s.options) if ("step" in o.next) expect(QR_STEPS[o.next.step as StepId]).toBeDefined();
  });
  it("internet ışığı kırmızıysa AI modem onarımı başlar", () => {
    const red = QR_STEPS.lights.options.find((o) => o.label.startsWith("Kırmızı"))!;
    expect(red.next).toEqual({ step: "modem_ai" });
  });
  it("'Modemim çalışmıyor' AI modem onarımına gider", () => {
    expect(QR_STEPS.topic.options.find((o) => o.label === "Modemim çalışmıyor")!.next).toEqual({ step: "modem_ai" });
  });
  it("öneri adımları 'düzeldi' cevabıyla biter", () => {
    for (const id of ["tip_slow", "tip_drops", "tip_pages", "tip_wifi", "tip_restart", "tip_power"] as StepId[]) expect(QR_STEPS[id].options.some((o) => "done" in o.next)).toBe(true);
  });
  it("detay sorusu dört yazılı seçeneği doğru akışa götürür", () => {
    expect(QR_STEPS.net_symptom.options.map((o) => [o.label, o.next])).toEqual([
      ["İnternete bağlanamıyorum.", { step: "lights" }],
      ["Bazı sayfalara erişemiyorum.", { step: "tip_pages" }],
      ["İnternet hızım yavaş", { step: "tip_slow" }],
      ["Kablosuz modem kullanıyorum. Evin bazı bölgelerinde internet bağlantım çok yavaş.", { step: "tip_wifi" }],
    ]);
  });
  it("hız sorunu önerilerden sonra çözülürse biter, çözülmezse hız ölçümü başlar", () => {
    expect(QR_STEPS.net_symptom.options.find((o) => o.label === "İnternet hızım yavaş")?.next).toEqual({ step: "tip_slow" });
    expect(QR_STEPS.tip_slow.options.map((o) => o.next)).toEqual([{ done: true }, { intent: "speed" }]);
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

import { modemEntryStep } from "@/features/qrSupport/qrHealth";
describe("Modemim çalışmıyor girişi", () => {
  it("yeniden başlatmadan sonra modem sorunu sürerse görüntülü GIGA açılır", () => {
    expect(QR_STEPS.tip_restart.options.find((o) => "video" in o.next)?.next).toEqual({ video: true });
    expect(QR_STEPS.tip_restart.options.some((o) => "intent" in o.next)).toBe(false);
  });
  it("elektrik kontrolünden sonra modem sorunu sürerse görüntülü GIGA açılır", () => {
    expect(QR_STEPS.tip_power.options.find((o) => "video" in o.next)?.next).toEqual({ video: true });
    expect(QR_STEPS.tip_power.options.some((o) => "intent" in o.next)).toBe(false);
  });
  it("modem sorunsuzsa önce ışık sorusu sorulur", () => expect(modemEntryStep("ok")).toBe("lights"));
  it("kablo sorunu simülasyonunda kameralı onarım açılır", () => expect(modemEntryStep("cable")).toBe("modem_ai"));
});
