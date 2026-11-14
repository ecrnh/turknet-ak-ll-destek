import { CheckCircle2, Lock } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/layout/headers";
import { Banner, StatRow } from "@/components/tn/primitives";
import { Button } from "@/components/ui/button";
import { GENERIC_OPS } from "@/data/mock";
import { useAppStore } from "@/features/core/appStore";
import { useActingAccount, useCan } from "@/features/family/store";
import { track } from "@/lib/analytics";

const SCOPE_FOR: Record<string, "plan" | "cancel" | undefined> = { "hiz-yukseltme": "plan", iptal: "cancel", dondur: "cancel" };

export function GenericOpScreen({ slug }: { slug: string }) {
  const op = GENERIC_OPS[slug];
  const addHistory = useAppStore((s) => s.addHistory);
  const acting = useActingAccount();
  const scope = SCOPE_FOR[slug];
  const allowed = useCan(scope ?? "ticket");
  const [done, setDone] = useState(false);

  if (!op)
    return (
      <div>
        <PageHeader title="İşlem" />
        <div className="px-4">
          <Banner tone="error" title="İşlem bulunamadı">Bu sayfa taşınmış olabilir.</Banner>
        </div>
      </div>
    );

  return (
    <div>
      <PageHeader title={op.title} />
      <div className="space-y-4 px-4">
        <div className="rounded-card bg-card p-5 shadow-card">
          <p className="text-foreground">{op.desc}</p>
          {op.facts && (
            <div className="mt-4">
              {op.facts.map(([k, v]) => (
                <StatRow key={k} label={k} value={v} />
              ))}
            </div>
          )}
          {op.cta && !done && (
            scope && acting && !allowed ? (
              <Banner tone="warning" className="mt-5" title="Bu işlem için yetkin yok">
                <span className="inline-flex items-center gap-1"><Lock className="size-3.5" /> {acting.honorific} bu yetkiyi vermedi.</span>
              </Banner>
            ) : (
              <Button
                size="lg"
                className="mt-5 w-full"
                onClick={() => {
                  setDone(true);
                  addHistory(op.title, "Talep alındı (demo)");
                  track("flow_completed", `op_${slug}`);
                }}
              >
                {op.cta}
              </Button>
            )
          )}
          {done && (
            <div className="mt-5 flex items-center gap-2 rounded-2xl bg-success-soft p-3 text-sm font-semibold">
              <CheckCircle2 className="size-5 text-success" /> Talebin alındı. İşlem Geçmişi'ne eklendi.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
