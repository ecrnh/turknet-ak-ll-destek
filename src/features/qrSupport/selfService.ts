import type { Intent } from "@/features/workflow/rules";
import type { UstaIssueId } from "@/data/mock";

/** Where a step answer leads: another step, a real service, live support, or done. */
export type Next =
  | { step: StepId }
  | { intent: Intent; usta?: UstaIssueId | "modem" }
  | { live: true }
  | { chat: string }
  | { done: true };

export type Option = { label: string; hint?: string; next: Next };
export type Step = { title: string; body?: string; tips?: string[]; options: Option[] };

export type StepId =
  | "topic"
  | "net_symptom"
  | "lights"
  | "tip_slow"
  | "tip_drops"
  | "tip_wifi"
  | "tip_restart"
  | "tip_power"
  | "done";

const STILL = "Hâlâ devam ediyor";
const FIXED = "Düzeldi, teşekkürler";

/** Pure self-service tree for QR entry; each answer decides the next step. */
export const QR_STEPS: Record<StepId, Step> = {
  topic: {
    title: "Bugün ne konuda yardım istersin?",
    body: "Bir konu seç, seni adım adım çözüme götürelim.",
    options: [
      { label: "İnternet bağlantım", hint: "Yavaşlık, kopma, ışıklar, Wi-Fi", next: { step: "net_symptom" } },
      { label: "Faturam", hint: "Tutar, ödeme, beklenmeyen ücret", next: { intent: "billing" } },
      { label: "Taşınma / nakil", hint: "Aboneliğini yeni adrese taşı", next: { intent: "relocation" } },
      { label: "Açık işlemlerim", hint: "Başvuru ve taleplerin durumu", next: { intent: "track" } },
      { label: "Paket değişikliği", hint: "Hız veya tarife değiştir", next: { chat: "Paketimi değiştirmek istiyorum" } },
    ],
  },
  net_symptom: {
    title: "Tam olarak ne yaşıyorsun?",
    options: [
      { label: "İnternet hiç yok", next: { step: "lights" } },
      { label: "İnternet yavaş", next: { step: "tip_slow" } },
      { label: "Sık sık kopuyor", next: { step: "tip_drops" } },
      { label: "Wi-Fi bazı odalarda çekmiyor", next: { step: "tip_wifi" } },
    ],
  },
  lights: {
    title: "Modemdeki internet ışığı ne durumda?",
    body: "Modeminin önündeki ışıklara bak; ışığın üzerinde genelde “Internet” veya bir dünya simgesi olur.",
    options: [
      { label: "Yeşil yanıyor", next: { step: "tip_restart" } },
      { label: "Kırmızı yanıyor ya da yanıp sönüyor", next: { intent: "ai_usta", usta: "modem" } },
      { label: "Hiçbir ışık yanmıyor", next: { step: "tip_power" } },
    ],
  },
  tip_restart: {
    title: "Modemini yeniden başlatalım",
    tips: ["Modemin arkasındaki güç düğmesine bas ve kapat.", "30 saniye bekle.", "Tekrar aç ve ışıkların sabitlenmesi için 2 dakika bekle."],
    options: [
      { label: FIXED, next: { done: true } },
      { label: STILL, next: { intent: "ai_usta", usta: "modem" } },
    ],
  },
  tip_power: {
    title: "Elektrik bağlantısını kontrol edelim",
    tips: ["Adaptörün prize ve modeme tam oturduğundan emin ol.", "Başka bir prizi dene.", "Modemin güç düğmesinin açık olduğunu kontrol et."],
    options: [
      { label: FIXED, next: { done: true } },
      { label: STILL, next: { intent: "ai_usta", usta: "modem" } },
    ],
  },
  tip_slow: {
    title: "Hızını artırmak için şunları dene",
    tips: ["Kullanmadığın cihazlarda indirmeleri durdur.", "Mümkünse kablo ile bağlanıp dene.", "Modemi açık ve yüksek bir yere koy."],
    options: [
      { label: FIXED, next: { done: true } },
      { label: "Hâlâ yavaş, hız kontrolü yap", next: { intent: "speed" } },
    ],
  },
  tip_drops: {
    title: "Kopmaları azaltalım",
    tips: ["Fiber ve güç kablolarının sıkıca takılı olduğunu kontrol et.", "Kabloda bükülme veya ezilme olmadığına bak.", "Modemi bir kez yeniden başlat."],
    options: [
      { label: FIXED, next: { done: true } },
      { label: STILL, next: { intent: "ai_usta" } },
    ],
  },
  tip_wifi: {
    title: "Wi-Fi kapsamasını iyileştirelim",
    tips: ["Modemi evin ortasına, yerden yüksek bir yere taşı.", "Modemin önünde metal eşya veya ayna olmasın.", "Uzak odalarda 2.4 GHz ağına bağlan."],
    options: [
      { label: FIXED, next: { done: true } },
      { label: "Hâlâ çekmiyor, ölçüm yap", next: { intent: "speed" } },
    ],
  },
  done: {
    title: "Harika, sorunun çözüldü!",
    body: "Yaptığımız iyileştirmeler kaydedildi. Yeni bir sorun olursa QR'ı tekrar okutman yeterli.",
    options: [],
  },
};

/** Step numbers shown in the progress header (answers decide the path length). */
export function stepNumber(path: StepId[]): number {
  return path.length;
}
