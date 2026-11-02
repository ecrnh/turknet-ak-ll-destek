import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, ChevronRight, CircleHelp, Headset, HeartPulse, Loader2, SendHorizontal, Wifi, X, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CHAT_TOPICS, GIGA, POPULAR_QUESTIONS, SPEED_FIX_STEPS, USER } from "@/data/mock";
import { useAppStore } from "@/features/core/appStore";
import { useAgentsStore } from "@/features/aiAgents/store";
import { useActingAccount } from "@/features/family/store";
import { runSpeedAgent } from "@/features/demo/scenarios";
import { useWorkflowStore } from "@/features/workflow/store";
import { isActive, STATUS_LABEL } from "@/features/workflow/rules";
import { openOutage } from "@/features/workflow/services/hybrid";
import { ActionModeTag, GigaAvatar, GigaName, type GigaMood } from "@/features/giga/GigaAvatar";
import { gigaReply, type GigaAction } from "@/features/giga/assistant";
import { handoffToHuman, startIntent } from "@/features/giga/actions";
import { iconFor } from "@/components/tn/icons";
import { NetBadge } from "@/components/tn/NetStatus";
import { BottomSheet } from "@/components/tn/Sheet";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

interface Msg {
  id: number;
  from: "user" | "bot";
  text: string;
  actions?: GigaAction[] | undefined;
  agent?: boolean | undefined;
}

