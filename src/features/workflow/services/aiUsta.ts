/**
 * AIHelperService: "GIGA Teknik" visual technical support, reachable from the app
 * or from the call centre (voice triage → simulated SMS → app, no re-telling).
 * Image analysis is a clearly-labelled simulation (no real vision model) and no
 * real SMS is sent. Flow: understand the problem → digital repair (simulated remote
 * checks) → remote fix if an issue is found, otherwise modem inspection (front/back
 * photo or manual light + cable answers) → one safe step at a time → verify →
 * escalate with full context. Live support can be chosen at every decision point.
 */
import { AI_USTA_CABLE_STEP, AI_USTA_STEPS, CABLE_STATES, CUSTOMER, INTERNET_LIGHT_STATES, IVR_MENU, REPAIR_CHECKS, SUBSCRIPTION, TEAMS, USTA_ISSUES, type CableState, type InternetLight } from "@/data/mock";
import { uid } from "@/lib/format";
import { ask, chain, complete, createWorkflow, escalate, getWf, log, notify, registerDecision, registerOp, schedule, setData, step, stepStatus } from "../engine";
import { MockNetworkAPI, MockVisionAPI } from "../mockServices";
import { AI_USTA_MAX_ATTEMPTS } from "../rules";
import { useWorkflowStore as W } from "../store";
import { setConnectivity } from "./connectivity";
import { startOutage } from "./hybrid";
import { openLiveChat } from "./liveSupport";

const USTA_STEPS = [
  { key: "repair", label: "Dijital onarım (uzaktan kontrol)" },
  { key: "remote", label: "Uzaktan düzeltme" },
  { key: "verify", label: "Uzaktan düzeltme sonrası kontrol" },
  { key: "inspect", label: "Modem kontrolü (ön ve arka yüz)" },
  { key: "analysis", label: "Işık ve kablo değerlendirmesi (simülasyon)" },
  { key: "step1", label: "Adım 1: Kablo ve güç bağlantısı" },
  { key: "step2", label: `Adım 2: ${AI_USTA_STEPS[1]!.title}` },
  { key: "reconnect", label: "Bağlantının yeniden kurulması bekleniyor" },
  { key: "recheck", label: "Bağlantı yeniden kontrol edildi" },
  { key: "confirm", label: "Çözümü siz doğruladınız" },
];

export const LIVE_OPTION = { id: "live", label: "Canlı destekle görüşmek istiyorum." } as const;

/** The selected problem, kept for the whole session (app question or phone menu). */
export function ustaIssue(id: string) {
  const issueId = String(getWf(id)?.data["issueId"] ?? "no_connect");
  const mapped = issueId === "no_internet" || issueId === "modem" ? "no_connect" : issueId;
  return USTA_ISSUES.find((x) => x.id === mapped) ?? USTA_ISSUES[0];
}

/** In-app start: "İnternetim çalışmıyor" asks what exactly first; "Modemimde sorun var" goes straight to digital repair. */
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
    data: { channel: "app", issue: said, issueId: issue },
    why: `Müşteri “${said}” dedi`,
  });
  if (!created) {
    resumeUsta(wf.id);
    return wf.id;
  }
  if (issue === "modem") {
    step(wf.id, "report", "done", `“${said}”`);
    startRepair(wf.id);
    return wf.id;
  }
  step(wf.id, "report", "waiting");
  ask(
    wf.id,
    {
      key: "usta_issue",
      prompt: "İnternetinle ilgili nasıl bir sorun yaşıyorsun?",
      options: USTA_ISSUES.map((x, i) => ({ id: x.id, label: x.label, primary: i === 0 })),
    },
    "Sorun türü önce netleşir; modem fotoğrafı hemen istenmez",
    { push: false },
  );
  return wf.id;
}

registerDecision("usta_issue", (id, opt) => {
  const x = USTA_ISSUES.find((i) => i.id === opt) ?? USTA_ISSUES[0];
  setData(id, { issue: x.issue, issueId: x.id });
  step(id, "report", "done", `“${x.label.replace(/\.$/, "")}”`);
  startRepair(id);
});

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
  log(id, "system", "info", "Telefondaki kontroller devralındı; sorun müşteriye tekrar sorulmadı", "Kanal değişse de bağlam korunur");
  chain("usta.repair", id, 1000);
  return true;
}

