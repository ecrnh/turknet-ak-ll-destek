import { useNavigate } from "@tanstack/react-router";
import { AlertCircle, Camera, Check, Loader2, Video, Wifi } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import modemBack from "@/assets/modem-back.jpg";
import { track } from "@/lib/analytics";
import { useQrHealthStore } from "../qrHealth";
import { ModemSetupGuide } from "./ModemSetupGuide";
import { modemGuide, type ModemId } from "../setupGuide";

type Phase = "detecting" | "detected" | "camera" | "checking" | "solved" | "unsolved";

export type AiMode = "repair" | "setup";

const COPY = {
  repair: {
    detecting: "Modeminle ilgili sorun tespiti yapılıyor…",
    detectingBody: "Lütfen biz bu tespiti yaparken WiFi'ını kapatmadığından emin ol.",
    ring: "Modem bağlantısı ve ağ ayarları kontrol ediliyor.",
    detected: "Sorun tespiti yapıldı",
    detectedBody: "WiFi kablolarının doğru bağlanmadığını fark ettik. Bu işi beraber 2 dakika içerisinde çözebiliriz.",
    cta: "Aşağıdaki kamera simgesine dokunarak WiFi'ını göster ve doğru kabloları doğru porta beraber bağlayalım.",
    checking: "{t0.checking}",
    solved: "Sorun çözüldü",
    solvedBody: "İşlem başarıyla gerçekleştirildi. İnternet bağlantın yeniden hazır.",
    unsolved: "Sorun hâlâ",
    unsolvedTail: "devam ediyor",
    unsolvedBody: "Bağlantını kontrol ettim ama sorunun devam ettiğini görüyorum. Birlikte başka bir yol deneyebiliriz.",
    steps: [
      { title: "Mavi kabloyu WAN portuna tak", body: "Kabloyu mavi porta, “tık” sesini duyana kadar itelemen yeterli." },
      { title: "Güç kablosunu kontrol et", body: "Siyah adaptör kablosunun modemin arkasına tam oturduğundan emin ol." },
    ],
  },
  setup: {
    detecting: "Kurulum için hattın hazırlanıyor…",
    detectingBody: "Hattını ve modem modelini kontrol ediyoruz. Modemi henüz prize takmadıysan sorun değil.",
    ring: "Hat durumu, modem modeli ve kurulum ayarları hazırlanıyor.",
    detected: "Kuruluma hazırsın",
    detectedBody: "Hattın aktif, modemin tanındı. Kurulumu kamerayla birlikte 4 adımda yaklaşık 5 dakikada tamamlayabiliriz.",
    cta: "Aşağıdaki kamera simgesine dokunarak modemini göster, kabloları birlikte doğru yerlere takalım.",
    checking: "Kurulum doğrulanıyor…",
    solved: "Kurulum tamamlandı",
    solvedBody: "Modemin hatta bağlandı ve internetin hazır. Wi-Fi adın ve şifren modemin altındaki etikette.",
    unsolved: "Kurulum",
    unsolvedTail: "tamamlanamadı",
    unsolvedBody: "Modemin hatta bağlanamadı. Adımları birlikte tekrar deneyebilir ya da teknik destekten yardım alabilirsin.",
    steps: [
      { title: "Telefon kablosunu DSL portuna tak", body: "Gri kabloyu duvardaki prizden modemin arkasındaki gri DSL portuna tak." },
      { title: "Adaptörü tak ve modemi aç", body: "Siyah adaptörü prize ve modeme tak, arkadaki güç düğmesine bas." },
      { title: "Işıkları bekle", body: "Power ve DSL ışıkları sabit yeşil yanana kadar 1-2 dakika bekle." },
      { title: "Wi-Fi'a bağlan", body: "Telefonundan modemin altındaki etikette yazan Wi-Fi adına ve şifresine bağlan." },
    ],
  },
} as const;

