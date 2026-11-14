import { useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Bot, Cable, CheckCircle2, Gauge, Home, Lightbulb, Loader2, Power, Receipt, Ticket, Wifi } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppLink, Banner, Card, StatRow } from "@/components/tn/primitives";
import { Button } from "@/components/ui/button";
import { USER } from "@/data/mock";
import { fmtDateTime } from "@/lib/format";
import { EvimHeader, RequirePerm, useEvim } from "../components";
import { useEvimStore } from "../store";

type Step = { icon: typeof Power; title: string; lines: string[]; action?: { label: string; busy: string; done: string } };

const STEPS: Step[] = [
  { icon: Lightbulb, title: "Modem ışıklarını kontrol et", lines: ["Power ışığı sabit yeşil olmalı.", "PON ışığı yanıp sönüyorsa fiber hattında sorun olabilir.", "Internet ışığı kapalıysa bir sonraki adıma geç."] },
  { icon: Power, title: "Modemi yeniden başlat", lines: ["Modemi uzaktan yeniden başlatabiliriz.", "Yeniden başlatma yaklaşık 1 dakika sürer; bu sırada internet kesilir."], action: { label: "Modemi yeniden başlat", busy: "Modem yeniden başlatılıyor…", done: "Modem yeniden başlatıldı" } },
  { icon: Cable, title: "Kabloları kontrol et", lines: ["Fiber kablonun modemin arkasına tam oturduğundan emin ol.", "Kablo bükülmüş ya da kırılmışsa düzelt.", "Güç adaptörünün prize sağlam takılı olduğunu kontrol et."] },
  { icon: Wifi, title: "Wi-Fi bağlantını yenile", lines: ["Cihazında Wi-Fi'ı kapatıp aç.", "Modeme yakın bir noktada bağlantıyı dene.", "Ardından hız testi yapalım."], action: { label: "Hız testi yap", busy: "Hız ölçülüyor…", done: "İndirme 94 Mbps · Yükleme 18 Mbps" } },
];

