import { Link } from "@tanstack/react-router";
import { Ban, Bot, ChevronRight, Clock, PhoneOff, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/headers";
import { iconFor } from "@/components/tn/icons";
import { EmptyState } from "@/components/tn/primitives";
import { Switch } from "@/components/ui/switch";
import { AGENT_DEFS } from "@/data/mock";
import { useAgentsStore } from "../store";
import { fmtRelative } from "@/lib/format";
import { useFlow } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export function AgentCenterScreen() {
  useFlow("ai_agents_center");
  const enabled = useAgentsStore((s) => s.enabled);
  const toggle = useAgentsStore((s) => s.toggle);
  const actions = useAgentsStore((s) => s.actions);
  const stats = useAgentsStore((s) => s.stats);
  const undo = useAgentsStore((s) => s.undo);
  const noRepeat = useAgentsStore((s) => s.noRepeat);

  return (
    <div>
      <PageHeader title="Turknet Asistan Ajanlarım" />
      <div className="space-y-4 px-4">
        <div className="rounded-card bg-plum p-5 text-primary-foreground shadow-float">
          <p className="flex items-center gap-2 text-sm text-primary-foreground/80"><Sparkles className="size-4" /> Bu ay senin için</p>
          <p className="mt-1 text-3xl font-bold">{stats.solved} işlem yaptım</p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-primary-foreground/10 p-3">
              <Bot className="mx-auto size-5" />
              <p className="mt-1 text-xl font-bold">{stats.solved}</p>
              <p className="text-[10px] text-primary-foreground/70">çözülen sorun</p>
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
        </div>

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
                  aria-label={`${a.name} ajanını ${enabled[a.id] ? "kapat" : "aç"}`}
                  className="data-[state=checked]:bg-magenta"
                />
              </div>
            );
          })}
        </div>

        <div className="rounded-card bg-card p-5 shadow-card">
          <p className="font-semibold text-primary">Son aksiyonlar</p>
          <p className="text-xs text-muted-foreground">Her aksiyon şeffaf: istersen geri al veya bir daha yapmamamı söyle.</p>
          {actions.length === 0 ? (
            <EmptyState icon={Bot} title="Henüz aksiyon yok" />
          ) : (
            <ol className="mt-3 space-y-3">
              {actions.map((a) => (
                <li key={a.id} className={cn("rounded-2xl border border-border p-3", a.undone && "opacity-60")}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-magenta">{AGENT_DEFS.find((d) => d.id === a.agent)?.name}</span>
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