const Icon = ({ children }: { children: React.ReactNode }) => (
  <span className="flex size-12 items-center justify-center rounded-2xl border border-magenta/15 bg-magenta-soft text-magenta">{children}</span>
);
const Primary = (p: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button type="button" {...p} className="min-h-12 w-full rounded-2xl bg-primary text-sm font-semibold text-primary-foreground active:scale-[0.99]" />
);
const Secondary = (p: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button type="button" {...p} className="min-h-12 w-full rounded-2xl border border-border bg-card text-sm font-semibold text-foreground" />
);

/** Live camera if allowed, otherwise the sample modem photo. */
function CameraView() {
  const ref = useRef<HTMLVideoElement>(null);
  const [live, setLive] = useState(false);
  useEffect(() => {
    let stream: MediaStream | null = null;
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: "environment" } })
      .then((s) => { stream = s; if (ref.current) { ref.current.srcObject = s; setLive(true); } })
      .catch(() => setLive(false));
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, []);
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
      <img src={modemBack} alt="Modemin arkası" className="absolute inset-0 size-full object-cover" />
      <video ref={ref} autoPlay playsInline muted className={live ? "absolute inset-0 size-full object-cover" : "hidden"} />
      <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-primary/80 px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">
        <span className="size-1.5 animate-pulse rounded-full bg-success" /> Kamera açık
      </span>
      <span className="absolute left-[34%] top-[52%] h-[22%] w-[18%] animate-pulse rounded-lg border-2 border-magenta" />
    </div>
  );
}

