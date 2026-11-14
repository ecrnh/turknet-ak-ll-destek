import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Cable, Camera, CameraOff, Check, CheckCircle2, Gauge, Home, Loader2, Power, RefreshCw, ShieldCheck, Sparkles, Star, Ticket, Unplug, Wifi, WifiOff, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/headers";
import { AppLink, Banner, Card, StatRow } from "@/components/tn/primitives";
import { Button } from "@/components/ui/button";
import { USER } from "@/data/mock";
import { useCamera } from "@/features/videoSupport/useCamera";
import { fmtDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useEvimStore } from "../store";
import { afterCheck, afterDiagnosis, afterVerify, ANALYSIS, defaultProblem, retryStep, SOLVE_POINTS, STAGES, stageOf, type RepairProblem, type RepairSource, type RepairStep } from "../selfRepair";

const GUIDE = [
  { icon: Unplug, title: "Kabloyu çıkar", text: "Modemin arkasındaki sarı LAN / Wi-Fi kablosunu yuvasından nazikçe çıkar." },
  { icon: Cable, title: "Doğru yuvaya tak", text: "Kabloyu 'LAN 1' yazan yuvaya, klik sesi gelene kadar tak." },
  { icon: Power, title: "Güç kablosunu kontrol et", text: "Adaptörün hem prize hem modeme tam oturduğundan emin ol." },
  { icon: Wifi, title: "Işıkları kontrol et", text: "Power ve Internet ışıkları sabit yeşil yanmalı. Yaklaşık 30 saniye bekle." },
];

