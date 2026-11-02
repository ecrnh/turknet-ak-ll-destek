import { Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, ReceiptText, SearchCheck, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/headers";
import { Button } from "@/components/ui/button";
import { SUBSCRIPTION } from "@/data/mock";
import { fmtTL } from "@/lib/format";
import { cn } from "@/lib/utils";
import { decide, explainBilling, runBillingShield, seedPaidButDebt, useWorkflowStore } from "@/features/workflow";
import { compareBilling, isActive } from "../rules";
import { DemoNote, StatusPill } from "../components/ui";

const COMPARE = ["Fatura tutarı", "Ödeme geçmişi", "Kampanya ve indirim bilgileri", "Abonelik değişiklikleri", "Dondurma ve iptal kayıtları"];
const LIST_PRICE = 949.9;

type Phase = "idle" | "checking" | "ok" | "diff" | "started";

export function BillingShieldScreen() {
  const navigate = useNavigate();
  const bills = useWorkflowStore((s) => s.bills);
  const payments = useWorkflowStore((s) => s.payments);
  const active = useWorkflowStore((s) => s.workflows.find((w) => w.type === "billing_check" && isActive(w)));
  const bill = bills[0]!;
  const findings = compareBilling(bill, payments);
  const [phase, setPhase] = useState<Phase>("idle");
  const [line, setLine] = useState(0);
  const [startedId, setStartedId] = useState<string | null>(null);

  useEffect(() => {
    if (phase !== "checking") return;
    setLine(0);
    const ts = COMPARE.map((_, i) => window.setTimeout(() => setLine(i + 1), 550 * (i + 1)));
    const done = window.setTimeout(() => setPhase(compareBilling(useWorkflowStore.getState().bills[0]!, useWorkflowStore.getState().payments).length ? "diff" : "ok"), 550 * COMPARE.length + 400);
    return () => {
      ts.forEach(clearTimeout);
      clearTimeout(done);
    };
  }, [phase]);

  const review = () => {
    const { wfId } = runBillingShield();
    if (!wfId) return setPhase("ok");
    explainBilling(wfId);
    decide(wfId, "start", "customer");
    setStartedId(wfId);
    setPhase("started");
  };

  const paid = bill.status === "paid" || payments.some((p) => p.billId === bill.id && p.status === "success");
  const dup = findings.some((f) => f.code === "duplicate_payment");

  return (
    <div>
      <PageHeader title="Fatura Kalkanı" />
      <div className="space-y-4 px-4 pb-4">
        <div className="rounded-card bg-plum p-5 text-primary-foreground shadow-float">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-foreground/15">
            <ShieldCheck className="size-6" />
          </span>
          <h2 className="mt-3 text-xl font-bold leading-snug">Faturalarınız bizim kontrolümüzde.</h2>
          <p className="mt-1 text-sm text-primary-foreground/85">Fatura ve abonelik işlemlerinizi sizin için kontrol ediyoruz.</p>
        </div>

        {active && (
          <Link to="/surec/$id" params={{ id: active.id }} className="flex items-center justify-between rounded-card bg-card p-4 shadow-card">
            <span className="font-semibold text-primary">{active.title}</span>
            <StatusPill status={active.status} />
          </Link>
        )}

        <div className="rounded-card bg-card p-5 shadow-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <ReceiptText className="size-4" /> {bill.period} faturası
              </p>
              <p className="mt-1 text-3xl font-bold text-primary">{fmtTL(bill.amount)}</p>
            </div>
            <span className={cn("rounded-full px-3 py-1 text-xs font-bold", paid ? "bg-success-soft text-success" : "bg-warning-soft text-warning")}>{paid ? "Ödendi" : "Ödenmedi"}</span>
          </div>
          <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
            {[
              ["Son ödeme tarihi", bill.due],
              ["Paket", SUBSCRIPTION.packageName],
              ["Aktif indirim", `Kampanya: ${fmtTL(LIST_PRICE - bill.amount)} / ay`],
              ["Ekranda görünen borç", fmtTL(bill.shownDebt)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className={cn("text-right font-semibold", k === "Ekranda görünen borç" && bill.shownDebt > 0 ? "text-orange-deep" : "text-foreground")}>{v}</dd>
              </div>
            ))}
          </dl>
          {phase === "idle" && (
            <Button size="xl" className="mt-5 w-full" onClick={() => setPhase("checking")}>
              <SearchCheck /> Faturamı kontrol et
            </Button>
          )}
        </div>

        {phase === "checking" && (
          <div className="rounded-card bg-card p-5 shadow-card" role="status" aria-live="polite">
            <p className="flex items-center gap-2 font-semibold text-primary">
              <Loader2 className="size-5 animate-spin text-magenta" /> Faturanızı karşılaştırıyoruz...
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {COMPARE.map((c, i) => (
                <li key={c} className="flex items-center gap-2">
                  {i < line ? <CheckCircle2 className="size-4 text-success" /> : <Loader2 className={cn("size-4 text-muted-foreground", i === line && "animate-spin")} />}
                  <span className={i < line ? "text-foreground" : "text-muted-foreground"}>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {phase === "ok" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-card bg-success-soft p-5">
            <p className="flex items-start gap-2 text-lg font-semibold leading-snug text-primary">
              <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-success" /> Her şey yolunda.
            </p>
            <p className="mt-1 text-sm text-foreground">Faturanızda dikkat etmemiz gereken bir durum görünmüyor. Sizin bir şey yapmanız gerekmiyor.</p>
            <Button variant="outline" className="mt-4 w-full" onClick={() => navigate({ to: "/" })}>
              Ana Sayfaya Dön
            </Button>
          </motion.div>
        )}

        {phase === "diff" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-card border-gradient p-5 shadow-card">
            <p className="text-lg font-semibold leading-snug text-primary">Faturanızda kontrol etmemizi istediğiniz bir farklılık var.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {dup ? "Aynı fatura için iki ödeme kaydı görünüyor. Fazla ödeme olup olmadığını sizin için inceleyebiliriz." : "Son ödemeniz başarılı görünüyor, ancak borç bilginiz henüz güncellenmemiş olabilir. Tekrar ödeme yapmanıza gerek yok."}
            </p>
            <p className="mt-3 rounded-2xl bg-muted p-3 text-xs text-muted-foreground">İnceleme hiçbir kaydı kendiliğinden değiştirmez. İade veya borç düzeltmesi yalnızca yetkili ekibin onayıyla ve size bilgi verilerek yapılır.</p>
            <Button size="xl" className="mt-4 w-full" onClick={review}>
              Benim için incele
            </Button>
            <button type="button" onClick={() => setPhase("idle")} className="mt-2 min-h-11 w-full text-sm font-semibold text-primary">
              Daha Sonra
            </button>
          </motion.div>
        )}

        {phase === "started" && startedId && (
          <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-card bg-card p-6 text-center shadow-card">
            <CheckCircle2 className="mx-auto size-12 text-success" />
            <p className="mt-2 text-lg font-semibold text-primary">İnceleme sürecini başlattık.</p>
            <p className="mt-1 text-sm text-muted-foreground">Sonucu buradan ve İşlemlerim'den takip edebilirsiniz.</p>
            <Button size="lg" className="mt-4 w-full" onClick={() => navigate({ to: "/surec/$id", params: { id: startedId } })}>
              İncelemeyi Takip Et
            </Button>
          </motion.div>
        )}

        <DemoNote>
          Fatura ve ödeme kayıtları örnek verilerdir; gerçek fatura sistemine bağlanılmaz.{" "}
          {!findings.length && !active && (
            <button type="button" onClick={() => { seedPaidButDebt(false); setPhase("idle"); }} className="font-semibold text-magenta underline">
              Demo: farklılık olan faturayı yükle
            </button>
          )}
        </DemoNote>
      </div>
    </div>
  );
}
