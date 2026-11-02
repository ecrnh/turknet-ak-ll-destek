/**
 * AIHelperService: "AI Usta" visual technical support, reachable from the app
 * or from the call centre (voice triage → simulated SMS → app, no re-telling).
 * Image analysis is a clearly-labelled simulation (no real vision model), no real
 * call is placed and no real SMS is sent. Every step is safe and reversible; when
 * the steps do not help, the customer is offered live support with full context.
 */
import { AI_USTA_STEPS, APPOINTMENT_SLOTS, CUSTOMER, IVR_MENU, LED_STATE_LABEL, MODEM_LEDS, MODEM_LED_DEMO, SUBSCRIPTION, TEAMS, type IvrCategory, type LedKey, type LedState } from "@/data/mock";
import { uid } from "@/lib/format";
import { ask, book, chain, complete, createWorkflow, escalate, getWf, log, notify, registerDecision, registerOp, schedule, setData, setStatus, step, stepStatus, workOrder } from "../engine";
import { MockNetworkAPI, MockVisionAPI } from "../mockServices";
import { useWorkflowStore as W } from "../store";
import type { ChatMessage, StepStatus } from "../types";
import { setConnectivity } from "./connectivity";
import { startSpeedCheck } from "./proactive";

const USTA_STEPS = [
  { key: "context", label: "Bağlantı ve açık kayıt kontrolü" },
  { key: "photo", label: "Modem ışıklarının görüntüsü" },
  { key: "analysis", label: "Görsel kontrol (simülasyon)" },
  { key: "step1", label: "Adım 1: Güç kablosu kontrolü" },
  { key: "step2", label: "Adım 2: Modemi yeniden başlatma" },
  { key: "recheck", label: "Bağlantı yeniden kontrol edildi" },
  { key: "confirm", label: "Çözümü siz doğruladınız" },
];

export const ISSUE_LABEL: Record<IvrCategory, string> = Object.fromEntries(IVR_MENU.map((m) => [m.id, m.label])) as Record<IvrCategory, string>;

/* ---------------- Modem lights ---------------- */
export type Leds = Record<LedKey, LedState>;
export const encodeLeds = (l: Leds) => MODEM_LEDS.map((m) => `${m.key}:${l[m.key]}`).join("|");
export function decodeLeds(v: unknown): Leds | null {
  if (typeof v !== "string" || !v) return null;
  const out = { ...MODEM_LED_DEMO };
  for (const part of v.split("|")) {
    const [k, st] = part.split(":") as [LedKey, LedState];
    if (k in out && st in LED_STATE_LABEL) out[k] = st;
  }
  return out;
}

/** Customer-facing reading of the lights. Never a definite diagnosis. */
export function readLeds(l: Leds): string {
  if (l.power === "off") return "Güç ışığı kapalı görünüyor. Önce güç bağlantısını kontrol edelim.";
  if (l.internet === "red" || l.internet === "off") return `İnternet ışığının ${l.internet === "red" ? "kırmızı" : "kapalı"} olduğunu görüyorum. Önce bağlantınızı kontrol edelim.`;
  if (l.wan === "red" || l.wan === "off") return "WAN ışığında bir sorun görünüyor. Kablo bağlantısını birlikte kontrol edelim.";
  if (l.wifi === "off") return "Wi-Fi ışığı kapalı görünüyor. Modemi birlikte yeniden başlatalım.";
  return "Işıklar normal görünüyor. Yine de bağlantınızı birlikte kontrol edelim.";
}

/** In-app start: "İnternetim çalışmıyor" / "Modemimde sorun var". */
export function startAiUsta(opts: { issue?: IvrCategory; initiatedBy?: string } = {}): string {
  const issue = opts.issue ?? "down";
  setConnectivity({ fixed: "down" }, "Modem internet oturumu yok");
  const { wf, created } = createWorkflow({
    type: "ai_usta",
    title: `AI Usta · ${ISSUE_LABEL[issue]}`,
    dedupeKey: `usta:${SUBSCRIPTION.id}`,
    steps: [{ key: "report", label: "Sorun bildirimi" }, ...USTA_STEPS],
    data: { channel: "app", issue, ...(opts.initiatedBy ? { initiatedBy: opts.initiatedBy } : {}) },
    why: `Müşteri “${ISSUE_LABEL[issue]}” dedi`,
  });
  if (!created) return wf.id;
  step(wf.id, "report", "done", `“${ISSUE_LABEL[issue]}”`);
  chain("usta.context", wf.id, 1200);
  return wf.id;
}

