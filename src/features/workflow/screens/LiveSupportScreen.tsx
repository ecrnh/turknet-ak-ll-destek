import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { AlertTriangle, CalendarCheck, Headset, SendHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/layout/headers";
import { EmptyState } from "@/components/tn/primitives";
import { Button } from "@/components/ui/button";
import { GigaAvatar } from "@/features/giga/GigaAvatar";
import { useFlow } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { acceptFieldVisit, declineFieldVisit, handoffSummary, LIVE_AGENT, openLiveChat, sendLiveChat } from "../services/liveSupport";
import { useWorkflowStore } from "../store";
import { DemoNote } from "../components/ui";

/** Context-preserving live support: summary first, then a chat where the agent already knows everything. */
export function LiveSupportScreen({ id }: { id: string }) {
  useFlow("live_support");
  const wf = useWorkflowStore((s) => s.workflows.find((w) => w.id === id));
  const connectivity = useWorkflowStore((s) => s.connectivity);
  const chat = useWorkflowStore((s) => s.chats.find((c) => c.workflowId === id));
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [chat?.messages.length]);

  if (!wf)
    return (
      <div>
        <PageHeader title="Canlı Destek" />
        <EmptyState icon={AlertTriangle} title="İşlem bulunamadı" text="Demo sıfırlanmış olabilir." action={<Link to="/takip" className="font-semibold text-magenta">İşlemlerim</Link>} />
      </div>
    );

  if (!wf.handoff)
    return (
      <div>
        <PageHeader title="Canlı Destek" />
        <div className="px-4">
          <EmptyState
            icon={Headset}
            title="Önce birlikte çözmeyi deneyelim"
            text="Bu işlem henüz uzmana aktarılmadı. İstersen işlem sayfasından canlı desteğe bağlanabilirsin."
            action={<Link to="/surec/$id" params={{ id }} className="font-semibold text-magenta">İşleme dön</Link>}
          />
        </div>
      </div>
    );

  const summary = handoffSummary(wf, connectivity);
  const pendingOffer = chat?.messages.some((m) => m.offer === "field_visit") && !wf.data["fieldVisit"] && !chat?.messages.some((m) => m.from === "customer" && m.text === "Şimdilik gerek yok.");

  const send = () => {
    if (!text.trim()) return setError("Mesajını yaz, sonra gönder.");
    setError(null);
    sendLiveChat(id, text);
    setText("");
  };

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader title="Canlı Destek" />
      <div className="flex-1 space-y-4 px-4 pb-4">
        {!chat ? (
          <>
            <div className="rounded-card bg-plum p-5 text-primary-foreground shadow-float">
              <div className="flex items-center gap-3">
                <GigaAvatar size={44} mood="done" />
                <p className="text-lg font-semibold leading-snug">Temsilciye seni tekrar tekrar anlatmak zorunda kalmayacaksın.</p>
              </div>
              <p className="mt-2 text-sm text-primary-foreground/80">Temsilcin görüşmeye bu bilgilerle başlayacak:</p>
            </div>
            <dl className="divide-y divide-border rounded-card bg-card px-5 shadow-card">
              {summary.map((r) => (
                <div key={r.label} className="py-3">
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{r.label}</dt>
                  <dd className="mt-0.5 text-sm text-foreground">{r.value}</dd>
                </div>
              ))}
            </dl>
            <Button size="xl" className="w-full rounded-full" onClick={() => openLiveChat(id)}>
              <Headset /> Canlı desteğe geç
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 rounded-card bg-card p-4 shadow-card">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">S</span>
              <div className="flex-1">
                <p className="font-semibold text-foreground">{LIVE_AGENT}</p>
                <p className="flex items-center gap-1.5 text-xs text-success"><span className="h-2 w-2 rounded-full bg-success" /> Çevrimiçi · demo temsilci</p>
              </div>
            </div>
            <div ref={scroller} className="space-y-3" aria-live="polite">
              {chat.messages.map((m) => (
                <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn("flex gap-2", m.from === "customer" ? "justify-end" : "justify-start")}>
                  {m.from === "giga" && <GigaAvatar size={28} label={false} />}
                  {m.from === "agent" && <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">S</span>}
                  <p className={cn("max-w-[80%] rounded-3xl px-4 py-2.5 text-sm", m.from === "customer" ? "rounded-br-md bg-primary text-primary-foreground" : m.from === "giga" ? "rounded-tl-md bg-magenta-soft text-foreground" : "rounded-tl-md bg-card text-foreground shadow-card")}>{m.text}</p>
                </motion.div>
              ))}
            </div>
            {pendingOffer && (
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => acceptFieldVisit(id)}><CalendarCheck /> Evet, randevu oluştur</Button>
                <Button variant="outline" onClick={() => declineFieldVisit(id)}>Şimdilik gerek yok</Button>
              </div>
            )}
            {wf.data["fieldVisit"] && (
              <Link to="/surec/$id" params={{ id }} className="flex min-h-12 items-center justify-center rounded-full border border-primary/20 bg-card text-sm font-semibold text-primary">
                İşlemlerim'de takip et
              </Link>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="sticky bottom-24"
            >
              <div className="flex items-center gap-2 rounded-full border border-border bg-card p-1.5 shadow-card">
                <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Mesajını yaz…" aria-label="Temsilciye mesaj" aria-invalid={!!error} className="h-11 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground" />
                <button type="submit" aria-label="Gönder" className="flex h-11 w-11 items-center justify-center rounded-full bg-magenta text-magenta-foreground">
                  <SendHorizontal className="size-5" />
                </button>
              </div>
              {error && <p className="mt-1 px-3 text-xs font-semibold text-destructive">{error}</p>}
            </form>
          </>
        )}
        <DemoNote>Canlı destek bu prototipte simülasyondur; gerçek bir temsilci veya ekip yönlendirmesi yapılmaz.</DemoNote>
      </div>
    </div>
  );
}
