import { describe, expect, it } from "vitest";
import { contextualReply, detectSearchIntent, SEARCH_INTENTS, SEARCH_SUGGESTIONS } from "@/features/giga/smartSearch";

describe("Akıllı arama niyeti doğru ekrana götürür", () => {
  const cases: [string, string][] = [
    ["İnternetimi yeni adresime taşımak istiyorum.", "/tasinma"],
    ["Bu ay faturam neden yüksek geldi?", "/fatura-kalkani"],
    ["İnternetim çok yavaş.", "/ai-usta"],
    ["İnternetim kesildi, bağlantı istiyorum.", "/hibrit"],
    ["Modemimin ışıkları yanmıyor.", "/goruntulu-destek"],
    ["İnternetimi dondurmak istiyorum.", "/islem/dondur"],
  ];
  for (const [q, to] of cases) it(q, () => expect(detectSearchIntent(q)?.to).toBe(to));

  it("öneriler de bir niyete bağlanır", () => {
    for (const s of SEARCH_SUGGESTIONS) expect(detectSearchIntent(s)).not.toBeNull();
  });

  it("takılan kullanıcıya ekrana özel yönlendirme verilir", () => {
    const r = contextualReply(SEARCH_INTENTS.relocation, "Buradan nasıl devam edeceğimi anlayamadım.");
    expect(r.text.startsWith("Nakil işlemini başlatmak istediğini görüyorum. Önce yeni adresinin altyapısını kontrol edelim.")).toBe(true);
  });
});
