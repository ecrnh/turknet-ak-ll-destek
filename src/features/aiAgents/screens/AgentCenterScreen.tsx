import { Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { CheckCircle2, ChevronDown, ChevronRight, Clock3, Loader2, Mic, RotateCcw, SendHorizontal, SlidersHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/layout/headers";
import { NetBadge } from "@/components/tn/NetStatus";
import { BILL_DISCOUNTS, GENERIC_OPS, GIGA, SUBSCRIPTION, USER } from "@/data/mock";
import { useAppStore } from "@/features/core/appStore";
import { useActingAccount } from "@/features/family/store";
import { ActionModeTag, GigaAvatar, GigaName, type GigaMood } from "@/features/giga/GigaAvatar";
import { gigaReply, nextForChat, type GigaAction, type GigaBillingSummary, type GigaWf } from "@/features/giga/assistant";
import { handoffToHuman, launchIntent } from "@/features/giga/actions";
import { useGigaChat } from "@/features/giga/chatStore";
import { useVoiceInput } from "@/features/giga/useVoiceInput";
import type { UstaIssueId } from "@/data/mock";
import { useWorkflowStore } from "@/features/workflow/store";
import { isActive, nextOpenStep, type Intent } from "@/features/workflow/rules";
import { lastDoneStep } from "@/features/workflow/copy";
import { openOutage } from "@/features/workflow/services/hybrid";
import type { Workflow } from "@/features/workflow/types";
import { AiUstaPanel, RepairProgress } from "@/features/workflow/components/panels";
import { HybridOfferInline } from "@/features/workflow/components/hybrid";
import { DecisionCard, StatusPill } from "@/features/workflow/components/ui";
import { track, useFlow } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { fmtTL } from "@/lib/format";

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

function BillingAnswerCard({ bill }: { bill: GigaBillingSummary }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">{bill.period}</p>
          <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", bill.paid ? "bg-success-soft text-success" : "bg-warning-soft text-warning")}>{bill.paid ? "Ödendi" : "Ödeme bekliyor"}</span>
        </div>
        <p className="mt-1 text-2xl font-bold text-foreground">{fmtTL(bill.amount)} <span className="text-base font-normal text-muted-foreground">/ ay</span></p>
        <div className="mt-4 rounded-xl bg-muted/60 p-3">
          <p className="text-sm font-semibold text-primary">Kullanım özeti</p>
          <p className="mt-1 text-sm text-foreground">Toplam <strong>{bill.usage.total}</strong> · {bill.packageName}</p>
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>İndirme <strong className="text-foreground">{bill.usage.download}</strong></span>
            <span>Yükleme <strong className="text-foreground">{bill.usage.upload}</strong></span>
            <span className="col-span-2">Günlük ortalama <strong className="text-foreground">{bill.usage.dailyAverage}</strong></span>
          </div>
        </div>
        <button type="button" onClick={() => setDetailsOpen((v) => !v)} aria-expanded={detailsOpen} className="mt-3 flex min-h-10 w-full items-center justify-between text-left text-sm font-semibold text-primary">
          Fatura detayları <ChevronDown className={cn("size-4 transition-transform", detailsOpen && "rotate-180")} />
        </button>
        {detailsOpen && (
          <div className="space-y-2 border-t border-border pt-3 text-sm">
            <div className="flex justify-between gap-3"><span className="text-muted-foreground">Son ödeme tarihi</span><strong>{bill.due}</strong></div>
            <div className="flex justify-between gap-3"><span className="text-muted-foreground">Görünen borç</span><strong>{fmtTL(bill.shownDebt)}</strong></div>
            <div className="pt-1"><p className="font-semibold text-primary">Uygulanan indirimler</p><ul className="mt-1 space-y-1 text-xs text-muted-foreground">{bill.discounts.map((d) => <li key={d}>• {d}</li>)}</ul></div>
          </div>
        )}
      </div>
    </div>
  );
}

/** A process GIGA started or was asked about, shown live in the conversation. Decisions are answered right here. */
function ChatProcess({ wfId }: { wfId: string }) {
  const wf = useWorkflowStore((s) => s.workflows.find((w) => w.id === wfId));
  if (!wf) return null;
  const current = nextOpenStep(wf.steps);
  const last = lastDoneStep(wf);
  const usta = wf.type === "ai_usta";
  const running = !usta && isActive(wf) && !wf.decision && current;
  return (
    <div className="ml-10 space-y-2.5">
      <div className="rounded-2xl border border-magenta/20 bg-card p-3.5 shadow-card" aria-live="polite">
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-sm font-semibold text-foreground">{wf.title}</p>
          <StatusPill status={wf.status} />
        </div>
        {last && !usta && (
          <p className="mt-1.5 flex items-start gap-1.5 text-xs text-foreground">
            <CheckCircle2 className="mt-px size-3.5 shrink-0 text-success" /> {last}
          </p>
        )}
        {running && (
          <p className="mt-1 flex items-start gap-1.5 text-xs text-foreground">
            {current.status === "in_progress" ? <Loader2 className="mt-px size-3.5 shrink-0 animate-spin text-magenta" /> : <Clock3 className="mt-px size-3.5 shrink-0 text-muted-foreground" />} {current.label}
          </p>
        )}
        {(!usta || wf.decision || wf.handoff || wf.status === "completed") && <p className="mt-1.5 text-xs text-muted-foreground">{wf.status === "completed" ? wf.outcome?.summary ?? "Bu işlem tamamlandı." : nextForChat(toGigaWf(wf))}</p>}
        <Link to="/surec/$id" params={{ id: wf.id }} className="mt-2 inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-magenta">
          Detayları gör <ChevronRight className="size-4" />
        </Link>
      </div>
      {usta && <RepairProgress wf={wf} />}
      {usta && wf.data["repairOutcome"] === "regional" && <HybridOfferInline />}
      {usta && isActive(wf) && <AiUstaPanel wf={wf} inChat />}
      {wf.decision && <DecisionCard key={wf.decision.key} wf={wf} />}
    </div>
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
  const entryMode = useGigaChat((s) => s.entryMode);
  const add = useGigaChat((s) => s.add);
  const clear = useGigaChat((s) => s.clear);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const name = acting ? acting.short : USER.firstName;

  const userLines = () => useGigaChat.getState().msgs.filter((m) => m.from === "user").map((m) => m.text);

  const runStart = (intent: Intent, said: string, usta?: UstaIssueId | "modem") => {
    const r = launchIntent(intent, said, usta);
    if (r.kind === "workflow") {
      add({ from: "bot", text: "", wfId: r.wfId });
    }
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
      const workflowState = useWorkflowStore.getState();
      const bill = workflowState.bills[0];
      const r = gigaReply(t, {
        net: useAppStore.getState().net.status,
        active: activeSorted(useWorkflowStore.getState().workflows).map(toGigaWf),
        outage: !!openOutage(),
        lastOffer: chat.lastOffer,
        billing: bill ? {
          period: bill.period,
          amount: bill.amount,
          due: bill.due,
          shownDebt: bill.shownDebt,
          paid: bill.status === "paid",
          packageName: SUBSCRIPTION.packageName,
          usage: GENERIC_OPS["kullanim"]?.usage ?? { total: "—", download: "—", upload: "—", dailyAverage: "—" },
          discounts: BILL_DISCOUNTS,
        } : undefined,
      });
      setTyping(false);
      chat.setOffer(r.offer ?? null);
          add({ from: "bot", text: r.text, actions: r.actions, wfId: r.focus, billingCard: r.billingCard });
      track("cta_clicked", "giga", { topic: r.topic });
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
          {entryMode === "qr" ? (
            <>
              <p className="text-sm leading-relaxed text-foreground">Merhaba! Modemini tanıdım. Şimdi bağlantını kontrol ederek sana nasıl yardımcı olabileceğime bakalım.</p>
              <p className="mt-2 text-xs text-muted-foreground">{USER.modemModel} · {USER.modemSerial} · Aboneliğin eşleştirildi</p>
            </>
          ) : (
            <>
              <p className="font-semibold text-primary">{GIGA.welcome[0].replace("{name}", name)}</p>
              <p className="mt-0.5 text-sm text-foreground">{GIGA.welcome[1]}</p>
              {acting && <p className="mt-2 text-xs text-muted-foreground">Şu an {acting.short} adına işlem yapıyorsun.</p>}
              <NetBadge className="mt-2" />
            </>
          )}
        </BotBubble>

        {!inChat && (
          <>
            <section className="ml-10 space-y-2" aria-label="Sık kullanılan konular">
              <p className="px-1 text-xs font-semibold text-muted-foreground">Sık kullanılan konular</p>
              {GIGA.starters.map((s) => (
                <button key={s} type="button" onClick={() => send(s)} className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-primary/15 bg-card px-3.5 py-2 text-left text-sm font-medium text-primary shadow-sm">
                  <span>{s}</span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </section>
            <p className="ml-10 text-xs text-muted-foreground">Kendi cümlelerinle de yazabilir ya da mikrofona dokunup söyleyebilirsin.</p>
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
                        {m.billingCard && <BillingAnswerCard bill={m.billingCard} />}
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
                          <div className="mt-3 flex flex-col gap-2">
                            {m.actions
                              .filter((a) => a.kind === "ask")
                              .map((a) => (
                                <button key={a.label} type="button" onClick={() => onAction(a)} className="flex min-h-10 w-full items-center justify-between gap-2 rounded-xl border border-primary/15 bg-background px-3 py-2 text-left text-sm font-medium text-primary">
                                  <span>{a.label}</span>
                                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
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

