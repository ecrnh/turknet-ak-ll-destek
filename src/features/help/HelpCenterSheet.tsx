import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Bot, CheckCircle2, ChevronRight, CircleHelp, HeartPulse, Loader2, SendHorizontal, Wifi, X, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CHAT_TOPICS, POPULAR_QUESTIONS, SPEED_FIX_STEPS, USER } from "@/data/mock";
import { useAppStore } from "@/features/core/appStore";
import { useAgentsStore } from "@/features/aiAgents/store";
import { useGiftStore } from "@/features/giftData/store";
import { useActingAccount } from "@/features/family/store";
import { runSpeedAgent } from "@/features/demo/scenarios";
import { NetBadge } from "@/components/tn/NetStatus";
import { BottomSheet } from "@/components/tn/Sheet";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { botReply, type ChatAction } from "./chatEngine";

interface Msg {
  id: number;
  from: "user" | "bot";
  text: string;
  actions?: ChatAction[];
  agent?: boolean;
}

function AgentSteps() {
  const run = useAgentsStore((s) => s.speedRun);
  const navigate = useNavigate();
  const close = useAppStore((s) => s.closeHelp);
  return (
    <div className="mt-2 space-y-2 rounded-2xl border border-magenta/20 bg-card p-3">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-magenta">
        <Bot className="size-4" /> Hız Koruyucu Ajan · canlı
      </p>
      {SPEED_FIX_STEPS.map((s, i) =>
        i <= run.stepIndex ? (
          <motion.p key={s} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="flex items-start gap-2 text-sm">
            {i < run.stepIndex || run.status === "done" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" /> : <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-magenta" />}
            <span>{s}</span>
          </motion.p>
        ) : null,
      )}
      {run.status === "done" && (
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

export function HelpCenterSheet() {
  const open = useAppStore((s) => s.helpOpen);
  const prefill = useAppStore((s) => s.helpPrefill);
  const close = useAppStore((s) => s.closeHelp);
  const net = useAppStore((s) => s.net);
  const addRecord = useAppStore((s) => s.addRecord);
  const giftGB = useGiftStore((s) => s.giftGB);
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

  useEffect(() => {
    if (open) {
      track("feature_opened", "help_center");
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
      const r = botReply(t, net, giftGB);
      setTyping(false);
      setMsgs((m) => [...m, { id: ++idRef.current, from: "bot", text: r.text, actions: r.actions, agent: r.agent === "speed" }]);
      if (r.agent === "speed") {
        if (useAppStore.getState().net.status !== "slow") useAppStore.getState().setNet({ status: "slow", speed: 20 });
        runSpeedAgent();
      }
      if (!recorded.current) {
        recorded.current = true;
        addRecord({ channel: "Chat", title: `Asistan: "${t.slice(0, 40)}"`, summary: "Dijital asistan self-servis akışa yönlendirdi, canlı chat'e aktarılmadı.", status: "Tamamlandı" });
      }
      inputRef.current?.focus();
    }, 900);
  };

  const onAction = (a: ChatAction) => {
    track("cta_clicked", "help_center", { action: a.label });
    if (a.to) {
      close();
      navigate({ to: a.to as "/" });
    }
  };

  const handleClose = () => {
    close();
    setTimeout(() => {
      setMsgs([]);
      recorded.current = false;
    }, 300);
  };

  const inChat = msgs.length > 0;

  return (
    <BottomSheet open={open} onClose={handleClose} full className="bg-background">
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 pb-2 pt-2">
          {inChat ? (
            <button onClick={() => setMsgs([])} aria-label="Geri" className="flex h-11 w-11 items-center justify-center rounded-full text-primary hover:bg-muted">
              <ArrowLeft className="size-5" />
            </button>
          ) : null}
          <div className="flex-1">
            <p className="text-xl font-semibold text-primary">Merhaba, {acting ? acting.honorific : USER.firstName}</p>
            <NetBadge className="mt-1" />
          </div>
          <button onClick={handleClose} aria-label="Kapat" className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
            <X className="size-5" />
          </button>
        </div>

        <div ref={scroller} className="-mx-5 flex-1 overflow-y-auto px-5 pb-4 no-scrollbar">
          {!inChat ? (
            <div className="space-y-5 pt-2">
              <button onClick={() => { handleClose(); navigate({ to: "/dijital-onarim" }); }} className="flex w-full items-center gap-4 rounded-card bg-plum p-5 text-left text-primary-foreground shadow-float">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-foreground/15">
                  <HeartPulse className="size-6" />
                </span>
                <span className="flex-1">
                  <span className="block text-lg font-semibold">Dijital Onarım</span>
                  <span className="block text-sm text-primary-foreground/80">Hat değerlerini 30 saniyede kontrol et</span>
                </span>
                <ChevronRight className="size-5" />
              </button>

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
            </div>
          ) : (
            <div className="space-y-3 pt-2" aria-live="polite">
              {msgs.map((m) => (
                <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn("flex", m.from === "user" ? "justify-end" : "justify-start")}>
                  {m.from === "user" ? (
                    <p className="max-w-[80%] rounded-3xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground">{m.text}</p>
                  ) : (
                    <div className="flex max-w-[92%] gap-2">
                      <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-magenta-soft text-magenta">
                        <Bot className="size-4" />
                      </span>
                      <div className="flex-1">
                        <p className="text-sm leading-relaxed text-foreground">{m.text}</p>
                        {m.agent && <AgentSteps />}
                        {m.actions && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {m.actions.map((a) => (
                              <Button key={a.label} size="sm" variant="outline" onClick={() => onAction(a)}>
                                {a.label}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
              {typing && (
                <div className="flex items-center gap-1.5 pl-10" aria-label="Yazıyor">
                  {[0, 1, 2].map((i) => (
                    <motion.span key={i} className="h-2 w-2 rounded-full bg-magenta" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: i * 0.15 }} />
                  ))}
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
          <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Size nasıl yardımcı olabiliriz?" aria-label="Mesaj" className="h-11 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          <button type="submit" disabled={!input.trim()} aria-label="Gönder" className="flex h-11 w-11 items-center justify-center rounded-full bg-magenta text-magenta-foreground disabled:opacity-40">
            <SendHorizontal className="size-5" />
          </button>
        </form>
      </div>
    </BottomSheet>
  );
}
