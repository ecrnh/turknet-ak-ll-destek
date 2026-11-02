/**
 * GIGA's conversational brain (pure, testable). Turns what the customer says
 * into a reply plus clearly-labelled actions. A reply never claims an action is
 * done; it only says what GIGA will do and what needs the customer's approval.
 */
import type { NetStatus } from "@/features/core/appStore";
import { detectIntent, STATUS_LABEL, type Intent } from "@/features/workflow/rules";
import type { Workflow } from "@/features/workflow/types";

export type GigaActionKind = "auto" | "approval" | "human" | "go" | "ask";

export interface GigaAction {
  label: string;
  kind: GigaActionKind;
  /** Starts a real workflow through the shared services. */
  intent?: Intent;
  to?: string;
  /** For kind "ask": text sent to GIGA when tapped. */
  prompt?: string;
}

export interface GigaReply {
  text: string;
  actions?: GigaAction[];
  /** Streams the speed-guard steps inside the chat. */
  agent?: "speed";
  topic: Intent | "human" | "privacy" | "payment" | "modem" | "wifi" | "family" | "subscription" | "upgrade" | "clarify";
}

export interface GigaContext {
  net: NetStatus;
  /** Active (non-terminal) workflows, newest first. */
  active: Pick<Workflow, "id" | "type" | "title" | "status">[];
  /** A known outage is being tracked. */
  outage: boolean;
}

/** Scope of connection checks, in plain words. Never implies access to browsing, messages or unrelated activity. */
export const PRIVACY_REPLY =
  "Bağlantı sorunlarını tespit edebilmek için yalnızca modem durumu, bağlantı kalitesi ve bölgesel kesinti bilgileri gibi teknik verileri kontrol ediyoruz. Ziyaret ettiğin siteleri, mesajlarını veya kişisel içeriklerini görmüyoruz.";

const has = (t: string, ...words: string[]) => words.some((w) => t.includes(w));

const HUMAN: GigaAction = { label: "Uzmana bağlan", kind: "human" };

export const CLARIFY_PROMPTS = ["İnternetim çalışmıyor", "İnternetim çok yavaş", "Faturamda tutarsızlık var", "Taşınacağım", "İşlemim ne durumda?"];

function outageReply(net: NetStatus): GigaReply {
  return {
    topic: "ai_usta",
    text:
      net === "mobile"
        ? "Ana bağlantındaki kesinti sürüyor; şu an Hibrit İnternet yedek bağlantın üzerinden bağlısın. Ana bağlantın düzelince geri dönüş otomatik yapılır, sana da haber veririz."
        : "Bağlantında bir kesinti var ve teknik ekibimiz çözüm üzerinde çalışıyor. Modeminde bir şey yapmana gerek yok. Kesinti 24 saati aşarsa ücretsiz Hibrit İnternet'i senin onayınla etkinleştirebiliriz.",
    actions: [{ label: "Kesinti durumunu gör", kind: "go", to: "/hibrit" }],
  };
}