/* ---------------- Sesli triyaj (simüle çağrı) → SMS → uygulama ---------------- */
export function startUstaCall(): string {
  const { wf, created } = createWorkflow({
    type: "ai_usta",
    title: "Telefon desteği · Sesli asistan",
    dedupeKey: `usta:${SUBSCRIPTION.id}`,
    steps: [
      { key: "call", label: "Sesli asistan sizi numaranızdan tanıdı" },
      { key: "report", label: "Sorununuzu menüden seçtiniz" },
      { key: "ivr_check", label: "Bölgesel kesinti kontrolü" },
      { key: "sms", label: "Destek bağlantısı SMS ile gönderildi" },
      ...USTA_STEPS,
    ],
    data: { channel: "ivr", phone: CUSTOMER.phone, callStartedAt: Date.now() },
    why: "Müşteri TürkNet'i aradı (simüle çağrı)",
  });
  if (!created) return wf.id;
  step(wf.id, "call", "done", `${CUSTOMER.phone} numarasından abonelik ${SUBSCRIPTION.id} tanındı (demo)`, "Telefon numarası ve abonelik eşleşti; şifre veya kimlik bilgisi sorulmadı");
  chain("usta.menu", wf.id, 2200);
  return wf.id;
}

export function askMenu(id: string) {
  if (stepStatus(id, "report") !== "pending") return;
  step(id, "report", "waiting");
  ask(
    id,
    {
      key: "usta_menu",
      prompt: "Bağlantınızda bir sorun olduğunu görüyorum. İnternetiniz hiç mi çalışmıyor, yoksa yavaş mı?",
      options: IVR_MENU.map((m, i) => ({ id: m.id, label: `${m.key} — ${m.label}`, primary: i === 0 })),
    },
    "Sesli menü, sorunu müşteriye teknik soru sormadan sınıflandırır",
    { push: false },
  );
}
registerOp("usta.menu", askMenu);

registerDecision("usta_menu", (id, opt) => {
  const issue = (IVR_MENU.some((m) => m.id === opt) ? opt : "down") as IvrCategory;
  setData(id, { issue });
  step(id, "report", "done", `Sesli menü: ${ISSUE_LABEL[issue]}`);
  if (issue !== "slow" && issue !== "other") setConnectivity({ fixed: "down" }, "Modem internet oturumu yok");
  step(id, "ivr_check", "in_progress", "Bölgenizde bilinen bir kesinti olup olmadığı kontrol ediliyor");
  chain("usta.ivrCheck", id, 2000);
});

export function ivrCheck(id: string) {
  const st = stepStatus(id, "ivr_check");
  if (st !== "in_progress" && st !== "pending") return;
  const issue = getWf(id)?.data["issue"] as IvrCategory | undefined;
  step(id, "ivr_check", "done", issue === "slow" ? "Bölgesel kesinti yok · hız paketin altında (demo)" : "Bölgenizde genel bir kesinti görünmüyor (demo)", "Bölgesel arıza olsaydı müşteriye adım yaptırılmazdı");
  step(id, "sms", "waiting");
  const prompt =
    issue === "other"
      ? "Diğer işlemlerinizi uygulamadan kolayca yapabilirsiniz. Size bir bağlantı göndermemi ister misiniz?"
      : issue === "slow"
        ? "Hızınızı telefonunuzdan birlikte ölçüp iyileştirmeyi deneyebiliriz. Size bir bağlantı göndermemi ister misiniz?"
        : "Telefonunuzdan birkaç basit kontrol yaparak sorunu çözmeyi deneyebiliriz. Size bir bağlantı göndermemi ister misiniz?";
  ask(
    id,
    {
      key: "usta_ivr",
      prompt,
      options: [
        { id: "sms", label: "Evet, devam edelim", primary: true },
        { id: "agent", label: "Hayır, temsilciyle görüşmek istiyorum" },
      ],
    },
    "Uygulamada adım adım çözüm, temsilci beklemeden sonuç verebilir; kanal değişikliği müşterinin seçimidir",
    { push: false },
  );
}
registerOp("usta.ivrCheck", ivrCheck);

