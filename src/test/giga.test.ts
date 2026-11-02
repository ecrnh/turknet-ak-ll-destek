import { describe, expect, it } from "vitest";
import { gigaReply, type GigaContext } from "@/features/giga/assistant";

const base: GigaContext = { net: "online", active: [], outage: false };

describe("GIGA · kim ne yapar", () => {
  it("fatura kontrolünü GIGA yapar, inceleme ve kayıt değişikliği onaya bağlıdır", () => {
    const r = gigaReply("Faturamda tutarsızlık var", base);
    expect(r.topic).toBe("billing");
    expect(r.start).toBe("billing");
    expect(r.text).toContain("onayınla");
  });

  it("taşınma başvurusu müşteri onayı gerektirir", () => {
    const r = gigaReply("Taşınacağım", base);
    expect(r.start).toBe("relocation");
    expect(r.text).toContain("onayını alırım");
  });

  it("açık taşınma varken yeni taşınma başlatılmaz, mevcut işleme gidilir", () => {
    const r = gigaReply("Taşınacağım", { ...base, active: [{ id: "NKL-1", type: "relocation", title: "Taşınma · Kadıköy", status: "in_progress" }] });
    expect(r.actions?.some((a) => a.intent === "relocation")).toBe(false);
    expect(r.actions?.[0]?.to).toBe("/surec/NKL-1");
  });

  it("müşteri istediğinde uzmana aktarılır", () => {
    expect(gigaReply("Müşteri temsilcisi istiyorum", base).actions?.[0]?.kind).toBe("human");
  });

  it("bilinen kesintide modem adımı yerine kesinti takibine yönlendirir", () => {
    const r = gigaReply("İnternetim çalışmıyor", { ...base, net: "down", outage: true });
    expect(r.actions?.some((a) => a.intent === "ai_usta")).toBe(false);
    expect(r.actions?.[0]?.to).toBe("/hibrit");
  });

  it("devam eden işlem varsa kaldığı yerden devam ettirir", () => {
    const r = gigaReply("İşlemim ne durumda?", { ...base, active: [{ id: "FTR-1", type: "billing_check", title: "Fatura Kalkanı · Eylül", status: "waiting_for_customer" }] });
    expect(r.actions?.[0]?.to).toBe("/surec/FTR-1");
  });

  it("anlamadığında önce netleştirme seçenekleri sunar, uzman seçeneğini öne çıkarmaz", () => {
    const r = gigaReply("asdf qwer", base);
    expect(r.topic).toBe("clarify");
    expect(r.actions?.filter((a) => a.kind === "ask").length).toBeGreaterThan(0);
    expect(r.actions?.some((a) => a.kind === "human")).toBe(false);
  });

  it("fatura ödeme sorusu fatura incelemesi başlatmaz", () => {
    const r = gigaReply("Faturamı nasıl öderim?", base);
    expect(r.topic).toBe("payment");
    expect(r.actions?.some((a) => a.intent === "billing")).toBe(false);
  });

  it("hiçbir yanıt işlemi tamamlandı diye iddia etmez", () => {
    for (const q of ["Faturamda tutarsızlık var", "Taşınacağım", "İnternetim çalışmıyor", "Hızım düşük"]) {
      expect(gigaReply(q, base).text).not.toMatch(/tamamladım|çözdüm|düzelttim|başlattım/);
    }
  });
});

describe("Ana sayfadan kaldırılan kısayollar sohbetten açılır", () => {
  it("Benim İçin Hallet ve Hibrit İnternet GIGA'dan erişilebilir", () => {
    const base2: GigaContext = { net: "online", active: [], outage: false };
    expect(gigaReply("Benim için hallet", base2).actions?.[0]?.to).toBe("/hallet");
    expect(gigaReply("Hibrit İnternet", base2).actions?.some((a) => a.to === "/hibrit")).toBe(true);
  });
});