export function gigaReply(input: string, ctx: GigaContext): GigaReply {
  const t = input.toLocaleLowerCase("tr-TR").trim();

  if (has(t, "temsilci", "canlı destek", "insanla", "gerçek kişi", "müşteri hizmet", "operatöre bağla", "uzmana bağla", "uzmanla görüş")) {
    return {
      topic: "human",
      text: "Tabii. Seni uzmanımıza bağlıyorum; bu konuşmayı da ona iletiyorum, sorunu baştan anlatmana gerek kalmayacak.",
      actions: [HUMAN],
    };
  }

  // What do the technical checks cover? Answer with the exact scope, once, when asked.
  if (has(t, "izliyor", "izleme", "gizlilik", "kişisel veri", "verilerim", "kvkk", "neyi kontrol", "ne kontrol", "hangi bilgi", "mesajlarım", "geçmişimi", "gezinme")) {
    return {
      topic: "privacy",
      text: PRIVACY_REPLY,
      actions: [{ label: "Otomatik kontrolleri yönet", kind: "go", to: "/ajanlar" }],
    };
  }

  // Paying a bill is not a billing dispute: answer it before intent routing.
  if (has(t, "öderim", "nasıl öde", "otomatik ödeme", "talimat", "son ödeme") && !has(t, "tutarsız", "mükerrer", "iade", "fazla", "yanlış", "borç")) {
    return {
      topic: "payment",
      text: "Ödenmemiş faturan bulunmuyor. Otomatik ödeme talimatı verirsen son ödeme gününü takip etmene gerek kalmaz; talimatı yalnızca senin onayınla oluştururum.",
      actions: [
        { label: "Faturalarım", kind: "go", to: "/faturalar" },
        { label: "Otomatik ödeme talimatı", kind: "approval", to: "/otomatik-odeme" },
      ],
    };
  }

  const intent = detectIntent(t) ?? (has(t, "devam", "kaldığım") ? "track" : null);

  switch (intent) {
    case "track": {
      if (!ctx.active.length) {
        return { topic: "track", text: "Şu an devam eden bir işlemin yok. Yeni bir talebin varsa yazman yeterli; adımlarını İşlemlerim'den görebilirsin.", actions: [{ label: "İşlemlerim", kind: "go", to: "/takip" }] };
      }
      const [top] = ctx.active;
      return {
        topic: "track",
        text: `Devam eden ${ctx.active.length} işlemin var. En son: “${top!.title}” · ${STATUS_LABEL[top!.status]}. Kaldığın yerden devam edebilirsin; bilgilerini tekrar sormam.`,
        actions: [...ctx.active.slice(0, 2).map((w) => ({ label: w.title, kind: "go" as const, to: `/surec/${w.id}` })), { label: "Tüm işlemlerim", kind: "go", to: "/takip" }],
      };
    }
    case "relocation": {
      const open = ctx.active.find((w) => w.type === "relocation");
      if (open) {
        return { topic: "relocation", text: `Zaten devam eden bir taşınma işlemin var (${STATUS_LABEL[open.status]}). Aynı talep için yeni kayıt açmıyorum.`, actions: [{ label: "Taşınmamı gör", kind: "go", to: `/surec/${open.id}` }] };
      }
      return {
        topic: "relocation",
        text: "Taşınmanı senin için yönetebilirim. Yeni adresini aldıktan sonra altyapıyı kontrol ederim; nakil başvurusunu ve kurulum randevusunu senin onayınla oluştururum.",
        actions: [{ label: "Taşınmayı Başlat", kind: "approval", intent: "relocation" }],
      };
    }
    case "billing":
      return {
        topic: "billing",
        text: "Faturanı ödeme kayıtlarınla karşılaştırabilirim. Bir farklılık görürsem önce sana açıklarım; inceleme yalnızca senin onayınla başlar. Faturanda veya borç kaydında kendim değişiklik yapmam.",
        actions: [
          { label: "Faturamı Kontrol Et", kind: "auto", intent: "billing" },
          { label: "Faturalarım", kind: "go", to: "/faturalar" },
        ],
      };
    case "speed":
      return {
        topic: "speed",
        text: "Hızını kontrol ediyorum. Uzaktan düzeltilebilir bir durum bulursam düzeltip tekrar ölçeceğim; her adımı burada göreceksin.",
        agent: "speed",
      };
    case "temp_internet":
      if (ctx.outage) return outageReply(ctx.net);
      return {
        topic: "temp_internet",
        text: "Şu an bağlantında kesinti görünmüyor. Kesinti 24 saati aşarsa ücretsiz Hibrit İnternet'i, taşınma sırasında ise TürkNet Box'ı senin onayınla etkinleştirebiliriz.",
        actions: [
          { label: "Hibrit İnternet", kind: "go", to: "/hibrit" },
          { label: "Bağlantım", kind: "go", to: "/baglanti" },
        ],
      };
    case "ai_usta":
      if (ctx.outage) return outageReply(ctx.net);
      if (has(t, "ışık", "modem", "led", "kırmızı")) {
        return {
          topic: "modem",
          text: "Modem ışıklarını birlikte inceleyelim. GIGA Teknik'te ışıkların fotoğrafını çekersin; ne anlama geldiklerini açıklar, tek seferde bir güvenli adım öneririm.",
          actions: [
            { label: "GIGA Teknik'i Başlat", kind: "auto", intent: "ai_usta" },
            { label: "Görüntülü destek", kind: "go", to: "/goruntulu-destek" },
          ],
        };
      }
      return {
        topic: "ai_usta",
        text: "Bağlantını kontrol edebilirim. Gerekirse modem ışıklarının fotoğrafını isteyip seninle adım adım ilerleriz; çözülmezse yaptıklarımızı uzmana aktarırım.",
        actions: [{ label: "GIGA Teknik'i Başlat", kind: "auto", intent: "ai_usta" }, HUMAN],
      };
    default:
      break;
  }

  if (has(t, "wi-fi", "wifi", "sinyal")) {
    return {
      topic: "wifi",
      text: "Wi-Fi sinyalini QR taramasıyla ölçebilirim: kanal yoğunluğu ve sinyal gücü dahil 6 kontrol, yaklaşık 20 saniye.",
      actions: [
        { label: "QR ile analiz et", kind: "go", to: "/qr/tara" },
        { label: "Görüntülü destek", kind: "go", to: "/goruntulu-destek" },
      ],
    };
  }
  if (has(t, "anne", "baba", "aile", "yetki", "ebeveyn")) {
    return {
      topic: "family",
      text: "Aile Yetkilendirme ile yakınının hesabında destek talebi açabilir, görüntülü destekte onu da görüşmeye ekleyebilirsin. Fatura ödeme ve iptal varsayılan olarak kapalıdır.",
      actions: [{ label: "Aile Yetkilendirme", kind: "go", to: "/aile" }],
    };
  }
  if (has(t, "iptal", "dondur")) {
    return {
      topic: "subscription",
      text: "Bu işlemleri uygulamadan yapabilirsin; her biri senin onayınla tamamlanır.",
      actions: [
        { label: "Hizmeti Dondur", kind: "approval", to: "/islem/dondur" },
        { label: "Aboneliğini İptal Et", kind: "approval", to: "/islem/iptal" },
      ],
    };
  }
  if (has(t, "paket", "yükselt", "1000", "fiber")) {
    return { topic: "upgrade", text: "Adresinde 1.000 Mbps fiber altyapı var. Paket değişikliğini senin onayınla yaparım.", actions: [{ label: "Hızımı yükselt", kind: "approval", to: "/islem/hiz-yukseltme" }] };
  }

  return {
    topic: "clarify",
    text: "Tam anlayamadım. Konu hangisine yakın?",
    actions: [...CLARIFY_PROMPTS.map((p) => ({ label: p, kind: "ask" as const, prompt: p })), HUMAN],
  };
}
