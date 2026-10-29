import { Workflow as WorkflowIcon, Bot, ChevronDown, ClipboardList, HeartPulse, MessageCircle, QrCode, ShieldCheck, Video } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/headers";
import { AppLink, Chip, EmptyState } from "@/components/tn/primitives";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppStore, type Channel } from "@/features/core/appStore";
import { fmtDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const CH_ICON: Record<Channel, typeof Bot> = { Görüntülü: Video, QR: QrCode, Ajan: Bot, Chat: MessageCircle, "Dijital Onarım": HeartPulse, Otonom: WorkflowIcon };
const CH_STYLE: Record<Channel, string> = {
  Görüntülü: "bg-primary text-primary-foreground",
  QR: "bg-magenta text-magenta-foreground",
  Ajan: "bg-orange-deep text-primary-foreground",
  Chat: "bg-muted text-foreground",
  "Dijital Onarım": "bg-success text-success-foreground",
  Otonom: "bg-magenta text-magenta-foreground",
};

export function RecordsScreen() {
  const records = useAppStore((s) => s.records);
  const [f, setF] = useState<Channel | "all">("all");
  const [open, setOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(t);
  }, []);
  const list = records.filter((r) => f === "all" || r.channel === f);
  const avoided = records.filter((r) => r.fieldVisitAvoided).length;

  return (
    <div>
      <PageHeader title="Tüm Destek Kayıtları" />
      <div className="px-4">
        <div className="mb-3 flex items-center gap-3 rounded-card bg-success-soft p-4">
          <ShieldCheck className="size-6 text-success" />
          <p className="text-sm">
            <span className="font-semibold">{avoided} kayıt</span> saha ekibi gönderilmeden çözüldü.
          </p>
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto px-4 pb-3 no-scrollbar">
        {(["all", "Görüntülü", "QR", "Ajan", "Chat", "Dijital Onarım", "Otonom"] as const).map((c) => (
          <Chip key={c} active={f === c} onClick={() => setF(c)} className="shrink-0">
            {c === "all" ? "Tümü" : c}
          </Chip>
        ))}
      </div>
      <div className="relative px-4">
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24 rounded-card" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <EmptyState icon={ClipboardList} title="Kayıt yok" text="Bu kanalda destek kaydın bulunmuyor." />
        ) : (
          <ol className="relative space-y-3 border-l-2 border-dashed border-border pl-5">
            {list.map((r) => {
              const Icon = CH_ICON[r.channel];
              const isOpen = open === r.id;
              return (
                <li key={r.id} className="relative">
                  <span className={cn("absolute -left-[33px] top-4 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-background", CH_STYLE[r.channel])}>
                    <Icon className="size-3.5" />
                  </span>
                  <div className="rounded-card bg-card p-4 shadow-card">
                    <button onClick={() => setOpen(isOpen ? null : r.id)} className="flex w-full items-start gap-2 text-left" aria-expanded={isOpen}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", CH_STYLE[r.channel])}>{r.channel}</span>
                          <span className="text-[11px] text-muted-foreground">{fmtDateTime(r.time)}</span>
                        </div>
                        <p className="mt-1.5 font-semibold text-foreground">{r.title}</p>
                        <p className="text-sm text-muted-foreground">{r.summary}</p>
                      </div>
                      <ChevronDown className={cn("mt-1 size-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                    </button>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-foreground">{r.status}</span>
                      {r.fieldVisitAvoided && <span className="rounded-full bg-success-soft px-2.5 py-1 text-xs font-semibold text-success">Saha ziyareti yok</span>}
                    </div>
                    {isOpen && r.details && (
                      <ul className="mt-3 space-y-1 border-t border-border pt-3 text-sm text-muted-foreground">
                        {r.details.map((d) => (
                          <li key={d}>• {d}</li>
                        ))}
                        {r.to && (
                          <li className="pt-2">
                            <AppLink to={r.to} className="font-semibold text-magenta">
                              Detaya git →
                            </AppLink>
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
