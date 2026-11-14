import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, CheckCircle2, ChevronDown, ChevronRight, FolderOpen, HelpCircle, Home, Loader2, Lock, Mic, PartyPopper, ReceiptText, Router, Send, Star, Wifi, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { USER } from "@/data/mock";
import { useAppStore } from "@/features/core/appStore";
import { launchIntent } from "@/features/giga/actions";
import { track, useFlow } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { useVoiceInput } from "@/features/giga/useVoiceInput";
import { Wrench } from "lucide-react";
import { HEALTH_CHECKS, healthResult, resolveQrHealth, modemEntryStep, useQrHealthStore, type QrHealth } from "../qrHealth";
import { useWorkflowStore } from "@/features/workflow/store";
import { SOLVE_POINTS } from "@/features/evim/selfRepair";
import { ModemAiRepair } from "../components/ModemAiRepair";
import { QrScanWelcome } from "../components/QrScanWelcome";
import { QR_STEPS, routeFreeText, type Option, type StepId } from "../selfService";

const OPTION_ICON: Record<string, LucideIcon> = {
  "Modemim çalışmıyor": Router,
  "Kurulum yap": Wrench,
  "İnternet bağlantım": Wifi,
  "Faturam": ReceiptText,
  "Taşınma / nakil": Home,
  "Açık işlemlerim": FolderOpen,
  "Diğer": HelpCircle,
};

