/**
 * AIHelperService: "AI Usta" visual technical support, reachable from the app
 * or from the call centre (voice triage → simulated SMS → app, no re-telling).
 * Image analysis is a clearly-labelled simulation (no real vision model) and no
 * real SMS is sent. Every step is safe and reversible; after AI_USTA_MAX_ATTEMPTS
 * it hands over to live support with full context.
 */
import { AI_USTA_STEPS, CUSTOMER, SUBSCRIPTION, TEAMS } from "@/data/mock";
import { uid } from "@/lib/format";
import { ask, chain, complete, createWorkflow, escalate, getWf, log, notify, registerDecision, registerOp, schedule, setData, step, stepStatus } from "../engine";
import { MockNetworkAPI, MockVisionAPI } from "../mockServices";
import { AI_USTA_MAX_ATTEMPTS } from "../rules";
import { useWorkflowStore as W } from "../store";
import { setConnectivity } from "./connectivity";

const USTA_STEPS = [
  { key: "context", label: "Bağlantı ve arıza kaydı kontrolü" },
  { key: "photo", label: "Modem ışıklarının fotoğrafı" },
  { key: "analysis", label: "Görsel analiz (simülasyon)" },
  { key: "step1", label: `Adım 1: ${AI_USTA_STEPS[0]!.title}` },
  { key: "recheck1", label: "Bağlantı yeniden kontrol edildi" },
  { key: "step2", label: `Adım 2: ${AI_USTA_STEPS[1]!.title}` },
  { key: "recheck2", label: "Bağlantı yeniden kontrol edildi" },
  { key: "confirm", label: "Çözümü siz doğruladınız" },
];

/** In-app start: "İnternetim çalışmıyor". */
export function startAiUsta(): string {
  setConnectivity({ fixed: "down" }, "Modem internet oturumu yok");
  const { wf, created } = createWorkflow({
    type: "ai_usta",
    title: "AI Usta · İnternetim çalışmıyor",
    dedupeKey: `usta:${SUBSCRIPTION.id}`,
    steps: [{ key: "report", label: "Sorun bildirimi" }, ...USTA_STEPS],
    data: { channel: "app" },
    why: "Müşteri “İnternetim çalışmıyor” dedi",
  });
  if (!created) return wf.id;
  step(wf.id, "report", "done", "“İnternetim çalışmıyor”");
  chain("usta.context", wf.id, 1200);
  return wf.id;
}

/* ---------------- Sesli triyaj (IVR) → SMS → AI Usta ---------------- */
export function startUstaCall(): string {
  setConnectivity({ fixed: "down" }, "Modem internet oturumu yok");
  const { wf, created } = createWorkflow({
    type: "ai_usta",
    title: "AI Usta · Çağrı merkezinden",
    dedupeKey: `usta:${SUBSCRIPTION.id}`,
    steps: [
      { key: "call", label: "Çağrı merkezi sizi tanıdı" },
      { key: "report", label: "Sorununuzu sesli anlattınız" },
      { key: "ivr_check", label: "Sesli asistan ilk kontrolleri yaptı" },
      { key: "sms", label: "AI Usta bağlantısı SMS ile gönderildi" },
      ...USTA_STEPS,
    ],
    data: { channel: "ivr", phone: CUSTOMER.phone },
    why: "Müşteri çağrı merkezini aradı",
  });
  if (!created) return wf.id;
  step(wf.id, "call", "done", `${CUSTOMER.phone} numarasından abonelik ${SUBSCRIPTION.id} tanındı (demo)`, "Telefon numarası ve abonelik eşleşti; müşteriye kimlik bilgisi sorulmadı");
  step(wf.id, "report", "done", "Sesli anlatım: “İnternetim çalışmıyor” (demo konuşma metni)");
  chain("usta.ivrCheck", wf.id, 1400);
  return wf.id;
}