const SMS_BODY: Record<"default" | "slow" | "other", string> = {
  default: "TürkNet: İnternet bağlantınızı birlikte kontrol edebilmemiz için size özel destek bağlantınızı hazırladık. AI Usta ile adım adım çözüm deneyebilirsiniz:",
  slow: "TürkNet: İnternet hızınızı birlikte kontrol edebilmemiz için size özel bağlantınızı hazırladık. Hız ölçümü ve iyileştirme adımları için:",
  other: "TürkNet: İşlemlerinizi uygulamadan kolayca yapabilmeniz için bağlantınızı hazırladık:",
};

registerDecision("usta_ivr", (id, opt) => {
  if (opt === "agent") {
    step(id, "sms", "skipped", "Müşteri temsilciyle görüşmek istedi");
    escalate(id, TEAMS.tech, "Müşteri sesli asistanda temsilciyle görüşmek istedi", "customer");
    return;
  }
  const issue = getWf(id)?.data["issue"];
  const link = `turk.net/d/${id.toLowerCase()}`;
  W.setState((s) => ({
    sms: [...s.sms.filter((m) => m.workflowId !== id), { id: `SMS-${uid().slice(0, 5).toUpperCase()}`, workflowId: id, body: SMS_BODY[issue === "slow" ? "slow" : issue === "other" ? "other" : "default"], link, at: Date.now(), opened: false }],
  }));
  setData(id, { callEndedAt: Date.now() });
  step(id, "sms", "waiting", "SMS gönderildi, açılması bekleniyor (demo · gerçek SMS gönderilmedi)");
  log(id, "system", "external", `SMS gönderildi: ${link} (simülasyon)`, "Uygulama yüklüyse bağlantı doğrudan ilgili ekranı açar, değilse indirme sayfasına gider");
});

const skipOpen = (id: string, note: string) =>
  W.setState((s) => ({
    workflows: s.workflows.map((w) => (w.id === id ? { ...w, steps: w.steps.map((x) => (["pending", "waiting", "in_progress"].includes(x.status) ? { ...x, status: "skipped" as StepStatus, note } : x)) } : w)),
  }));

/**
 * Customer taps the link in the SMS. Context from the call carries over.
 * Returns the in-app path to open, or null if the link was already used.
 */
export function openUstaSms(id: string): string | null {
  if (stepStatus(id, "sms") !== "waiting" || getWf(id)?.decision) return null;
  W.setState((s) => ({ sms: s.sms.map((m) => (m.workflowId === id ? { ...m, opened: true } : m)) }));
  step(id, "sms", "done", "SMS bağlantısıyla uygulama açıldı");
  const issue = getWf(id)?.data["issue"];
  if (issue === "slow" || issue === "other") {
    const target = issue === "slow" ? `/surec/${startSpeedCheck()}` : "/hallet";
    skipOpen(id, issue === "slow" ? "Hız optimizasyonuna aktarıldı" : "Uygulamaya yönlendirildi");
    complete(id, { resolved: true, summary: issue === "slow" ? "Hız kontrolüne aktarıldınız" : "Uygulamaya yönlendirildiniz", results: [`Sesli menü: ${ISSUE_LABEL[issue as IvrCategory]}`, "Bölgesel kesinti yok (demo)", "Destek kaydı açılmadı"] });
    return target;
  }
  step(id, "context", "done", "Çağrıdaki kontroller devralındı; sorun size tekrar sorulmadı", "Kanal değişse de bağlam korunur");
  chain("usta.photo", id, 1000);
  return `/ai-usta/${id}`;
}

/** Customer hangs up before the call reaches a result. */
export function endCall(id: string) {
  const wf = getWf(id);
  if (!wf) return;
  if (wf.handoff || stepStatus(id, "sms") === "waiting" || stepStatus(id, "sms") === "done") {
    setData(id, { callClosed: true });
    return;
  }
  skipOpen(id, "Görüşme sonlandırıldı");
  W.setState((s) => ({
    ops: s.ops.filter((o) => o.workflowId !== id),
    workflows: s.workflows.map((w) => (w.id === id ? { ...w, decision: null, status: "failed", outcome: { resolved: false, summary: "Görüşmeyi sonlandırdınız", results: ["Destek kaydı açılmadı"] }, data: { ...w.data, callClosed: true } } : w)),
  }));
  log(id, "customer", "info", "Müşteri görüşmeyi sonlandırdı; kayıt açılmadı");
}

