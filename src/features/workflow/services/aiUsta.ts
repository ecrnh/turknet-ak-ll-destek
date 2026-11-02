/**
 * AIHelperService: "GIGA Teknik" visual technical support, reachable from the app
 * or from the call centre (voice triage → simulated SMS → app, no re-telling).
 * Image analysis is a clearly-labelled simulation (no real vision model) and no
 * real SMS is sent. Every step is safe and reversible; after AI_USTA_MAX_ATTEMPTS
 * it hands over to live support with full context.
 */
import { AI_USTA_STEPS, CUSTOMER, IVR_MENU, SUBSCRIPTION, TEAMS, type InternetLight } from "@/data/mock";
import { uid } from "@/lib/format";
import { ask, chain, complete, createWorkflow, escalate, getWf, log, notify, registerDecision, registerOp, schedule, setData, step, stepStatus } from "../engine";
import { MockNetworkAPI, MockVisionAPI } from "../mockServices";
import { AI_USTA_MAX_ATTEMPTS } from "../rules";
import { useWorkflowStore as W } from "../store";
import { setConnectivity } from "./connectivity";

const USTA_STEPS = [
  { key: "context", label: "Bölgesel kesinti ve arıza kaydı kontrolü" },
  { key: "photo", label: "Modem ışıkları (kamera)" },
  { key: "analysis", label: "Işık kontrolü (simülasyon)" },
  { key: "step1", label: `Adım 1: ${AI_USTA_STEPS[0]!.title}` },
  { key: "step2", label: `Adım 2: ${AI_USTA_STEPS[1]!.title}` },
  { key: "reconnect", label: "Bağlantının yeniden kurulması bekleniyor" },
  { key: "recheck", label: "Bağlantı yeniden kontrol edildi" },
  { key: "confirm", label: "Çözümü siz doğruladınız" },
];

/** In-app start: "İnternetim çalışmıyor" or "Modemimde sorun var". */
export function startAiUsta(issue: "no_internet" | "modem" = "no_internet"): string {
  // The customer started this themselves: automatic checks run without presenter "Sonraki".
  W.setState({ autoFollowUp: true });
  setConnectivity({ fixed: "down" }, "Modem internet oturumu yok");
  const said = issue === "modem" ? "Modemimde sorun var" : "İnternetim çalışmıyor";
  const { wf, created } = createWorkflow({
    type: "ai_usta",
    title: `Bağlantı sorunu · ${said}`,
    dedupeKey: `usta:${SUBSCRIPTION.id}`,
    steps: [{ key: "report", label: "Sorun bildirimi" }, ...USTA_STEPS],
    data: { channel: "app", issue: said },
    why: `Müşteri “${said}” dedi`,
  });
  if (!created) {
    resumeUsta(wf.id);
    return wf.id;
  }
  step(wf.id, "report", "done", `“${said}”`);
  chain("usta.context", wf.id, 1200);
  return wf.id;
}

/**
 * Re-queues the next automatic check of an in-app session that is stuck because its
 * delayed op was lost (e.g. started while a presenter scenario had paused auto follow-up).
 * Idempotent: does nothing while a decision is open or an op is already queued.
 */
export function resumeUsta(id: string) {
  const wf = getWf(id);
  if (!wf || wf.type !== "ai_usta" || wf.status === "completed" || wf.handoff || wf.decision) return;
  if (W.getState().ops.some((o) => o.workflowId === id)) return;
  if (stepStatus(id, "report") !== "done") return;
  if (stepStatus(id, "context") === "pending" && wf.data["channel"] === "app") schedule("usta.context", id, 800);
  else if (stepStatus(id, "context") === "done" && stepStatus(id, "photo") === "pending") schedule("usta.photo", id, 800);
  else if (stepStatus(id, "analysis") === "in_progress") schedule("usta.analyzed", id, 800);
  else if (stepStatus(id, "analysis") === "done" && stepStatus(id, "step1") === "pending") schedule("usta.step1", id, 800);
  else if (stepStatus(id, "step1") === "done" && stepStatus(id, "step2") === "pending") schedule("usta.step2", id, 800);
  else if (stepStatus(id, "reconnect") === "in_progress") schedule("usta.reconnected", id, 800);
  else if (stepStatus(id, "recheck") === "in_progress") schedule("usta.recheck", id, 800);
  else if (stepStatus(id, "recheck") === "done" && stepStatus(id, "confirm") === "pending") schedule("usta.confirm", id, 800);
}

