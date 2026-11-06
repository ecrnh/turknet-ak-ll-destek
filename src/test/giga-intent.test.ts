import { describe, expect, it } from "vitest";
import { GIGA } from "@/data/mock";
import { gigaReply, type GigaContext } from "@/features/giga/assistant";
import { understand } from "@/features/giga/intent";

const base: GigaContext = { net: "online", active: [], outage: false };

describe("GIGA kullanıcının cümlesinden doğru akışı başlatır", () => {
  it("“İnternetim kesildi” → dijital onarım kontrolleri, sorun türü tekrar sorulmaz", () => {
    const r = gigaReply("İnternetim kesildi.", base);
    expect(r.text).toBe("Bağlantını kontrol ediyorum. Önce sorunun evindeki bağlantıdan mı yoksa bölgesel bir kesintiden mi kaynaklandığını anlamaya çalışalım.");
    expect(r.start).toBe("ai_usta");
    expect(r.usta).toBe("no_connect");
  });

  it("“Faturam neden bu kadar yüksek?” → Fatura Kalkanı", () => {
    const r = gigaReply("Faturam neden bu kadar yüksek?", base);
    expect(r.text.startsWith("Faturanı birlikte inceleyelim. Önceki dönem tutarını, mevcut faturanı ve varsa kampanya veya abonelik değişikliklerini kontrol ediyorum.")).toBe(true);
    expect(r.start).toBe("billing");
  });

  it("“Taşınacağım” → taşınma akışı açılır", () => {
    const r = gigaReply("Taşınacağım.", base);
    expect(r.text.startsWith("Yeni adresin için altyapı ve port uygunluğunu kontrol ederek nakil sürecini başlatalım.")).toBe(true);
    expect(r.start).toBe("relocation");
  });

  it("“Nakil başvurum ne durumda?” yeni başvuru açmaz, mevcut kaydın durumunu ve sonraki adımı gösterir", () => {
    const active = [
      { id: "FTR-1", type: "billing_check" as const, title: "Fatura Kalkanı · Eylül", status: "in_progress" as const },
      { id: "NKL-1", type: "relocation" as const, title: "Taşınma · Kadıköy", status: "waiting_for_external_system" as const, nextStep: "Port ataması" },
    ];
    const r = gigaReply("Nakil başvurum ne durumda?", { ...base, active });
    expect(r.start).toBeUndefined();
    expect(r.focus).toBe("NKL-1");
    expect(r.text).toContain("Yanıt bekleniyor");
    expect(r.text).toContain("İlgili ekipten yanıt bekliyoruz");
  });

  it("nakil başvurusu yoksa bunu söyler ve başlatmayı önerir, “evet” deyince başlatır", () => {
    const r = gigaReply("Nakil başvurum ne durumda?", base);
    expect(r.start).toBeUndefined();
    expect(r.offer).toBe("relocation");
    expect(gigaReply("evet", { ...base, lastOffer: r.offer ?? null }).start).toBe("relocation");
  });

  it("başlangıç önerilerinin her biri anlaşılır", () => {
    expect(GIGA.starters).toEqual([
      "İnternetimle ilgili destek almak istiyorum",
      "Fatura borcum ne kadar?",
      "İnternetimi başka adrese taşıma işlemini nasıl gerçekleştiririm?",
      "İnternet hizmetini belli bir süre nasıl dondurabilirim?",
    ]);
    expect(gigaReply("İnternetimle ilgili destek almak istiyorum", base).topic).toBe("clarify");
    expect(gigaReply("Fatura borcum ne kadar?", base).topic).toBe("payment");
    expect(gigaReply("İnternetimi başka adrese taşıma işlemini nasıl gerçekleştiririm?", base).offer).toBe("relocation");
    expect(gigaReply("İnternet hizmetini belli bir süre nasıl dondurabilirim?", base).topic).toBe("subscription");
  });
});

describe("Niyet anlama", () => {
  it("Türkçe karakter olmadan yazılanı ve küçük yazım hatalarını anlar", () => {
    expect(understand("faturam neden bu kadar yuksek").topic).toBe("billing");
    expect(understand("internetim kesildi").topic).toBe("outage");
    expect(understand("fatrua tutarsiz").topic).toBe("billing");
    expect(understand("baglanamiyorum").topic).toBe("outage");
  });

  it("benzer kelimeleri karıştırmaz", () => {
    expect(understand("ne zaman gelir").scores.billing).toBeUndefined(); // "zaman" ≠ "zam"
    expect(understand("nakit ödeme").topic).not.toBe("relocation"); // "nakit" ≠ "nakil"
  });

  it("aynı cümledeki ikinci ihtiyacı da yakalar", () => {
    const u = understand("Taşınıyorum, bir de faturam çok yüksek geldi");
    expect(u.topic).toBe("relocation");
    expect(u.also).toBe("billing");
    expect(gigaReply("Taşınıyorum, bir de faturam çok yüksek geldi", base).actions?.some((a) => a.prompt === "Faturamı kontrol et.")).toBe(true);
  });

  it("bağlantı sorunu türünü cümleden çıkarır", () => {
    expect(gigaReply("Bağlantım sürekli kopuyor", base).usta).toBe("drops");
    expect(gigaReply("Wi-Fi ağıma bağlanamıyorum", base).usta).toBe("wifi");
    expect(gigaReply("Modemde kırmızı ışık yanıyor", base).usta).toBe("modem");
  });

  it("görüntülü destek istenince uzmana aktarır", () => {
    expect(gigaReply("Görüntülü görüşmek istiyorum", base).actions?.[0]?.kind).toBe("human");
  });

  it("bilinen kesintide yeni teknik kayıt başlatmaz", () => {
    expect(gigaReply("İnternetim kesildi", { ...base, outage: true, net: "down" }).start).toBeUndefined();
  });

  it("açık teknik kayıt varken yenisini başlatmaz, kaldığı yerden devam eder", () => {
    const r = gigaReply("İnternetim çalışmıyor", { ...base, active: [{ id: "UST-1", type: "ai_usta", title: "Bağlantı sorunu", status: "in_progress" }] });
    expect(r.start).toBeUndefined();
    expect(r.focus).toBe("UST-1");
  });
});
