import { describe, expect, it } from "vitest";
import { GIGA, SEARCH_INDEX } from "@/data/mock";
import { gigaReply, PRIVACY_REPLY } from "@/features/giga/assistant";
import { TYPE_LABEL } from "@/features/workflow/copy";
import { HEALTH_COPY } from "@/features/workflow/rules";

const BANNED_NAMES = ["GIGA Fatura", "GIGA Taşınma", "GIGA Takip", "GIGA Bildirim", "GIGA İşlemlerim"];

describe("GIGA yalnızca asistan deneyiminde kullanılır", () => {
  it("sıradan özellikler GIGA önekiyle adlandırılmaz", () => {
    const names = [...Object.values(TYPE_LABEL), ...GIGA.capabilities.map((c) => c.name), ...SEARCH_INDEX.map((s) => s.title)];
    for (const n of names) for (const b of BANNED_NAMES) expect(n).not.toContain(b);
  });
  it("yerleşik ürün adları korunur", () => {
    expect(TYPE_LABEL.billing_check).toBe("Fatura Kalkanı");
    expect(TYPE_LABEL.relocation).toBe("Taşınma ve Nakil");
  });
});

describe("Güvene dayalı teknik kontrol dili", () => {
  it("bağlantı durumu metinleri sürekli izleme ima etmez", () => {
    for (const c of Object.values(HEALTH_COPY)) expect(c.text).not.toMatch(/izliyor|sürekli izle/);
    expect(HEALTH_COPY.normal.text).toContain("gerekli teknik kontrolleri");
  });
  it("gizlilik sorusuna kapsamı net bir yanıt verilir", () => {
    const r = gigaReply("Beni izliyor musunuz?", { net: "online", active: [], outage: false });
    expect(r.topic).toBe("privacy");
    expect(r.text).toBe(PRIVACY_REPLY);
    expect(PRIVACY_REPLY).toContain("Ziyaret ettiğin siteleri, mesajlarını veya kişisel içeriklerini görmüyoruz");
  });
});
