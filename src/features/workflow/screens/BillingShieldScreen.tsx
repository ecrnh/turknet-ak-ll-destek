import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { CalendarClock, CheckCircle2, ChevronRight, CreditCard, Loader2, ReceiptText, ShieldCheck, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/layout/headers";
import { Button } from "@/components/ui/button";
import { BILL_DISCOUNTS, BILLING_CHECKS, SUBSCRIPTION } from "@/data/mock";
import { GigaAvatar, GigaNote } from "@/features/giga/GigaAvatar";
import { fmtTL } from "@/lib/format";
import { useFlow } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { consentBillingReview, runBillingShield, seedPaidButDebt, useWorkflowStore } from "@/features/workflow";
import { compareBilling, isActive } from "../rules";
import { DemoNote, StatusPill } from "../components/ui";

const COMPARE = ["Fatura tutarı", "Ödeme geçmişi", "Kampanya ve indirimler", "Abonelik değişiklikleri", "Dondurma ve iptal kayıtları"];

/** Fatura Kalkanı: invoice card → comparison → no issue / possible difference → consent. GIGA only explains a found difference. */
export function BillingShieldScreen() {
  useFlow("billing_shield");
  const navigate = useNavigate();
  const byGiga = useSearch({ from: "/fatura-kalkani" }).kontrol === 1;
  const bills = useWorkflowStore((s) => s.bills);
  const payments = useWorkflowStore((s) => s.payments);
  const autoPay = useWorkflowStore((s) => s.autoPay);
  const wfs = useWorkflowStore((s) => s.workflows).filter((w) => w.type === "billing_check");
  const [phase, setPhase] = useState<"idle" | "checking" | "done">(byGiga ? "done" : "idle");
  const [wfId, setWfId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const bill = bills[0]!;
  const findings = compareBilling(bill, payments);
  const active = wfs.find(isActive);
  const current = wfs.find((w) => w.id === wfId) ?? active;
  const reviewStarted = !!current && (current.steps.find((s) => s.key === "consent")?.status === "done");
  const paid = payments.filter((p) => p.billId === bill.id && p.status !== "pending").reduce((a, p) => a + p.amount, 0);

  const check = () => {
    setPhase("checking");
    setStep(0);
    COMPARE.forEach((_, i) => setTimeout(() => setStep(i + 1), 450 * (i + 1)));
    setTimeout(() => {
      const r = runBillingShield();
      setWfId(r.wfId);
      setPhase("done");
    }, 450 * (COMPARE.length + 1));
  };

  return (
    <div>
      <PageHeader title="Fatura Kalkanı" />
      <div className="space-y-4 px-4">
        <div className="rounded-card bg-plum p-5 text-primary-foreground shadow-float">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-foreground/15">
            <ShieldCheck className="size-6" />
          </span>
          <p className="mt-3 text-xl font-semibold leading-snug">Faturaların bizim kontrolümüzde.</p>
          <p className="mt-1 text-sm text-primary-foreground/80">Fatura ve abonelik işlemlerini senin için kontrol ediyoruz.</p>
          <p className="mt-3 text-xs text-primary-foreground/75">Fatura Kalkanı kayıtları kendisi değiştirmez. İade veya borç düzeltme yalnızca senin onayınla ve yetkili ekip üzerinden yapılır.</p>
        </div>

        <div className="rounded-card bg-card p-5 shadow-card">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs text-muted-foreground">{bill.period} faturası</p>
              <p className="text-2xl font-bold text-foreground">{fmtTL(bill.amount)}</p>
            </div>
            <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", bill.shownDebt > 0 ? "bg-warning-soft text-warning" : "bg-success-soft text-success")}>{bill.shownDebt > 0 ? "Ödenmedi görünüyor" : "Ödendi"}</span>
          </div>
          <dl className="mt-3 space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="flex items-center gap-1.5 text-muted-foreground"><CalendarClock className="size-4" /> Son ödeme</dt><dd className="font-semibold">{bill.due}</dd></div>
            <div className="flex justify-between"><dt className="flex items-center gap-1.5 text-muted-foreground"><ReceiptText className="size-4" /> Paket</dt><dd className="font-semibold">{SUBSCRIPTION.packageName}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Ödemeler</dt><dd className="font-semibold">{fmtTL(paid)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Ekranda görünen borç</dt><dd className={cn("font-semibold", bill.shownDebt > 0 ? "text-orange-deep" : "text-success")}>{fmtTL(bill.shownDebt)}</dd></div>
          </dl>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {BILL_DISCOUNTS.map((d) => (
              <span key={d} className="rounded-full bg-icon-box px-2.5 py-1 text-[11px] font-semibold text-primary">{d}</span>
            ))}
          </div>

          {phase === "idle" && !active && (
            <Button size="xl" className="mt-5 w-full" onClick={check}>
              Faturamı kontrol et
            </Button>
          )}
        </div>

        {phase === "checking" && (
          <div className="rounded-card bg-card p-5 shadow-card" aria-live="polite">
            <PlainNote icon={Loader2}>Faturanı ve önceki ödemelerini karşılaştırıyoruz. Biraz bekleyebilirsin.</PlainNote>
            <ul className="mt-4 space-y-2 text-sm">
              {COMPARE.map((c, i) => (
                <motion.li key={c} initial={{ opacity: 0.4 }} animate={{ opacity: i <= step ? 1 : 0.4 }} className="flex items-center gap-2">
                  {i < step ? <CheckCircle2 className="size-4 text-success" /> : i === step ? <Loader2 className="size-4 animate-spin text-magenta" /> : <span className="h-4 w-4 rounded-full border-2 border-border" />}
                  {c}
                </motion.li>
              ))}
            </ul>
          </div>
        )}

        {(phase === "done" || active) && (findings.length === 0 && !active ? (
          <div className="rounded-card bg-success-soft p-5">
            <p className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <CheckCircle2 className="size-5 text-success" /> Her şey yolunda.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">Faturanda dikkat etmemiz gereken bir durum görünmüyor. {BILLING_CHECKS.length} kontrolün hepsi uyumlu.</p>
            <Button variant="outline" className="mt-4 w-full" onClick={check}>Tekrar kontrol et</Button>
          </div>
        ) : current ? (
          <div className="rounded-card border-2 border-warning/30 bg-card p-5 shadow-card">
            {!reviewStarted ? (
              <>
                <p className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <TriangleAlert className="size-5 text-warning" /> Faturanda kontrol etmemizi istediğimiz bir farklılık var.
                </p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {findings.map((f) => (
                    <li key={f.code}>• {f.detail}</li>
                  ))}
                </ul>
                <GigaNote className="mt-4">Ödemen görünüyor ama borç bilgin henüz güncellenmemiş olabilir. Tekrar ödeme yapmana gerek yok. İstersen senin için inceleyeyim; kayıtları ben değiştirmem, yetkili ekip onaylar.</GigaNote>
                <Button size="xl" className="mt-4 w-full" onClick={() => consentBillingReview(current.id)}>
                  Benim için incele
                </Button>
              </>
            ) : (
              <>
                <p className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <CheckCircle2 className="size-6 text-success" strokeWidth={1.5} aria-hidden /> İnceleme sürecini başlattık.
                </p>
                <p className="mt-1 text-sm text-muted-foreground">Sonucu buradan takip edebilirsin.</p>
              </>
            )}
            <Link to="/surec/$id" params={{ id: current.id }} className="mt-3 flex items-center justify-between rounded-2xl bg-muted px-3 py-2.5 text-sm">
              <span className="font-semibold text-primary">{current.title}</span>
              <StatusPill status={current.status} />
            </Link>
          </div>
        ) : null)}

        <Link to="/otomatik-odeme" className="flex items-center gap-3 rounded-card bg-card p-4 shadow-card">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-icon-box text-primary"><CreditCard className="size-5" /></span>
          <span className="flex-1">
            <span className="block font-semibold text-primary">Akıllı Otomatik Ödeme</span>
            <span className="block text-xs text-muted-foreground">{autoPay.status === "active" ? `Talimat aktif · ${autoPay.method?.label}` : "Ödeme tarihini takip etmek zorunda kalma"}</span>
          </span>
          <ChevronRight className="size-5 text-muted-foreground" />
        </Link>

        <DemoNote className="pb-2">
          Fatura ve ödeme kayıtları örnek verilerdir; gerçek fatura sistemine bağlanılmaz.{" "}
          {!active && findings.length === 0 && (
            <button type="button" className="font-semibold text-magenta underline" onClick={() => { seedPaidButDebt(false); setPhase("idle"); navigate({ to: "/fatura-kalkani" }); }}>
              Demo: farklılık senaryosunu yükle
            </button>
          )}
        </DemoNote>
      </div>
    </div>
  );
}
