import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Check, Mic, Search, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { GigaAvatar } from "./GigaAvatar";
import { useSearchCtx } from "./searchContext";
import { detectSearchIntent, SEARCH_SUGGESTIONS, type SearchIntent } from "./smartSearch";

const DEMO_PHRASES = ["İnternetimi yeni adresime taşımak istiyorum.", "Bu ay faturam neden yüksek geldi?", "İnternetim çok yavaş.", "Modemimin ışıkları yanmıyor."];

type Rec = { start: () => void; stop: () => void; onresult: ((e: any) => void) | null; onend: (() => void) | null; onerror: (() => void) | null; lang: string; interimResults: boolean };

export function SmartSearchBar() {
  const navigate = useNavigate();
  const setCtx = useSearchCtx((s) => s.set);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [simulated, setSimulated] = useState(false);
  const [heard, setHeard] = useState(false);
  const [result, setResult] = useState<{ query: string; intent: SearchIntent | null } | null>(null);
  const rec = useRef<Rec | null>(null);
  const timer = useRef<number | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const [hint, setHint] = useState(false);
  const [full, setFull] = useState(false);
  useEffect(() => {
    if (sessionStorage.getItem("tn-voice-hint")) return;
    const show = window.setTimeout(() => { setHint(true); sessionStorage.setItem("tn-voice-hint", "1"); }, 1200);
    const hide = window.setTimeout(() => setHint(false), 7200);
    return () => { window.clearTimeout(show); window.clearTimeout(hide); };
  }, []);

  const submit = (text = q) => {
    const t = text.trim();
    if (!t) return;
    const intent = detectSearchIntent(t);
        setResult({ query: t, intent });
    setOpen(true);
  };

  const go = () => {
    if (!result?.intent) return;
    setCtx(result.query, result.intent.id, result.intent.to, result.intent.reply);
    setOpen(false); setFull(false); setResult(null); setQ("");
    navigate({ to: result.intent.to as "/" });
  };

  const startVoice = () => {
    setResult(null); setOpen(true); setListening(true); setHeard(false); setQ("");
    const W = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
    const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (Ctor) {
      try {
        const r = new Ctor();
        r.lang = "tr-TR"; r.interimResults = true;
        r.onresult = (e) => setQ(Array.from(e.results as ArrayLike<{ 0: { transcript: string } }>).map((x) => x[0].transcript).join(""));
        r.onend = () => { setListening(false); setHeard(true); };
        r.onerror = () => simulate();
        rec.current = r; setSimulated(false); r.start();
        return;
      } catch { /* fall through to simulation */ }
    }
    simulate();
  };

  const simulate = () => {
    rec.current = null; setSimulated(true);
    const phrase = DEMO_PHRASES[Math.floor(Math.random() * DEMO_PHRASES.length)] ?? DEMO_PHRASES[0]!;
    let i = 0;
    if (timer.current) window.clearInterval(timer.current);
    timer.current = window.setInterval(() => {
      i += 2; setQ(phrase.slice(0, i));
      if (i >= phrase.length && timer.current) { window.clearInterval(timer.current); timer.current = null; }
    }, 60);
  };

  const stopVoice = () => {
    rec.current?.stop();
    if (timer.current) { window.clearInterval(timer.current); timer.current = null; }
    setListening(false);
    setHeard(true);
  };

  const close = () => { stopVoice(); setHeard(false); setOpen(false); setFull(false); setResult(null); };
  const other = () => { setResult(null); setHeard(false); setQ(""); setOpen(false); setFull(true); };
  const sendHeard = () => { setHeard(false); submit(); };

  return (
    <div className="relative flex-1">
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="flex h-12 items-center gap-2 rounded-full border-2 border-primary/30 bg-card pl-1.5 pr-3 ring-1 ring-primary/5 transition-colors focus-within:border-primary shadow-sm">
        <button type="button" onClick={() => { setHint(false); listening ? stopVoice() : startVoice(); }} aria-label={listening ? "Dinlemeyi durdur" : "Sesle anlat"} className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", listening ? "bg-magenta text-magenta-foreground" : "bg-icon-box text-primary")}>
          <Mic className="size-[18px]" strokeWidth={1.75} />
        </button>
        <input
          ref={input}
          value={q}
          onChange={(e) => { setQ(e.target.value); setResult(null); setHeard(false); }}
          onFocus={() => setFull(true)}
          placeholder="Ne yapmak istiyorsun?"
          aria-label="Aradığın işlemi yaz veya konuşarak anlat"
          enterKeyHint="search"
          className="h-full min-w-0 flex-1 bg-transparent text-[0.78rem] outline-none placeholder:text-muted-foreground"
        />
      </form>
      <p className="mt-1.5 px-1 text-[0.68rem] leading-tight text-muted-foreground">Aradığın işlemi söyleyerek de anlatabilirsin!</p>
      {hint && !open && !full && (
        <div role="status" className="absolute right-0 top-[74px] z-20 flex w-60 items-start gap-2 rounded-2xl bg-primary px-3 py-2.5 text-primary-foreground shadow-float animate-in fade-in slide-in-from-top-1">
          <span aria-hidden className="absolute -top-1.5 right-4 h-3 w-3 rotate-45 bg-primary" />
          <Mic className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
          <p className="flex-1 text-xs leading-snug">Sorununu sesli de söyleyebilirsin. Mikrofona dokunman yeter.</p>
          <button onClick={() => setHint(false)} aria-label="Kapat" className="-mr-1 -mt-0.5 opacity-80"><X className="size-3.5" /></button>
        </div>
      )}

      {full && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background p-4">
          <div className="flex items-center gap-2">
            <form onSubmit={(e) => { e.preventDefault(); const t = q; setFull(false); submit(t); }} className="flex h-12 flex-1 items-center gap-2 rounded-full border-2 border-primary bg-card px-3">
              <Search className="size-5 shrink-0" strokeWidth={1.75} />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ne yapmak istediğini yaz..." aria-label="Ne yapmak istediğini yaz" className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none" />
              <button type="button" onClick={() => { setFull(false); startVoice(); }} aria-label="Sesle anlat" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-icon-box text-primary"><Mic className="size-[18px]" /></button>
            </form>
            <button onClick={close} aria-label="Kapat" className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"><X className="size-5" /></button>
          </div>
          <div className="mt-4 overflow-y-auto">
            <Suggestions title="Popüler sorular" onPick={(s) => { setQ(s); setFull(false); submit(s); }} />
          </div>
        </div>
      )}

      {open && (
        <>
          <button aria-label="Kapat" onClick={close} className="fixed inset-0 z-0 cursor-default bg-primary-deep/20" />
          <div className="fixed inset-x-3 top-[136px] z-10 rounded-card bg-card p-4 shadow-float">
            <button onClick={close} aria-label="Kapat" className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"><X className="size-4" /></button>

            {listening ? (
              <div className="flex flex-col items-center pb-1 pt-2 text-center" aria-live="polite">
                <div className="flex h-10 items-center justify-center gap-1" aria-hidden>
                  {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                    <span key={i} className="h-8 w-1.5 origin-center rounded-full bg-magenta animate-[tnwave_0.9s_ease-in-out_infinite]" style={{ animationDelay: `${i * 0.12}s` }} />
                  ))}
                </div>
                <p className="mt-2 font-semibold text-primary">Seni dinliyorum...</p>
                <p className="mt-2 flex h-11 w-full items-center justify-center rounded-2xl bg-muted px-3 text-sm leading-snug text-foreground">
                  <span className="line-clamp-2">{q || "Konuşmaya başlayabilirsin"}</span>
                </p>
                <p className="mt-1.5 h-4 text-[11px] leading-4 text-muted-foreground">{simulated ? "Ses tanıma yok; örnek cümle simüle ediliyor." : "Türkçe konuşabilirsin"}</p>
                <button onClick={stopVoice} className="mt-3 flex h-11 items-center gap-1.5 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground">
                  <Check className="size-4" /> Tamam
                </button>
              </div>
            ) : heard && !result ? (
              <div className="pt-1" aria-live="polite">
                <p className="mb-2 pr-8 text-sm font-semibold text-primary">Duyduğum bu, istersen düzelt:</p>
                <textarea
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  rows={2}
                  aria-label="Algılanan metin"
                  className="w-full resize-none rounded-2xl border border-border bg-background px-3 py-2 text-sm leading-snug outline-none focus:border-primary"
                />
                <button onClick={sendHeard} disabled={!q.trim()} className="mt-3 flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50">
                  Gönder <ArrowRight className="size-4" />
                </button>
              </div>
            ) : result ? (
              <div aria-live="polite">
                <p className="mb-3 mr-8 rounded-2xl bg-muted px-3 py-2 text-sm text-foreground">“{result.query}”</p>
                <div className="flex gap-2.5">
                  <GigaAvatar size={34} label={false} />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-primary">GIGA{result.intent && <span className="ml-1.5 font-medium text-magenta">· {result.intent.label}</span>}</p>
                    <p className="mt-0.5 text-sm text-foreground">{result.intent ? result.intent.reply : "Ne yapmak istediğini tam anlayamadım. Biraz daha anlatır mısın ya da aşağıdakilerden birini seçer misin?"}</p>
                  </div>
                </div>
                {result.intent ? (
                  <button onClick={go} className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground">
                    {result.intent.cta} <ArrowRight className="size-4" />
                  </button>
                ) : null}
                <button onClick={other} className="mt-2 flex w-full items-center justify-center rounded-full border-2 border-primary/20 py-2.5 text-sm font-semibold text-primary">
                  {result.intent ? "Bunu kastetmedim, başka bir konu" : "Popüler sorulara göz at"}
                </button>
              </div>
            ) : q.trim() ? (
              <button onClick={() => submit()} className="flex w-full items-center gap-2 text-left text-sm text-primary">
                <Search className="size-4" /> “{q}” için ne yapabileceğimi göster
              </button>
            ) : (
              <button onClick={() => { setOpen(false); setFull(true); }} className="flex w-full items-center gap-2 text-left text-sm text-primary">
                <Search className="size-4" /> Popüler sorulara göz at
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Suggestions({ onPick, title = "Neler yapabilirsin?" }: { onPick: (s: string) => void; title?: string }) {
  return (
    <div className="mt-1">
      <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-primary"><Sparkles className="size-4 text-magenta" /> {title}</p>
      <div className="flex flex-col gap-1.5">
        {SEARCH_SUGGESTIONS.map((s) => (
          <button key={s} onClick={() => onPick(s)} className="flex items-center justify-between rounded-2xl bg-muted/60 px-3 py-2.5 text-left text-sm font-medium text-primary hover:bg-muted">
            {s} <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
}