export function SelfRepairScreen({ source }: { source: RepairSource }) {
  const navigate = useNavigate();
  const openTicket = useEvimStore((s) => s.openTicket);
  const ticket = useEvimStore((s) => s.ticket);
  const [step, setStep] = useState<RepairStep>("verify");
  const [history, setHistory] = useState<RepairStep[]>([]);
  const [problem, setProblem] = useState<RepairProblem | null>(defaultProblem(source));
  const [tries, setTries] = useState(0);

  const go = (s: RepairStep) => { setHistory((h) => [...h, step]); setStep(s); };
  const back = () => {
    const prev = history.filter((h) => h !== "verify" && h !== "analyze").at(-1);
    if (!prev || step === "ticketDone" || step === "solved") {
      void navigate({ to: "/" });
      return;
    }
    setHistory((h) => h.slice(0, h.lastIndexOf(prev)));
    setStep(prev);
  };
  const p = problem ?? "slow";
  const a = ANALYSIS[p];

  return (
    <div className="pb-8">
      <PageHeader
        title="Self Servis Onarım"
        right={<AppLink to="/" aria-label="Ana sayfaya dön" className="mr-1 flex h-10 w-10 items-center justify-center rounded-full text-primary"><Home className="size-5" /></AppLink>}
      />
      <div className="space-y-4 px-4">
        <Stepper current={stageOf(step)} />
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }} className="space-y-4">
            {step === "verify" && <Verify source={source} onDone={() => go(afterVerify(source))} />}

            {step === "choose" && (
              <>
                <Title kicker="Adım 2" title="Hangi sorunu çözmek istiyorsun?" text="Seçimine göre seni doğru onarım adımlarına götüreceğiz." />
                {([
                  { id: "slow", icon: Gauge, label: "İnternet hızım yavaş", desc: "Sayfalar geç açılıyor, video donuyor" },
                  { id: "down", icon: WifiOff, label: "İnternet bağlantım yok", desc: "Hiçbir cihaz internete bağlanamıyor" },
                ] as const).map((o) => (
                  <button key={o.id} type="button" onClick={() => { setProblem(o.id); go("analyze"); }} className="flex w-full items-center gap-4 rounded-card bg-card p-4 text-left shadow-card transition active:scale-[0.98]">
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-magenta-soft text-magenta"><o.icon className="size-7" /></span>
                    <span className="flex-1"><span className="block font-semibold text-primary">{o.label}</span><span className="block text-xs text-muted-foreground">{o.desc}</span></span>
                  </button>
                ))}
              </>
            )}

            {step === "analyze" && <Analyze checks={a.checks} onDone={() => go("diagnosis")} />}

            {step === "diagnosis" && (
              <>
                <Card className="text-center">
                  <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-warning-soft text-warning"><Wrench className="size-8" /></span>
                  <p className="mt-3 text-lg font-semibold text-primary">Sorun tespiti yapıldı</p>
                  <p className="mt-1 text-sm text-foreground">{a.finding}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{a.detail}</p>
                  <p className="mt-3 font-semibold text-magenta">{a.solution}</p>
                </Card>
                {p === "slow" ? (
                  <Button size="xl" variant="magenta" className="w-full rounded-full" onClick={() => go(afterDiagnosis(p))}><Camera /> Görsel desteğe geç</Button>
                ) : (
                  <RemoteRestart onDone={() => go(afterDiagnosis(p))} />
                )}
              </>
            )}

            {step === "camera" && <CameraStep onNext={() => go("guide")} />}

            {step === "guide" && <Guide onDone={() => go("check")} />}

            {step === "check" && (
              <>
                <Card className="text-center">
                  <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-icon-box text-primary"><Wifi className="size-8" /></span>
                  <p className="mt-3 text-lg font-semibold text-primary">{p === "slow" ? "İnternetin şimdi hızlı mı?" : "İnternetin geri geldi mi?"}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Bir sayfa açarak ya da video izleyerek dene.</p>
                </Card>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="lg" onClick={() => { setTries((t) => t + 1); go(afterCheck(false)); }}>Hayır, değil</Button>
                  <Button variant="success" size="lg" onClick={() => go(afterCheck(true))}>Evet, düzeldi</Button>
                </div>
              </>
            )}

            {step === "solved" && (
              <div className="pt-4 text-center">
                <motion.span initial={{ scale: 0.4, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring" }} className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-success-soft text-success"><CheckCircle2 className="size-12" /></motion.span>
                <p className="mt-4 text-2xl font-semibold text-primary">Süpersin! İşlem başarıyla gerçekleştirildi.</p>
                <p className="mt-2 text-sm text-muted-foreground">Bir teknik ekip üyesi gibi sorunu hallettin.</p>
                <motion.p initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full bg-magenta-soft px-5 py-2.5 text-lg font-bold text-magenta">
                  <Star className="size-5 fill-current" /> +{SOLVE_POINTS} puan senin
                </motion.p>
                <Button size="xl" className="mt-6 w-full rounded-full" onClick={() => navigate({ to: "/" })}><Home /> Ana sayfaya dön</Button>
              </div>
            )}

            {step === "unsolved" && (
              <>
                <Card className="text-center">
                  <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-warning-soft text-warning"><RefreshCw className="size-8" /></span>
                  <p className="mt-3 text-lg font-semibold text-primary">Hâlâ sorunun devam ettiğini görüyorum.</p>
                  <p className="mt-1 text-sm text-muted-foreground">Adımları bir kez daha deneyebilir ya da teknik ekibimize bağlanabilirsin.</p>
                </Card>
                <Button size="xl" variant="magenta" className="w-full rounded-full" onClick={() => go(retryStep(p))}><RefreshCw /> Yeniden deneyelim</Button>
                <Button size="xl" variant="outline" className="w-full rounded-full" onClick={() => go("ticket")}><Ticket /> Teknik desteğe bağlan</Button>
              </>
            )}

            {step === "ticket" && (
              <>
                <Title kicker="Destek kaydı" title="Talebini onayla" text="Bu özet teknik ekibe iletilecek; sorunu tekrar anlatman gerekmez." />
                <Card>
                  <StatRow label="Abone no" value={USER.subscriberNo} />
                  <StatRow label="Modem" value={USER.modemModel} />
                  <StatRow label="Sorun" value={p === "slow" ? "İnternet hızı yavaş" : "İnternet bağlantısı yok"} />
                  <StatRow label="Tespit" value={p === "slow" ? "Kablo bağlantısı" : "Modem oturumu"} />
                  <StatRow label="Denenen" value={p === "slow" ? `Görsel kablo rehberi · ${tries} deneme` : `Uzaktan yeniden başlatma · ${tries} deneme`} />
                </Card>
                <Button size="xl" variant="magenta" className="w-full rounded-full" onClick={() => { openTicket(`Self servis onarım sonrası sorun devam ediyor: ${p === "slow" ? "yavaş internet" : "bağlantı yok"}`); go("ticketDone"); }}><Check /> Destek talebini onayla</Button>
              </>
            )}

            {step === "ticketDone" && ticket && (
              <>
                <div className="pt-4 text-center">
                  <motion.span initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success-soft text-success"><Ticket className="size-10" /></motion.span>
                  <p className="mt-3 text-xl font-semibold text-primary">Destek kaydın oluşturuldu</p>
                  <p className="mt-1 text-sm text-muted-foreground">Teknik ekibimiz seninle iletişime geçecek.</p>
                </div>
                <Card>
                  <StatRow label="Kayıt no" value={ticket.id} />
                  <StatRow label="Durum" value={<span className="text-warning">Açık · inceleniyor</span>} />
                  <StatRow label="Oluşturma" value={fmtDateTime(ticket.createdAt)} />
                  <StatRow label="Tahmini dönüş" value="4 saat içinde" />
                </Card>
                <Button size="xl" className="w-full rounded-full" onClick={() => navigate({ to: "/" })}><Home /> Ana sayfaya dön</Button>
              </>
            )}
          </motion.div>
        </AnimatePresence>
        {step !== "verify" && step !== "analyze" && step !== "solved" && step !== "ticketDone" && (
          <Button variant="ghost" className="w-full" onClick={back}><ArrowLeft /> Geri</Button>
        )}
      </div>
    </div>
  );
}

