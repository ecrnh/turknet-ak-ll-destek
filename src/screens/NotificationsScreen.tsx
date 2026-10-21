import { useNavigate } from "@tanstack/react-router";
import { BellOff, CheckCheck } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/layout/headers";
import { NOTIF_ICON } from "@/components/layout/Overlays";
import { Chip, EmptyState } from "@/components/tn/primitives";
import { useAppStore, type NotifKind } from "@/features/core/appStore";
import { fmtRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

const FILTERS: { id: NotifKind | "all"; label: string }[] = [
  { id: "all", label: "Tümü" },
  { id: "agent", label: "Ajanlar" },
  { id: "gift", label: "Hediye" },
  { id: "support", label: "Destek" },
  { id: "family", label: "Aile" },
];

export function NotificationsScreen() {
  const items = useAppStore((s) => s.notifications);
  const markAll = useAppStore((s) => s.markAllRead);
  const markRead = useAppStore((s) => s.markRead);
  const navigate = useNavigate();
  const [f, setF] = useState<NotifKind | "all">("all");
  const list = items.filter((n) => f === "all" || n.kind === f);

  return (
    <div>
      <PageHeader
        title="Bildirimler"
        right={
          <button onClick={markAll} className="flex min-h-11 items-center gap-1 rounded-full px-3 text-sm font-semibold text-magenta">
            <CheckCheck className="size-4" /> Tümünü oku
          </button>
        }
      />
      <div className="-mx-0 flex gap-2 overflow-x-auto px-4 pb-3 no-scrollbar">
        {FILTERS.map((x) => (
          <Chip key={x.id} active={f === x.id} onClick={() => setF(x.id)} className="shrink-0">
            {x.label}
          </Chip>
        ))}
      </div>
      <div className="space-y-2.5 px-4">
        {list.length === 0 && <EmptyState icon={BellOff} title="Bildirim yok" text="Bu kategoride henüz bildirimin bulunmuyor." />}
        {list.map((n) => {
          const Icon = NOTIF_ICON[n.kind];
          return (
            <button
              key={n.id}
              onClick={() => {
                markRead(n.id);
                if (n.to) navigate({ to: n.to as "/" });
              }}
              className={cn("flex w-full items-start gap-3 rounded-card bg-card p-4 text-left shadow-card", !n.read && "ring-1 ring-magenta/30")}
            >
              <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", n.kind === "gift" ? "bg-magenta text-magenta-foreground" : n.kind === "agent" ? "bg-primary text-primary-foreground" : "bg-icon-box text-primary")}>
                <Icon className="size-5" />
              </span>
              <span className="flex-1">
                <span className="flex items-center gap-2">
                  <span className="flex-1 font-semibold text-foreground">{n.title}</span>
                  {!n.read && <span className="h-2.5 w-2.5 rounded-full bg-magenta" aria-label="Okunmamış" />}
                </span>
                <span className="mt-0.5 block text-sm text-muted-foreground">{n.body}</span>
                <span className="mt-1 block text-[11px] text-muted-foreground">{fmtRelative(n.time)}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