/** QR "Modemim çalışmıyor": AI detects the issue, guides with the camera, then reports solved / unsolved. */
export function ModemAiRepair({ onDone, onLive, mode = "repair" }: { onDone: () => void; onLive: () => void; mode?: AiMode }) {
  const navigate = useNavigate();
  const t0 = COPY[mode];
  const [modemId, setModemId] = useState<ModemId>("zte");
  const CAMERA_STEPS = mode === "setup" ? modemGuide(modemId).steps : t0.steps;
  const [phase, setPhase] = useState<Phase>("detecting");
  const [pct, setPct] = useState(0);
  const [camStep, setCamStep] = useState(0);

  useEffect(() => {
    if (phase !== "detecting") return;
    setPct(0);
    const t = window.setInterval(() => setPct((p) => {
      if (p >= 100) { window.clearInterval(t); setPhase("detected"); return 100; }
      return p + 4;
    }), 120);
    return () => window.clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "checking") return;
    const t = window.setTimeout(() => {
      const r = useQrHealthStore.getState().repair;
      track("cta_clicked", "qr_self_service", { step: mode === "setup" ? "setup_ai" : "modem_ai", answer: r });
      setPhase(r);
    }, 2200);
    return () => window.clearTimeout(t);
  }, [phase]);

  const confirmStep = () => {
    if (camStep < CAMERA_STEPS.length - 1) return setCamStep((s) => s + 1);
    setPhase("checking");
  };

  if (phase === "detecting") {
    const r = 52, c = 2 * Math.PI * r;
    return (
      <div aria-live="polite">
        <Icon><Wifi className="size-6" /></Icon>
        <h1 className="mt-4 text-2xl font-bold leading-tight">{t0.detecting}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t0.detectingBody}</p>
        <div className="mt-6 flex flex-col items-center rounded-2xl border border-border bg-card shadow-card p-6">
          <svg viewBox="0 0 120 120" className="size-32 -rotate-90">
            <circle cx="60" cy="60" r={r} fill="none" strokeWidth="10" className="stroke-muted" />
            <circle cx="60" cy="60" r={r} fill="none" strokeWidth="10" strokeLinecap="round" className="stroke-magenta transition-all" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} />
          </svg>
          <p className="mt-3 text-sm font-semibold">Tespit devam ediyor · %{pct}</p>
          <p className="mt-1 text-center text-xs text-muted-foreground">{t0.ring}</p>
        </div>
      </div>
    );
  }

  if (phase === "detected") return (
    <div>
      {mode === "setup" && <ModemSetupGuide onModemChange={setModemId} onComplete={onDone} />}
      <Icon><Wifi className="size-6" /></Icon>
      <h1 className="mt-4 text-2xl font-bold leading-tight">{t0.detected}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t0.detectedBody}</p>
      <button type="button" onClick={() => { setCamStep(0); setPhase("camera"); }} className="mt-6 flex w-full flex-col items-center gap-3 rounded-2xl border border-border bg-card shadow-card p-5 text-center">
        <span className="text-sm font-semibold">{t0.cta}</span>
        <span className="flex size-11 items-center justify-center rounded-full bg-magenta-soft text-magenta"><Camera className="size-5" /></span>
      </button>
      <button type="button" onClick={() => { track("cta_clicked", "qr_self_service", { step: mode === "setup" ? "setup_ai" : "modem_ai", answer: "giga_video" }); navigate({ to: "/goruntulu-destek" }); }} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-magenta/25 bg-magenta-soft text-sm font-semibold text-magenta">
        <Video className="size-4" /> GIGA ile görüntülü yardımı başlat
      </button>
    </div>
  );

  if (phase === "camera" || phase === "checking") {
    const s = CAMERA_STEPS[camStep] ?? CAMERA_STEPS[0];
    if (!s) return null;
    return (
      <div className="pb-32">
        <h1 className="text-2xl font-bold leading-tight">Birlikte bağlayalım</h1>
        <p className="mt-2 text-sm text-muted-foreground">Kameranı modemin arkasına tut. Doğru bağlantıyı birlikte bulalım.</p>
        <div className="mt-4 max-h-[38vh] overflow-hidden rounded-3xl"><CameraView /></div>
        <div className="mt-4 rounded-2xl border border-border bg-card shadow-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Adım {camStep + 1} / {CAMERA_STEPS.length}</p>
          <p className="mt-1 text-sm font-semibold">{s.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{s.body}</p>
        </div>
        <div className="mt-4">
          {phase === "checking"
            ? <Primary disabled><span className="inline-flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> {t0.checking}</span></Primary>
            : <Primary onClick={confirmStep}>{camStep < CAMERA_STEPS.length - 1 ? "Taktım, devam et" : "Bağladım, kontrol et"}</Primary>}
          {phase !== "checking" && <div className="mt-2"><Secondary onClick={onLive}>Yapamıyorum, teknik desteğe bağlan</Secondary></div>}
        </div>
      </div>
    );
  }

  if (phase === "solved") return (
    <div>
      <Icon><Check className="size-6" /></Icon>
      <h1 className="mt-4 text-2xl font-bold leading-tight">Süpersin!<br />{t0.solved}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t0.solvedBody}</p>
      <div className="mt-6 rounded-2xl border border-border bg-card shadow-card p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Ödül kazandın</p>
        <p className="mt-2 text-4xl font-bold">+15 puan</p>
        <p className="mt-2 text-xs text-muted-foreground">Bir teknik ekip üyesi gibi sorunu hallettin! Bu yüzden +15 puan senin.</p>
      </div>
      <div className="mt-6 space-y-2">
        <Primary onClick={onDone}>Harika, devam et</Primary>
        <p className="text-center text-xs text-muted-foreground">Bağlantını kullanmaya başla</p>
      </div>
    </div>
  );

  return (
    <div>
      <Icon><AlertCircle className="size-6" /></Icon>
      <h1 className="mt-4 text-2xl font-bold leading-tight">{t0.unsolved}<br />{t0.unsolvedTail}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t0.unsolvedBody}</p>
      <div className="mt-6 rounded-2xl border border-border bg-card shadow-card p-4">
        <p className="text-sm font-semibold">Nasıl devam edelim?</p>
        <p className="mt-1 text-xs text-muted-foreground">Adımları yeniden deneyebilir veya teknik destek ekibinden yardım isteyebilirsin.</p>
      </div>
      <div className="mt-6 space-y-2">
        <Primary onClick={() => { setCamStep(0); setPhase("camera"); }}>Yeniden deneyelim</Primary>
        <Secondary onClick={onLive}>Teknik desteğe bağlan</Secondary>
      </div>
    </div>
  );
}