/* ---------------- Ortak GIGA Teknik akışı ---------------- */

/** Digital repair: five simulated remote checks, one after another. Nothing real is queried. */
export function startRepair(id: string) {
  if (stepStatus(id, "repair") !== "pending" || stepStatus(id, "report") !== "done") return;
  setData(id, { checkIdx: 0, repair: "" });
  step(id, "repair", "in_progress", "Dijital onarım başladı (simülasyon)", "Modem fotoğrafı istenmeden önce bağlantı uzaktan kontrol edilir");
  schedule("usta.check", id, 1300);
}
registerOp("usta.repair", startRepair);

/** Parsed repair results: check id → found an issue? */
export function repairResults(data: Record<string, unknown>): Record<string, boolean> {
  return Object.fromEntries(
    String(data["repair"] ?? "")
      .split("|")
      .filter(Boolean)
      .map((x) => {
        const [k, ok] = x.split(":");
        return [k, ok === "1"];
      }),
  );
}

registerOp("usta.check", (id) => {
  const wf = getWf(id);
  if (!wf || stepStatus(id, "repair") !== "in_progress") return;
  const idx = Number(wf.data["checkIdx"] ?? 0);
  const check = REPAIR_CHECKS[idx];
  // Every check already answered (e.g. an interrupted session): close the run instead of stalling.
  if (!check) return finishRepair(id);
  // A check that gets no answer stops the run: the customer sees "Kontroller tamamlanamadı", never a guessed result.
  if (check.id === "diag" && !MockNetworkAPI.checksAnswer()) {
    setData(id, { checkIdx: idx });
    finishRepair(id, "incomplete");
    return;
  }
  const bad = (MockNetworkAPI.repairFindsIssue() && ustaIssue(id).check === check.id) || (check.id === "regional" && MockNetworkAPI.regionalOutage().found);
  const repair = [String(wf.data["repair"] ?? ""), `${check.id}:${bad ? "0" : "1"}`].filter(Boolean).join("|");
  setData(id, { repair, checkIdx: idx + 1 });
  if (idx + 1 < REPAIR_CHECKS.length) {
    schedule("usta.check", id, 1100);
    return;
  }
  finishRepair(id);
});

const AFTER_REPAIR = ["remote", "verify", "inspect", "analysis", "step1", "step2", "reconnect", "recheck", "confirm"];