/** Glass option row used on the purple QR screen. */
function OptionButton({ o, onClick, disabled }: { o: Option; onClick: () => void; disabled?: boolean }) {
  const Icon = OPTION_ICON[o.label];
  return (
    <button type="button" disabled={disabled} onClick={onClick} className="flex min-h-16 w-full items-center gap-3 rounded-2xl border border-magenta/15 bg-magenta-soft px-3.5 py-3 text-left transition-colors enabled:hover:bg-magenta/15 disabled:cursor-not-allowed disabled:opacity-45">
      {Icon && <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-card"><Icon className="size-5 text-magenta" /></span>}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">{o.label}</span>
        {o.hint && <span className="block text-xs text-muted-foreground">{o.hint}</span>}
      </span>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
    </button>
  );
}

/** Shown once the customer says the problem is solved: rate the process. */
function DoneRating() {
  const addRating = useAppStore((s) => s.addRating);
  const [score, setScore] = useState(0);
  return (
    <div className="mt-4 rounded-2xl bg-muted/60 p-4">
      {score ? (
        <div className="space-y-2.5">
          <p className="flex items-center justify-center gap-2 text-sm font-semibold text-foreground">
            <CheckCircle2 className="size-4 text-success" /> Puanın için teşekkürler! Her zaman yanındayım.
          </p>
          <motion.p initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mx-auto inline-flex items-center gap-2 rounded-full bg-magenta-soft px-4 py-2 text-sm font-bold text-magenta">
            <Star className="size-4 fill-current" /> +{SOLVE_POINTS} puan senin
          </motion.p>
        </div>
      ) : (
        <>
          <p className="text-sm font-semibold text-foreground">Süreci puanlar mısın?</p>
          <div className="mt-2 flex justify-center gap-1" role="group" aria-label="Süreci yıldızla puanla">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" aria-label={`${n} yıldız`} onClick={() => { setScore(n); addRating({ feature: "qr_self_service", csat: n, nps: null, comment: "" }); }} className="rounded-lg p-1.5 text-amber-500 active:scale-110">
                <Star className="size-7 fill-transparent" />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Sits just under the page header: checks internet health when the QR is scanned. */
function ConnectionCheck({ onDone, health }: { onDone: (h: QrHealth) => void; health: QrHealth }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (i >= HEALTH_CHECKS.length) { onDone(health); return; }
    const t = window.setTimeout(() => setI((s) => s + 1), 1400);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, health, onDone]);
  const done = i >= HEALTH_CHECKS.length;
  const bad = done && health === "bad";
  const pct = Math.round((Math.min(i, HEALTH_CHECKS.length) / HEALTH_CHECKS.length) * 100);
  const res = healthResult(health);
  return (
    <div className={cn("rounded-2xl border bg-card p-3.5 shadow-card", bad ? "border-destructive/30" : "border-magenta/20")} aria-live="polite">
      <div className="flex items-center gap-3">
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", !done ? "bg-magenta-soft text-magenta" : bad ? "bg-destructive-soft text-destructive" : "bg-success-soft text-success")}>
          {!done ? <Loader2 className="size-5 animate-spin" /> : bad ? <AlertTriangle className="size-5" /> : <CheckCircle2 className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-primary">{done ? res.title : "İnternet sağlığını kontrol ediyorum"}</p>
            <span className="text-xs font-semibold text-muted-foreground">%{pct}</span>
          </div>
          <p className="text-xs text-muted-foreground">{done ? res.body : `Aşama ${Math.min(i + 1, HEALTH_CHECKS.length)}/${HEALTH_CHECKS.length} · ${HEALTH_CHECKS[i]}`}</p>
          {!done && <p className="mt-0.5 text-[11px] font-medium text-magenta">Kontrol tamamlanana kadar lütfen bekle.</p>}
        </div>
      </div>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-all duration-700", bad ? "bg-destructive" : "bg-magenta")} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const qrRoute = getRouteApi("/qr/destek");

export function QrSelfServiceScreen() {
  useFlow("qr_self_service");
  const navigate = useNavigate();
  const { giris } = qrRoute.useSearch();
  /** Entry from Yardım & Destek: skip the check button, open the topic step with a finished good result. */
  const fromHelp = giris === "yardim";
  const [showWelcome, setShowWelcome] = useState(!fromHelp);
  const finishWelcome = useCallback(() => setShowWelcome(false), []);
  useEffect(() => { setShowWelcome(!fromHelp); }, [fromHelp]);
  const openHelp = useAppStore((s) => s.openHelp);
  const fixed = useWorkflowStore((s) => s.connectivity.fixed);
  const outage = useWorkflowStore((s) => s.outage);
  const simulatedHealth = useQrHealthStore((s) => s.health);
  const outageDetected = fixed === "down" || !!(outage && outage.restoredAt == null);
  const currentHealth = resolveQrHealth({ health: simulatedHealth, fixed, outageOngoing: outageDetected });
  const [path, setPath] = useState<StepId[]>(["topic"]);
  const [answers, setAnswers] = useState<string[]>([]);
  const current: StepId = path[path.length - 1] ?? "topic";
  const step = QR_STEPS[current];
  const isDone = current === "done";
  const [issue, setIssue] = useState(false);
  /** idle: not started (never auto-run); running: checks in progress; done: result shown. */
  const [phase, setPhase] = useState<"idle" | "running" | "done">(fromHelp ? "done" : "idle");
  const [result, setResult] = useState<QrHealth | null>(fromHelp ? "good" : null);
  const [topicsOpen, setTopicsOpen] = useState(false);
  const loaded = useRef(false);
  useEffect(() => {
    if (fromHelp) { loaded.current = true; return; }
    try {
      const raw = sessionStorage.getItem("qr-destek-state");
      if (raw) {
        const v = JSON.parse(raw);
        // A check interrupted by a reload restarts from idle so no result is shown early.
        if (v.phase === "done" && v.result) { setPhase("done"); setResult(v.result); }
        if (Array.isArray(v.path) && v.path.length && (v.phase === "done" || v.path.length === 1)) { setPath(v.path); setAnswers(v.answers ?? []); setIssue(!!v.issue); }
      }
    } catch { /* ignore */ }
    loaded.current = true;
  }, []);
  useEffect(() => {
    if (!outageDetected) return;
    setPhase("done");
    setResult("bad");
    setIssue(true);
    setPath((p) => p.length === 1 ? ["topic", "net_symptom"] : p);
    setAnswers((a) => a.length === 0 ? ["İnternet bağlantım"] : a);
  }, [outageDetected]);
  // Saved results must not override the presenter's current simulation selection.
  useEffect(() => {
    if (phase !== "done") return;
    setResult(currentHealth);
    if (currentHealth === "good") setIssue(false);
  }, [phase, currentHealth]);
  useEffect(() => {
    if (!loaded.current || fromHelp) return;
    sessionStorage.setItem("qr-destek-state", JSON.stringify({ phase, result, path, answers, issue }));
  }, [phase, result, path, answers, issue, fromHelp]);
  const startCheck = () => {
    if (phase === "running") return;
    track("cta_clicked", "qr_self_service", { step: "health", answer: "start" });
    setIssue(false); setPath(["topic"]); setAnswers([]); setResult(null); setTopicsOpen(false);
    setPhase("running");
  };
  const running = phase === "running";
  const topicsLocked = running || (issue && current !== "topic" && !isDone);
  const onHealth = useCallback((h: QrHealth) => {
    setPhase("done");
    setResult(h);
    if (h !== "bad") return;
    setIssue(true);
    track("cta_clicked", "qr_self_service", { step: "health", answer: "bad" });
    setAnswers(["İnternet bağlantım"]);
    setPath(["topic", "net_symptom"]);
  }, []);

  const back = () => {
    if (path.length <= 1) { navigate({ to: fromHelp ? "/yardim" : "/qr" }); return; }
    setPath((p) => p.slice(0, -1));
    setAnswers((a) => a.slice(0, -1));
  };

  const [text, setText] = useState("");
  const submitText = (t: string) => {
    const said = t.trim();
    if (!said) return;
    setText("");
    track("cta_clicked", "qr_self_service", { step: "other", free_text: true });
    choose({ label: said, next: routeFreeText(said) });
  };
  const voice = useVoiceInput((t) => submitText(t));

  const choose = (o: Option) => {
    track("cta_clicked", "qr_self_service", { step: current, answer: o.label });
    const n = o.next;
    if ("step" in n) {
      setAnswers((a) => [...a, o.label]);
      const target = current === "topic" && n.step === "modem_ai" ? modemEntryStep(useQrHealthStore.getState().modem) : n.step;
      return setPath((p) => [...p, target]);
    }
    if ("done" in n) {
      setAnswers((a) => [...a, o.label]);
      return setPath((p) => [...p, "done"]);
    }
    const said = [...answers, o.label].join(" · ");
    if ("video" in n) return navigate({ to: "/goruntulu-destek" });
    if ("chat" in n) return openHelp(n.chat);
    if ("live" in n) {
      toast("Seni canlı desteğe bağlıyoruz", { description: "Anlattıkların temsilciye iletildi." });
      return openHelp(current === "other" ? `Canlı destekle görüşmek istiyorum: ${o.label}` : "Canlı destekle görüşmek istiyorum");
    }
    const r = launchIntent(n.intent, said, n.usta);
    if (r.kind === "workflow") return navigate({ to: "/surec/$id", params: { id: r.wfId } });
    if (r.kind === "clear") {
      toast.success("Faturan kontrol edildi", { description: "Faturan ve ödemelerin uyumlu görünüyor." });
      return navigate({ to: "/fatura-kalkani", search: { kontrol: 1 } });
    }
    navigate({ to: r.to as "/" });
  };

  /** Done screen: back to the topic list so the customer can start a fresh subject. */
  const newTopic = () => {
    setIssue(false);
    setPath(["topic"]);
    setAnswers([]);
    setTopicsOpen(false);
  };

  /** "Farklı bir konuda yardım ister misin?" choices: drop the internet thread, start the new topic. */
  const pickTopic = (o: Option) => {
    if (topicsLocked) return;
    setTopicsOpen(false);
    setIssue(false);
    setPath(["topic"]);
    setAnswers([]);
    choose(o);
  };

  if (showWelcome && !fromHelp) return <QrScanWelcome onComplete={finishWelcome} />;

  return (
    <div className="flex min-h-full flex-col bg-background text-foreground">
      <div className="flex items-center justify-between px-4 pt-4">
        <button type="button" onClick={back} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-sm font-semibold text-foreground shadow-card">
          <ArrowLeft className="size-4" /> Geri
        </button>
        {!fromHelp && <span className="text-xs font-medium text-muted-foreground">{current !== "topic" && !isDone ? `Adım ${path.length} · ` : ""}QR Destek</span>}
      </div>
      <div className="flex-1 space-y-5 px-4 pb-24 pt-6">
        {phase === "idle" ? (
          <button type="button" onClick={startCheck} className="flex w-full items-center gap-3 rounded-2xl border border-magenta/15 bg-magenta-soft p-3 text-left">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-card text-magenta"><Wifi className="size-5" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">İnternet sağlığımı kontrol et</span>
              <span className="block text-xs text-muted-foreground">{USER.modemModel} · Modemin ve aboneliğin eşleştirildi</span>
            </span>
            <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
          </button>
        ) : phase === "running" ? (
          <ConnectionCheck key="run" health={currentHealth} onDone={onHealth} />
        ) : (
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-card">
            <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", currentHealth === "bad" ? "bg-destructive-soft text-destructive" : "bg-success-soft text-success")}>
              {currentHealth === "bad" ? <AlertTriangle className="size-5" /> : <CheckCircle2 className="size-5" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{healthResult(currentHealth, outageDetected).title}</p>
              <p className="text-xs text-muted-foreground">{healthResult(currentHealth, outageDetected).body}</p>
              {currentHealth === "good" && <button type="button" onClick={startCheck} className="mt-1 text-xs font-semibold underline">Tekrar kontrol et</button>}
            </div>
          </div>
        )}

        {answers.length > 0 && (
          <ol className="flex flex-wrap gap-1.5" aria-label="Verdiğin cevaplar">
            {answers.map((a, i) => {
              const problem = issue && i === 0 && a === "İnternet bağlantım";
              return (
                <li key={i} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                  {problem ? <AlertTriangle className="size-3" /> : <CheckCircle2 className="size-3" />} {problem ? "İnternet bağlantında sorun var" : a}
                </li>
              );
            })}
          </ol>
        )}

        <AnimatePresence mode="wait">
          <motion.section key={current} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }}>
            {current === "modem_ai" ? (
              <ModemAiRepair
                onDone={() => setPath((p) => [...p, "done"])}
                onLive={() => { toast("Seni teknik desteğe bağlıyoruz", { description: "Modem kontrolünde yaptıkların temsilciye iletildi." }); openHelp("Canlı destekle görüşmek istiyorum: Modemim çalışmıyor, kablo bağlantısını kameralı onarımla denedim ama sorun devam ediyor."); }}
              />
            ) : current === "setup_ai" ? (
              <ModemAiRepair
                mode="setup"
                onDone={() => setPath((p) => [...p, "done"])}
                onLive={() => { toast("Seni teknik desteğe bağlıyoruz", { description: "Kurulumda yaptıkların temsilciye iletildi." }); openHelp("Canlı destekle görüşmek istiyorum: Modem kurulumunu kameralı AI rehberiyle denedim ama tamamlayamadım."); }}
              />
            ) : isDone ? (
              <div className="rounded-2xl bg-card p-5 text-center text-foreground">
                <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-success-soft text-success"><PartyPopper className="size-7" /></span>
                <h2 className="mt-3 text-lg font-semibold text-primary">{step.title}</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">{step.body}</p>
                <DoneRating />
                <button type="button" onClick={newTopic} className="mt-5 min-h-12 w-full rounded-2xl bg-primary text-sm font-semibold text-primary-foreground">Başka bir konuda yardıma ihtiyacım var</button>
              </div>
            ) : (
              <>
                <h1 className="text-lg font-semibold text-primary">{step.title}</h1>
                {step.body && <p className="mt-1.5 text-sm text-muted-foreground">{step.body}</p>}
                {step.tips && (
                  <ol className="mt-5 space-y-2.5">
                    {step.tips.map((t: string, i: number) => (
                      <li key={t} className="flex gap-3 text-sm">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-magenta-soft text-xs font-bold text-magenta">{i + 1}</span>
                        <span className="pt-0.5">{t}</span>
                      </li>
                    ))}
                  </ol>
                )}
                {step.tips && <p className="mt-5 text-sm font-semibold">Sorun düzeldi mi?</p>}
                {current === "other" && (
                  <form onSubmit={(e) => { e.preventDefault(); submitText(text); }} className="mt-5 space-y-3">
                    <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Örn. Faturamda bilmediğim bir ücret var" aria-label="Sorununu yaz" className="w-full resize-none rounded-2xl border border-border bg-card p-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-magenta" />
                    <div className="flex gap-2">
                      <button type="button" onClick={voice.toggle} aria-label="Konuşarak anlat" className={cn("flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-card text-sm font-semibold", voice.listening && "bg-magenta-soft")}>
                        <Mic className={cn("size-4", voice.listening && "animate-pulse")} /> {voice.listening ? "Dinliyorum…" : "Konuş"}
                      </button>
                      <button type="submit" disabled={!text.trim()} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50">
                        <Send className="size-4" /> Gönder
                      </button>
                    </div>
                  </form>
                )}
                <div className="mt-5 space-y-3">
                  {step.options.map((o: Option) => (
                    <OptionButton key={o.label} o={o} onClick={() => (current === "topic" ? pickTopic(o) : choose(o))} disabled={current === "topic" && running} />
                  ))}
                </div>
              </>
            )}
          </motion.section>
        </AnimatePresence>

        {!isDone && current !== "topic" && current !== "modem_ai" && current !== "setup_ai" && (
          <section className="overflow-hidden rounded-2xl border border-magenta/15 bg-magenta-soft/50">
            <button type="button" aria-expanded={topicsOpen} onClick={() => setTopicsOpen((o) => !o)} className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left">
              <span className="text-sm font-semibold">Farklı bir konuda yardıma ihtiyacım var.</span>
              <ChevronDown className={cn("size-5 shrink-0 transition-transform", topicsOpen && "rotate-180")} />
            </button>
            {topicsOpen && (
              <div className="space-y-3 px-3 pb-3">
                {topicsLocked && (
                  <p className="flex items-center gap-1.5 rounded-xl bg-card px-3 py-2 text-xs font-medium">
                    <Lock className="size-3.5" /> {running ? "Kontrol sürerken diğer konular kullanılamaz." : "Önce mevcut sorunu birlikte tamamlayalım."}
                  </p>
                )}
                {QR_STEPS.topic.options.map((o) => (
                  <OptionButton key={o.label} o={o} disabled={topicsLocked} onClick={() => pickTopic(o)} />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
