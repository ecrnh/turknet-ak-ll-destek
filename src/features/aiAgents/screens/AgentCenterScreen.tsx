import { Link } from "@tanstack/react-router";
import { Ban, Bot, CheckCircle2, ChevronRight, Clock, Hand, MessageCircle, PhoneOff, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/headers";
import { iconFor } from "@/components/tn/icons";
import { EmptyState, SectionTitle } from "@/components/tn/primitives";
import { Switch } from "@/components/ui/switch";
import { AGENT_DEFS, GIGA } from "@/data/mock";
import { useAppStore } from "@/features/core/appStore";
import { ActionModeTag, GigaAvatar, GigaName } from "@/features/giga/GigaAvatar";
import { useAgentsStore } from "../store";
import { fmtRelative } from "@/lib/format";
import { useFlow } from "@/lib/analytics";
import { cn } from "@/lib/utils";

/** GIGA's home: one assistant, its capabilities, its automatic tasks and a transparent action log. */
export function AgentCenterScreen() {
  useFlow("ai_agents_center");
  const enabled = useAgentsStore((s) => s.enabled);
  const toggle = useAgentsStore((s) => s.toggle);
  const actions = useAgentsStore((s) => s.actions);
  const stats = useAgentsStore((s) => s.stats);
  const undo = useAgentsStore((s) => s.undo);
  const noRepeat = useAgentsStore((s) => s.noRepeat);
  const openHelp = useAppStore((s) => s.openHelp);

  return (
    <div>
      <PageHeader title="GIGA" />
      <div className="space-y-4 px-4">
        <div className="rounded-card bg-plum p-5 text-primary-foreground shadow-float">
          <div className="flex items-center gap-4">
            <GigaAvatar size={64} mood="idle" />
            <div>
              <p className="text-lg font-semibold">Merhaba, ben <GigaName />!</p>
              <p className="text-sm text-primary-foreground/80">{GIGA.tagline}. Sadece ne yapacağını söylemem; işini halletmene yardım ederim.</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-primary-foreground/10 p-3">
              <Bot className="mx-auto size-5" />
              <p className="mt-1 text-xl font-bold">{stats.solved}</p>
              <p className="text-[10px] text-primary-foreground/70">bu ay çözülen</p>
            </div>
            <div className="rounded-2xl bg-primary-foreground/10 p-3">
              <Clock className="mx-auto size-5" />
              <p className="mt-1 text-xl font-bold">{stats.minutesSaved} dk</p>
              <p className="text-[10px] text-primary-foreground/70">kazandırılan süre</p>
            </div>
            <div className="rounded-2xl bg-primary-foreground/10 p-3">
              <PhoneOff className="mx-auto size-5" />
              <p className="mt-1 text-xl font-bold">{stats.callsPrevented}</p>
              <p className="text-[10px] text-primary-foreground/70">önlenen çağrı</p>
            </div>
          </div>
          <button type="button" onClick={() => openHelp()} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-card text-sm font-semibold text-primary">
            <MessageCircle className="size-4" /> GIGA ile Konuş
          </button>
        </div>

        <SectionTitle>Neler yapabilirim?</SectionTitle>
        <div className="grid grid-cols-2 gap-2.5">
          {GIGA.capabilities.map((c) => {
            const Icon = iconFor(c.icon);
            return (
              <Link key={c.id} to={c.to as "/"} className="flex min-h-[112px] flex-col justify-between rounded-card bg-card p-4 shadow-card">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-icon-box text-primary">
                  <Icon className="size-5" strokeWidth={1.5} />
                </span>
                <span>
                  <span className="block font-bold text-primary">{c.name}</span>
                  <span className="block text-[11px] leading-snug text-muted-foreground">{c.desc}</span>
                </span>
              </Link>
            );
          })}
        </div>

        <div className="rounded-card bg-card p-5 shadow-card">
          <p className="font-semibold text-primary">Kim ne yapar?</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Bazı işleri ben yaparım; bazıları yalnızca senin onayınla başlar.</p>
          <div className="mt-3 grid gap-3">
            <div>
              <ActionModeTag mode="auto" />
              <ul className="mt-1.5 space-y-1 text-sm text-foreground">
                {GIGA.can.map((x) => (
                  <li key={x} className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" /> {x}</li>
                ))}
              </ul>
            </div>
            <div>
              <ActionModeTag mode="approval" />
              <ul className="mt-1.5 space-y-1 text-sm text-foreground">
                {GIGA.needsApproval.map((x) => (
                  <li key={x} className="flex gap-2"><Hand className="mt-0.5 size-4 shrink-0 text-warning" /> {x}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <SectionTitle>Otomatik görevlerim</SectionTitle>
        <div className="space-y-2.5">
          {AGENT_DEFS.map((a) => {
            const Icon = iconFor(a.icon);
            return (
              <div key={a.id} className="flex items-center gap-3 rounded-card bg-card p-4 shadow-card">
                <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", enabled[a.id] ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                  <Icon className="size-5" />
                </span>
                <Link to={a.to as "/"} className="flex-1">
                  <p className="flex items-center gap-1 font-semibold text-foreground">{a.name} <ChevronRight className="size-4 text-muted-foreground" /></p>
                  <p className="text-xs text-muted-foreground">{a.desc}</p>
                </Link>
                <Switch
                  checked={enabled[a.id]}
                  onCheckedChange={(v) => { toggle(a.id, v); toast(`${a.name} ${v ? "açıldı" : "kapatıldı"}`); }}
                  aria-label={`GIGA ${a.name} görevini ${enabled[a.id] ? "kapat" : "aç"}`}
                  className="data-[state=checked]:bg-magenta"
                />
              </div>
            );
          })}
        </div>

        <div className="rounded-card bg-card p-5 shadow-card">
          <p className="flex items-center gap-2 font-semibold text-primary"><Sparkles className="size-4 text-magenta" /> Son aksiyonlarım</p>
          <p className="text-xs text-muted-foreground">Her aksiyon şeffaf: istersen geri al veya bir daha yapmamamı söyle.</p>
          {actions.length === 0 ? (
            <EmptyState icon={Bot} title="Henüz aksiyon yok" />
          ) : (
            <ol className="mt-3 space-y-3">
              {actions.map((a) => (
                <li key={a.id} className={cn("rounded-2xl border border-border p-3", a.undone && "opacity-60")}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-magenta">GIGA · {AGENT_DEFS.find((d) => d.id === a.agent)?.name}</span>
                    <span className="text-[11px] text-muted-foreground">{fmtRelative(a.time)}</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold">{a.undone ? <s>{a.title}</s> : a.title}</p>
                  <p className="text-xs text-muted-foreground">{a.detail}</p>
                  <div className="mt-2 flex gap-2">
                    {!a.undone && (
                      <button onClick={() => { undo(a.id); toast("Aksiyon geri alındı"); }} className="inline-flex min-h-9 items-center gap-1 rounded-full bg-muted px-3 text-xs font-semibold text-primary">
                        <RotateCcw className="size-3.5" /> Geri al
                      </button>
                    )}
                    {!a.noRepeat ? (
                      <button onClick={() => { noRepeat(a.id); toast("Bunu bir daha yapmayacağım"); }} className="inline-flex min-h-9 items-center gap-1 rounded-full bg-muted px-3 text-xs font-semibold text-primary">
                        <Ban className="size-3.5" /> Bunu bir daha yapma
                      </button>
                    ) : (
                      <span className="text-xs font-semibold text-muted-foreground">Bir daha yapılmayacak</span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
