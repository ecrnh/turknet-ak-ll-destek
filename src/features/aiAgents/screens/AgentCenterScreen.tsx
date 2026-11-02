import { Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { CheckCircle2, ChevronRight, Clock3, Loader2, MessageCircle, Mic, RotateCcw, SendHorizontal, SlidersHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/layout/headers";
import { NetBadge } from "@/components/tn/NetStatus";
import { Button } from "@/components/ui/button";
import { GIGA, SPEED_FIX_STEPS, USER } from "@/data/mock";
import { useAppStore } from "@/features/core/appStore";
import { useActingAccount } from "@/features/family/store";
import { runSpeedAgent } from "@/features/demo/scenarios";
import { useAgentsStore } from "@/features/aiAgents/store";
import { ActionModeTag, GigaAvatar, GigaName, type GigaMood } from "@/features/giga/GigaAvatar";
import { gigaReply, nextForChat, type GigaAction, type GigaWf } from "@/features/giga/assistant";
import { handoffToHuman, launchIntent } from "@/features/giga/actions";
import { useGigaChat } from "@/features/giga/chatStore";
import { useVoiceInput } from "@/features/giga/useVoiceInput";
import type { UstaIssueId } from "@/data/mock";
import { useWorkflowStore } from "@/features/workflow/store";
import { isActive, nextOpenStep, STATUS_LABEL, type Intent } from "@/features/workflow/rules";
import { lastDoneStep } from "@/features/workflow/copy";
import { openOutage } from "@/features/workflow/services/hybrid";
import type { Workflow } from "@/features/workflow/types";
import { AiUstaPanel } from "@/features/workflow/components/panels";
import { DecisionCard, StatusPill } from "@/features/workflow/components/ui";
import { track, useFlow } from "@/lib/analytics";
import { fmtRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

const toGigaWf = (w: Workflow): GigaWf => ({ id: w.id, type: w.type, title: w.title, status: w.status, nextStep: w.nextStep, waiting: !!w.decision, team: w.handoff?.team ?? null });

const activeSorted = (list: Workflow[]) => list.filter(isActive).sort((a, b) => Number(!!b.decision) - Number(!!a.decision) || b.updatedAt - a.updatedAt);

function BotBubble({ children, mood = "idle" }: { children: React.ReactNode; mood?: GigaMood }) {
  return (
    <div className="flex max-w-[94%] gap-2">
      <GigaAvatar size={32} mood={mood} label={false} className="mt-0.5" />
      <div className="flex-1 rounded-3xl rounded-tl-md bg-card px-4 py-3 shadow-card">{children}</div>
    </div>
  );
}

/** Hız Koruyucu steps streamed inside GIGA's message. Success is shown only once the run is done. */
function AgentSteps() {
  const run = useAgentsStore((s) => s.speedRun);
  const navigate = useNavigate();
  const done = run.status === "done";
  return (
    <div className="mt-2 space-y-2 rounded-2xl border border-magenta/20 bg-card p-3">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-magenta">
        <GigaAvatar size={20} mood={done ? "done" : "working"} label={false} /> Hız Koruyucu {done ? "" : "· çalışıyor"}
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
            <Button size="sm" onClick={() => navigate({ to: "/hiz-testi" })}>Hız Testi ile doğrula</Button>
            <Button size="sm" variant="outline" onClick={() => navigate({ to: "/ajanlar/hiz" })}>Detaylar</Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** A process GIGA started or was asked about, shown live in the conversation. Decisions are answered right here. */
function ChatProcess({ wfId }: { wfId: string }) {
  const wf = useWorkflowStore((s) => s.workflows.find((w) => w.id === wfId));
  if (!wf) return null;
  const current = nextOpenStep(wf.steps);
  const last = lastDoneStep(wf);
  const running = isActive(wf) && !wf.decision && current;
  return (
    <div className="ml-10 space-y-2.5">
      <div className="rounded-2xl border border-magenta/20 bg-card p-3.5 shadow-card" aria-live="polite">
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-sm font-semibold text-foreground">{wf.title}</p>
          <StatusPill status={wf.status} />
        </div>
        {last && (
          <p className="mt-1.5 flex items-start gap-1.5 text-xs text-foreground">
            <CheckCircle2 className="mt-px size-3.5 shrink-0 text-success" /> {last}
          </p>
        )}
        {running && (
          <p className="mt-1 flex items-start gap-1.5 text-xs text-foreground">
            {current.status === "in_progress" ? <Loader2 className="mt-px size-3.5 shrink-0 animate-spin text-magenta" /> : <Clock3 className="mt-px size-3.5 shrink-0 text-muted-foreground" />} {current.label}
          </p>
        )}
        <p className="mt-1.5 text-xs text-muted-foreground">{wf.status === "completed" ? wf.outcome?.summary ?? "Bu işlem tamamlandı." : nextForChat(toGigaWf(wf))}</p>
        <Link to="/surec/$id" params={{ id: wf.id }} className="mt-2 inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-magenta">
          Detayları gör <ChevronRight className="size-4" />
        </Link>
      </div>
      {wf.type === "ai_usta" && isActive(wf) && <AiUstaPanel wf={wf} />}
      {wf.decision && <DecisionCard key={wf.decision.key} wf={wf} />}
    </div>
  );
}

/** "Devam Eden İşlemlerin": only when something is active; compact rows, no empty card. */
function ActiveProcesses({ onAsk }: { onAsk: (text: string) => void }) {
  const workflows = useWorkflowStore((s) => s.workflows);
  const active = activeSorted(workflows);
  if (!active.length) return null;
  return (
    <section aria-labelledby="giga-active">
      <div className="mb-2 flex items-center justify-between">
        <h2 id="giga-active" className="font-semibold text-primary">Devam Eden İşlemlerin</h2>
        {active.length > 3 && <Link to="/takip" className="text-sm font-semibold text-magenta">Tümü</Link>}
      </div>
      <ul className="divide-y divide-border rounded-card bg-card shadow-card">
        {active.slice(0, 3).map((w) => (
          <li key={w.id} className="px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 truncate text-sm font-semibold text-foreground">{w.title}</p>
              <span className={cn("shrink-0 text-xs font-semibold", w.decision ? "text-warning" : "text-primary")}>{w.decision ? "Kararını bekliyor" : STATUS_LABEL[w.status]}</span>
            </div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground">Son güncelleme {fmtRelative(w.updatedAt)}</span>
              <span className="flex items-center gap-3">
                <button type="button" onClick={() => onAsk(`${w.title} ne durumda?`)} className="inline-flex min-h-8 items-center gap-1 text-xs font-semibold text-primary">
                  <MessageCircle className="size-3.5" /> Sor
                </button>
                <Link to="/surec/$id" params={{ id: w.id }} className="inline-flex min-h-8 items-center text-xs font-semibold text-magenta">
                  Detayları gör <ChevronRight className="size-3.5" />
                </Link>
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * GIGA: the single way into support. The customer writes, speaks or taps a
 * suggestion; GIGA understands the need and starts the matching existing flow
 * (GIGA Teknik, Fatura Kalkanı, Taşınma ve Nakil, Hibrit İnternet, görüntülü
 * destek, işlem takibi) through the shared services.
 */
export function AgentCenterScreen() {
  useFlow("giga");
  const navigate = useNavigate();
  const acting = useActingAccount();
  const helpOpen = useAppStore((s) => s.helpOpen);
  const msgs = useGigaChat((s) => s.msgs);
  const add = useGigaChat((s) => s.add);
  const clear = useGigaChat((s) => s.clear);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const name = acting ? acting.short : USER.firstName;

  const userLines = () => useGigaChat.getState().msgs.filter((m) => m.from === "user").map((m) => m.text);

  const runStart = (intent: Intent, said: string, usta?: UstaIssueId | "modem") => {
    const r = launchIntent(intent, said, usta);
    if (r.kind === "workflow") add({ from: "bot", text: "", wfId: r.wfId });
    else if (r.kind === "clear") add({ from: "bot", text: r.text, actions: [{ label: "Fatura Kalkanı'nda gör", kind: "go", to: "/fatura-kalkani" }] });
    else navigate({ to: r.to as "/" });
  };

  const send = (text: string) => {
    const t = text.trim();
    if (!t) return;
    setInput("");
    add({ from: "user", text: t });
    setTyping(true);
    window.setTimeout(() => {
      const chat = useGigaChat.getState();
      const r = gigaReply(t, {
        net: useAppStore.getState().net.status,
        active: activeSorted(useWorkflowStore.getState().workflows).map(toGigaWf),
        outage: !!openOutage(),
        lastOffer: chat.lastOffer,
      });
      setTyping(false);
      chat.setOffer(r.offer ?? null);
      add({ from: "bot", text: r.text, actions: r.actions, agent: r.agent === "speed", wfId: r.focus });
      track("cta_clicked", "giga", { topic: r.topic });
      if (r.agent === "speed") {
        if (useAppStore.getState().net.status !== "slow") useAppStore.getState().setNet({ status: "slow", speed: 20 });
        runSpeedAgent();
      }
      if (r.start) {
        const start = r.start;
        window.setTimeout(() => runStart(start, t, r.usta), start === "relocation" ? 1400 : 600);
      }
    }, 700);
  };

  const voice = useVoiceInput(send);

  // Entry from the home page box (or any "ask GIGA" button): send what was written there.
  useEffect(() => {
    if (!helpOpen) return;
    const { helpPrefill, closeHelp } = useAppStore.getState();
    closeHelp();
    if (helpPrefill) send(helpPrefill);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [helpOpen]);

  useEffect(() => {
    if (!msgs.length) return;
    // Wait a frame so the new bubble (and any live process card) has its height.
    const t = window.setTimeout(() => {
      const el = document.getElementById("tn-scroll");
      el?.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }, 120);
    return () => window.clearTimeout(t);
  }, [msgs, typing]);

  const onAction = (a: GigaAction) => {
    track("cta_clicked", "giga", { action: a.label, kind: a.kind });
    if (a.kind === "ask") return send(a.prompt ?? a.label);
    if (a.kind === "human") {
      handoffToHuman(userLines());
      return navigate({ to: "/goruntulu-destek" });
    }
    if (a.intent) return runStart(a.intent, userLines().at(-1) ?? a.label);
    if (a.to) navigate({ to: a.to as "/" });
  };

  const mood: GigaMood = voice.listening ? "listening" : typing ? "thinking" : input.trim() ? "listening" : "idle";
  const inChat = msgs.length > 0;

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <GigaAvatar size={30} mood={mood} label={false} />
            <GigaName />
          </span>
        }
        right={
          inChat ? (
            <button type="button" onClick={clear} className="mr-1 inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-primary hover:bg-muted">
              <RotateCcw className="size-3.5" /> Yeni sohbet
            </button>
          ) : (
            <Link to="/ajanlar/kontroller" aria-label="Otomatik kontroller ve gizlilik" className="mr-1 flex h-11 w-11 items-center justify-center rounded-full text-primary hover:bg-muted">
              <SlidersHorizontal className="size-5" />
            </Link>
          )
        }
      />

      <div className="flex-1 space-y-4 px-4 pb-20">
        <BotBubble mood={mood}>
          <p className="font-semibold text-primary">{GIGA.welcome[0].replace("{name}", name)}</p>
          <p className="mt-0.5 text-sm text-foreground">{GIGA.welcome[1]}</p>
          {acting && <p className="mt-2 text-xs text-muted-foreground">Şu an {acting.short} adına işlem yapıyorsun.</p>}
          <NetBadge className="mt-2" />
        </BotBubble>

        {!inChat && (
          <>
            <div className="ml-10 flex flex-wrap gap-2" aria-label="Önerilen konular">
              {GIGA.starters.map((s) => (
                <button key={s} type="button" onClick={() => send(s)} className="min-h-10 rounded-full border border-primary/25 bg-card px-3.5 text-sm font-semibold text-primary">
                  {s}
                </button>
              ))}
            </div>
            <p className="ml-10 text-xs text-muted-foreground">Kendi cümlelerinle de yazabilir ya da mikrofona dokunup söyleyebilirsin.</p>
            <ActiveProcesses onAsk={send} />
          </>
        )}

        {inChat && (
          <div className="space-y-3" aria-live="polite">
            {msgs.map((m) => (
              <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn("flex flex-col", m.from === "user" ? "items-end" : "items-stretch")}>
                {m.from === "user" ? (
                  <p className="max-w-[80%] rounded-3xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground">{m.text}</p>
                ) : (
                  <div className="space-y-2.5">
                    {m.text && (
                      <BotBubble>
                        <p className="text-sm leading-relaxed text-foreground">{m.text}</p>
                        {m.agent && <AgentSteps />}
                        {m.actions && m.actions.some((a) => a.kind !== "ask") && (
                          <div className="mt-3 flex flex-col gap-2">
                            {m.actions
                              .filter((a) => a.kind !== "ask")
                              .map((a) => (
                                <button key={a.label} type="button" onClick={() => onAction(a)} className="flex min-h-11 w-full items-center justify-between gap-2 rounded-2xl border border-primary/20 bg-background px-3.5 py-2 text-left">
                                  <span className="text-sm font-semibold text-primary">{a.label}</span>
                                  {a.kind === "go" ? <ChevronRight className="size-4 text-muted-foreground" /> : <ActionModeTag mode={a.kind as "auto" | "approval" | "human"} />}
                                </button>
                              ))}
                          </div>
                        )}
                        {m.actions && m.actions.some((a) => a.kind === "ask") && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {m.actions
                              .filter((a) => a.kind === "ask")
                              .map((a) => (
                                <button key={a.label} type="button" onClick={() => onAction(a)} className="rounded-full border border-primary/20 bg-background px-3 py-1.5 text-xs font-semibold text-primary">
                                  {a.label}
                                </button>
                              ))}
                          </div>
                        )}
                      </BotBubble>
                    )}
                    {m.wfId && <ChatProcess wfId={m.wfId} />}
                  </div>
                )}
              </motion.div>
            ))}
            {typing && (
              <div className="flex items-center gap-2" aria-label="GIGA düşünüyor">
                <GigaAvatar size={32} mood="thinking" label={false} />
                <span className="text-xs font-semibold text-muted-foreground">Yazıyor…</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-[80px] z-30 bg-gradient-to-t from-background via-background to-transparent px-4 pb-2 pt-3">
        {voice.listening && (
          <p className="mb-2 flex items-center justify-center gap-2 text-xs font-semibold text-magenta" role="status">
            <span className="h-2 w-2 animate-pulse rounded-full bg-magenta" /> Dinliyorum…
          </p>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-2 rounded-full border border-border bg-card p-1.5 shadow-card"
        >
          <button
            type="button"
            onClick={voice.toggle}
            aria-label={voice.listening ? "Dinlemeyi durdur" : "Sesli anlat"}
            aria-pressed={voice.listening}
            className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full", voice.listening ? "bg-magenta text-magenta-foreground" : "text-primary hover:bg-muted")}
          >
            <Mic className="size-5" />
          </button>
          <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} placeholder={GIGA.placeholder} aria-label="GIGA'ya mesaj" className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          <button type="submit" disabled={!input.trim()} aria-label="Gönder" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-magenta text-magenta-foreground disabled:opacity-40">
            <SendHorizontal className="size-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
