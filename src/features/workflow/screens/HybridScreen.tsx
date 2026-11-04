import { Link } from "@tanstack/react-router";
import { CheckCircle2, CloudOff, Info, Loader2, Power, Router, Signal, Smartphone, TriangleAlert, Wifi } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/headers";
import { ToggleRow } from "@/components/tn/primitives";
import { Button } from "@/components/ui/button";
import { HYBRID_BACKUP_QUOTA_MB } from "@/data/mock";
import { useNow } from "@/hooks/use-now";
import { useFlow } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { HYBRID_COPY as C } from "../copy";
import { runOverdueOps } from "../engine";
import { hybridView } from "../hybridView";
import { HYBRID_OFFER_AFTER_H, hybridOfferOpen, hybridUsageMb } from "../rules";
import { checkHybrid, openHybridBox, outageHours, requestHybridDevice, setAutoFailover } from "../services/hybrid";
import { useWorkflowStore } from "../store";
import { ChecksList, DeviceTracker, FreeBadge, fmtOngoing, fmtUsage, OutageMeta } from "../components/hybrid";
import { DemoNote, TechDetails } from "../components/ui";

type Tone = "ok" | "warn" | "down" | "info";
const TONE: Record<Tone, string> = { ok: "bg-success-soft text-success", warn: "bg-warning-soft text-warning", down: "bg-destructive-soft text-destructive", info: "bg-icon-box text-primary" };

/**
 * Hibrit İnternet, simplified: one connection card (main line, Hibrit Box,
 * mobile backup, remaining backup data), one action ("Hibrit Box'ı Aç"), one
 * automatic-switch setting, and everything technical behind "Teknik detayları gör".
 * There is no switch-off button: the backup closes itself when the main line is back.
 */
