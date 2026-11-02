import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/headers";
import { Button } from "@/components/ui/button";
import { BILLING_CHECKS } from "@/data/mock";
import { fmtTL } from "@/lib/format";
import { cn } from "@/lib/utils";
import { runBillingShield, useWorkflowStore } from "@/features/workflow";
import { compareBilling, isActive } from "../rules";
import { DemoNote, StatusPill } from "../components/ui";

export function BillingShieldScreen() {
  const navigate = useNavigate();
  const bills = useWorkflowStore((s) => s.bills);
  const payments = useWorkflowStore((s) => s.payments);
  const wfs = useWorkflowStore((s) => s.workflows).filter((w) => w.type === "billing_check");
  const byGiga = useSearch({ from: "/fatura-kalkani" }).kontrol === 1;
  const [ran, setRan] = useState(false);
  const bill = bills[0]!;
  const findings = compareBilling(bill, payments);
  const active = wfs.find(isActive);
  const checked = ran || byGiga || wfs.length > 0;

  const run = () => {
    const r = runBillingShield();
    setRan(true);
    if (r.wfId) navigate({ to: "/surec/$id", params: { id: r.wfId } });
    else toast.success("Faturanız uyumlu görünüyor", { description: `${BILLING_CHECKS.length} kontrolün hepsi uyumlu.` });
  };

  return (
    <div>
      <PageHeader title="GIGA Fatura" />
      <div className="space-y-4 px-4">
        <div className="rounded-card bg-plum p-5 text-primary-foreground shadow-float">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-foreground/15">
            <ShieldCheck className="size-6" />
          </span>
          <p className="mt-3 text-lg font-semibold leading-snug">Faturanızı ve ödemelerinizi biz karşılaştıralım; olası bir farklılığı siz fark etmeden yakalayalım.</p>
          <p className="mt-2 text-xs text-primary-foreground/80">GIGA Fatura, Fatura Kalkanı ile kayıtları karşılaştırır ama kendisi değiştirmez. İade veya borç düzeltme yalnızca sizin onayınızla ve yetkili ekip üzerinden yapılır.</p>
        </div>

        {active && (
          <Link to="/surec/$id" params={{ id: active.id }} className="flex items-center justify-between rounded-card bg-card p-4 shadow-card">
            <span className="font-semibold text-primary">{active.title}</span>
            <StatusPill status={active.status} />
          </Link>
        )}

        <div className="rounded-card bg-card p-5 shadow-card">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{bill.period} faturası</span>
            <span className="font-bold text-foreground">{fmtTL(bill.amount)}</span>
          </div>
          <div className="mt-1 flex justify-between text-sm">
            <span className="text-muted-foreground">Ödemeler</span>
            <span className="font-bold text-foreground">{fmtTL(payments.reduce((a, p) => a + p.amount, 0))}</span>
          </div>
          <div className="mt-1 flex justify-between text-sm">
            <span className="text-muted-foreground">Ekranda görünen borç</span>
            <span className={cn("font-bold", bill.shownDebt > 0 ? "text-orange-deep" : "text-success")}>{fmtTL(bill.shownDebt)}</span>
          </div>
          <ul className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
            {BILLING_CHECKS.map((c) => {
              const hit = findings.some((f) => f.code === c.code);
              return (
                <li key={c.code} className="flex items-center justify-between gap-2">
                  <span className="text-foreground">{c.label}</span>
                  <span className={cn("shrink-0 text-xs font-bold", !checked ? "text-muted-foreground" : hit ? "text-orange-deep" : "text-success")}>{!checked ? "Kontrol edilmedi" : hit ? "Farklılık olabilir" : "Uyumlu"}</span>
                </li>
              );
            })}
          </ul>
          <Button size="xl" className="mt-5 w-full" onClick={run}>
            Faturamı İncele
          </Button>
        </div>
        <DemoNote className="pb-2">Fatura ve ödeme kayıtları örnek verilerdir; gerçek fatura sistemine bağlanılmaz.</DemoNote>
      </div>
    </div>
  );
}
