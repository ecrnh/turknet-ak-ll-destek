/**
 * Customer-facing language for the workflow platform. Every screen reads status
 * wording from here so the same state always reads the same way (UX writing §14).
 * Technical terms stay in the audit log / "Teknik detayları gör".
 */
import { TEAMS } from "@/data/mock";
import { STATUS_LABEL } from "./rules";
import type { Workflow, WorkflowStatus, WorkflowType } from "./types";

export { STATUS_LABEL };

/** Long form: "Şu an ne oluyor?" */
export const STATUS_SENTENCE: Record<WorkflowStatus, string> = {
  pending: "İşleminiz sırada",
  in_progress: "İşleminiz devam ediyor",
  waiting_for_customer: "Kararınızı bekliyoruz",
  waiting_for_external_system: "İlgili ekipten yanıt bekliyoruz",
  blocked: "İşleminiz şu an ilerleyemiyor",
  escalated: "Konuyu uzman ekibimize ilettik",
  completed: "İşleminiz tamamlandı",
  failed: "İşlem tamamlanamadı",
};

const EXTERNAL_PARTY: Partial<Record<WorkflowType, string>> = {
  relocation: "Altyapı ekibinden yanıt bekliyoruz",
  billing_check: "Ödeme kuruluşundan yanıt bekliyoruz",
};

export function statusSentence(wf: Pick<Workflow, "status" | "type">): string {
  if (wf.status === "waiting_for_external_system") return EXTERNAL_PARTY[wf.type] ?? STATUS_SENTENCE.waiting_for_external_system;
  return STATUS_SENTENCE[wf.status];
}

/** Friendly follow-up for the expert handoff: who took it over and that nothing is expected from the customer. */
export function handoffNote(wf: Pick<Workflow, "handoff">): string {
  const team = wf.handoff?.team;
  return team
    ? `Süreci ${team} devraldı. Yaptığımız tüm kontrolleri onlara da ilettik; konuyu baştan anlatman gerekmiyor.`
    : "Süreci uzman ekibimiz devraldı. Yaptığımız tüm kontrolleri onlara da ilettik; konuyu baştan anlatman gerekmiyor.";
}

/** "Benim bir şey yapmam gerekiyor mu?" */
export function customerAction(wf: Pick<Workflow, "status" | "decision">): { needed: boolean; text: string } {
  if (wf.decision) return { needed: true, text: "Aşağıdaki seçimi yapmanız gerekiyor." };
  if (wf.status === "waiting_for_customer") return { needed: true, text: "Devam etmemiz için onayınızı bekliyoruz." };
  if (wf.status === "completed") return { needed: false, text: "Yapmanız gereken bir şey kalmadı." };
  if (wf.status === "failed") return { needed: true, text: "İsterseniz tekrar deneyebilir veya destek ekibimize ulaşabilirsiniz." };
  return { needed: false, text: "Şu an sizden bir işlem yapmanız gerekmiyor." };
}

/** "Bundan sonra ne olacak?" */
export function whatsNext(wf: Pick<Workflow, "status" | "decision" | "nextStep" | "handoff" | "outcome" | "type">): string {
  if (wf.status === "completed") return wf.outcome?.summary ?? "Süreç kapandı.";
  if (wf.decision) return "Seçiminize göre süreci sizin için sürdüreceğiz.";
  if (wf.handoff) return `${wf.handoff.team} konuyu inceliyor. Gelişme olduğunda size haber vereceğiz.`;
  if (wf.status === "waiting_for_external_system") return "Yanıt geldiğinde sizi bilgilendireceğiz.";
  if (wf.type === "ai_usta" && wf.status === "in_progress") return "Bağlantını kontrol ediyoruz. Sonuca göre sana uygun çözüm seçeneklerini sunacağız.";
  if (wf.nextStep) return `Sıradaki adım: ${wf.nextStep}. Gelişme olduğunda size haber vereceğiz.`;
  return "Gelişme olduğunda size haber vereceğiz.";
}

/** Most recent finished step (for "Son gerçekleşen adım"). */
export function lastDoneStep(wf: Pick<Workflow, "steps">): string | null {
  const done = wf.steps.filter((s) => s.status === "done" && s.at).sort((a, b) => (b.at ?? 0) - (a.at ?? 0));
  return done[0]?.label ?? null;
}

export const TYPE_LABEL: Record<WorkflowType, string> = {
  relocation: "Taşınma ve Nakil",
  temp_internet: "Geçici internet",
  outage_recovery: "Kesinti",
  billing_check: "Fatura Kalkanı",
  ai_usta: "GIGA Teknik",
  proactive_fault: "Proaktif kontrol",
  speed_optimize: "Hız kontrolü",
};

/** Which product area a workflow belongs to (3 ana ürün alanı). */
export const AREA_OF: Record<WorkflowType, "process" | "support" | "connection"> = {
  relocation: "process",
  billing_check: "process",
  temp_internet: "connection",
  outage_recovery: "connection",
  proactive_fault: "connection",
  speed_optimize: "connection",
  ai_usta: "support",
};

export const TEAM_FOR: Record<WorkflowType, string> = {
  relocation: TEAMS.relocation,
  temp_internet: TEAMS.logistics,
  outage_recovery: TEAMS.tech,
  billing_check: TEAMS.finance,
  ai_usta: TEAMS.tech,
  proactive_fault: TEAMS.tech,
  speed_optimize: TEAMS.tech,
};