export function HybridScreen() {
  const flow = useFlow("hybrid_internet");
  const o = useWorkflowStore((s) => s.outage);
  const h = useWorkflowStore((s) => s.hybrid);
  const c = useWorkflowStore((s) => s.connectivity);
  const hasDevice = useWorkflowStore((s) => s.config.hybridDevice);
  const verify = useWorkflowStore((s) => s.workflows.find((w) => w.id === s.outage?.wfId)?.steps.find((st) => st.key === "verify")?.status);
  const now = Math.max(useNow(5_000), o?.lastUpdateAt ?? 0);
  const wantOpen = !!h.openRequested;

  const ongoing = !!o && !o.restoredAt;
  const hours = ongoing ? outageHours(o, now) : 0;
  const offerOpen = ongoing && hybridOfferOpen(hours, o.etaH);
  const backupOn = h.status === "active" && !h.pausedAt;
  const used = h.activatedAt ? hybridUsageMb(h.activatedAt, h.pausedAt ?? h.endedAt ?? now) : 0;
  const left = Math.max(0, HYBRID_BACKUP_QUOTA_MB - used);

  // Eligibility (device, SIM, coverage) is checked quietly once the backup may be opened.
  useEffect(() => {
    if (offerOpen && h.status === "offered") checkHybrid();
  }, [offerOpen, h.status]);

  // A check or activation in progress can never stall on this screen.
  const busyOp = h.status === "checking" || h.status === "activating" || !!h.switching;
  useEffect(() => {
    if (!busyOp) return;
    const t = window.setInterval(() => runOverdueOps(), 2500);
    return () => window.clearInterval(t);
  }, [busyOp]);

  useEffect(() => {
    if (h.status === "active") flow.complete({ attempts: h.attempts });
  }, [h.status, h.attempts, flow]);

  const openBox = () => {
    if (!openHybridBox()) toast("Hibrit Box şu an açılamıyor", { description: `Kesinti ${HYBRID_OFFER_AFTER_H} saati aştığında ya da aşması beklendiğinde açılabilir.` });
  };

  // The whole status area is derived from the real connection state (see hybridView).
  const v = hybridView({
    fixed: c.fixed,
    outageOngoing: ongoing,
    restored: !!o?.restoredAt,
    restoredVerified: verify === "done",
    hours,
    offerOpen,
    status: h.status,
    paused: !!h.pausedAt,
    activatedBy: h.activatedBy,
    autoFailover: h.autoFailover,
    hasDevice,
  });
  const { tone } = v;

  const rows: { icon: typeof Router; label: string; value: string; tone: "on" | "off" | "bad" }[] = [
    { icon: Wifi, label: "Ana internet", value: v.main, tone: v.main === "Bağlı" ? "on" : "bad" },
    { icon: Router, label: "Hibrit Box", value: v.box, tone: v.box === "Cihaz yok" ? "off" : "on" },
    { icon: Smartphone, label: "Mobil yedek", value: v.mobile, tone: v.mobile === "Bağlı" ? "on" : "off" },
  ];

  const busy = (wantOpen && h.status === "checking") || !!h.switching;

  return (
    <div>
      <PageHeader title={C.name} />
      <div className="space-y-4 px-4 pb-4">
        <div>
          <p className="text-lg font-semibold leading-snug text-primary">İnternetin kesilse bile bağlantın devam etsin.</p>
          <FreeBadge className="mt-1.5" label="Ücretsiz · Aboneliğine dahil" />
        </div>

        <section className="rounded-card bg-card p-5 shadow-card" aria-live="polite">
          <div className={cn("flex items-start gap-2.5 rounded-2xl px-3 py-2.5", TONE[tone])}>
            {tone === "ok" ? <CheckCircle2 className="mt-0.5 size-5 shrink-0" /> : tone === "down" ? <CloudOff className="mt-0.5 size-5 shrink-0" /> : tone === "warn" ? <TriangleAlert className="mt-0.5 size-5 shrink-0" /> : v.phase === "activating" || (v.phase === "restored" && verify !== "done") ? <Loader2 className="mt-0.5 size-5 shrink-0 animate-spin" /> : <Signal className="mt-0.5 size-5 shrink-0" />}
            <div>
              <p className="text-sm font-semibold">{v.title}</p>
              {v.lines.map((l) => (
                <p key={l} className="mt-0.5 text-xs text-foreground/80">{l}</p>
              ))}
            </div>
          </div>

          <dl className="mt-4 grid grid-cols-3 gap-2">
            {rows.map((r) => (
              <div key={r.label} className="rounded-2xl bg-muted p-3">
                <dt className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <r.icon className="size-3.5" /> {r.label}
                </dt>
                <dd className={cn("mt-0.5 break-words text-[13px] font-semibold", r.tone === "on" ? "text-foreground" : r.tone === "bad" ? "text-destructive" : "text-muted-foreground")}>{r.value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-3">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Kalan yedek internet (demo)</span>
              <span className="font-semibold text-foreground">{fmtUsage(left)} / {fmtUsage(HYBRID_BACKUP_QUOTA_MB)}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-magenta" style={{ width: `${(left / HYBRID_BACKUP_QUOTA_MB) * 100}%` }} />
            </div>
          </div>

          {v.showOpen && (
            <>
              <Button size="xl" className="mt-4 w-full rounded-full" onClick={openBox} disabled={!v.canOpen || busy}>
                {busy ? <Loader2 className="animate-spin" /> : <Power />} Hibrit Box'ı Aç
              </Button>
              {v.openHint && (
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  {v.openHint}
                  {hours > 0 ? ` Kesinti ${fmtOngoing(hours)} sürüyor.` : ""}
                </p>
              )}
            </>
          )}
          {ongoing && h.status === "no_device" && (
            h.device ? (
              <div className="mt-4 rounded-2xl bg-muted p-3">
                <DeviceTracker d={h.device} />
              </div>
            ) : (
              <Button size="xl" className="mt-4 w-full rounded-full" onClick={() => requestHybridDevice()}>
                {C.noDevice.cta}
              </Button>
            )
          )}

          {v.failbackNote && (
            <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0" /> Ana internetin düzeldiğinde otomatik olarak ana bağlantına dönersin.
            </p>
          )}
        </section>

        <section className="rounded-card bg-card px-5 py-1 shadow-card">
          <ToggleRow id="hybrid-auto" title="Otomatik yedek geçişi" desc="Kesinti 24 saati aşarsa mobil yedek bağlantın otomatik açılsın." checked={h.autoFailover} onChange={(val) => setAutoFailover(val)} />
          <p className="border-t border-border py-3 text-xs text-muted-foreground">Ana internetin yeniden bağlandığında sistem otomatik olarak sabit bağlantına döner.</p>
        </section>

        <TechDetails>
          <dl className="space-y-1.5 text-xs">
            {[
              ["Cihaz", hasDevice ? "Uyumlu Hibrit Box · bağlı" : "Evde uyumlu cihaz yok"],
              ["SIM", hasDevice ? (backupOn ? "Aktif" : "Hazır") : "Yok"],
              ["Mobil bağlantı", backupOn ? "Bağlı · 4.5G · sinyal iyi" : "Beklemede"],
              ["Bağlantı modu", backupOn ? "Mobil yedek" : v.main === "Kesik" ? "Bağlantı yok" : "Ana hat (fiber)"],
              ["Açan", h.activatedBy === "auto" ? "Otomatik yedek geçişi" : h.activatedBy === "customer" ? "Sen (manuel)" : "—"],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <dt className="w-28 shrink-0 text-muted-foreground">{k}</dt>
                <dd className="font-semibold text-foreground">{v}</dd>
              </div>
            ))}
          </dl>
          {(h.checks || h.status === "checking") && (
            <div>
              <p className="mb-2 text-xs font-semibold text-primary">Uygunluk kontrolü</p>
              <ChecksList checks={h.checks} checking={h.status === "checking"} />
            </div>
          )}
          {o && <OutageMeta o={o} now={now} />}
          {o && (
            <Link to="/surec/$id" params={{ id: o.wfId }} className="block text-sm font-semibold text-primary">
              İşlem adımlarını gör →
            </Link>
          )}
          <DemoNote>Kesinti süresi, cihaz, SIM, kapsama ve kullanım bilgileri demo verisidir; gerçek modem, SIM veya mobil operatör bağlantısı yoktur.</DemoNote>
        </TechDetails>
      </div>
    </div>
  );
}
