import { Download, FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/headers";
import { Skeleton } from "@/components/ui/skeleton";
import { INVOICES } from "@/data/mock";
import { fmtTL } from "@/lib/format";

export function PastBillsScreen() {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, []);
  return (
    <div>
      <PageHeader title="Geçmiş Faturalarım" />
      <div className="space-y-3 px-4 pt-2">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-card" />)
          : INVOICES.map((inv) => (
              <div key={inv.id} className="flex items-center gap-3 rounded-card bg-card p-4 shadow-card">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-icon-box text-primary">
                  <FileText className="size-5" />
                </span>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{inv.period}</p>
                  <p className="text-xs text-success">{inv.status}</p>
                </div>
                <p className="font-bold text-primary">{fmtTL(inv.amount)}</p>
                <button onClick={() => toast.success("Fatura PDF'i indirildi")} aria-label={`${inv.period} faturasını indir`} className="flex h-11 w-11 items-center justify-center rounded-full text-primary hover:bg-muted">
                  <Download className="size-5" />
                </button>
              </div>
            ))}
      </div>
    </div>
  );
}