/** Speed-guard steps streamed inside GIGA's message. Success is shown only once the run is done. */
function AgentSteps() {
  const run = useAgentsStore((s) => s.speedRun);
  const navigate = useNavigate();
  const close = useAppStore((s) => s.closeHelp);
  const done = run.status === "done";
  return (
    <div className="mt-2 space-y-2 rounded-2xl border border-magenta/20 bg-card p-3">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-magenta">
        <GigaAvatar size={20} mood={done ? "done" : "working"} label={false} /> GIGA · Hız Koruyucu {done ? "" : "· çalışıyor"}
      </p>
      {SPEED_FIX_STEPS.map((s, i) =>
        i <= run.stepIndex ? (
          <motion.p key={s} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="flex items-start gap-2 text-sm">
            {i < run.stepIndex || done ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" /> : <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-magenta" />}
            <span>{s}</span>
          </motion.p>
        ) : null,
      )}
      {done && (
        <div className="pt-1">
          <p className="font-semibold text-primary">Hızını 20 Mbps'ten 98 Mbps'e yükselttim ✨</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => { close(); navigate({ to: "/hiz-testi" }); }}>
              Hız Testi ile doğrula
            </Button>
            <Button size="sm" variant="outline" onClick={() => { close(); navigate({ to: "/ajanlar/hiz" }); }}>
              Detaylar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function BotBubble({ children, mood = "idle" }: { children: React.ReactNode; mood?: GigaMood }) {
  return (
    <div className="flex max-w-[94%] gap-2">
      <GigaAvatar size={32} mood={mood} label={false} className="mt-0.5" />
      <div className="flex-1 rounded-3xl rounded-tl-md bg-card px-4 py-3 shadow-card">{children}</div>
    </div>
  );
}

/** GIGA: TürkNet's single assistant. Opens from the centre button of the bottom menu. */
export function HelpCenterSheet() {
  const open = useAppStore((s) => s.helpOpen);
  const prefill = useAppStore((s) => s.helpPrefill);
  const close = useAppStore((s) => s.closeHelp);
  const net = useAppStore((s) => s.net);
  const addRecord = useAppStore((s) => s.addRecord);
  const workflows = useWorkflowStore((s) => s.workflows);
  const acting = useActingAccount();
  const navigate = useNavigate();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [topics, setTopics] = useState(false);
  const recorded = useRef(false);
  const scroller = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const idRef = useRef(0);

  const active = workflows.filter(isActive).sort((a, b) => b.updatedAt - a.updatedAt);

  useEffect(() => {
    if (open) {
      track("feature_opened", "giga");
      if (prefill) send(prefill);
      setTimeout(() => inputRef.current?.focus(), 350);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [msgs, typing]);

  const send = (text: string) => {
    const t = text.trim();
    if (!t) return;
    setTopics(false);
    setInput("");
    setMsgs((m) => [...m, { id: ++idRef.current, from: "user", text: t }]);
    setTyping(true);
    setTimeout(() => {
      const wfs = useWorkflowStore.getState().workflows.filter(isActive).sort((a, b) => b.updatedAt - a.updatedAt);
      const r = gigaReply(t, { net: useAppStore.getState().net.status, active: wfs, outage: !!openOutage() });
      setTyping(false);
      setMsgs((m) => [...m, { id: ++idRef.current, from: "bot", text: r.text, actions: r.actions, agent: r.agent === "speed" }]);
      track("cta_clicked", "giga", { topic: r.topic });
      if (r.agent === "speed") {
        if (useAppStore.getState().net.status !== "slow") useAppStore.getState().setNet({ status: "slow", speed: 20 });
        runSpeedAgent();
      }
      if (!recorded.current && r.topic !== "human") {
        recorded.current = true;
        addRecord({ channel: "GIGA", title: `GIGA: "${t.slice(0, 40)}"`, summary: "GIGA talebi ilgili self-servis akışa yönlendirdi.", status: "Tamamlandı" });
      }
      inputRef.current?.focus();
    }, 900);
  };

  const userLines = () => msgs.filter((m) => m.from === "user").map((m) => m.text);

  const toHuman = () => {
    handoffToHuman(userLines());
    close();
    navigate({ to: "/goruntulu-destek" });
  };

  const onAction = (a: GigaAction) => {
    track("cta_clicked", "giga", { action: a.label, kind: a.kind });
    if (a.kind === "ask") return send(a.prompt ?? a.label);
    if (a.kind === "human") return toHuman();
    close();
    if (a.intent) {
      startIntent(a.intent, userLines().at(-1) ?? a.label, navigate);
      return;
    }
    if (a.to) navigate({ to: a.to as "/" });
  };

  const handleClose = () => {
    close();
    setTimeout(() => {
      setMsgs([]);
      recorded.current = false;
    }, 300);
  };

  const inChat = msgs.length > 0;
  const headMood: GigaMood = typing ? "thinking" : input.trim() ? "listening" : "idle";

  return (
    <BottomSheet open={open} onClose={handleClose} full className="bg-background">
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 pb-2 pt-2">
          {inChat ? (
            <button onClick={() => setMsgs([])} aria-label="Geri" className="flex h-11 w-11 items-center justify-center rounded-full text-primary hover:bg-muted">
              <ArrowLeft className="size-5" />
            </button>
          ) : null}
          <GigaAvatar size={46} mood={headMood} />
          <div className="min-w-0 flex-1">
            <p className="text-xl leading-tight text-primary">
              <GigaName />
            </p>
            <p className="truncate text-xs text-muted-foreground">{GIGA.tagline}</p>
            <NetBadge className="mt-1" />
          </div>
          <button onClick={handleClose} aria-label="Kapat" className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
            <X className="size-5" />
          </button>
        </div>

        <div ref={scroller} className="-mx-5 flex-1 overflow-y-auto px-5 pb-4 no-scrollbar">
          {!inChat ? (
            <div className="space-y-5 pt-2">
              <BotBubble>
                <p className="font-semibold text-primary">{GIGA.welcome[0]}</p>
                <p className="mt-1 text-sm leading-relaxed text-foreground">{GIGA.welcome[1]}</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{GIGA.welcome[2]}</p>
                {acting && <p className="mt-2 text-xs text-muted-foreground">Şu an {acting.short} adına işlem yapıyorsun, {acting ? acting.honorific : USER.firstName}.</p>}
              </BotBubble>

              {active.length > 0 && (
                <div>
                  <p className="mb-2 font-semibold text-primary">Kaldığın yerden devam et</p>
                  <div className="space-y-2">
                    {active.slice(0, 2).map((w) => (
                      <button key={w.id} onClick={() => { handleClose(); navigate({ to: "/surec/$id", params: { id: w.id } }); }} className="flex w-full items-center gap-3 rounded-2xl bg-card p-3 text-left shadow-card">
                        <GigaAvatar size={28} mood={w.decision ? "listening" : "working"} label={false} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-foreground">{w.title}</span>
                          <span className="block text-xs text-muted-foreground">{w.decision ? "Kararını bekliyorum" : STATUS_LABEL[w.status]} · bilgilerini tekrar sormam</span>
                        </span>
                        <ChevronRight className="size-4 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                {GIGA.capabilities.map((c) => {
                  const Icon = iconFor(c.icon);
                  return (
                    <button key={c.id} onClick={() => send(c.prompt)} className="flex min-h-[104px] flex-col justify-between rounded-2xl bg-card p-3.5 text-left shadow-card">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-icon-box text-primary">
                        <Icon className="size-5" strokeWidth={1.5} />
                      </span>
                      <span>
                        <span className="block text-sm font-bold text-primary">{c.name}</span>
                        <span className="block text-[11px] leading-snug text-muted-foreground">{c.desc}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <button onClick={() => { handleClose(); navigate({ to: "/dijital-onarim" }); }} className="flex w-full items-center gap-4 rounded-card bg-plum p-4 text-left text-primary-foreground shadow-float">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-foreground/15">
                  <HeartPulse className="size-6" />
                </span>
                <span className="flex-1">
                  <span className="block font-semibold">Dijital Onarım</span>
                  <span className="block text-sm text-primary-foreground/80">Hat değerlerini 30 saniyede kontrol et</span>
                </span>
                <ChevronRight className="size-5" />
              </button>

              <div>
                <p className="mb-2 font-semibold text-primary">Popüler Sorular</p>
                <div className="-mx-5 flex gap-2 overflow-x-auto px-5 no-scrollbar">
                  {POPULAR_QUESTIONS.map((q) => (
                    <button key={q} onClick={() => send(q)} className="min-h-11 shrink-0 rounded-full border border-primary/25 bg-card px-4 text-sm font-semibold text-primary">
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 font-semibold text-primary">Sana Özel Öneriler</p>
                <div className="-mx-5 flex gap-3 overflow-x-auto px-5 no-scrollbar">
                  <button onClick={() => { handleClose(); navigate({ to: "/islem/$slug", params: { slug: "hiz-yukseltme" } }); }} className="w-60 shrink-0 rounded-card bg-referral p-4 text-left shadow-card">
                    <Zap className="size-6 text-magenta" />
                    <p className="mt-2 font-semibold text-primary">1.000 Mbps Hız Fiber İle Seninle!</p>
                  </button>
                  <button onClick={() => { handleClose(); navigate({ to: "/islem/$slug", params: { slug: "fiyat-sabitle" } }); }} className="w-60 shrink-0 rounded-card bg-campaign p-4 text-left text-primary-foreground shadow-card">
                    <Wifi className="size-6" />
                    <p className="mt-2 font-semibold">12 Ay Peşin Ödemede Ayda ₺749,90 Fırsatı!</p>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-2" aria-live="polite">
              {msgs.map((m) => (
                <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn("flex", m.from === "user" ? "justify-end" : "justify-start")}>
                  {m.from === "user" ? (
                    <p className="max-w-[80%] rounded-3xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground">{m.text}</p>
                  ) : (
                    <BotBubble>
                      <p className="text-sm leading-relaxed text-foreground">{m.text}</p>
                      {m.agent && <AgentSteps />}
                      {m.actions && (
                        <div className="mt-3 flex flex-col gap-2">
                          {m.actions.map((a) =>
                            a.kind === "ask" ? null : (
                              <button key={a.label} onClick={() => onAction(a)} className="flex min-h-11 w-full items-center justify-between gap-2 rounded-2xl border border-primary/20 bg-background px-3.5 py-2 text-left">
                                <span className="text-sm font-semibold text-primary">{a.label}</span>
                                {a.kind === "go" ? <ChevronRight className="size-4 text-muted-foreground" /> : <ActionModeTag mode={a.kind} />}
                              </button>
                            ),
                          )}
                          {m.actions.some((a) => a.kind === "ask") && (
                            <div className="flex flex-wrap gap-1.5">
                              {m.actions
                                .filter((a) => a.kind === "ask")
                                .map((a) => (
                                  <button key={a.label} onClick={() => onAction(a)} className="rounded-full border border-primary/20 bg-background px-3 py-1.5 text-xs font-semibold text-primary">
                                    {a.label}
                                  </button>
                                ))}
                            </div>
                          )}
                        </div>
                      )}
                    </BotBubble>
                  )}
                </motion.div>
              ))}
              {typing && (
                <div className="flex items-center gap-2" aria-label="GIGA düşünüyor">
                  <GigaAvatar size={32} mood="thinking" label={false} />
                  <span className="text-xs font-semibold text-muted-foreground">GIGA düşünüyor…</span>
                </div>
              )}
            </div>
          )}
        </div>

        <AnimatePresence>
          {topics && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} className="mb-3 max-h-[50%] overflow-y-auto rounded-card bg-card p-4 shadow-device no-scrollbar">
              {CHAT_TOPICS.map((g) => (
                <div key={g.title} className="mb-3 last:mb-0">
                  <p className="mb-2 text-xs font-bold tracking-wide text-magenta">{g.title}</p>
                  <div className="flex flex-wrap gap-2">
                    {g.items.map((q) => (
                      <button key={q} onClick={() => send(q)} className="min-h-10 rounded-full bg-muted px-3.5 text-sm font-medium text-primary">
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <p className="text-[11px] leading-snug text-muted-foreground">{GIGA.humanNote}</p>
          <button type="button" onClick={toHuman} className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full bg-muted px-3 text-xs font-semibold text-primary">
            <Headset className="size-3.5" /> Uzmana bağlan
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-2 rounded-full border border-border bg-card p-1.5 shadow-card"
        >
          <button type="button" onClick={() => setTopics((v) => !v)} aria-label="Konu seç" aria-expanded={topics} className={cn("flex h-11 w-11 items-center justify-center rounded-full", topics ? "bg-primary text-primary-foreground" : "text-primary hover:bg-muted")}>
            <CircleHelp className="size-6" strokeWidth={1.5} />
          </button>
          <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} placeholder={GIGA.placeholder} aria-label="GIGA'ya mesaj" className="h-11 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          <button type="submit" disabled={!input.trim()} aria-label="Gönder" className="flex h-11 w-11 items-center justify-center rounded-full bg-magenta text-magenta-foreground disabled:opacity-40">
            <SendHorizontal className="size-5" />
          </button>
        </form>
      </div>
    </BottomSheet>
  );
}
