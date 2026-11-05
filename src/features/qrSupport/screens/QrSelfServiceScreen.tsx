import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, ChevronRight, Headphones, Loader2, PartyPopper, Wifi } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/headers";
import { USER } from "@/data/mock";
import { useAppStore } from "@/features/core/appStore";
import { launchIntent } from "@/features/giga/actions";
import { track, useFlow } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { QR_STEPS, type Option, type StepId } from "../selfService";

const CHECKS = ["Modem bağlantısı kontrol ediliyor", "Hat sinyali ölçülüyor", "Wi-Fi kanalı optimize ediliyor", "Bağlantı ayarları yenileniyor"];

/** Stays on top while the customer moves through the steps. */
function ConnectionCheck() {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (i >= CHECKS.length) return;
    const t = window.setTimeout(() => setI((s) => s + 1), 1600);
    return () => window.clearTimeout(t);
  }, [i]);
  const done = i >= CHECKS.length;
  const pct = Math.round((Math.min(i, CHECKS.length) / CHECKS.length) * 100);
  return (
    <div className="rounded-2xl border border-magenta/20 bg-card p-3.5 shadow-card" aria-live="polite">
      <div className="flex items-center gap-3">
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", done ? "bg-success-soft text-success" : "bg-magenta-soft text-magenta")}>
          {done ? <CheckCircle2 className="size-5" /> : <Loader2 className="size-5 animate-spin" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-primary">{done ? "Bağlantı iyileştirmesi tamamlandı" : "Bağlantın iyileştiriliyor"}</p>
            <span className="text-xs font-semibold text-muted-foreground">%{pct}</span>
          </div>
          <p className="truncate text-xs text-muted-foreground">{done ? "Modem ve hat ayarların en iyi duruma getirildi." : CHECKS[i]}</p>
        </div>
      </div>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-magenta transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function QrSelfServiceScreen() {
  useFlow("qr_self_service");
  const navigate = useNavigate();
  const openHelp = useAppStore((s) => s.openHelp);
  const [path, setPath] = useState<StepId[]>(["topic"]);
  const [answers, setAnswers] = useState<string[]>([]);
  const current: StepId = path[path.length - 1] ?? "topic";
  const step = QR_STEPS[current];
  const isDone = current === "done";

  const back = () => {
    if (path.length <= 1) { navigate({ to: "/qr" }); return; }
    setPath((p) => p.slice(0, -1));
    setAnswers((a) => a.slice(0, -1));
  };

  const choose = (o: Option) => {
    track("cta_clicked", "qr_self_service", { step: current, answer: o.label });
    const n = o.next;
    if ("step" in n) {
      setAnswers((a) => [...a, o.label]);
      return setPath((p) => [...p, n.step]);
    }
    if ("done" in n) {
      setAnswers((a) => [...a, o.label]);
      return setPath((p) => [...p, "done"]);
    }
    const said = [...answers, o.label].join(" · ");
    if ("chat" in n) return openHelp(n.chat);
    if ("live" in n) return openHelp("Canlı destekle görüşmek istiyorum");
    const r = launchIntent(n.intent, said, n.usta);
    if (r.kind === "workflow") return navigate({ to: "/surec/$id", params: { id: r.wfId } });
    if (r.kind === "clear") {
      toast.success("Faturan kontrol edildi", { description: "Faturan ve ödemelerin uyumlu görünüyor." });
      return navigate({ to: "/fatura-kalkani", search: { kontrol: 1 } });
    }
    navigate({ to: r.to as "/" });
  };

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader title="QR ile Destek" />
      <div className="flex-1 space-y-4 px-4 pb-24">
        <ConnectionCheck />

        <div className="flex items-center justify-between px-1">
          <button type="button" onClick={back} className="inline-flex min-h-10 items-center gap-1 rounded-full pr-3 text-sm font-semibold text-primary">
            <ArrowLeft className="size-4" /> Geri
          </button>
          {!isDone && <span className="text-xs font-semibold text-muted-foreground">Adım {path.length}</span>}
        </div>

        {answers.length > 0 && (
          <ol className="flex flex-wrap gap-1.5 px-1" aria-label="Verdiğin cevaplar">
            {answers.map((a, i) => (
              <li key={i} className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success">
                <CheckCircle2 className="size-3" /> {a}
              </li>
            ))}
          </ol>
        )}

        <AnimatePresence mode="wait">
          <motion.section key={current} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }} className="rounded-card bg-card p-5 shadow-card">
            {isDone ? (
              <div className="text-center">
                <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-success-soft text-success"><PartyPopper className="size-7" /></span>
                <h2 className="mt-3 text-lg font-semibold text-primary">{step.title}</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">{step.body}</p>
                <button type="button" onClick={() => navigate({ to: "/" })} className="mt-5 min-h-12 w-full rounded-2xl bg-primary text-sm font-semibold text-primary-foreground">Ana sayfaya dön</button>
              </div>
            ) : (
              <>
                {current === "topic" && <p className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground"><Wifi className="size-3.5" /> {USER.modemModel} · Aboneliğin eşleştirildi</p>}
                <h2 className="text-lg font-semibold leading-snug text-primary">{step.title}</h2>
                {step.body && <p className="mt-1.5 text-sm text-muted-foreground">{step.body}</p>}
                {step.tips && (
                  <ol className="mt-4 space-y-2.5">
                    {step.tips.map((t: string, i: number) => (
                      <li key={t} className="flex gap-3 text-sm text-foreground">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-magenta-soft text-xs font-bold text-magenta">{i + 1}</span>
                        <span className="pt-0.5">{t}</span>
                      </li>
                    ))}
                  </ol>
                )}
                {step.tips && <p className="mt-4 text-sm font-semibold text-primary">Sorun düzeldi mi?</p>}
                <div className="mt-3 space-y-2">
                  {step.options.map((o: Option) => (
                    <button key={o.label} type="button" onClick={() => choose(o)} className="flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border border-primary/15 bg-background px-4 py-2.5 text-left transition-colors hover:border-magenta/40 hover:bg-magenta-soft">
                      <span>
                        <span className="block text-sm font-semibold text-primary">{o.label}</span>
                        {o.hint && <span className="block text-xs text-muted-foreground">{o.hint}</span>}
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </>
            )}
          </motion.section>
        </AnimatePresence>

        {!isDone && (
          <button type="button" onClick={() => openHelp("Canlı destekle görüşmek istiyorum")} className="mx-auto flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-primary hover:bg-muted">
            <Headphones className="size-4" /> Canlı destekle görüş
          </button>
        )}
      </div>
    </div>
  );
}
