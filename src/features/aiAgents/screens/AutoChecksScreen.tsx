import { Link } from "@tanstack/react-router";
import { CheckCircle2, ChevronRight, Hand, Lock } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/headers";
import { iconFor } from "@/components/tn/icons";
import { SectionTitle } from "@/components/tn/primitives";
import { Switch } from "@/components/ui/switch";
import { AGENT_DEFS, GIGA } from "@/data/mock";
import { ActionModeTag } from "@/features/giga/GigaAvatar";
import { PRIVACY_REPLY } from "@/features/giga/assistant";
import { useAgentsStore } from "../store";
import { useFlow } from "@/lib/analytics";
import { cn } from "@/lib/utils";

/** Automatic checks (on/off), who does what, and the scope of technical checks. Moved off the GIGA chat to keep it simple. */
export function AutoChecksScreen() {
  useFlow("ai_agents_center");
  const enabled = useAgentsStore((s) => s.enabled);
  const toggle = useAgentsStore((s) => s.toggle);

  return (
    <div>
      <PageHeader title="Otomatik kontroller" />
      <div className="space-y-4 px-4">
        <div className="space-y-2.5">
          {AGENT_DEFS.map((a) => {
            const Icon = iconFor(a.icon);
            const self = a.to === "/ajanlar/kontroller";
            return (
              <div key={a.id} className="flex items-center gap-3 rounded-card bg-card p-4 shadow-card">
                <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", enabled[a.id] ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                  <Icon className="size-5" />
                </span>
                {self ? (
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.desc}</p>
                  </div>
                ) : (
                  <Link to={a.to as "/"} className="flex-1">
                    <p className="flex items-center gap-1 font-semibold text-foreground">{a.name} <ChevronRight className="size-4 text-muted-foreground" /></p>
                    <p className="text-xs text-muted-foreground">{a.desc}</p>
                  </Link>
                )}
                <Switch
                  checked={enabled[a.id]}
                  onCheckedChange={(v) => { toggle(a.id, v); toast(`${a.name} ${v ? "açıldı" : "kapatıldı"}`); }}
                  aria-label={`${a.name} ${enabled[a.id] ? "kapat" : "aç"}`}
                  className="data-[state=checked]:bg-magenta"
                />
              </div>
            );
          })}
        </div>

        <div className="flex items-start gap-2.5 rounded-card bg-card p-4 shadow-card" role="note">
          <Lock className="mt-0.5 size-4 shrink-0 text-magenta" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-primary">Hangi bilgileri kontrol ediyoruz?</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{PRIVACY_REPLY} Otomatik kontrolleri istediğin zaman kapatabilirsin.</p>
          </div>
        </div>

        <SectionTitle>Kim ne yapar?</SectionTitle>
        <div className="rounded-card bg-card p-5 shadow-card">
          <p className="text-xs text-muted-foreground">Bazı kontroller kendiliğinden yapılır; bazı işlemler yalnızca senin onayınla başlar.</p>
          <ul className="mt-3 space-y-1 text-sm text-foreground">
            {GIGA.can.map((x) => (
              <li key={x} className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" /> {x}</li>
            ))}
          </ul>
          <div className="mt-4">
            <ActionModeTag mode="approval" />
            <ul className="mt-1.5 space-y-1 text-sm text-foreground">
              {GIGA.needsApproval.map((x) => (
                <li key={x} className="flex gap-2"><Hand className="mt-0.5 size-4 shrink-0 text-warning" /> {x}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