function Stepper({ current }: { current: number }) {
  return (
    <div>
      <div className="flex gap-1.5">{STAGES.map((_, k) => <span key={k} className={cn("h-1.5 flex-1 rounded-full transition-colors", k <= current ? "bg-magenta" : "bg-muted")} />)}</div>
      <p className="mt-1.5 text-xs font-semibold text-magenta">Adım {current + 1} / {STAGES.length} · {STAGES[current]}</p>
    </div>
  );
}

function Title({ kicker, title, text }: { kicker: string; title: string; text: string }) {
  return (
    <div className="px-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-magenta">{kicker}</p>
      <p className="text-xl font-semibold text-primary">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function useTicker(count: number, ms: number, onDone: () => void) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (n >= count) { const t = window.setTimeout(onDone, 600); return () => window.clearTimeout(t); }
    const t = window.setTimeout(() => setN(n + 1), ms);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);
  return n;
}

function Verify({ source, onDone }: { source: RepairSource; onDone: () => void }) {
  const rows = ["QR kod okundu", "Kimliğin doğrulandı", "Abonelik bulundu", "Onarım yetkin kontrol edildi"];
  const n = useTicker(rows.length, 550, onDone);
  return (
    <Card>
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-icon-box text-primary"><ShieldCheck className="size-6" /></span>
        <div><p className="font-semibold text-primary">Seni tanıyoruz</p><p className="text-xs text-muted-foreground">{source === "kisisel" ? `Modem ${USER.modemSerial}` : "Genel TürkNet QR kodu"}</p></div>
      </div>
      <div className="mt-4 space-y-2">
        {rows.map((r, i) => (
          <p key={r} className={cn("flex items-center gap-2 rounded-2xl border border-border px-3 py-2 text-sm", i < n && "border-success/30 bg-success-soft")}>
            {i < n ? <Check className="size-4 text-success" /> : i === n ? <Loader2 className="size-4 animate-spin text-magenta" /> : <span className="size-4" />}{r}
          </p>
        ))}
      </div>
    </Card>
  );
}

function Analyze({ checks, onDone }: { checks: string[]; onDone: () => void }) {
  const n = useTicker(checks.length, 900, onDone);
  const pct = Math.round((n / checks.length) * 100);
  return (
    <>
      <Title kicker="Dijital onarım" title="Bağlantını analiz ediyoruz" text="Bu birkaç saniye sürer, hiçbir şey yapmana gerek yok." />
      <Card className="flex flex-col items-center">
        <div className="relative flex h-36 w-36 items-center justify-center">
          <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
            <circle cx="50" cy="50" r="44" className="fill-none stroke-muted" strokeWidth="8" />
            <circle cx="50" cy="50" r="44" className="fill-none stroke-magenta transition-all duration-700" strokeWidth="8" strokeLinecap="round" strokeDasharray={276} strokeDashoffset={276 - (276 * pct) / 100} />
          </svg>
          <motion.span animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 1.4 }} className="text-3xl font-bold text-primary">%{pct}</motion.span>
        </div>
        <div className="mt-4 w-full space-y-2">
          {checks.map((c, i) => (
            <p key={c} className="flex items-center gap-2 text-sm">
              {i < n ? <CheckCircle2 className="size-4 text-success" /> : i === n ? <Loader2 className="size-4 animate-spin text-magenta" /> : <span className="size-4 rounded-full border border-border" />}
              <span className={cn(i > n && "text-muted-foreground")}>{c}</span>
            </p>
          ))}
        </div>
      </Card>
    </>
  );
}