/* ---------------- Ortak AI Usta akışı ---------------- */
export function ustaContext(id: string) {
  if (stepStatus(id, "context") !== "pending") return;
  step(id, "context", "done", "Bölgesel arıza yok · açık arıza kaydı yok · modem görünüyor, internet oturumu yok (demo)", "Bölgesel arıza olsaydı müşteriye adım yaptırılmazdı");
  chain("usta.photo", id, 1200);
}
registerOp("usta.context", ustaContext);

export function requestPhoto(id: string) {
  if (stepStatus(id, "photo") !== "pending" || stepStatus(id, "context") !== "done") return;
  step(id, "photo", "waiting");
  ask(
    id,
    {
      key: "usta_photo",
      prompt: "Modeminizi gösterin, birlikte kontrol edelim",
      detail: "Kamerayı modeminizin ön yüzüne tutun ve ışıkların durumunu seçin. Kamera açılmazsa örnek görüntüyle devam edebilirsiniz.",
      options: [
        { id: "uploaded", label: "Görüntüyü gönder" },
        { id: "demo_photo", label: "Örnek görüntüyü kullan", primary: true },
      ],
    },
    "Işık durumları, müşteriye teknik soru sormadan sorunu daraltmayı sağlar",
    { push: false },
  );
}
registerOp("usta.photo", requestPhoto);

/** The customer marked the light states on the simulated camera view. */
export function setUstaLeds(id: string, leds: Leds) {
  if (stepStatus(id, "photo") !== "waiting") return;
  setData(id, { leds: encodeLeds(leds) });
}

registerDecision("usta_photo", (id, opt) => {
  if (opt !== "uploaded" || !getWf(id)?.data["leds"]) setData(id, { leds: encodeLeds({ ...MODEM_LED_DEMO, ...MockVisionAPI.analyzeModemPhoto() }) });
  step(id, "photo", "done", opt === "uploaded" ? "Müşteri modem ışıklarını gösterdi" : "Örnek modem görüntüsü kullanıldı");
  step(id, "analysis", "in_progress", MockVisionAPI.name);
  schedule("usta.analyzed", id, 1800);
});

registerOp("usta.analyzed", (id) => {
  const leds = decodeLeds(getWf(id)?.data["leds"]) ?? MODEM_LED_DEMO;
  const reading = readLeds(leds);
  setData(id, { reading });
  step(id, "analysis", "done", `${MODEM_LEDS.map((m) => `${m.name}: ${LED_STATE_LABEL[leds[m.key]]}`).join(" · ")} (simülasyon, kesin teşhis değil)`);
  chain("usta.step1", id, 1000);
});

export function giveStep(id: string, n: 1 | 2) {
  if (stepStatus(id, `step${n}`) !== "pending" || stepStatus(id, "analysis") !== "done") return;
  if (n === 2 && stepStatus(id, "step1") !== "done") return;
  const s = AI_USTA_STEPS[n - 1]!;
  step(id, `step${n}`, "waiting");
  ask(
    id,
    {
      key: `usta_step${n}`,
      prompt: s.title,
      detail: `${s.text} ${s.safe}`,
      options: [
        { id: "done", label: s.cta, primary: true },
        { id: "help", label: "Bu adımı yapamıyorum" },
      ],
    },
    "Bir sonraki en güvenli ve geri alınabilir kontrol adımı",
    { push: false },
  );
}
registerOp("usta.step1", (id) => giveStep(id, 1));
registerOp("usta.step2", (id) => giveStep(id, 2));

const onStep = (n: 1 | 2) => (id: string, opt: string) => {
  if (opt === "help") {
    step(id, `step${n}`, "failed", "Müşteri bu adımı yapamadığını bildirdi");
    askLive(id, "Bu adımı birlikte uzmanımızla yapalım");
    return;
  }
  step(id, `step${n}`, "done", "Müşteri uyguladığını bildirdi");
  if (n === 1) {
    chain("usta.step2", id, 900);
    return;
  }
  step(id, "recheck", "in_progress", "Bağlantının yeniden kurulmasını bekliyoruz");
  schedule("usta.recheck", id, 3500);
};
registerDecision("usta_step1", onStep(1));
registerDecision("usta_step2", onStep(2));