export function ivrCheck(id: string) {
  if (stepStatus(id, "ivr_check") !== "pending") return;
  step(id, "ivr_check", "done", "Bölgesel arıza yok · modemde internet oturumu yok · telefonda çözülemedi (demo)", "Telefonda çözülemeyen modem sorunları için görsel destek önerilir");
  step(id, "sms", "waiting");
  ask(
    id,
    {
      key: "usta_ivr",
      prompt: "Modeminizi görüntülü kontrol etmek için AI Usta bağlantısını SMS ile gönderelim mi?",
      detail: "Sesli yanıt: “SMS için 1'e, müşteri temsilcisi için 2'ye basın.”",
      options: [
        { id: "sms", label: "1 · SMS gönder", primary: true },
        { id: "agent", label: "2 · Temsilciye bağlan" },
      ],
    },
    "Görsel destek, saha ziyareti gerektirmeden çözüm şansı sunar",
    { push: false },
  );
}
registerOp("usta.ivrCheck", ivrCheck);

registerDecision("usta_ivr", (id, opt) => {
  if (opt === "agent") {
    step(id, "sms", "skipped", "Müşteri temsilciye bağlanmayı seçti");
    escalate(id, TEAMS.tech, "Müşteri sesli yanıtta temsilciye bağlanmayı seçti");
    return;
  }
  const link = `turk.net/u/${id}`;
  W.setState((s) => ({
    sms: [...s.sms.filter((m) => m.workflowId !== id), { id: `SMS-${uid().slice(0, 5).toUpperCase()}`, workflowId: id, body: "TürkNet: Modeminizi AI Usta ile birlikte kontrol edelim. Sorununuzu tekrar anlatmanıza gerek yok.", link, at: Date.now(), opened: false }],
  }));
  step(id, "sms", "waiting", "SMS gönderildi, açılması bekleniyor (demo · gerçek SMS gönderilmedi)");
  log(id, "system", "external", `SMS gönderildi: ${link} (simülasyon)`, "Uygulama yüklüyse bağlantı doğrudan AI Usta'yı açar, değilse indirme sayfasına gider");
});

/** Customer taps "AI Usta'yı Aç" in the SMS. Context from the call carries over. */
export function openUstaSms(id: string): boolean {
  if (stepStatus(id, "sms") !== "waiting" || getWf(id)?.decision) return false;
  W.setState((s) => ({ sms: s.sms.map((m) => (m.workflowId === id ? { ...m, opened: true } : m)) }));
  step(id, "sms", "done", "SMS bağlantısıyla uygulama açıldı");
  step(id, "context", "done", "Çağrıdaki kontroller devralındı; sorun müşteriye tekrar sorulmadı", "Kanal değişse de bağlam korunur");
  chain("usta.photo", id, 1000);
  return true;
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
      prompt: "Modeminizdeki ışıkları birlikte kontrol edelim",
      detail: "Önce internet ışığının durumunu görmem gerekiyor. Modeminizin ön yüzünün fotoğrafını çekin veya örnek fotoğrafı kullanın.",
      options: [
        { id: "uploaded", label: "Fotoğraf yükledim" },
        { id: "demo_photo", label: "Örnek Fotoğrafı Kullan", primary: true },
      ],
    },
    "Işık durumları, müşteriye teknik soru sormadan sorunu daraltmayı sağlar",
    { push: false },
  );
}
registerOp("usta.photo", requestPhoto);

registerDecision("usta_photo", (id, opt) => {
  step(id, "photo", "done", opt === "uploaded" ? "Müşteri modem fotoğrafı yükledi" : "Örnek modem fotoğrafı kullanıldı");
  step(id, "analysis", "in_progress", MockVisionAPI.name);
  schedule("usta.analyzed", id, 1600);
});

registerOp("usta.analyzed", (id) => {
  const leds = MockVisionAPI.analyzeModemPhoto();
  setData(id, { leds: leds.map((l) => `${l.name}:${l.ok ? "1" : "0"}:${l.state}`).join("|") });
  step(id, "analysis", "done", `${leds.map((l) => `${l.name} ${l.ok ? "✓" : "✕"}`).join(" · ")} → internet göstergesinde anormal durum (simülasyon, kesin teşhis değil)`);
  chain("usta.step1", id, 1200);
});