/* ---------------- Hibrit İnternet (free outage backup) ---------------- */
export const HYBRID_COPY = {
  name: "Hibrit İnternet",
  included: "TürkNet aboneliğinize dahildir. Ek ücret ödemezsiniz.",
  freeBadge: "Ücretsiz · aboneliğinize dahil",
  detected: {
    title: "İnternet bağlantınızda kesinti tespit ettik",
    text: "Teknik ekibimiz sorunun çözümü için çalışıyor. Gelişmeleri sizin için takip ediyoruz.",
  },
  offer: {
    title: "İnternetiniz henüz düzelmedi",
    text: "Kesinti süresince internet erişiminizin devam etmesi için ücretsiz yedek bağlantınızı kullanabilirsiniz.",
    cta: "Hibrit İnterneti Etkinleştir",
  },
  what: "Ana bağlantınız kesildiğinde yedek internet cihazınız mobil ağ üzerinden devreye girer. Böylece arıza giderilene kadar internete bağlı kalırsınız.",
  how: [
    "Kesinti başladığı anda ücretsiz olarak etkinleştirebilirsiniz.",
    "Yedek cihazınız ve SIM'iniz mobil ağ üzerinden çalışır.",
    "Ana bağlantınız düzelince otomatik olarak ana bağlantıya dönersiniz.",
  ],
  consent: "Ücretsiz Olarak Etkinleştir",
  notNow: "Şimdi Değil",
  active: {
    title: "Yedek internetiniz aktif!",
    text: "Ana bağlantınız düzelene kadar internet erişiminizi yedek bağlantınız üzerinden sürdürebilirsiniz.",
  },
  noDevice: {
    title: "Uyumlu bir yedek cihaz gerekiyor",
    text: "Hibrit İnternet, uyumlu bir yedek internet cihazı ve aktif SIM ile çalışır. Size ücretsiz bir cihaz gönderebiliriz.",
    cta: "Cihaz Talep Et",
  },
  noCoverage: {
    title: "Yedek bağlantı şu an kullanılamıyor",
    text: "Bulunduğunuz konumda yedek bağlantı için yeterli mobil kapsama bulunamadı.",
    after: "Arıza takibiniz devam ediyor. Ana bağlantınız düzeldiğinde size haber vereceğiz.",
  },
  failed: {
    title: "Etkinleştirme tamamlanamadı",
    text: "Yedek cihazınız mobil ağa bağlanamadı. Birkaç saniye sonra tekrar deneyebilirsiniz.",
    cta: "Tekrar Dene",
  },
  restored: {
    title: "Ana bağlantınız geri geldi",
    text: "Bağlantınızı doğruladık ve yedek bağlantıdan ana bağlantınıza geri geçtik.",
    plain: "Kesinti giderildi ve bağlantınızı doğruladık. Anlayışınız için teşekkür ederiz.",
  },
  device: { requested: "Talep alındı", preparing: "Hazırlanıyor", on_the_way: "Yolda", delivered: "Teslim edildi", cancelled: "İptal edildi" },
} as const;

/**
 * NetBox bilgilendirmesi: paketin içinde ne olduğu, adım adım nasıl çalıştığı,
 * neler gerektirdiği ve ana hat gelince ne olduğu. Ana sayfadaki "Nasıl Çalışır?"
 * bağlantısı bu içeriği gösterir.
 */
export const NETBOX_INFO = {
  intro:
    "NetBox, TürkNet paketinizin içinde gelen ücretsiz yedek internettir. Ana internetiniz kesildiğinde mobil ağ üzerinden devreye girer ve siz hiçbir şey yapmasanız bile bağlantınız sürer.",
  included: [
    { title: "Ek ücret yok", desc: "NetBox aboneliğinize dahildir. Ayrı bir fatura, ek sözleşme veya taahhüt gerektirmez." },
    { title: "Kesinti başladığı anda hazır", desc: "Yedek internet, kesinti tespit edildiği anda etkinleştirilebilir hale gelir; bekleme süresi yoktur." },
    { title: "Aylık yedek internet hakkı", desc: "Kesinti süresince kullandığınız yedek internet, o aya ait yedek internet hakkınızdan düşer." },
    { title: "Otomatik yedek geçiş", desc: "Bu ayarı açarsanız NetBox kesintide kendiliğinden devreye girer; telefonunuz yanında olmasa bile." },
  ],
  steps: [
    { title: "Kesinti algılanır", desc: "Ana hattınızdaki kesinti tespit edilir, size bildirim ve SMS gönderilir." },
    { title: "Uygunluk kontrolü yapılır", desc: "Yedek cihazınız, SIM'iniz ve mobil kapsamanız otomatik olarak kontrol edilir." },
    { title: "NetBox devreye girer", desc: "Siz etkinleştirirsiniz ya da otomatik yedek geçiş açıksa kendiliğinden açılır." },
    { title: "Bağlantınız sürer", desc: "Modeminiz mobil ağ üzerinden internete bağlanmaya devam eder; Wi-Fi adınız ve şifreniz değişmez." },
    { title: "Ana hat gelince geri dönersiniz", desc: "Ana bağlantınız düzelince otomatik olarak ana hatta geçersiniz, NetBox kapanır." },
  ],
  needs: [
    { title: "Uyumlu yedek internet cihazı", desc: "NetBox, uyumlu bir yedek internet cihazı üzerinde çalışır." },
    { title: "Aktif SIM", desc: "Cihazınızda mobil ağa bağlanabilen aktif bir SIM bulunmalıdır." },
    { title: "Yeterli mobil kapsama", desc: "Bulunduğunuz adreste yeterli mobil kapsama olmalıdır." },
  ],
  noDevice: "Cihazınız yoksa ücretsiz olarak talep edebilirsiniz; kargoyla adresinize gönderilir.",
  openFrom: [
    "Uygulamadaki İnternet Durumu ekranından",
    "Ana sayfadaki NetBox anahtarından",
    "Kesinti anında gelen SMS'teki bağlantıdan",
  ],
  cta: "İnternet durumunu gör",
} as const;

