/**
 * GIGA's conversational brain (pure, testable). Turns what the customer says
 * into a reply plus clearly-labelled actions. A reply never claims an action is
 * done; it says what GIGA is checking now (`start`, run by the chat through the
 * real workflow services) and what needs the customer's approval.
 */
import { GIGA, type UstaIssueId } from "@/data/mock";
import type { NetStatus } from "@/features/core/appStore";
import { STATUS_LABEL, type Intent } from "@/features/workflow/rules";
import type { Workflow, WorkflowType } from "@/features/workflow/types";
import { understand, type GigaTopic } from "./intent";

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
  /** The chat starts this flow right after the reply (checks GIGA may run on its own, or opening a wizard). */
  start?: Intent;
  /** GIGA Teknik: what is already known, so the problem type is not asked again. */
  usta?: UstaIssueId | "modem";
  /** Show this existing process live inside the chat. */
  focus?: string;
  /** Proposed but not started: a following "evet / başlat" starts it. */
  offer?: Intent;
  topic: Intent | GigaTopic | "status" | "clarify" | "outage";
  billingCard?: GigaBillingSummary;
}

export interface GigaBillingSummary {
  period: string;
  amount: number;
  due: string;
  shownDebt: number;
  paid: boolean;
  packageName: string;
  usage: { total: string; download: string; upload: string; dailyAverage: string };
  discounts: string[];
}

export type GigaWf = Pick<Workflow, "id" | "type" | "title" | "status"> & {
  nextStep?: string | null;
  /** A customer decision is open. */
  waiting?: boolean;
  /** Team currently handling a hand-over. */
  team?: string | null;
};

export interface GigaContext {
  net: NetStatus;
  /** Active (non-terminal) workflows, newest first. */
  active: GigaWf[];
  /** A known outage is being tracked. */
  outage: boolean;
  /** What GIGA proposed in its previous message (for "evet", "başlat"). */
  lastOffer?: Intent | null;
  billing?: {
    period: string;
    amount: number;
    due: string;
    shownDebt: number;
    paid: boolean;
    packageName: string;
    usage: GigaBillingSummary["usage"];
    discounts: string[];
  };
}

/** Scope of connection checks, in plain words. Never implies access to browsing, messages or unrelated activity. */
export const PRIVACY_REPLY =
  "Bağlantı sorunlarını tespit edebilmek için yalnızca modem durumu, bağlantı kalitesi ve bölgesel kesinti bilgileri gibi teknik verileri kontrol ediyoruz. Ziyaret ettiğin siteleri, mesajlarını veya kişisel içeriklerini görmüyoruz.";

export const CLARIFY_PROMPTS: readonly string[] = GIGA.starters;

/** Follow-up chips when the internet problem is not specific enough to pick a check. */
export const TECH_CLARIFY = ["İnternete hiç bağlanamıyorum", "İnternetim yavaş", "Bağlantım sürekli kopuyor", "Wi-Fi ağıma bağlanamıyorum"];

const HUMAN: GigaAction = { label: "Uzmana bağlan", kind: "human" };

const ask = (p: string): GigaAction => ({ label: p, kind: "ask", prompt: p });

/** Which processes a topic can refer to ("nakil başvurum ne durumda?" → relocation). */
const TOPIC_TYPES: Partial<Record<GigaTopic, WorkflowType[]>> = {
  relocation: ["relocation"],
  billing: ["billing_check"],
  refund: ["billing_check"],
  payment: ["billing_check"],
  outage: ["ai_usta", "proactive_fault", "outage_recovery"],
  modem: ["ai_usta", "proactive_fault"],
  wifi: ["ai_usta"],
  internet: ["ai_usta", "proactive_fault", "outage_recovery", "speed_optimize"],
  speed: ["speed_optimize", "proactive_fault"],
  hybrid: ["temp_internet", "outage_recovery"],
};

