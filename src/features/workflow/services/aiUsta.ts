/**
 * AIHelperService: "AI Usta" visual technical support. Image analysis is a
 * clearly-labelled simulation (no real vision model). Every step is safe and
 * reversible; after AI_USTA_MAX_ATTEMPTS it hands over to live support with
 * full context.
 */
import { AI_USTA_STEPS, SUBSCRIPTION, TEAMS } from "@/data/mock";
import { ask, chain, complete, createWorkflow, escalate, getWf, notify, registerDecision, registerOp, schedule, setData, step, stepStatus } from "../engine";
import { MockNetworkAPI, MockVisionAPI } from "../mockServices";
import { AI_USTA_MAX_ATTEMPTS } from "../rules";
import { setConnectivity } from "./connectivity";

export function startAiUsta(): string {
  setConnectivity({ fixed: "down" }, "Modem internet oturumu yok");
  const { wf, created } = createWorkflow({
    type: "ai_usta",
    title: "AI Usta · İnternetim çalışmıyor",
    dedupeKey: `usta:${SUBSCRIPTION.id}`,
    steps: [
      { key: "report", label: "Sorun bildirimi" },
      { key: "context", label: "Bağlantı ve arıza kaydı kontrolü" },
      { key: "photo", label: "Modem fotoğrafı" },
      { key: "analysis", label: "Görsel analiz (simülasyon)" },
      { key: "step1", label: `Adım 1: ${AI_USTA_STEPS[0]!.title}` },
      { key: "recheck1", label: "Yeniden kontrol 1" },
      { key: "step2", label: `Adım 2: ${AI_USTA_STEPS[1]!.title}` },
      { key: "recheck2", label: "Yeniden kontrol 2" },
      { key: "confirm", label: "Müşteri çözüm doğrulaması" },
    ],
    why: "Müşteri “İnternetim çalışmıyor” dedi",
  });
  if (!created) return wf.id;
  step(wf.id, "report", "done", "“İnternetim çalışmıyor”");
  chain("usta.context", wf.id, 1200);
  return wf.id;
}

export function ustaContext(id: string) {
  if (stepStatus(id, "context") !== "pending") return;
  step(id, "context", "done", "Bölgesel arıza yok · açık arıza kaydı yok · modem OLT'de görünüyor, internet oturumu yok (demo)", "Bölgesel arıza olsaydı müşteriye adım yaptırılmazdı");
  chain("usta.photo", id, 1200);
}
registerOp("usta.context", ustaContext);

export function requestPhoto(id: string) {
  if (stepStatus(id, "photo") !== "pending") return;
  step(id, "photo", "waiting");
  ask(
    id,
    {
      key: "usta_photo",
      prompt: "Modeminin ön yüzündeki ışıkların fotoğrafını çeker misin?",
      detail: "Fotoğraf yalnızca bu destek için kullanılır. Görsel analiz bu prototipte simülasyondur.",
      options: [
        { id: "uploaded", label: "Fotoğraf yükledim" },
        { id: "demo_photo", label: "Örnek fotoğrafı kullan", primary: true },
      ],
    },
    "Işık durumları, müşteriye teknik soru sormadan sorunu daraltmayı sağlar",
  );
}
registerOp("usta.photo", requestPhoto);

registerDecision("usta_photo", (id, opt) => {
  step(id, "photo", "done", opt === "uploaded" ? "Müşteri fotoğraf yükledi" : "Örnek modem fotoğrafı kullanıldı");
  step(id, "analysis", "in_progress", MockVisionAPI.name);
  schedule("usta.analyzed", id, 1600);
});

registerOp("usta.analyzed", (id) => {
  const leds = MockVisionAPI.analyzeModemPhoto();
  setData(id, { leds: leds.map((l) => `${l.name}:${l.ok ? "1" : "0"}:${l.state}`).join("|") });
  step(id, "analysis", "done", `${leds.map((l) => `${l.name} ${l.ok ? "✓" : "✕"}`).join(" · ")} → fiber sinyali var, internet oturumu açılamıyor olabilir (kesin teşhis değil)`);
  chain("usta.step1", id, 1200);
});