function finishRepair(id: string, forced?: "incomplete") {
  const issue = ustaIssue(id);
  const results = repairResults(getWf(id)?.data ?? {});
  if (forced === "incomplete") {
    setData(id, { repairOutcome: "incomplete" });
    step(id, "repair", "waiting", "Kontroller tamamlanamadı · bir sistem yanıt vermedi (simülasyon)", "Yanıt alınamayan kontrol sonuç sayılmaz");
    ask(
      id,
      {
        key: "usta_incomplete",
        prompt: "Kontrolleri şu an tamamlayamadım. Birazdan tekrar deneyebilir ya da seni teknik destek ekibimize aktarabilirim.",
        options: [{ id: "retry", label: "Tekrar dene", primary: true }, { id: "handoff", label: "Teknik desteğe aktar" }, LIVE_OPTION],
      },
      "Kontroller yarım kaldı; müşteri tekrar denemeyi veya aktarımı seçer",
      { push: false },
    );
    return;
  }
  if (results["regional"] === false) {
    const { etaH } = MockNetworkAPI.regionalOutage();
    setData(id, { repairOutcome: "regional", etaH });
    step(id, "repair", "done", `Bölgesel arıza bulundu · tahmini çözüm ${etaH} saat (simülasyon)`);
    AFTER_REPAIR.forEach((k) => step(id, k, "skipped", "Sorun bölgesel; müşteri tarafında adım gerekmiyor"));
    const outageId = startOutage(0.2, { regional: true, etaH, relatedIds: [id], why: "GIGA Teknik dijital onarımı bölgesel arıza buldu (demo)" });
    setData(id, { outageWf: outageId });
    complete(id, {
      resolved: false,
      summary: "Sorun bölgesel bir kesintiden kaynaklanıyor; takip Kesinti Takibi'nde sürüyor.",
      results: [`Bölgesel arıza · tahmini çözüm ${etaH} saat`, "Modeminde yapılacak bir adım yok"],
    });
    return;
  }
  const found = Object.values(results).some((ok) => !ok);
  if (!found) {
    setData(id, { repairOutcome: "clear" });
    step(id, "repair", "done", "5 kontrol tamamlandı · bilinen bir arıza görünmüyor (simülasyon)");
    ["remote", "verify"].forEach((k) => step(id, k, "skipped", "Uzaktan düzeltilecek bir sorun bulunmadı"));
    step(id, "inspect", "waiting");
    ask(
      id,
      {
        key: "usta_more",
        prompt: "Bağlantını kontrol ettim. Şu anda sistemlerimizde bilinen bir arıza görünmüyor. Ancak internetine hâlâ erişemediğini söylüyorsun. Birlikte biraz daha detaylı inceleyelim mi?",
        detail: "Kontrol sonuçları bu prototipte simülasyondur; gerçek TürkNet sistemlerine bağlanılmaz.",
        options: [{ id: "yes", label: "Evet, inceleyelim", primary: true }, LIVE_OPTION],
      },
      "Kontroller normal görünse de sorun çözülmüş sayılmaz; müşteri tarafı incelenir",
      { push: false },
    );
    return;
  }
  setData(id, { finding: issue.finding, repairOutcome: "issue" });
  step(id, "repair", "done", `Sorun tespit edildi: ${issue.finding} (simülasyon)`);
  step(id, "remote", "in_progress", `${issue.fix}…`);
  schedule("usta.remoteDone", id, 2200);
}

registerOp("usta.remoteDone", (id) => {
  if (stepStatus(id, "remote") !== "in_progress") return;
  const issue = ustaIssue(id);
  step(id, "remote", "done", `${issue.fixed} (simülasyon)`);
  step(id, "verify", "in_progress", "Bağlantını tekrar kontrol ediyorum");
  schedule("usta.verify", id, 1500);
});

registerOp("usta.verify", (id) => {
  if (stepStatus(id, "verify") !== "in_progress") return;
  if (MockNetworkAPI.connectionAfterSelfFix()) {
    step(id, "verify", "done", "Bağlantı geri geldi · 96 Mbps (demo ölçüm)");
    setConnectivity({ fixed: "up", metric: { optic: -19.2, drops: 0, speed: 96 } }, "Uzaktan düzeltme sonrası bağlantı açıldı");
    ["inspect", "analysis", "step1", "step2", "reconnect", "recheck"].forEach((k) => step(id, k, "skipped", "Uzaktan çözüldü; modem kontrolüne gerek kalmadı"));
    askConfirm(id);
    return;
  }
  step(id, "verify", "done", "Uzaktan düzeltme sonrası bağlantı hâlâ yok");
  ask(
    id,
    {
      key: "usta_remote_failed",
      prompt: "Bağlantı sorunun devam ediyor. Seni yaptığımız kontrollerle birlikte teknik destek ekibimize aktarabilirim.",
      detail: "İstersen önce modemini birlikte kontrol edebiliriz.",
      options: [{ id: "handoff", label: "Teknik desteğe aktar", primary: true }, { id: "inspect", label: "Önce modemimi kontrol edelim" }, LIVE_OPTION],
    },
    "Uzaktan düzeltme sonuç vermedi; aktarım müşterinin seçimidir",
    { push: false },
  );
});

registerDecision("usta_remote_failed", (id, opt) => {
  if (opt === "live") return goLive(id);
  if (opt === "inspect") return askInspect(id);
  escalate(id, TEAMS.tech, "Uzaktan düzeltme sonrası bağlantı gelmedi; dijital onarım sonuçları aktarıldı");
});

