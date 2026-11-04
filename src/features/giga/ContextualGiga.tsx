import { useRouterState } from "@tanstack/react-router";
import { Headset, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/features/core/appStore";
import { GigaAvatar } from "./GigaAvatar";
import { useSearchCtx } from "./searchContext";
import { contextualReply, SEARCH_INTENTS } from "./smartSearch";

/** Small GIGA entry on the screen the smart search led to; keeps the original request. */
export function ContextualGiga() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { query, intent, to, msgs, push, clear } = useSearchCtx();
  const openHelp = useAppStore((s) => s.openHelp);
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [text, setText] = useState("");
  const [live, setLive] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { setHidden(false); setOpen(false); }, [to]);
  useEffect(() => end.current?.scrollIntoView({ block: "end" }), [msgs.length, open]);

  if (!intent || !to || !query || !path.startsWith(to)) return null;
  const info = SEARCH_INTENTS[intent];

  const send = (t = text) => {
    if (!t.trim()) return;
    push({ from: "user", text: t });
    const r = contextualReply(info, t);
    push({ from: "giga", text: r.text });
    setLive(r.live); setText("");
  };

  const toLive = () => {
    const summary = `Canlı desteğe bağlanmak istiyorum. Talebim: “${query}”. Konu: ${info.label}. Bulunduğum adım: ${info.label} ekranı. ${info.helpAction}`;
    setOpen(false); clear();
    openHelp(summary);
  };

  if (hidden) return null;

  if (!open)
    return (
      <div className="pointer-events-none absolute inset-x-3 bottom-[104px] z-40 flex justify-end">
        <div className="pointer-events-auto flex max-w-[300px] items-start gap-2.5 rounded-card border border-border bg-card p-3 shadow-float">
          <GigaAvatar size={32} label={false} />
          <div className="flex-1">
            <p className="text-xs font-bold text-primary">GIGA</p>
            <p className="text-[13px] leading-snug text-foreground">Aradığın işlemi bulabildin mi? Takıldığın bir nokta varsa birlikte çözelim.</p>
            <button onClick={() => setOpen(true)} className="mt-2 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground">GIGA ile devam et</button>
          </div>
          <button onClick={() => setHidden(true)} aria-label="Gizle" className="-mr-1 -mt-1 flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"><X className="size-3.5" /></button>
        </div>
      </div>
    );

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end bg-primary-deep/30">
      <button aria-label="Kapat" className="flex-1 cursor-default" onClick={() => setOpen(false)} />
      <div className="flex max-h-[70%] flex-col rounded-t-[28px] bg-card shadow-float">
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
          <GigaAvatar size={32} label={false} />
          <div className="flex-1">
            <p className="text-sm font-bold text-primary">GIGA</p>
            <p className="text-[11px] text-muted-foreground">{info.label} · talebin hatırlanıyor</p>
          </div>
          <button onClick={() => setOpen(false)} aria-label="Kapat" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted"><X className="size-4" /></button>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3 no-scrollbar">
          {msgs.map((m, i) => (
            <p key={i} className={m.from === "user" ? "ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-primary px-3 py-2 text-sm text-primary-foreground" : "max-w-[85%] rounded-2xl rounded-bl-md bg-muted px-3 py-2 text-sm text-foreground"}>{m.text}</p>
          ))}
          {msgs.length <= 2 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {["Buradan nasıl devam edeceğimi anlayamadım.", "Canlı desteğe bağlan"].map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded-full border border-primary/20 px-3 py-1.5 text-xs font-semibold text-primary">{s}</button>
              ))}
            </div>
          )}
          {live && (
            <button onClick={toLive} className="flex items-center gap-1.5 rounded-full bg-magenta px-4 py-2 text-xs font-semibold text-magenta-foreground">
              <Headset className="size-4" /> Canlı desteğe aktar (konuşma iletilir)
            </button>
          )}
          <div ref={end} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-center gap-2 border-t border-border p-3">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="GIGA'ya yaz..." aria-label="GIGA'ya yaz" className="h-11 flex-1 rounded-full border border-border bg-background px-4 text-sm outline-none" />
          <button type="submit" aria-label="Gönder" className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground"><Send className="size-4" /></button>
        </form>
      </div>
    </div>
  );
}