export function ConnectionScreen() {
  const navigate = useNavigate();
  const closeTicket = useEvimStore((s) => s.closeTicket);
  const ticket = useEvimStore((s) => s.ticket);
  const [i, setI] = useState(0);
  const [act, setAct] = useState<"idle" | "busy" | "done">("idle");
  const [result, setResult] = useState<"solved" | "unsolved" | null>(null);
  const step = STEPS[i] ?? STEPS[0]!;

  const runAction = () => {
    setAct("busy");
    window.setTimeout(() => setAct("done"), 1800);
  };
  const next = () => {
    if (i < STEPS.length - 1) {
      setI(i + 1);
      setAct("idle");
    } else setResult("unsolved");
  };
  const solved = () => {
    if (ticket?.status === "open") closeTicket();
    setResult("solved");
  };

  if (result === "solved")
    return (
      <div className="pb-8">
        <EvimHeader title="İşlem tamamlandı" />
        <div className="space-y-4 px-4 text-center">
          <motion.span initial={{ scale: 0.6 }} animate={{ scale: 1 }} className="mx-auto mt-6 flex h-20 w-20 items-center justify-center rounded-full bg-success-soft text-success"><CheckCircle2 className="size-10" /></motion.span>
          <p className="text-xl font-semibold text-primary">Sorunun çözüldü</p>
          <p className="text-sm text-muted-foreground">Bağlantın normale döndü.{ticket ? ` ${ticket.id} numaralı destek kaydın kapatıldı.` : ""}</p>
          <Button size="xl" className="w-full rounded-full" onClick={() => navigate({ to: "/evim" })}>TürkNet Evim'e dön</Button>
        </div>
      </div>
    );

  if (result === "unsolved")
    return (
      <div className="pb-8">
        <EvimHeader title="Bağlantı Problemleri" />
        <div className="space-y-4 px-4 text-center">
          <span className="mx-auto mt-6 flex h-20 w-20 items-center justify-center rounded-full bg-magenta-soft text-magenta"><Bot className="size-10" /></span>
          <p className="text-xl font-semibold text-primary">Sorun devam ediyor</p>
          <p className="text-sm text-muted-foreground">Temel adımları tamamladın. AI Usta modemine uzaktan bağlanıp derin analiz yapsın.</p>
          <Button size="xl" variant="magenta" className="w-full rounded-full" onClick={() => navigate({ to: "/evim/ai-usta" })}><Bot /> Problemi AI Usta ile Çöz</Button>
          <Button variant="ghost" className="w-full" onClick={() => { setI(0); setAct("idle"); setResult(null); }}>Adımları baştan başlat</Button>
        </div>
      </div>
    );

  return (
    <div className="pb-8">
      <EvimHeader title="Bağlantı Problemleri" />
      <RequirePerm perm="troubleshoot">
        <div className="space-y-4 px-4">
          <div className="flex gap-1.5" aria-label={`Adım ${i + 1} / ${STEPS.length}`}>
            {STEPS.map((_, k) => <span key={k} className={`h-1.5 flex-1 rounded-full ${k <= i ? "bg-magenta" : "bg-muted"}`} />)}
          </div>
          <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <Card>
              <p className="text-xs font-semibold text-magenta">Adım {i + 1} / {STEPS.length}</p>
              <div className="mt-2 flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-icon-box text-primary"><step.icon className="size-6" /></span>
                <p className="text-lg font-semibold text-primary">{step.title}</p>
              </div>
              <ol className="mt-4 space-y-2 text-sm">
                {step.lines.map((l, k) => <li key={k} className="flex gap-2"><span className="font-bold text-magenta">{k + 1}.</span>{l}</li>)}
              </ol>
              {step.action && (
                <div className="mt-4">
                  {act === "idle" && <Button variant="outline" className="w-full" onClick={runAction}>{step.icon === Wifi ? <Gauge /> : <Power />} {step.action.label}</Button>}
                  {act === "busy" && <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> {step.action.busy}</p>}
                  {act === "done" && <Banner tone="success" title={step.action.done} />}
                </div>
              )}
            </Card>
          </motion.div>
          <p className="px-1 text-center text-sm font-semibold text-primary">İnternetin şimdi çalışıyor mu?</p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="lg" onClick={next} disabled={act === "busy" || (!!step.action && act === "idle")}>Hayır, devam et</Button>
            <Button variant="success" size="lg" onClick={solved} disabled={act === "busy"}>Evet, çözüldü</Button>
          </div>
          {step.action && act === "idle" && <p className="text-center text-xs text-muted-foreground">Devam etmeden önce yukarıdaki işlemi çalıştır.</p>}
        </div>
      </RequirePerm>
    </div>
  );
}