registerDecision("usta_incomplete", (id, opt) => {
  if (opt === "live") return goLive(id);
  if (opt === "handoff") {
    step(id, "repair", "failed", "Kontroller tamamlanamadı; teknik desteğe aktarıldı");
    return escalate(id, TEAMS.tech, "Dijital onarım kontrolleri tamamlanamadı; yapılan kontroller aktarıldı");
  }
  setData(id, { checkIdx: 0, repair: "", repairOutcome: "" });
  step(id, "repair", "pending");
  startRepair(id);
});

registerDecision("usta_more", (id, opt) => {
  if (opt === "live") return goLive(id);
  askInspect(id);
});

/** Front + back of the modem: photos if the customer wants, manual light and cable answers otherwise. */
export function askInspect(id: string) {
  if (stepStatus(id, "repair") !== "done" || stepStatus(id, "inspect") === "done") return;
  step(id, "inspect", "waiting");
  ask(
    id,
    {
      key: "usta_inspect",
      prompt: "Modeminin ön ve arka yüzünün fotoğrafını paylaşabilir misin? Işıkları ve kablo bağlantılarını birlikte inceleyelim.",
      detail: "Fotoğraf çekmek istemezsen ışık rengini ve kabloların durumunu aşağıdan seçebilirsin.",
      options: [{ id: "done", label: "İncelemeyi gönder", primary: true }, LIVE_OPTION],
    },
    "Fotoğraf yalnızca dijital onarım sonrası, gerekli olduğunda istenir",
    { push: false },
  );
}
registerOp("usta.inspect", askInspect);

/** What the customer showed or picked during inspection. */
export function setInspection(id: string, v: { light?: InternetLight; cable?: CableState; front?: boolean; back?: boolean }) {
  if (stepStatus(id, "inspect") !== "waiting") return;
  setData(id, v);
}
/** Kept for the camera viewfinder. */
export function setModemLight(id: string, light: InternetLight) {
  setInspection(id, { light });
}