/* ---------------- GIGA sesli destek (IVR) → SMS → GIGA Teknik ---------------- */
export function startUstaCall(): string {
  setConnectivity({ fixed: "down" }, "Modem internet oturumu yok");
  const { wf, created } = createWorkflow({
    type: "ai_usta",
    title: "Bağlantı sorunu · Telefon görüşmesinden",
    dedupeKey: `usta:${SUBSCRIPTION.id}`,
    steps: [
      { key: "call", label: "Aboneliğiniz numaranızdan bulundu" },
      { key: "report", label: "Sorununuzu telefonda seçtiniz" },
      { key: "ivr_check", label: "Bölgesel kesinti ve bağlantı kontrolü" },
      { key: "sms", label: "Destek bağlantısı SMS ile gönderildi" },
      ...USTA_STEPS,
    ],
    data: { channel: "ivr", phone: CUSTOMER.phone, callStartedAt: Date.now() },
    why: "Müşteri çağrı merkezini aradı",
  });
  if (!created) return wf.id;
  step(wf.id, "call", "done", `${CUSTOMER.phone} numarasından abonelik ${SUBSCRIPTION.id} tanındı (demo)`, "Telefon numarası ve abonelik eşleşti; şifre, T.C. kimlik no gibi bilgiler sorulmadı");
  step(wf.id, "report", "waiting");
  ask(
    wf.id,
    {
      key: "usta_ivr_menu",
      prompt: "Bağlantında bir sorun olduğunu görüyorum. İnternetin hiç mi çalışmıyor, yoksa yavaş mı?",
      detail: "Sesli menü (demo): tuşlayarak seçin.",
      options: IVR_MENU.map((m, i) => ({ id: m.id, label: `${m.key} — ${m.label}`, primary: i === 0 })),
    },
    "Sorun kategorisi telefonda seçilir; uygulamaya geçince tekrar sorulmaz",
    { push: false },
  );
  return wf.id;
}

registerDecision("usta_ivr_menu", (id, opt) => {
  const m = IVR_MENU.find((x) => x.id === opt) ?? IVR_MENU[0]!;
  setData(id, { issue: m.issue, issueId: m.id });
  step(id, "report", "done", `Telefonda seçilen: “${m.label}”`);
  if (m.id === "other") {
    ["ivr_check", "sms"].forEach((k) => step(id, k, "skipped", "Diğer işlemler için temsilciye bağlandı"));
    escalate(id, TEAMS.tech, "Müşteri sesli menüde diğer işlemleri seçti; temsilciye bağlandı");
    return;
  }
  chain("usta.ivrCheck", id, 1400);
});

export function ivrCheck(id: string) {
  if (stepStatus(id, "ivr_check") !== "pending" || stepStatus(id, "report") !== "done") return;
  const issue = String(getWf(id)?.data["issue"] ?? "İnternet hiç çalışmıyor");
  step(id, "ivr_check", "done", `Bölgede genel kesinti yok · modemde internet oturumu yok · sorun: ${issue.toLocaleLowerCase("tr-TR")} (demo)`, "Bölgesel arıza olsaydı müşteriye adım yaptırılmazdı");
  step(id, "sms", "waiting");
  ask(
    id,
    {
      key: "usta_ivr",
      prompt: "Telefonundan birkaç basit kontrol yaparak sorunu çözmeyi deneyebiliriz. Sana bir bağlantı göndermemi ister misin?",
      detail: "Bölgenizde genel bir kesinti görünmüyor. Uygulamayı kullanmak zorunda değilsiniz; isterseniz temsilciye bağlanırsınız.",
      options: [
        { id: "sms", label: "Evet, devam edelim", primary: true },
        { id: "agent", label: "Hayır, temsilciyle görüşmek istiyorum" },
      ],
    },
    "Görsel destek, saha ziyareti gerektirmeden çözüm şansı sunar; kanal değişimi müşterinin seçimidir",
    { push: false },
  );
}
registerOp("usta.ivrCheck", ivrCheck);

