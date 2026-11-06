import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, CheckCircle2, ChevronDown, ChevronRight, Loader2, Lock, Mic, PartyPopper, Send, Star, Wifi } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/headers";
import { USER } from "@/data/mock";
import { useAppStore } from "@/features/core/appStore";
import { launchIntent } from "@/features/giga/actions";
import { track, useFlow } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { useVoiceInput } from "@/features/giga/useVoiceInput";
import { HEALTH_CHECKS, healthResult, useQrHealthStore, type QrHealth } from "../qrHealth";
import { QR_STEPS, routeFreeText, type Option, type StepId } from "../selfService";

/** Shown once the customer says the problem is solved: rate the process. */
function DoneRating() {
  const addRating = useAppStore((s) => s.addRating);
  const [score, setScore] = useState(0);
  return (
    <div className="mt-4 rounded-2xl bg-muted/60 p-4">
      {score ? (
        <p className="flex items-center justify-center gap-2 text-sm font-semibold text-foreground">
          <CheckCircle2 className="size-4 text-success" /> Puanın için teşekkürler! Her zaman yanındayım.
        </p>
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
function ConnectionCheck({ onDone }: { onDone: (h: QrHealth) => void }) {
  const health = useQrHealthStore((s) => s.health);
  const [i, setI] = useState(0);
  useEffect(() => {
    if (i >= HEALTH_CHECKS.length) { onDone(health); return; }
    const t = window.setTimeout(() => setI((s) => s + 1), 1400);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);
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

export function QrSelfServiceScreen() {
  useFlow("qr_self_service");
  const navigate = useNavigate();
  const openHelp = useAppStore((s) => s.openHelp);
  const [path, setPath] = useState<StepId[]>(["topic"]);
  const [answers, setAnswers] = useState<string[]>([]);
  const current: StepId = path[path.length - 1] ?? "topic";
  const step = QR_STEPS[current];
  const isDone = current === "done";
  const [issue, setIssue] = useState(false);
  /** idle: not started (never auto-run); running: checks in progress; done: result shown. */
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [result, setResult] = useState<QrHealth | null>(null);
  const [topicsOpen, setTopicsOpen] = useState(false);
  const loaded = useRef(false);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("qr-destek-state");
      if (raw) {
        const v = JSON.parse(raw);
        // A check interrupted by a reload restarts from idle so no result is shown early.
        if (v.phase === "done" && v.result) { setPhase("done"); setResult(v.result); useQrHealthStore.setState({ health: v.result }); }
        if (Array.isArray(v.path) && v.path.length && (v.phase === "done" || v.path.length === 1)) { setPath(v.path); setAnswers(v.answers ?? []); setIssue(!!v.issue); }
      }
    } catch { /* ignore */ }
    loaded.current = true;
  }, []);
  useEffect(() => {
    if (!loaded.current) return;
    sessionStorage.setItem("qr-destek-state", JSON.stringify({ phase, result, path, answers, issue }));
  }, [phase, result, path, answers, issue]);
  const startCheck = () => {
    if (phase === "running") return;
    track("cta_clicked", "qr_self_service", { step: "health", answer: "start" });
    setIssue(false); setPath(["topic"]); setAnswers([]); setResult(null); setTopicsOpen(false);
    setPhase("running");
  };
  const running = phase === "running";
  const topicsLocked = running || (issue && current !== "topic" && !isDone);
  const onHealth = (h: QrHealth) => {
    setPhase("done");
    setResult(h);
    if (h !== "bad") return;
    setIssue(true);
    track("cta_clicked", "qr_self_service", { step: "health", answer: "bad" });
    setAnswers(["İnternet bağlantım"]);
    setPath(["topic", "net_symptom"]);
  };

  const back = () => {
    if (path.length <= 1) { navigate({ to: "/qr" }); return; }
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
      return setPath((p) => [...p, n.step]);
    }
    if ("done" in n) {
      setAnswers((a) => [...a, o.label]);
      return setPath((p) => [...p, "done"]);
    }
    const said = [...answers, o.label].join(" · ");
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

  /** "Farklı bir konuda yardım ister misin?" choices: drop the internet thread, start the new topic. */
  const pickTopic = (o: Option) => {
    if (topicsLocked) return;
    setTopicsOpen(false);
    setIssue(false);
    setPath(["topic"]);
    setAnswers([]);
    choose(o);
  };

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader title="QR ile Destek" />
      <div className="flex-1 space-y-4 px-4 pb-24">
        <div className="sticky top-16 z-20 -mx-4 bg-background/95 px-4 pb-3 pt-4 backdrop-blur">
          {phase === "idle" ? (
            <div className="rounded-2xl border border-magenta/20 bg-card p-4 shadow-card">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Wifi className="size-3.5" /> {USER.modemModel} · Modemin ve aboneliğin eşleştirildi</p>
              <button type="button" onClick={startCheck} className="mt-3 min-h-12 w-full rounded-2xl bg-magenta text-sm font-semibold text-magenta-foreground shadow-card active:scale-[0.99]">İnternet sağlığımı kontrol et</button>
              <p className="mt-2 text-xs text-muted-foreground">Bağlantını ve modemini kontrol ederim; sorun bulursam dijital onarımı birlikte başlatırız.</p>
            </div>
          ) : phase === "running" ? (
            <ConnectionCheck key="run" onDone={onHealth} />
          ) : (
            <div className={cn("rounded-2xl border bg-card p-3.5 shadow-card", result === "bad" ? "border-destructive/30" : "border-success/30")}>
              <div className="flex items-center gap-3">
                <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", result === "bad" ? "bg-destructive-soft text-destructive" : "bg-success-soft text-success")}>
                  {result === "bad" ? <AlertTriangle className="size-5" /> : <CheckCircle2 className="size-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-primary">{healthResult(result ?? "good").title}</p>
                  <p className="text-xs text-muted-foreground">{healthResult(result ?? "good").body}</p>
                </div>
              </div>
              {result === "good" && <button type="button" onClick={startCheck} className="mt-2.5 text-xs font-semibold text-magenta">Tekrar kontrol et</button>}
            </div>
          )}
        </div>

        {current !== "topic" && <div className="flex items-center justify-between px-1">
          <button type="button" onClick={back} className="inline-flex min-h-10 items-center gap-1 rounded-full pr-3 text-sm font-semibold text-primary">
            <ArrowLeft className="size-4" /> Geri
          </button>
          {!isDone && <span className="text-xs font-semibold text-muted-foreground">Adım {path.length}</span>}
        </div>}

        {answers.length > 0 && (
          <ol className="flex flex-wrap gap-1.5 px-1" aria-label="Verdiğin cevaplar">
            {answers.map((a, i) => {
              const problem = issue && i === 0 && a === "İnternet bağlantım";
              return (
                <li key={i} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${problem ? "bg-destructive/10 text-destructive" : "bg-success-soft text-success"}`}>
                  {problem ? <AlertTriangle className="size-3" /> : <CheckCircle2 className="size-3" />} {problem ? "İnternet bağlantında sorun var" : a}
                </li>
              );
            })}
          </ol>
        )}

        {current !== "topic" && <AnimatePresence mode="wait">
          <motion.section key={current} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }} className="rounded-card bg-card p-5 shadow-card">
            {isDone ? (
              <div className="text-center">
                <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-success-soft text-success"><PartyPopper className="size-7" /></span>
                <h2 className="mt-3 text-lg font-semibold text-primary">{step.title}</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">{step.body}</p>
                <DoneRating />
                <button type="button" onClick={() => navigate({ to: "/" })} className="mt-5 min-h-12 w-full rounded-2xl bg-primary text-sm font-semibold text-primary-foreground">Ana sayfaya dön</button>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-semibold leading-snug text-primary">{step.title}</h2>
                {step.body && <p className="mt-1.5 text-sm text-muted-foreground">{step.body}</p>}
                {step.tips && (
                  <ol className="mt-4 space-y-2.5">
                    {step.tips.map((t: string, i: number) => (
                      <li key={t} className="flex gap-3 text-sm text-foreground">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-magenta-soft text-xs font-bold text-magenta">{i + 1}</span>
                        <span className="pt-0.5">{t}</span>
                      </li>
                    ))}
                  </ol>
                )}
                {step.tips && <p className="mt-4 text-sm font-semibold text-primary">Sorun düzeldi mi?</p>}
                {current === "other" && (
                  <form onSubmit={(e) => { e.preventDefault(); submitText(text); }} className="mt-4 space-y-3">
                    <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Örn. Faturamda bilmediğim bir ücret var" aria-label="Sorununu yaz" className="w-full resize-none rounded-2xl border border-primary/15 bg-background p-3 text-sm text-foreground outline-none focus:border-magenta/50" />
                    <div className="flex gap-2">
                      <button type="button" onClick={voice.toggle} aria-label="Konuşarak anlat" className={cn("flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl border text-sm font-semibold", voice.listening ? "border-magenta bg-magenta-soft text-magenta" : "border-primary/15 text-primary")}>
                        <Mic className={cn("size-4", voice.listening && "animate-pulse")} /> {voice.listening ? "Dinliyorum…" : "Konuş"}
                      </button>
                      <button type="submit" disabled={!text.trim()} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50">
                        <Send className="size-4" /> Gönder
                      </button>
                    </div>
                  </form>
                )}
                <div className="mt-3 space-y-2">
                  {step.options.map((o: Option) => (
                    <button key={o.label} type="button" onClick={() => choose(o)} className="flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border border-primary/15 bg-background px-4 py-2.5 text-left transition-colors hover:border-magenta/40 hover:bg-magenta-soft">
                      <span>
                        <span className="block text-sm font-semibold text-primary">{o.label}</span>
                        {o.hint && <span className="block text-xs text-muted-foreground">{o.hint}</span>}
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </>
            )}
          </motion.section>
        </AnimatePresence>}

        {!isDone && (
          <section className="overflow-hidden rounded-card bg-card shadow-card">
            <button type="button" aria-expanded={topicsOpen} onClick={() => setTopicsOpen((o) => !o)} className="flex min-h-14 w-full items-center justify-between gap-3 bg-magenta-soft px-4 py-3 text-left">
              <span className="text-sm font-semibold text-magenta">Farklı bir konuda yardıma ihtiyacım var.</span>
              <ChevronDown className={cn("size-5 shrink-0 text-magenta transition-transform", topicsOpen && "rotate-180")} />
            </button>
            {topicsOpen && (
              <div className="p-4">
                <p className="text-xs text-muted-foreground">{QR_STEPS.topic.body}</p>
                {topicsLocked && (
                  <p className="mt-2 flex items-center gap-1.5 rounded-xl bg-muted px-3 py-2 text-xs font-medium text-muted-foreground">
                    <Lock className="size-3.5" /> {running ? "Kontrol sürerken diğer konular kullanılamaz." : "Önce mevcut sorunu birlikte tamamlayalım."}
                  </p>
                )}
                <div className="mt-2.5 space-y-2">
                  {QR_STEPS.topic.options.map((o) => (
                    <button key={o.label} type="button" disabled={topicsLocked} aria-disabled={topicsLocked} onClick={() => pickTopic(o)} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-primary/15 bg-background px-3 py-2 text-left transition-colors enabled:hover:border-magenta/40 enabled:hover:bg-magenta-soft disabled:cursor-not-allowed disabled:opacity-45">
                      <span>
                        <span className="block text-sm font-semibold text-primary">{o.label}</span>
                        {o.hint && <span className="block text-xs text-muted-foreground">{o.hint}</span>}
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

      </div>
    </div>
  );
}