const TOPIC_NAME: Partial<Record<GigaTopic, string>> = {
  relocation: "nakil başvurun",
  billing: "fatura incelemen",
  refund: "iade veya fatura incelemen",
  payment: "fatura incelemen",
  outage: "teknik arıza kaydın",
  modem: "teknik arıza kaydın",
  wifi: "teknik arıza kaydın",
  internet: "teknik kaydın",
  speed: "hız kontrolün",
  hybrid: "Hibrit İnternet işlemin",
};

/** Suggested follow-up when the sentence also mentions a second need. */
const ALSO_PROMPT: Partial<Record<GigaTopic, string>> = {
  relocation: "Taşınmak istiyorum.",
  billing: "Faturamı kontrol et.",
  refund: "İade durumumu öğren",
  speed: "İnternetim yavaş",
  outage: "İnternetim kesildi",
  hybrid: "Hibrit İnternet",
  wifi: "Wi-Fi ağıma bağlanamıyorum",
  modem: "Modemimde sorun var",
  family: "Aile yetkilendirme",
};

/** "Bundan sonra ne olacak?" in GIGA's own voice. */
export function nextForChat(w: GigaWf): string {
  if (w.status === "completed") return "Bu işlem tamamlandı.";
  if (w.waiting) return "Devam etmek için senden bir seçim bekleniyor; hemen aşağıdan seçebilirsin.";
  if (w.team) return `${w.team} konuyu inceliyor; gelişme olunca sana haber veririz.`;
  if (w.status === "waiting_for_external_system") return "İlgili ekipten yanıt bekliyoruz; yanıt gelince sana haber veririz.";
  if (w.nextStep) return `Sıradaki adım: ${w.nextStep}.`;
  return "Gelişme olunca sana haber veririz.";
}

function statusReply(w: GigaWf, more = 0): GigaReply {
  return {
    topic: "status",
    text: `“${w.title}” şu an: ${STATUS_LABEL[w.status]}. ${nextForChat(w)}${more ? ` Ayrıca devam eden ${more} işlemin daha var.` : ""}`,
    focus: w.id,
    actions: [{ label: "Detayları gör", kind: "go", to: `/surec/${w.id}` }, ...(more ? [{ label: "Tüm işlemlerim", kind: "go" as const, to: "/takip" }] : [])],
  };
}

function trackReply(ctx: GigaContext, topic: GigaTopic | null): GigaReply | null {
  const types = topic ? TOPIC_TYPES[topic] : undefined;
  const pool = types ? ctx.active.filter((w) => types.includes(w.type)) : ctx.active;
  if (!pool.length) {
    if (types) return null; // topic-specific: let the topic reply explain there is none
    return { topic: "status", text: "Şu an devam eden bir işlemin yok. Yeni bir ihtiyacın varsa kendi cümlelerinle yazman yeterli.", actions: [{ label: "İşlem geçmişim", kind: "go", to: "/takip" }] };
  }
  if (pool.length === 1 || types) return statusReply(pool[0]!, types ? 0 : pool.length - 1);
  return {
    topic: "status",
    text: `Devam eden ${pool.length} işlemin var. En son güncellenen: “${pool[0]!.title}” · ${STATUS_LABEL[pool[0]!.status]}. Hangisine bakmak istersin?`,
    actions: [...pool.slice(0, 3).map((w) => ({ label: w.title, kind: "go" as const, to: `/surec/${w.id}` })), { label: "Tüm işlemlerim", kind: "go", to: "/takip" }],
  };
}

function outageReply(net: NetStatus): GigaReply {
  return {
    topic: "outage",
    text:
      net === "mobile"
        ? "Ana bağlantındaki kesinti sürüyor; şu an Hibrit İnternet yedek bağlantın üzerinden bağlısın. Ana bağlantın düzelince geri dönüş otomatik yapılır, sana da haber veririz."
        : "Bölgende bilinen bir kesinti var ve teknik ekibimiz çözüm üzerinde çalışıyor. Modeminde bir şey yapmana gerek yok. Kesinti başladığı anda ücretsiz Hibrit İnternet'i senin onayınla etkinleştirebiliriz.",
    actions: [{ label: "Kesinti durumunu gör", kind: "go", to: "/hibrit" }],
  };
}