registerDecision("usta_ivr", (id, opt) => {
  if (opt === "agent") {
    step(id, "sms", "skipped", "Müşteri temsilciye bağlanmayı seçti");
    escalate(id, TEAMS.tech, "Müşteri telefonda temsilciyle görüşmek istedi");
    return;
  }
  const link = `turk.net/giga/${id}`;
  W.setState((s) => ({
    sms: [
      ...s.sms.filter((m) => m.workflowId !== id),
      {
        id: `SMS-${uid().slice(0, 5).toUpperCase()}`,
        workflowId: id,
        body: "TürkNet: Bağlantı sorununu birlikte çözebilmemiz için sana özel destek bağlantını hazırladık. GIGA Teknik ile adım adım kontrol edebilirsin:",
        link,
        at: Date.now(),
        opened: false,
      },
    ],
  }));
  step(id, "sms", "waiting", "SMS gönderildi, açılması bekleniyor (demo · gerçek SMS gönderilmedi)");
  log(id, "system", "external", `SMS gönderildi: ${link} (simülasyon)`, "Uygulama yüklüyse bağlantı doğrudan GIGA Teknik'i açar, değilse indirme sayfasına gider");
});

/** Customer hangs up the simulated call. The process stays open and can continue in the app. */
export function endUstaCall(id: string) {
  const wf = getWf(id);
  if (!wf || wf.data["callEnded"]) return;
  setData(id, { callEnded: true });
  log(id, "customer", "info", "Müşteri telefon görüşmesini sonlandırdı", "Süreç kapanmaz; uygulamadan veya SMS bağlantısından devam edilebilir");
}

/** Customer taps the link in the SMS. Context from the call carries over. */
export function openUstaSms(id: string): boolean {
  if (stepStatus(id, "sms") !== "waiting" || getWf(id)?.decision) return false;
  W.setState((s) => ({ sms: s.sms.map((m) => (m.workflowId === id ? { ...m, opened: true } : m)) }));
  setData(id, { callEnded: true });
  step(id, "sms", "done", W.getState().config.appInstalled ? "SMS bağlantısıyla uygulama açıldı" : "Uygulama yüklendi ve SMS bağlantısıyla açıldı (demo)");
  step(id, "context", "done", "Telefondaki kontroller devralındı; sorun müşteriye tekrar sorulmadı", "Kanal değişse de bağlam korunur");
  chain("usta.photo", id, 1000);
  return true;
}

/* ---------------- Ortak GIGA Teknik akışı ---------------- */
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
      prompt: "GIGA Teknik yanında. Modemini göster, birlikte kontrol edelim.",
      detail: "Kamerayı açıp modeminin ön yüzünü göster. Kamera kullanmak istemezsen örnek görüntüyle devam edebilirsin.",
      options: [
        { id: "uploaded", label: "Fotoğraf yükledim" },
        { id: "demo_photo", label: "Kamerayı aç", primary: true },
      ],
    },
    "Işık durumları, müşteriye teknik soru sormadan sorunu daraltmayı sağlar",
    { push: false },
  );
}
registerOp("usta.photo", requestPhoto);

/** Simulated camera: the light state the customer shows (or picks) before the shot. */
export function setModemLight(id: string, light: InternetLight) {
  if (stepStatus(id, "photo") !== "waiting") return;
  setData(id, { light });
}

registerDecision("usta_photo", (id, opt) => {
  step(id, "photo", "done", opt === "uploaded" ? "Müşteri modem fotoğrafı yükledi" : "Kamera görüntüsü alındı (simülasyon)");
  step(id, "analysis", "in_progress", MockVisionAPI.name);
  schedule("usta.analyzed", id, 1600);
});

