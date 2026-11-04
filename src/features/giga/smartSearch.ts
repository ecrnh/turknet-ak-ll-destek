/**
 * Intent-based smart search (pure, testable). Maps a natural sentence to one
 * existing destination screen plus GIGA's short confirmation and the
 * screen-aware follow-up help shown once the customer lands there.
 */
import { normalize, understand } from "./intent";

export type SearchIntentId = "relocation" | "billing" | "tech" | "hybrid" | "modem" | "freeze";

export interface SearchIntent {
  id: SearchIntentId;
  label: string;
  reply: string;
  cta: string;
  to: string;
  /** Answer when the customer is stuck on the destination screen. */
  help: string;
  helpAction: string;
}

export const SEARCH_INTENTS: Record<SearchIntentId, SearchIntent> = {
  relocation: {
    id: "relocation", label: "Nakil işlemi", to: "/tasinma", cta: "Nakil işlemine git",
    reply: "Anladım! İnternetini yeni adresine taşımak istiyorsun. Nakil işlemini buradan başlatabiliriz.",
    help: "Nakil işlemini başlatmak istediğini görüyorum. Önce yeni adresinin altyapısını kontrol edelim.",
    helpAction: "Yeni adresi gir ve altyapıyı sorgula; sonra uygun nakil tarihini seç.",
  },
  billing: {
    id: "billing", label: "Fatura inceleme", to: "/fatura-kalkani", cta: "Fatura incelemesine git",
    reply: "Anladım! Bu ayki faturanın neden yüksek geldiğini öğrenmek istiyorsun. Faturanı birlikte inceleyelim.",
    help: "Faturanı incelemek istediğini görüyorum. İncelemeyi başlattığında kalemleri önceki ayla karşılaştırırız.",
    helpAction: "Sayfadaki inceleme düğmesine dokunup onay ver; sonuç bu ekranda görünür.",
  },
  tech: {
    id: "tech", label: "Teknik destek", to: "/ai-usta", cta: "Teknik desteğe git",
    reply: "Anladım! İnternetin yavaş. Bağlantını uzaktan kontrol edip çözüm bulalım.",
    help: "Yavaşlık sorununu çözmek istediğini görüyorum. Önce uzaktan bağlantı kontrollerini başlatalım.",
    helpAction: "Sorun türünü seç; kontroller kendiliğinden ilerler ve sonucu gösterir.",
  },
  hybrid: {
    id: "hybrid", label: "Kesinti / Hibrit İnternet", to: "/hibrit", cta: "Hibrit İnternet'e git",
    reply: "Anladım! İnternetin kesildi ve bağlantıya ihtiyacın var. Alternatif bağlantı seçeneğine bakalım.",
    help: "Kesinti sırasında bağlantı istediğini görüyorum. Arıza bilgisini ve NetBox'u bu sayfadan takip edebilirsin.",
    helpAction: "Kesinti 24 saati aştıysa NetBox'u etkinleştir düğmesine dokun.",
  },
  modem: {
    id: "modem", label: "Modem sorunu", to: "/goruntulu-destek", cta: "Görüntülü desteğe git",
    reply: "Anladım! Modeminin ışıkları yanmıyor. Modemi kamerayla birlikte kontrol edelim.",
    help: "Modem ışıklarını kontrol etmek istediğini görüyorum. Önce modemin fişini ve güç düğmesini kontrol edelim.",
    helpAction: "Görüşmeyi başlat ve kamerayı modemin ön yüzüne tut.",
  },
  freeze: {
    id: "freeze", label: "Hizmet dondurma", to: "/islem/dondur", cta: "Dondurma işlemine git",
    reply: "Anladım! İnternetini bir süre dondurmak istiyorsun. Dondurma talebini buradan oluşturabiliriz.",
    help: "Hizmetini dondurmak istediğini görüyorum. 1-3 ay arası süre seçip talebini oluşturabilirsin.",
    helpAction: "Süreyi seç ve Dondurma Talebi Oluştur düğmesine dokun.",
  },
};

export const SEARCH_SUGGESTIONS = [
  "Faturamı incele",
  "İnternetimi yeni adresime taşı",
  "Bağlantı sorunumu çöz",
  "İnternet kesintisinde alternatif bağlantıyı etkinleştir",
];

export function detectSearchIntent(text: string): SearchIntent | null {
  const n = normalize(text);
  if (!n) return null;
  if (/dondur/.test(n)) return SEARCH_INTENTS.freeze;
  if (/(isik|lamba)/.test(n) || /modem/.test(n)) return SEARCH_INTENTS.modem;
  if (/(alternatif|hibrit|netbox|yedek baglanti|kesint|kesildi|kopt)/.test(n)) return SEARCH_INTENTS.hybrid;
  const u = understand(text);
  switch (u.topic) {
    case "relocation": return SEARCH_INTENTS.relocation;
    case "billing": case "refund": case "payment": return SEARCH_INTENTS.billing;
    case "speed": case "wifi": case "internet": return SEARCH_INTENTS.tech;
    case "outage": case "hybrid": return SEARCH_INTENTS.hybrid;
    case "modem": return SEARCH_INTENTS.modem;
    case "subscription": return SEARCH_INTENTS.freeze;
  }
  if (/(sorun|baglanti|yavas|calismiyor)/.test(n)) return SEARCH_INTENTS.tech;
  if (/fatura/.test(n)) return SEARCH_INTENTS.billing;
  if (/tasi|nakil|adres/.test(n)) return SEARCH_INTENTS.relocation;
  return null;
}

/** GIGA's reply inside the contextual card on the destination screen. */
export function contextualReply(intent: SearchIntent, text: string): { text: string; live: boolean } {
  const n = normalize(text);
  if (/(canli|temsilci|uzman|insan|olmadi|yapamadim|cozulmedi)/.test(n))
    return { text: "Seni canlı desteğe aktarabilirim. Talebini ve bulunduğun adımı uzmana ileteceğim, tekrar anlatman gerekmez.", live: true };
  if (/(nasil|anlama|anlamadim|takil|devam|ne yap|yardim)/.test(n))
    return { text: `${intent.help} ${intent.helpAction}`, live: false };
  return { text: `${intent.label} için buradayım. ${intent.helpAction} Olmazsa canlı desteğe aktarabilirim.`, live: true };
}