registerOp("usta.recheck", (id) => {
  if (stepStatus(id, "recheck") !== "in_progress") return;
  if (MockNetworkAPI.connectionAfterSelfFix()) {
    step(id, "recheck", "done", "Bağlantı yeniden aktif · 96 Mbps (demo ölçüm)");
    setConnectivity({ fixed: "up", metric: { optic: -19.2, drops: 0, speed: 96 } }, "Modem oturumu açıldı");
    chain("usta.confirm", id, 600);
    return;
  }
  step(id, "recheck", "failed", "Bağlantı hâlâ kurulamadı (demo ölçüm)");
  askLive(id, "Bu adımlara rağmen bağlantınız düzelmedi");
});

export function askConfirm(id: string) {
  if (stepStatus(id, "confirm") !== "pending" || stepStatus(id, "recheck") !== "done") return;
  step(id, "confirm", "waiting");
  ask(
    id,
    {
      key: "usta_confirm",
      prompt: "Harika! Bağlantınız yeniden aktif görünüyor.",
      detail: "Bir web sayfası açarak deneyebilirsiniz. Sorunun çözüldü sayılması için sizin onayınız gerekiyor.",
      options: [
        { id: "yes", label: "Evet, internetim çalışıyor", primary: true },
        { id: "no", label: "Hayır, hâlâ sorun var" },
      ],
    },
    "Sistem ölçümü tek başına yeterli değildir; çözümü müşteri doğrular",
    { push: false },
  );
}
registerOp("usta.confirm", askConfirm);

registerDecision("usta_confirm", (id, opt) => {
  if (opt === "no") {
    step(id, "confirm", "failed", "Müşteri sorunun sürdüğünü bildirdi");
    askLive(id, "Ölçüm düzelmiş görünse de sorun devam ediyor");
    return;
  }
  step(id, "confirm", "done", "Müşteri çözümü doğruladı");
  setData(id, { reward: true });
  const wf = getWf(id);
  notify(id, "Bağlantı sorununuz giderildi", "Teknisyen beklemeden birlikte çözdük. İnternetinizi tekrar kullanabilirsiniz.");
  complete(id, {
    resolved: true,
    summary: "AI Usta ile sorun çözüldü, destek kaydı açılmadı",
    results: [`Uygulanan adımlar: ${AI_USTA_STEPS.map((s) => s.cta).join(", ")}`, "Bağlantı 96 Mbps ile döndü (demo)", "Teknisyen ziyareti gerekmedi", `Süre: ${wf ? Math.max(1, Math.round((Date.now() - wf.createdAt) / 60000)) : 1} dk`],
  });
});

/** Self-service did not help: offer live support. A record is only created if the customer accepts. */
export function askLive(id: string, reason: string) {
  setData(id, { liveReason: reason });
  ask(
    id,
    {
      key: "usta_live",
      prompt: `${reason}. Sorunu daha detaylı inceleyelim.`,
      detail: "Canlı destek, yaptığımız tüm kontrolleri görecek; sorununuzu tekrar anlatmanız gerekmeyecek.",
      options: [
        { id: "live", label: "Canlı Desteğe Bağlan", primary: true },
        { id: "later", label: "Daha Sonra" },
      ],
    },
    "Otomatik adımlar yetmedi; insan incelemesi gerekiyor",
    { push: false },
  );
}

registerDecision("usta_live", (id, opt) => {
  if (opt === "later") {
    setStatus(id, "waiting_for_customer", { blocker: "Hazır olduğunuzda canlı desteğe bağlanabilirsiniz" });
    return;
  }
  escalate(id, TEAMS.tech, String(getWf(id)?.data["liveReason"] ?? "Güvenli adımlar sorunu çözmedi"), "customer");
});

/** Short satisfaction question after a verified fix. Does not reopen the workflow. */
export function rateUsta(id: string, score: 1 | 2 | 3) {
  const wf = getWf(id);
  if (!wf || wf.status !== "completed" || wf.data["rating"]) return;
  setData(id, { rating: score });
  log(id, "customer", "info", `Memnuniyet: ${score === 3 ? "Çok iyi" : score === 2 ? "İdare eder" : "Kötü"}`);
}

/* ---------------- Canlı destek (simüle temsilci) ---------------- */
const AGENT = "Selin";
const pushChat = (m: Omit<ChatMessage, "id" | "at">) => W.setState((s) => ({ chats: [...s.chats, { ...m, id: `MSG-${uid().slice(0, 6)}`, at: Date.now() }] }));
export const chatOf = (id: string) => W.getState().chats.filter((m) => m.workflowId === id);