registerDecision("usta_inspect", (id, opt) => {
  if (opt === "live") return goLive(id);
  const d = getWf(id)?.data ?? {};
  const light = INTERNET_LIGHT_STATES.find((x) => x.id === d["light"]) ?? INTERNET_LIGHT_STATES[0];
  const cable = CABLE_STATES.find((x) => x.id === d["cable"]) ?? CABLE_STATES[0];
  setData(id, { light: light.id, cable: cable.id });
  const src = `${d["front"] ? "ön yüz fotoğrafı" : "ışık seçimi"} · ${d["back"] ? "arka yüz fotoğrafı" : "kablo seçimi"}`;
  step(id, "inspect", "done", `Internet ışığı ${light.label.toLocaleLowerCase("tr-TR")} · ${cable.say} (${src})`);
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

/** Step 1 depends on the cable answer: loose/unsure cables are fixed first. */
export function stepContent(id: string, n: 1 | 2) {
  if (n === 2) return AI_USTA_STEPS[1]!;
  return getWf(id)?.data["cable"] === "ok" ? AI_USTA_STEPS[0]! : AI_USTA_CABLE_STEP;
}

export function giveStep(id: string, n: 1 | 2) {
  if (stepStatus(id, `step${n}`) !== "pending" || stepStatus(id, "analysis") !== "done") return;
  if (n === 2 && stepStatus(id, "step1") !== "done") return;
  const s = stepContent(id, n);
  step(id, `step${n}`, "waiting");
  ask(
    id,
    {
      key: `usta_step${n}`,
      prompt: s.title,
      detail: `${s.text} ${s.safe}`,
      options: [{ id: "done", label: s.cta, primary: true }, LIVE_OPTION],
    },
    "Bir sonraki en güvenli ve geri alınabilir kontrol adımı",
    { push: false },
  );
}
registerOp("usta.step1", (id) => giveStep(id, 1));
registerOp("usta.step2", (id) => giveStep(id, 2));

registerDecision("usta_step1", (id, opt) => {
  if (opt === "live") return goLive(id);
  step(id, "step1", "done", getWf(id)?.data["cable"] === "ok" ? "Müşteri güç kablosunu kontrol etti" : "Müşteri kablo bağlantılarını yerine taktı");
  chain("usta.step2", id, 800);
});
registerDecision("usta_step2", (id, opt) => {
  if (opt === "live") return goLive(id);
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
  escalate(id, TEAMS.tech, `Dijital onarım ve ${AI_USTA_MAX_ATTEMPTS} güvenli adım denendi, bağlantı düzelmedi; uzman incelemesi gerekiyor`);
});

export function askConfirm(id: string) {
  if (stepStatus(id, "confirm") !== "pending") return;
  if (stepStatus(id, "recheck") !== "done" && !(stepStatus(id, "verify") === "done" && stepStatus(id, "recheck") === "skipped")) return;
  step(id, "confirm", "waiting");
  ask(
    id,
    {
      key: "usta_confirm",
      prompt: "Harika! Bağlantın yeniden aktif görünüyor. İnternetini tekrar deneyebilirsin.",
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
  const remote = stepStatus(id, "remote") === "done";
  notify(id, "Bağlantı sorununuz giderildi", "Teknisyen beklemeden birlikte çözdük. İnternetiniz kullanıma hazır.");
  complete(id, {
    resolved: true,
    summary: "Harika, sorunu GIGA Teknik ile birlikte çözdük",
    results: [
      remote ? `Dijital onarım: ${String(wf?.data["finding"] ?? "sorun bulundu")} → uzaktan düzeltildi` : `Uygulanan adımlar: ${stepContent(id, 1).title.toLocaleLowerCase("tr-TR")}, modemi yeniden başlatma`,
      "Bağlantı 96 Mbps ile döndü (demo)",
      "Destek kaydı açılmadı, teknisyen ziyareti gerekmedi",
      `Süre: ${wf ? Math.max(1, Math.round((Date.now() - wf.createdAt) / 60000)) : 1} dk`,
    ],
  });
});

/** "Canlı destekle görüşmek istiyorum": hands over with every check so far and opens the live chat. */
export function goLive(id: string) {
  log(id, "customer", "info", "Müşteri canlı destekle görüşmek istedi", "Müşteri tüm adımları tamamlamak zorunda değildir");
  setData(id, { liveRequested: true });
  escalate(id, TEAMS.tech, "Müşteri canlı destekle görüşmek istedi; yapılan kontroller temsilciye aktarıldı");
  openLiveChat(id);
}

/**
 * Re-queues the next automatic step of a session that is stuck because its delayed op
 * was lost (e.g. started while a presenter scenario had paused auto follow-up).
 * Idempotent: does nothing while a decision is open or an op is already queued.
 */
export function resumeUsta(id: string) {
  const wf = getWf(id);
  if (!wf || wf.type !== "ai_usta" || wf.status === "completed" || wf.handoff || wf.decision) return;
  // Only a queued GIGA Teknik job means the session is moving; unrelated jobs must not block it.
  if (W.getState().ops.some((o) => o.workflowId === id && o.op.startsWith("usta."))) return;
  if (stepStatus(id, "report") !== "done") return;
  const s = (k: string) => stepStatus(id, k);
  if (s("repair") === "pending" && (wf.data["channel"] === "app" || s("sms") === "done")) startRepair(id);
  else if (s("repair") === "in_progress") schedule("usta.check", id, 800);
  else if (s("remote") === "in_progress") schedule("usta.remoteDone", id, 800);
  else if (s("verify") === "in_progress") schedule("usta.verify", id, 800);
  else if (s("analysis") === "in_progress") schedule("usta.analyzed", id, 800);
  else if (s("analysis") === "done" && s("step1") === "pending") schedule("usta.step1", id, 800);
  else if (s("step1") === "done" && s("step2") === "pending") schedule("usta.step2", id, 800);
  else if (s("reconnect") === "in_progress") schedule("usta.reconnected", id, 800);
  else if (s("recheck") === "in_progress") schedule("usta.recheck", id, 800);
  else if (s("confirm") === "pending") askConfirm(id);
}

/** Short satisfaction question after a verified fix. Does not reopen the workflow. */
export function rateUsta(id: string, score: 1 | 2 | 3) {
  const wf = getWf(id);
  if (!wf || wf.status !== "completed" || wf.data["rating"]) return;
  setData(id, { rating: score });
  log(id, "customer", "info", `Memnuniyet: ${score === 3 ? "Çok iyi" : score === 2 ? "İdare eder" : "Kötü"}`);
}