export function giveStep(id: string, n: 1 | 2) {
  if (stepStatus(id, `step${n}`) !== "pending" || stepStatus(id, "analysis") !== "done") return;
  const s = AI_USTA_STEPS[n - 1]!;
  step(id, `step${n}`, "waiting");
  ask(
    id,
    {
      key: `usta_step${n}`,
      prompt: s.title,
      detail: `${s.text} ${s.safe}`,
      options: [
        { id: "done", label: "Uyguladım", primary: true },
        { id: "persist", label: "Sorun devam ediyor" },
      ],
    },
    "Bir sonraki en güvenli ve geri alınabilir kontrol adımı",
    { push: false },
  );
}
registerOp("usta.step1", (id) => giveStep(id, 1));
registerOp("usta.step2", (id) => giveStep(id, 2));

const onStep = (n: 1 | 2) => (id: string, opt: string) => {
  step(id, `step${n}`, "done", opt === "persist" ? "Uygulandı · müşteri sorunun sürdüğünü bildirdi" : "Müşteri uyguladığını bildirdi");
  setData(id, { [`said${n}`]: opt });
  step(id, `recheck${n}`, "in_progress", "Hat ve modem oturumu yeniden sorgulanıyor");
  schedule(`usta.recheck${n}`, id, 1500);
};
registerDecision("usta_step1", onStep(1));
registerDecision("usta_step2", onStep(2));

const onRecheck = (n: 1 | 2) => (id: string) => {
  const ok = n === 1 && MockNetworkAPI.connectionAfterSelfFix();
  if (ok) {
    step(id, `recheck${n}`, "done", "Bağlantı geri geldi · 96 Mbps (demo ölçüm)");
    setConnectivity({ fixed: "up", metric: { optic: -19.2, drops: 0, speed: 96 } }, "Modem oturumu açıldı");
    if (n === 1) {
      step(id, "step2", "skipped", "Gerek kalmadı");
      step(id, "recheck2", "skipped", "Gerek kalmadı");
    }
    chain("usta.confirm", id, 1000);
    return;
  }
  step(id, `recheck${n}`, "failed", "Bağlantı hâlâ yok");
  if (n < AI_USTA_MAX_ATTEMPTS) {
    notify(id, "Henüz düzelmedi", "Sorun değil, bir sonraki güvenli adıma geçiyoruz.", "quiet");
    chain("usta.step2", id, 1200);
  } else {
    escalate(id, TEAMS.tech, `${AI_USTA_MAX_ATTEMPTS} güvenli adım denendi, bağlantı gelmedi; uzman incelemesi gerekiyor`);
  }
};
registerOp("usta.recheck1", onRecheck(1));
registerOp("usta.recheck2", onRecheck(2));

export function askConfirm(id: string) {
  if (stepStatus(id, "confirm") !== "pending" || stepStatus(id, "recheck1") !== "done") return;
  step(id, "confirm", "waiting");
  ask(
    id,
    {
      key: "usta_confirm",
      prompt: "İnternetiniz şu an çalışıyor mu?",
      detail: "Bir web sayfası açarak deneyebilirsiniz. Sorunun çözüldü sayılması için sizin onayınız gerekiyor.",
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
  notify(id, "Sorununuz çözüldü", "Teknisyen beklemeden birlikte çözdük. İnternetiniz kullanıma hazır.");
  complete(id, {
    resolved: true,
    summary: "AI Usta ile sorun çözüldü, siz doğruladınız",
    results: [`Uygulanan adım: ${AI_USTA_STEPS[0]!.title}`, "Bağlantı 96 Mbps ile döndü (demo)", "Teknisyen ziyareti gerekmedi", `Süre: ${wf ? Math.max(1, Math.round((Date.now() - wf.createdAt) / 60000)) : 1} dk`],
  });
});

/** Short satisfaction question after a verified fix. Does not reopen the workflow. */
export function rateUsta(id: string, score: 1 | 2 | 3) {
  const wf = getWf(id);
  if (!wf || wf.status !== "completed" || wf.data["rating"]) return;
  setData(id, { rating: score });
  log(id, "customer", "info", `Memnuniyet: ${score === 3 ? "Çok iyi" : score === 2 ? "İdare eder" : "Kötü"}`);
}