function RemoteRestart({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  return busy ? (
    <Banner tone="info" title="Modem yeniden başlatılıyor…">Yaklaşık 1 dakika sürer, bu sırada internet kesilir.</Banner>
  ) : (
    <Button size="xl" variant="magenta" className="w-full rounded-full" onClick={() => { setBusy(true); window.setTimeout(onDone, 2200); }}><Power /> Modemi uzaktan yeniden başlat</Button>
  );
}

function CameraStep({ onNext }: { onNext: () => void }) {
  const cam = useCamera(false);
  const [simulated, setSimulated] = useState(false);
  const open = cam.status === "live" || simulated;
  useEffect(() => {
    if (cam.status === "denied" || cam.status === "unavailable") setSimulated(true);
  }, [cam.status]);
  useEffect(() => cam.stop, [cam.stop]);

  if (!open)
    return (
      <>
        <Card className="text-center">
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-magenta-soft text-magenta"><Camera className="size-10" /></span>
          <p className="mt-3 text-lg font-semibold text-primary">Görsel teknik destek</p>
          <p className="mt-1 text-sm text-muted-foreground">Kameranı modemine ve arkasındaki kablolara tut. Ekrandaki rehberle bağlantıları birlikte düzelteceğiz.</p>
        </Card>
        <Button size="xl" variant="magenta" className="w-full rounded-full" disabled={cam.status === "pending"} onClick={() => cam.start("environment")}>
          {cam.status === "pending" ? <Loader2 className="animate-spin" /> : <Camera />} Kamerayı başlat
        </Button>
      </>
    );

  return (
    <>
      <div className="relative aspect-[3/4] overflow-hidden rounded-card bg-primary">
        {cam.status === "live" ? (
          <video ref={cam.videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-primary-foreground/80">
            <CameraOff className="size-10" />
            <p className="px-8 text-center text-sm">Kamera açılamadı. Demo için rehber görünümü gösteriliyor.</p>
          </div>
        )}
        <div className="pointer-events-none absolute inset-8 rounded-3xl border-2 border-dashed border-primary-foreground/80" />
        <motion.div animate={{ y: ["0%", "2400%", "0%"] }} transition={{ repeat: Infinity, duration: 3, ease: "linear" }} className="pointer-events-none absolute inset-x-8 top-8 h-1 rounded-full bg-magenta shadow-[0_0_16px_var(--magenta)]" />
        <p className="absolute inset-x-0 bottom-4 mx-auto w-fit rounded-full bg-card/90 px-4 py-2 text-xs font-semibold text-primary">Modemin arka yüzünü çerçeveye al</p>
      </div>
      <p className="text-center text-xs text-muted-foreground">Görüntü yalnızca sana rehberlik için gösterilir; otomatik analiz yapılmaz.</p>
      <Button size="xl" variant="magenta" className="w-full rounded-full" onClick={() => { cam.stop(); onNext(); }}><Sparkles /> Kabloları gördüm, rehbere geç</Button>
    </>
  );
}

function Guide({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const g = GUIDE[i]!;
  return (
    <>
      <Title kicker={`Wi-Fi gezgini · ${i + 1} / ${GUIDE.length}`} title={g.title} text="Her adımı yaptıktan sonra devam et." />
      <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
        <Card className="flex flex-col items-center text-center">
          <div className="relative flex h-40 w-full items-center justify-center rounded-2xl bg-icon-box">
            <div className="flex h-20 w-48 items-end justify-around rounded-xl bg-card px-3 pb-3 shadow-card">
              {["PWR", "WAN", "LAN 1", "LAN 2"].map((port, k) => (
                <span key={port} className="flex flex-col items-center gap-1">
                  <span className={cn("h-5 w-6 rounded-sm border-2", (i === 1 && k === 2) || (i === 2 && k === 0) || (i === 0 && k === 2) ? "border-magenta bg-magenta-soft" : "border-border")} />
                  <span className="text-[9px] font-bold text-muted-foreground">{port}</span>
                </span>
              ))}
            </div>
            <motion.span animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.2 }} className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-magenta text-magenta-foreground"><g.icon className="size-5" /></motion.span>
          </div>
          <p className="mt-4 text-sm text-foreground">{g.text}</p>
        </Card>
      </motion.div>
      <div className="flex gap-1.5">{GUIDE.map((_, k) => <span key={k} className={cn("h-1 flex-1 rounded-full", k <= i ? "bg-primary" : "bg-muted")} />)}</div>
      <Button size="xl" variant="magenta" className="w-full rounded-full" onClick={() => (i < GUIDE.length - 1 ? setI(i + 1) : onDone())}>
        <Check /> {i < GUIDE.length - 1 ? "Yaptım, devam et" : "Tamamladım, kontrol et"}
      </Button>
    </>
  );
}