registerOp("usta.analyzed", (id) => {
  const light = (getWf(id)?.data["light"] as InternetLight | undefined) ?? "red";
  const leds = MockVisionAPI.analyzeModemPhoto(light);
  setData(id, { leds: leds.map((l) => `${l.name}:${l.ok ? "1" : "0"}:${l.state}`).join("|"), light });
  step(id, "analysis", "done", `${leds.map((l) => `${l.name} ${l.ok ? "✓" : "✕"}`).join(" · ")} (simülasyon, kesin teşhis değil)`);
  chain("usta.step1", id, 1200);
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
      options: [{ id: "done", label: s.cta, primary: true }],
    },
    "Bir sonraki en güvenli ve geri alınabilir kontrol adımı",
    { push: false },
  );
}
registerOp("usta.step1", (id) => giveStep(id, 1));
registerOp("usta.step2", (id) => giveStep(id, 2));

registerDecision("usta_step1", (id) => {
  step(id, "step1", "done", "Müşteri güç kablosunu kontrol etti");
  chain("usta.step2", id, 800);
});
registerDecision("usta_step2", (id) => {
  step(id, "step2", "done", "Müşteri modemi kapatıp açtı");
  step(id, "reconnect", "in_progress", "Modem yeniden başlıyor, bağlantı kuruluyor");
  schedule("usta.reconnected", id, 2500);
});

registerOp("usta.reconnected", (id) => {
  if (stepStatus(id, "reconnect") !== "in_progress") return;
  step(id, "reconnect", "done", "Modem açıldı");
  step(id, "recheck", "in_progress", "Şimdi bağlantını tekrar kontrol ediyorum");
  schedule("usta.recheck", id, 1500);
});

registerOp("usta.recheck", (id) => {
  if (stepStatus(id, "recheck") !== "in_progress") return;
  if (MockNetworkAPI.connectionAfterSelfFix()) {
    step(id, "recheck", "done", "Bağlantı geri geldi · 96 Mbps (demo ölçüm)");
    setConnectivity({ fixed: "up", metric: { optic: -19.2, drops: 0, speed: 96 } }, "Modem oturumu açıldı");
    chain("usta.confirm", id, 1000);
    return;
  }
  step(id, "recheck", "failed", "Bağlantı hâlâ yok");
  escalate(id, TEAMS.tech, `${AI_USTA_MAX_ATTEMPTS} güvenli adım denendi, bağlantı düzelmedi; uzman incelemesi gerekiyor`);
});

export function askConfirm(id: string) {
  if (stepStatus(id, "confirm") !== "pending" || stepStatus(id, "recheck") !== "done") return;
  step(id, "confirm", "waiting");
  ask(
    id,
    {
      key: "usta_confirm",
      prompt: "Harika! Bağlantın yeniden aktif görünüyor. İnternetin şu an çalışıyor mu?",
      detail: "Bir web sayfası açarak deneyebilirsin. Sorunun çözüldü sayılması için senin onayın gerekiyor.",
      options: [
        { id: "yes", label: "Evet, Çalışıyor", primary: true },
        { id: "no", label: "Hayır, Sorun Devam Ediyor" },
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
    escalate(id, TEAMS.tech, "Ölçüm düzelmiş görünse de müşteri sorunun sürdüğünü bildirdi");
    return;
  }
  step(id, "confirm", "done", "Müşteri çözümü doğruladı");
  setData(id, { reward: true });
  const wf = getWf(id);
  notify(id, "Bağlantı sorununuz giderildi", "Teknisyen beklemeden birlikte çözdük. İnternetiniz kullanıma hazır.");
  complete(id, {
    resolved: true,
    summary: "Harika, sorunu GIGA Teknik ile birlikte çözdük",
    results: ["Uygulanan adımlar: güç kablosu kontrolü, modemi yeniden başlatma", "Bağlantı 96 Mbps ile döndü (demo)", "Destek kaydı açılmadı, teknisyen ziyareti gerekmedi", `Süre: ${wf ? Math.max(1, Math.round((Date.now() - wf.createdAt) / 60000)) : 1} dk`],
  });
});

/** Short satisfaction question after a verified fix. Does not reopen the workflow. */
export function rateUsta(id: string, score: 1 | 2 | 3) {
  const wf = getWf(id);
  if (!wf || wf.status !== "completed" || wf.data["rating"]) return;
  setData(id, { rating: score });
  log(id, "customer", "info", `Memnuniyet: ${score === 3 ? "Çok iyi" : score === 2 ? "İdare eder" : "Kötü"}`);
}