const TECH_REPLIES = [
  { id: "tech", label: "Teknisyen randevusu istiyorum" },
  { id: "remote", label: "Uzaktan bir kontrol daha yapın" },
  { id: "later", label: "Şimdilik bu kadar" },
];

/** Opens the live chat. The first agent message already knows the full context. */
export function openLiveChat(id: string): boolean {
  const wf = getWf(id);
  if (!wf || !wf.handoff) return false;
  if (chatOf(id).length) return true;
  pushChat({ workflowId: id, from: "system", text: `${TEAMS.tech} · temsilci ${AGENT} bağlandı (demo temsilci)` });
  pushChat({ workflowId: id, from: "agent", text: "Merhaba, bağlantı sorununuzla ilgili yaptığınız kontrolleri görebiliyorum. Aynı adımları tekrar yapmanıza gerek yok. Şimdi birlikte devam edelim." });
  pushChat({
    workflowId: id,
    from: "agent",
    text: "Modeminiz internete bağlanamıyor ve güvenli adımlar sonuç vermedi. Hattınızın yerinde kontrol edilmesi gerekebilir. Nasıl devam etmek istersiniz?",
    replies: TECH_REPLIES,
  });
  setData(id, { liveChat: true });
  log(id, "agent", "info", `Canlı destek sohbeti başladı; ${wf.handoff.context.length} adımlık bağlam temsilciye gösterildi`, "Müşteri sorunu baştan anlatmaz");
  return true;
}

export const CHAT_MAX = 500;

/** Customer sends a message or taps a quick reply. Returns false for invalid input. */
export function sendChat(id: string, text: string, replyId?: string): boolean {
  const t = text.trim();
  if (!t || t.length > CHAT_MAX || !getWf(id)?.handoff) return false;
  pushChat({ workflowId: id, from: "customer", text: t });
  schedule("chat.reply", id, 1200, replyId ?? "free");
  return true;
}

registerOp("chat.reply", (id, kind) => {
  if (kind === "tech") {
    const existing = W.getState().workOrders.find((o) => o.workflowId === id && o.kind === "field_repair");
    const slot = APPOINTMENT_SLOTS[4]!;
    const wo = existing ?? workOrder(id, { kind: "field_repair", title: "Yerinde bağlantı kontrolü", team: TEAMS.field }, "Fiziksel müdahale gerekiyor; temsilci teknisyen ziyareti planladı");
    if (!existing) {
      book(id, { id: slot.id, label: `${slot.label} · ${TEAMS.field}` }, wo.id);
      notify(id, "Teknisyen randevunuz oluşturuldu", `${slot.label}. Tüm kontrolleriniz teknisyene iletildi (demo).`);
    }
    pushChat({ workflowId: id, from: "agent", text: `Teknisyen randevunuzu oluşturdum: ${slot.label}. Yaptığınız tüm kontroller kayda eklendi; teknisyen sorunu baştan sormayacak. Bu işlemi İşlemlerim'den takip edebilirsiniz.`, replies: [{ id: "thanks", label: "Teşekkürler" }] });
    return;
  }
  if (kind === "remote") {
    log(id, "agent", "info", "Temsilci uzaktan hat kontrolü yaptı: modem oturumu yok (demo)");
    pushChat({ workflowId: id, from: "agent", text: "Hattınıza uzaktan bir kontrol daha yaptım: modeminiz hâlâ internete bağlanamıyor. Sorun bina içi kablo bağlantısında olabilir; yerinde kontrol en hızlı çözüm olacak.", replies: TECH_REPLIES.filter((r) => r.id !== "remote") });
    return;
  }
  if (kind === "later" || kind === "thanks") {
    pushChat({ workflowId: id, from: "agent", text: "Rica ederim. Bu görüşme ve tüm kontroller işleminize kaydedildi. Gelişme olduğunda size haber vereceğiz. İyi günler dilerim." });
    return;
  }
  pushChat({ workflowId: id, from: "agent", text: "Notunuzu aldım ve kaydınıza ekledim. Sorunu en hızlı çözmek için size teknisyen randevusu oluşturabilirim.", replies: TECH_REPLIES.filter((r) => r.id !== "remote") });
});