function withAlso(r: GigaReply, also: GigaTopic | null): GigaReply {
  const p = also ? ALSO_PROMPT[also] : undefined;
  if (!p) return r;
  return { ...r, text: `${r.text} Diğer konuna da hemen ardından bakabiliriz.`, actions: [...(r.actions ?? []), ask(p)] };
}

export function gigaReply(input: string, ctx: GigaContext): GigaReply {
  const u = understand(input);
  const openOf = (types: WorkflowType[]) => ctx.active.find((w) => types.includes(w.type));
  const normalizedInput = input.toLocaleLowerCase("tr-TR");

  // Answer a balance question with the customer's current invoice context, then offer related actions.
  if ((u.topic === "billing" || u.topic === "payment") && /(ne kadar|kalan borc|borcum)/.test(normalizedInput)) {
    const b = ctx.billing;
    return {
      topic: "payment",
      text: b
        ? `Fatura bilgilerin aşağıda yer alıyor. ${b.paid ? "Ödenmemiş faturanın bulunmuyor." : "Ödeme bekleyen faturanın var."} Faturanla ilgili başka ne yapmak istersin?`
        : "Fatura bilgilerini ve kullanım detaylarını burada gösterebilirim. Faturanda yapmak istediğin başka bir işlem var mı?",
      ...(b ? { billingCard: b } : {}),
      actions: [
        { label: "Güncel faturam", kind: "go", to: "/faturalar" },
        { label: "Fatura Kalkanı", kind: "go", to: "/fatura-kalkani" },
        { label: "Geçmiş faturalar", kind: "go", to: "/faturalar/gecmis" },
        { label: "Otomatik ödeme", kind: "go", to: "/otomatik-odeme" },
      ],
    };
  }

  // Status questions about a specific process ("nakil başvurum ne durumda?").
  if (u.isStatus && u.topic && u.topic !== "track") {
    const r = trackReply(ctx, u.topic);
    if (r) return r;
    if (ctx.outage && ["outage", "internet", "modem", "hybrid"].includes(u.topic)) return outageReply(ctx.net);
    const name = TOPIC_NAME[u.topic];
    const offer: Intent | undefined = u.topic === "relocation" ? "relocation" : u.topic === "billing" || u.topic === "refund" ? "billing" : undefined;
    if (name) {
      return {
        topic: "status",
        text: `Kayıtlarına baktım; şu an devam eden bir ${name} görünmüyor.${offer === "relocation" ? " Taşınıyorsan yeni adresinle hemen başlatabiliriz." : offer === "billing" ? " İstersen faturanı şimdi kontrol edebilirim." : ""}`,
        ...(offer ? { offer, actions: [ask(offer === "relocation" ? "Taşınmak istiyorum." : "Faturamı kontrol et.")] } : { actions: [{ label: "İşlem geçmişim", kind: "go", to: "/takip" }] }),
      };
    }
  }

  switch (u.topic) {
    case "human":
      return {
        topic: "human",
        text: "Tabii. Seni uzmanımıza bağlıyorum; bu konuşmayı da ona iletiyorum, sorunu baştan anlatmana gerek kalmayacak.",
        actions: [HUMAN],
      };
    case "video":
      return {
        topic: "video",
        text: "Görüntülü görüşmede bir uzmanımız modemini ve bağlantını seninle birlikte kontrol eder. Konuştuklarımızı ona iletirim; baştan anlatmana gerek kalmaz.",
        actions: [{ label: "Görüntülü desteğe geç", kind: "human" }],
      };
    case "privacy":
      return { topic: "privacy", text: PRIVACY_REPLY, actions: [{ label: "Otomatik kontrolleri yönet", kind: "go", to: "/ajanlar/kontroller" }] };
    case "hallet":
      return {
        topic: "hallet",
        text: "Ne yapmak istediğini yazman yeterli. Taşınma, fatura kontrolü veya bağlantı sorunu için süreci birlikte başlatalım; onayın gereken her adımda önce sana sorarım.",
        actions: [{ label: "Benim İçin Hallet", kind: "go", to: "/hallet" }, ...GIGA.starters.slice(0, 3).map(ask)],
      };
    case "payment":
      return {
        topic: "payment",
      text: "Fatura bilgilerini ve kullanım detaylarını burada görebilirsin. Faturanla ilgili başka ne yapmak istersin?",
        actions: [
          { label: "Güncel faturam", kind: "go", to: "/faturalar" },
          { label: "Fatura Kalkanı", kind: "go", to: "/fatura-kalkani" },
          { label: "Geçmiş faturalar", kind: "go", to: "/faturalar/gecmis" },
          { label: "Otomatik ödeme", kind: "go", to: "/otomatik-odeme" },
        ],
      };
    case "refund": {
      const open = openOf(["billing_check"]);
      if (open) return statusReply(open);
      return withAlso(
        {
          topic: "billing",
          text: "İade için önce faturanı ve ödemelerini karşılaştırıyorum. Fazla bir ödeme görürsem iade talebini yalnızca senin onayınla başlatırım.",
          start: "billing",
        },
        u.also,
      );
    }
    case "billing": {
      const open = openOf(["billing_check"]);
      if (open) return { ...statusReply(open), text: `Bu dönem için açık bir fatura incelemen zaten var; yeni kayıt açmıyorum. ${STATUS_LABEL[open.status]}. ${nextForChat(open)}` };
      return withAlso(
        {
          topic: "billing",
          text: "Faturanı birlikte inceleyelim. Önceki dönem tutarını, mevcut faturanı ve varsa kampanya veya abonelik değişikliklerini kontrol ediyorum. Bir farklılık görürsem önce sana açıklarım; inceleme yalnızca senin onayınla başlar.",
          start: "billing",
        },
        u.also,
      );
    }
    case "relocation": {
      const open = openOf(["relocation"]);
      if (open) return { ...statusReply(open), topic: "relocation", text: `Zaten devam eden bir taşınma işlemin var (${STATUS_LABEL[open.status]}). Aynı talep için yeni kayıt açmıyorum. ${nextForChat(open)}` };
      return withAlso(
        {
          topic: "relocation",
          text: "Yeni adresin için altyapı ve port uygunluğunu kontrol ederek nakil sürecini başlatalım. Başvuruyu oluşturmadan önce onayını alırım.",
          start: "relocation",
        },
        u.also,
      );
    }
    case "speed": {
      if (ctx.outage) return outageReply(ctx.net);
      return withAlso({ topic: "speed", text: "Önce hızını ölçüp bağlantını kontrol ediyorum. Ardından uzaktan iyileştirmeyi deneyeceğim; hız düşük kalırsa modem konumunu ve sorun yaşadığın odadaki Wi-Fi hızını birlikte kontrol ederiz.", start: "speed" }, u.also);
    }
    case "hybrid": {
      if (ctx.outage) return outageReply(ctx.net);
      return {
        topic: "temp_internet",
        text: "Şu an bağlantında kesinti görünmüyor. Kesinti başladığı anda ücretsiz Hibrit İnternet'i, taşınma sırasında ise TürkNet Box'ı senin onayınla etkinleştirebiliriz.",
        actions: [
          { label: "Hibrit İnternet", kind: "go", to: "/hibrit" },
          { label: "Bağlantım", kind: "go", to: "/baglanti" },
        ],
      };
    }
    case "outage":
    case "modem":
    case "wifi":
    case "internet": {
      if (ctx.outage) return outageReply(ctx.net);
      const open = openOf(["ai_usta"]);
      // An escalated process should appear only when the customer asks for its status.
      // Otherwise every new technical question repeats the live-support handoff.
      if (open && !open.team) return { ...statusReply(open), topic: "ai_usta", text: `Bu sorun için başlattığımız kontrol sürüyor; kaldığımız yerden devam edelim. ${nextForChat(open)}` };
      if (u.topic === "internet" && !u.ustaIssue) {
        return { topic: "clarify", text: "İnternetinle ilgili nasıl bir sorun yaşıyorsun?", actions: TECH_CLARIFY.map(ask) };
      }
      if (u.topic === "modem") {
        return withAlso({ topic: "modem", text: "Önce bağlantını uzaktan kontrol ediyorum. Bir arıza görünmezse modeminin ışıklarına birlikte bakar, tek seferde bir güvenli adım öneririm.", start: "ai_usta", usta: "modem" }, u.also);
      }
      if (u.topic === "wifi") {
        return withAlso(
          {
            topic: "wifi",
            text: "Önce hattını ve modemini uzaktan kontrol ediyorum. Gerekirse QR taramasıyla evindeki Wi-Fi sinyalini de birlikte ölçeriz.",
            start: "ai_usta",
            usta: "wifi",
            actions: [{ label: "QR ile Wi-Fi analizi", kind: "go", to: "/qr/tara" }],
          },
          u.also,
        );
      }
      return withAlso(
        {
          topic: "ai_usta",
          text: "Bağlantını kontrol ediyorum. Önce sorunun evindeki bağlantıdan mı yoksa bölgesel bir kesintiden mi kaynaklandığını anlamaya çalışalım.",
          start: "ai_usta",
          usta: u.ustaIssue ?? "no_connect",
        },
        u.also,
      );
    }
    case "family":
      return {
        topic: "family",
        text: "Aile Yetkilendirme ile yakınının hesabında destek talebi açabilir, görüntülü destekte onu da görüşmeye ekleyebilirsin. Fatura ödeme ve iptal varsayılan olarak kapalıdır.",
        actions: [{ label: "Aile Yetkilendirme", kind: "go", to: "/aile" }],
      };
    case "subscription":
      if (normalizedInput.includes("iptal")) return {
        topic: "subscription",
        text: "Abonelik iptal sürecini ve gerekli bilgileri buradan inceleyebilirsin.",
        actions: [{ label: "Abonelik iptal işlemi", kind: "approval", to: "/islem/iptal" }],
      };
      if (normalizedInput.includes("dondur")) return {
        topic: "subscription",
        text: "Hizmetini belirli bir süre dondurma seçeneklerini buradan görebilirsin.",
        actions: [{ label: "Hizmeti dondur", kind: "approval", to: "/islem/dondur" }],
      };
      return {
        topic: "subscription",
        text: "Bu işlemleri uygulamadan yapabilirsin; her biri senin onayınla tamamlanır.",
        actions: [
          { label: "Hizmeti Dondur", kind: "approval", to: "/islem/dondur" },
          { label: "Aboneliğini İptal Et", kind: "approval", to: "/islem/iptal" },
        ],
      };
    case "upgrade":
      return { topic: "upgrade", text: "Adresinde 1.000 Mbps fiber altyapı var. Paket değişikliğini senin onayınla yaparım.", actions: [{ label: "Hızımı yükselt", kind: "approval", to: "/islem/hiz-yukseltme" }] };
    case "track":
      return trackReply(ctx, null)!;
    case "yes":
      if (ctx.lastOffer) return { topic: ctx.lastOffer, text: "Tamam, hemen bakıyorum.", start: ctx.lastOffer };
      return { topic: "clarify", text: "Neye bakmamı istersin? Kendi cümlenle yazabilirsin.", actions: GIGA.starters.map(ask) };
    case "no":
      return { topic: "clarify", text: "Peki. Başka bir konuda yardımcı olabileceğim bir şey olursa yazman yeterli." };
    case "greeting":
      return { topic: "greeting", text: "Merhaba! Bugün senin için ne yapabilirim? Kendi cümlelerinle anlatabilirsin.", actions: GIGA.starters.map(ask) };
    case "thanks":
      return { topic: "thanks", text: "Rica ederim! Başka bir şey olursa buradayım." };
    default:
      return {
        topic: "clarify",
        text: "Tam anlayamadım. Biraz daha anlatır mısın? Konu bunlardan birine yakınsa seçebilirsin.",
        actions: GIGA.starters.map(ask),
      };
  }
}