/** AI Usta handoff after self-service; the full AI Usta journey plugs in here later. */
export function EvimAiUstaScreen() {
  const navigate = useNavigate();
  const openTicket = useEvimStore((s) => s.openTicket);
  const ticket = useEvimStore((s) => s.ticket);
  const [phase, setPhase] = useState<"analyzing" | "ask" | "ticket">("analyzing");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (phase !== "analyzing") return;
    const t = window.setInterval(() => setProgress((p) => {
      if (p >= 100) { window.clearInterval(t); setPhase("ask"); return 100; }
      return p + 10;
    }), 250);
    return () => window.clearInterval(t);
  }, [phase]);

  const checks = ["Fiber sinyal seviyesi", "Modem yazılımı ve sıcaklık", "Kanal yoğunluğu", "Kanal değişikliği uygulandı"];

  return (
    <div className="pb-8">
      <EvimHeader title="AI Usta" />
      <RequirePerm perm="troubleshoot">
        <div className="space-y-4 px-4">
          {phase !== "ticket" && (
            <Card>
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-magenta-soft text-magenta"><Bot className="size-6" /></span>
                <div>
                  <p className="font-semibold text-primary">AI Usta modemini inceliyor</p>
                  <p className="text-xs text-muted-foreground">{USER.modemModel} · {USER.modemSerial}</p>
                </div>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-magenta transition-all" style={{ width: `${progress}%` }} /></div>
              <div className="mt-3 space-y-1.5">
                {checks.map((c, k) => {
                  const ok = progress >= ((k + 1) / checks.length) * 100;
                  return <p key={c} className="flex items-center gap-2 text-sm">{ok ? <CheckCircle2 className="size-4 text-success" /> : <Loader2 className="size-4 animate-spin text-muted-foreground" />}{c}</p>;
                })}
              </div>
            </Card>
          )}
          {phase === "ask" && (
            <>
              <p className="text-center text-sm font-semibold text-primary">AI Usta düzeltmeyi uyguladı. İnternetin çalışıyor mu?</p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="lg" onClick={() => { openTicket("AI Usta sonrası bağlantı sorunu devam ediyor"); setPhase("ticket"); }}>Hayır, çözülmedi</Button>
                <Button variant="success" size="lg" onClick={() => { toast.success("Sorunun AI Usta ile çözüldü"); navigate({ to: "/" }); }}>Evet, çözüldü</Button>
              </div>
            </>
          )}
          {phase === "ticket" && ticket && (
            <>
              <div className="pt-4 text-center">
                <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-warning-soft text-warning"><Ticket className="size-10" /></span>
                <p className="mt-3 text-xl font-semibold text-primary">Destek kaydın oluşturuldu</p>
                <p className="mt-1 text-sm text-muted-foreground">Teknik ekibimiz AI Usta'nın analizini görerek seninle iletişime geçecek; sorunu tekrar anlatman gerekmez.</p>
              </div>
              <Card>
                <StatRow label="Kayıt no" value={ticket.id} />
                <StatRow label="Durum" value={<span className="text-warning">Açık · inceleniyor</span>} />
                <StatRow label="Oluşturma" value={fmtDateTime(ticket.createdAt)} />
                <StatRow label="Tahmini dönüş" value="4 saat içinde" />
              </Card>
              <Button size="xl" className="w-full rounded-full" onClick={() => navigate({ to: "/evim" })}><Home /> TürkNet Evim'e dön</Button>
            </>
          )}
        </div>
      </RequirePerm>
    </div>
  );
}

export function EvimBillsScreen() {
  const { role } = useEvim();
  const owner = role === "owner";
  return (
    <div className="pb-8">
      <EvimHeader title="Fatura İşlemleri" />
      <RequirePerm perm="billsView">
        <div className="space-y-4 px-4">
          <Card>
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-icon-box text-primary"><Receipt className="size-6" /></span>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Kasım 2026 faturası</p>
                <p className="text-2xl font-semibold text-primary">449,90 TL</p>
              </div>
              <span className="rounded-full bg-warning-soft px-2.5 py-1 text-[11px] font-bold text-warning">Ödenmedi</span>
            </div>
            <StatRow label="Son ödeme" value="18 Kasım 2026" className="mt-3" />
            <StatRow label="Paket" value={USER.packageName} />
          </Card>
          {owner ? (
            <div className="grid gap-2">
              <Button size="lg" asChild><AppLink to="/faturalar">Faturayı öde</AppLink></Button>
              <Button size="lg" variant="outline" asChild><AppLink to="/faturalar/gecmis">Geçmiş faturalar</AppLink></Button>
              <Button size="lg" variant="outline" asChild><AppLink to="/fatura-kalkani">Faturama itiraz et</AppLink></Button>
            </div>
          ) : (
            <Banner tone="info" title="Yalnızca görüntüleme yetkin var">Ödeme ve itiraz işlemlerini abonelik sahibi yapabilir.</Banner>
          )}
        </div>
      </RequirePerm>
    </div>
  );
}
