import { Link } from "@tanstack/react-router";
import { ChevronDown, Headset, Send, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/layout/headers";
import { EmptyState } from "@/components/tn/primitives";
import { fmtDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CHAT_MAX, openLiveChat, sendChat } from "../services/aiUsta";
import { useWorkflowStore } from "../store";
import { SupportSummary } from "./AiUstaSessionScreen";

/** Simulated live support chat. The agent starts with the full troubleshooting context. */
export function LiveChatScreen({ id }: { id: string }) {
  const wf = useWorkflowStore((s) => s.workflows.find((w) => w.id === id));
  const all = useWorkflowStore((s) => s.chats);
  const typing = useWorkflowStore((s) => s.ops.some((o) => o.workflowId === id && o.op === "chat.reply"));
  const msgs = all.filter((m) => m.workflowId === id);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showCtx, setShowCtx] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (wf?.handoff) openLiveChat(id);
  }, [id, wf?.handoff]);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs.length, typing]);

  if (!wf || !wf.handoff)
    return (
      <div>
        <PageHeader title="Canlı Destek" />
        <EmptyState icon={TriangleAlert} title="Canlı destek oturumu bulunamadı" text="Önce AI Usta ile birlikte kontrol edelim; gerekirse sizi bağlamınızla aktarırız." action={<Link to="/ai-usta" className="font-semibold text-magenta">AI Usta'ya git</Link>} />
      </div>
    );

  const last = msgs[msgs.length - 1];
  const replies = !typing && last?.from === "agent" ? (last.replies ?? []) : [];

  const send = (t: string, replyId?: string) => {
    if (!t.trim()) return setError("Lütfen bir mesaj yazın.");
    if (t.length > CHAT_MAX) return setError(`Mesajınız en fazla ${CHAT_MAX} karakter olabilir.`);
    setError(null);
    if (sendChat(id, t, replyId)) setText("");
  };

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title={
          <span className="flex flex-col">
            <span>Canlı Destek</span>
            <span className="text-xs font-normal text-muted-foreground">Temsilci Selin · çevrimiçi (demo)</span>
          </span>
        }
      />
      <div className="px-4">
        <button type="button" onClick={() => setShowCtx((v) => !v)} aria-expanded={showCtx} className="flex w-full items-center gap-2 rounded-2xl bg-success-soft px-3 py-2.5 text-left text-xs font-semibold text-foreground">
          <Headset className="size-4 text-success" />
          <span className="flex-1">Temsilci yaptığınız tüm kontrolleri görüyor · {wf.handoff.id}</span>
          <ChevronDown className={cn("size-4 transition-transform", showCtx && "rotate-180")} />
        </button>
        {showCtx && (
          <div className="mt-2">
            <SupportSummary wf={wf} />
          </div>
        )}
      </div>

      <div className="flex-1 space-y-2.5 px-4 py-4" aria-live="polite">
        {msgs.map((m) =>
          m.from === "system" ? (
            <p key={m.id} className="text-center text-[11px] text-muted-foreground">
              {m.text} · {fmtDateTime(m.at)}
            </p>
          ) : (
            <p key={m.id} className={cn("max-w-[85%] rounded-2xl px-4 py-2.5 text-sm", m.from === "agent" ? "rounded-tl-sm bg-card text-foreground shadow-card" : "ml-auto rounded-tr-sm bg-primary text-primary-foreground")}>
              {m.text}
            </p>
          ),
        )}
        {typing && <p className="w-16 rounded-2xl bg-card px-4 py-2.5 text-center text-sm tracking-widest text-muted-foreground shadow-card">•••</p>}
        <div ref={end} />
      </div>

      <div className="sticky bottom-0 space-y-2 bg-background/95 px-4 pb-4 pt-2 backdrop-blur">
        {replies.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {replies.map((r) => (
              <button key={r.id} type="button" onClick={() => send(r.label, r.id)} className="min-h-10 rounded-full border border-primary/25 bg-card px-3.5 text-sm font-semibold text-primary">
                {r.label}
              </button>
            ))}
          </div>
        )}
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            send(text);
          }}
          className="flex items-center gap-2"
        >
          <label htmlFor="chat-input" className="sr-only">
            Mesajınız
          </label>
          <input
            id="chat-input"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setError(null);
            }}
            maxLength={CHAT_MAX + 1}
            placeholder="Mesajınızı yazın"
            className="h-12 flex-1 rounded-full border border-border bg-card px-4 text-sm outline-none focus:border-primary"
          />
          <button type="submit" aria-label="Gönder" className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-float">
            <Send className="size-5" />
          </button>
        </form>
        {error && <p className="text-xs font-medium text-destructive">{error}</p>}
        <p className="text-center text-[10px] text-muted-foreground">Prototip: temsilci yanıtları önceden hazırlanmış demo mesajlardır.</p>
      </div>
    </div>
  );
}
