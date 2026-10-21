import { History } from "lucide-react";
import { PageHeader } from "@/components/layout/headers";
import { EmptyState } from "@/components/tn/primitives";
import { useAppStore } from "@/features/core/appStore";
import { fmtDateTime } from "@/lib/format";

export function HistoryScreen() {
  const items = useAppStore((s) => s.history);
  return (
    <div>
      <PageHeader title="İşlem Geçmişi" />
      <div className="px-4">
        {items.length === 0 ? (
          <EmptyState icon={History} title="Henüz işlem yok" />
        ) : (
          <div className="divide-y divide-border rounded-card bg-card px-5 shadow-card">
            {items.map((h) => (
              <div key={h.id} className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-foreground">{h.title}</p>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{fmtDateTime(h.time)}</span>
                </div>
                <p className="text-sm text-muted-foreground">{h.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