export function giveStep(id: string, n: 1 | 2) {
  if (stepStatus(id, `step${n}`) !== "pending") return;
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
        { id: "cant", label: "Yapamadım / emin değilim" },
      ],
    },
    "Bir sonraki en güvenli ve geri alınabilir kontrol adımı",
  );
}
registerOp("usta.step1", (id) => giveStep(id, 1));
registerOp("usta.step2", (id) => giveStep(id, 2));

const onStep = (n: 1 | 2) => (id: string, opt: string) => {
  if (opt === "cant") {
    step(id, `step${n}`, "failed", "Müşteri adımı uygulayamadı");
    escalate(id, TEAMS.tech, "Müşteri güvenli adımı uygulayamadı; uzman yönlendirmesi gerekiyor");
    return;
  }
  step(id, `step${n}`, "done", "Müşteri uyguladığını bildirdi");
  step(id, `recheck${n}`, "in_progress", "Hat ve modem oturumu yeniden sorgulanıyor");
  schedule(`usta.recheck${n}`, id, 1500);
};
registerDecision("usta_step1", onStep(1));
registerDecision("usta_step2", onStep(2));

const onRecheck = (n: 1 | 2) => (id: string) => {
  const ok = n === 1 && MockNetworkAPI.connectionAfterSelfFix();
  if (ok) {
    step(id, `recheck${n}`, "done", "Bağlantı geri geldi · 96 Mbps (demo ölçüm)");
    setConnectivity({ fixed: "up" }, "Modem oturumu açıldı");
    if (n === 1) {
      step(id, "step2", "skipped", "Gerek kalmadı");
      step(id, "recheck2", "skipped", "Gerek kalmadı");
    }
    chain("usta.confirm", id, 1000);
    return;
  }
  step(id, `recheck${n}`, "failed", "Bağlantı hâlâ yok");
  if (n < AI_USTA_MAX_ATTEMPTS) {
    notify(id, "Henüz düzelmedi", "Sorun değil, bir sonraki güvenli adıma geçiyoruz.");
    chain("usta.step2", id, 1200);
  } else {
    escalate(id, TEAMS.tech, `${AI_USTA_MAX_ATTEMPTS} güvenli adım denendi, bağlantı gelmedi; uzman incelemesi gerekiyor`);
  }
};
registerOp("usta.recheck1", onRecheck(1));
registerOp("usta.recheck2", onRecheck(2));

export function askConfirm(id: string) {
  if (stepStatus(id, "confirm") !== "pending") return;
  step(id, "confirm", "waiting");
  ask(
    id,
    {
      key: "usta_confirm",
      prompt: "İnternetin şu an çalışıyor mu?",
      detail: "Bir web sayfası açarak dener misin? Sorun çözüldü sayılması için senin onayın gerekiyor.",
      options: [
        { id: "yes", label: "Evet, çalışıyor", primary: true },
        { id: "no", label: "Hayır, hâlâ sorun var" },
      ],
    },
    "Sistem ölçümü tek başına yeterli değildir; çözümü müşteri doğrular",
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
  notify(id, "Harika, sorunu birlikte çözdük", "Teknisyen beklemeden çözdün. Doğrulanmış self-servis çözüm rozetin hesabına eklendi (örnek gösterim).");
  complete(id, {
    resolved: true,
    summary: "AI Usta ile self-servis çözüldü, müşteri doğruladı",
    results: [`Uygulanan adım: ${AI_USTA_STEPS[0]!.title}`, "Bağlantı 96 Mbps ile döndü (demo)", "Saha ziyareti gerekmedi", `Süre: ${wf ? Math.max(1, Math.round((Date.now() - wf.createdAt) / 60000)) : 1} dk`],
  });
});
