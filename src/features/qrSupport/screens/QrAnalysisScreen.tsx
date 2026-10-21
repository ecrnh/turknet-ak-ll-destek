import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, EarOff, Loader2, Sparkles, Wrench, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/headers";
import { RingChart } from "@/components/tn/RingChart";
import { ToggleRow } from "@/components/tn/primitives";
import { Button } from "@/components/ui/button";
import { QR_CHECKS, USER } from "@/data/mock";
import { useAppStore } from "@/features/core/appStore";
import { buildScan, useQrStore, type CheckResult, type ScanResult } from "../store";
import { useFlow } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { fmtDateTime } from "@/lib/format";

const ICON = { ok: CheckCircle2, warn: AlertTriangle, fail: XCircle };
const TONE = { ok: "text-success", warn: "text-warning", fail: "text-destructive" };

export function QrAnalysisScreen() {
  const flow = useFlow("qr_support");
  const navigate = useNavigate();
  const netStatus = useAppStore((s) => s.net.status);
  const addRecord = useAppStore((s) => s.addRecord);
  const notify = useAppStore((s) => s.notify);
  const setScan = useQrStore((s) => s.setScan);
  const addTicket = useQrStore((s) => s.addTicket);
  const serial = useQrStore((s) => s.serial);
  const [result] = useState<ScanResult>(() => buildScan(netStatus));
  const [i, setI] = useState(0);
  const [checks, setChecks] = useState<CheckResult[]>(result.checks);
  const [fixing, setFixing] = useState(false);
  const [fixed, setFixed] = useState(false);
  const [contact, setContact] = useState(false);
  const done = i >= QR_CHECKS.length;

  useEffect(() => {
    if (done) {
      setScan(result);
      return;
    }
    const t = setTimeout(() => setI((v) => v + 1), 850);
    return () => clearTimeout(t);
  }, [i, done, result, setScan]);

  const issues = checks.filter((c) => c.state !== "ok");
  const penalty = checks.reduce((n, c) => n + (c.state === "fail" ? 25 : c.state === "warn" ? 11 : 0), 0);
  const score = Math.max(8, 100 - penalty);
  const fixable = checks.some((c) => c.key === "wifi" && c.state !== "ok");

  const autoFix = () => {
    setFixing(true);
    setTimeout(() => {
      setChecks((cs) => cs.map((c) => (c.key === "wifi" ? { ...c, state: "ok", value: "Kanal 11 · %22", note: undefined } : c.key === "drops" ? { ...c, state: "ok", value: "İzleniyor", note: undefined } : c)));
      setFixing(false);
      setFixed(true);
      addRecord({ channel: "Dijital Onarım", title: "QR sonrası otomatik onarım", summary: "Wi-Fi kanalı 6 → 11 değiştirildi.", status: "Tamamlandı", fieldVisitAvoided: true });
      toast.success("Wi-Fi kanalı 6 → 11 olarak değiştirildi");
    }, 2200);
  };

  const createTicket = () => {
    const tech: [string, string][] = checks.map((c) => [c.label, c.value]);
    const category = issues.some((c) => c.key === "line" && c.state === "fail") ? "Hat arızası" : issues.some((c) => c.key === "optic") ? "Optik sinyal / fiber" : "Kablosuz ağ";
    const recordId = addRecord({
      channel: "QR",
      title: `QR talebi: ${category}`,
      summary: `Form doldurulmadan otomatik oluşturuldu · Sağlık skoru ${score}`,
      status: "Alındı",
      details: [...issues.map((c) => c.note ?? c.label), `Cihaz: ${USER.modemModel} (${serial})`, contact ? "Gerekirse aranabilir" : "Arama istemiyor (temassız)"],
    });
    const t = addTicket({
      category,
      issues: issues.map((c) => c.note ?? c.label),
      tech,
      device: `${USER.modemModel} · ${serial}`,
      contactMe: contact,
      eta: category === "Hat arızası" ? "4 saat" : "24 saat",
      recordId,
    });
    useAppStore.getState().updateRecord(recordId, { to: `/qr/talep/${t.id}`, title: `${t.id} · ${category}` });
    notify({ kind: "support", title: `${t.id} talebin alındı`, body: `${category} · Tahmini çözüm ${t.eta}`, to: `/qr/talep/${t.id}` }, false);
    flow.complete({ score, issues: issues.length });
    navigate({ to: "/qr/talep/$id", params: { id: t.id } });
  };

  return (
    <div>
      <PageHeader title={done ? "Analiz Sonucu" : "Modemin analiz ediliyor…"} />
      <div className="space-y-4 px-4">
        {!done ? (
          <div className="rounded-card bg-card p-5 shadow-card">
            <p className="text-sm text-muted-foreground">{serial} · {fmtDateTime(Date.now())}</p>
            <ul className="mt-4 space-y-3.5" aria-live="polite">
              {QR_CHECKS.map((c, idx) => {
                const r = result.checks[idx];
                const Icon = ICON[r.state];
                return (
                  <li key={c.key} className="flex items-center gap-3">
                    {idx < i ? <Icon className={cn("size-6", TONE[r.state])} /> : idx === i ? <Loader2 className="size-6 animate-spin text-magenta" /> : <span className="h-6 w-6 rounded-full border-2 border-border" />}
                    <span className={cn("flex-1 font-medium", idx > i && "text-muted-foreground")}>{c.label}</span>
                    {idx < i && <span className="text-xs text-muted-foreground">{r.value}</span>}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center rounded-card bg-card p-6 shadow-card">
              <RingChart value={score} size={170} tone={score >= 80 ? "success" : score >= 55 ? "warning" : "destructive"} label={`Sağlık skoru ${score}`}>
                <p className="text-4xl font-bold text-primary">{score}</p>
                <p className="text-xs text-muted-foreground">Sağlık Skoru</p>
              </RingChart>
              <p className="mt-3 text-center text-sm text-muted-foreground">{issues.length === 0 ? "Modemin sağlıklı görünüyor." : `${issues.length} konu tespit edildi`}</p>
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-magenta-soft px-3 py-1.5 text-xs font-semibold text-magenta">
                <EarOff className="size-3.5" /> Temassız: kimseyle konuşmadan, form doldurmadan
              </span>
            </div>

            <div className="space-y-2.5">
              <AnimatePresence>
                {checks.map((c) => {
                  const Icon = ICON[c.state];
                  const bad = c.state !== "ok";
                  return (
                    <motion.div layout key={c.key} className={cn("flex items-start gap-3 rounded-2xl border-2 bg-card p-3.5", c.state === "fail" ? "border-destructive/50 bg-destructive-soft" : c.state === "warn" ? "border-warning/50 bg-warning-soft" : "border-transparent")}>
                      <Icon className={cn("mt-0.5 size-5", TONE[c.state])} />
                      <div className="flex-1">
                        <p className={cn("text-sm font-semibold", bad && "text-foreground")}>{c.label}</p>
                        {c.note && <p className="text-xs text-muted-foreground">{c.note}</p>}
                      </div>
                      <span className="text-xs font-semibold">{c.value}</span>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {fixable && !fixed && (
              <div className="rounded-card bg-plum p-5 text-primary-foreground shadow-float">
                <p className="flex items-center gap-2 font-semibold"><Sparkles className="size-5" /> Önce Otomatik Onarım Dene</p>
                <p className="mt-1 text-sm text-primary-foreground/80">Wi-Fi kanal yoğunluğu uzaktan çözülebilir. 20 saniye sürer.</p>
                <Button variant="white" size="lg" className="mt-4 w-full" onClick={autoFix} disabled={fixing}>
                  {fixing ? <><Loader2 className="animate-spin" /> Onarılıyor…</> : <><Wrench /> Otomatik Onarım Dene</>}
                </Button>
              </div>
            )}

            {issues.length > 0 && (
              <div className="rounded-card bg-card p-5 shadow-card">
                <p className="font-semibold text-primary">{fixed ? "Kalan sorun için talep aç" : "Destek talebi"}</p>
                <p className="mt-1 text-sm text-muted-foreground">Sorun kategorisi, teknik veriler, saat ve cihaz bilgisi otomatik doldurulur.</p>
                <ToggleRow id="contact-me" title="Gerekirse bana ulaşın" desc="Kapalıysa yalnızca bildirimle bilgilendiririz" checked={contact} onChange={setContact} />
                <Button size="xl" className="mt-2 w-full rounded-full" onClick={createTicket}>
                  Destek Talebini Oluştur
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
