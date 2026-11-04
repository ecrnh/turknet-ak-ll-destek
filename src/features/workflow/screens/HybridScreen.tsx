import { Link } from "@tanstack/react-router";
import { CheckCircle2, Clock, Gauge, Loader2, Power, TriangleAlert, Wifi } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/headers";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { HYBRID_BACKUP_QUOTA_MB, USER } from "@/data/mock";
import { useAppStore } from "@/features/core/appStore";
import { useNow } from "@/hooks/use-now";
import { useFlow } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { HYBRID_COPY as C } from "../copy";
import { runOverdueOps } from "../engine";
import { hybridView, outageInfo, type HybridTone } from "../hybridView";
import { HYBRID_OFFER_AFTER_H, hybridOfferOpen, hybridUsageMb } from "../rules";
import { checkHybrid, openHybridBox, outageHours, requestHybridDevice, setAutoFailover } from "../services/hybrid";
import { useWorkflowStore } from "../store";
import { ChecksList, DeviceTracker, fmtOngoing, fmtUsage, OutageMeta } from "../components/hybrid";
import { DemoNote, TechDetails } from "../components/ui";

const PILL: Record<HybridTone | "muted", string> = {
  ok: "bg-success-soft text-success",
  warn: "bg-warning-soft text-warning",
  down: "bg-destructive-soft text-destructive",
  info: "bg-icon-box text-primary",
  muted: "bg-muted text-muted-foreground",
};

function StatusPill({ label, tone, className }: { label: string; tone: HybridTone | "muted"; className?: string }) {
  const Icon = tone === "ok" ? CheckCircle2 : tone === "warn" || tone === "down" ? TriangleAlert : tone === "info" ? (/lıyor|nıyor/.test(label) ? Loader2 : Wifi) : Clock;
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", PILL[tone], className)}>
      <Icon className={cn("size-3.5", Icon === Loader2 && "animate-spin")} aria-hidden /> {label}
    </span>
  );
}

/** Tone of a single connection row value (Bağlı / Kesik / Hazır / Beklemede …). */
function rowTone(value: string): HybridTone | "muted" {
  if (value === "Kesik") return "warn";
  if (value === "Yavaş") return "warn";
  if (value === "Bağlı" || value === "Aktif" || value === "Hazır") return "ok";
  if (value === "Açılıyor" || value === "Bağlanıyor") return "info";
  return "muted";
}

const card = "rounded-card bg-card p-5 shadow-card";

/**
 * İnternet Durumu (route /hibrit): one page for the connection, whether the main
 * line works, is down, or the customer is on NetBox (Hibrit Box). All status text
 * comes from hybridView()/outageInfo(); the open action is the shared openHybridBox().
 */
export function HybridScreen() {
  const flow = useFlow("hybrid_internet");
  const o = useWorkflowStore((s) => s.outage);
  const h = useWorkflowStore((s) => s.hybrid);
  const c = useWorkflowStore((s) => s.connectivity);
  const hasDevice = useWorkflowStore((s) => s.config.hybridDevice);
  const verify = useWorkflowStore((s) => s.workflows.find((w) => w.id === s.outage?.wfId)?.steps.find((st) => st.key === "verify")?.status);
  const regional = useWorkflowStore((s) => s.workflows.find((w) => w.id === s.outage?.wfId)?.data["outageType"] === "regional");
  const speed = useAppStore((s) => s.net.speed);
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
    if (!openHybridBox()) toast("NetBox şu an açılamıyor", { description: `Kesinti ${HYBRID_OFFER_AFTER_H} saati aştığında ya da aşması beklendiğinde açılabilir.` });
  };

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
  const info = outageInfo({ fixed: c.fixed, outageOngoing: ongoing, regional, hours, etaH: o?.etaH });
  const busy = (wantOpen && h.status === "checking") || !!h.switching || h.status === "activating";

  const rows = [
    { label: "Ana internet", value: v.main },
    { label: "Hibrit Box", value: v.box },
    { label: "Mobil yedek", value: v.mobile },
  ];

  // Only problem states get a note in the connection card; the normal flow stays quiet.
  const showNote = !!info && (h.status === "no_device" || h.status === "no_coverage" || h.status === "failed" || v.phase === "activating");

  return (
    <div>
      <PageHeader title="İnternet Durumu" right={<StatusPill label={v.badge.label} tone={v.badge.tone} className="mr-1" />} />
      <div className="space-y-3 px-4 pb-4">
        <section className={card}>
          <p className="text-lg font-bold leading-snug text-primary">İnternetin kesilse bile bağlantın NetBox ile devam etsin.</p>
        </section>

        {info ? (
          <section className={card} aria-labelledby="net-status-title" aria-live="polite">
            <p id="net-status-title" className="text-base font-bold text-primary">
              {regional ? "Bölgende internet kesintisi var" : "Ana internetinde kesinti var"}
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {backupOn ? "Şu anda NetBox ile internete bağlısın; ana bağlantın düzelince otomatik geri dönersin." : "Teknik ekibimiz çalışıyor; gelişmeleri sana bildireceğiz."}
            </p>
            <dl className="mt-4 space-y-3 text-sm">
              {[
                { k: "Arıza sebebi", v: info.cause },
                { k: "Tahmini çözüm", v: ongoing ? `${info.remaining} (demo)` : info.remaining },
                ...(ongoing ? [{ k: "Süre", v: `Kesinti ${fmtOngoing(hours)} sürüyor` }, { k: "Onarım durumu", v: o.repairNote }] : []),
              ].map((r) => (
                <div key={r.k} className="grid grid-cols-[96px_1fr] gap-3">
                  <dt className="text-xs font-medium leading-5 text-muted-foreground">{r.k}</dt>
                  <dd className="font-semibold leading-5 text-foreground">{r.v}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : (
          <section className={card} aria-labelledby="net-status-title" aria-live="polite">
            <div className="flex items-start gap-3">
              <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", PILL[v.tone])}>
                {v.tone === "ok" ? <CheckCircle2 className="size-5" strokeWidth={1.75} /> : v.tone === "warn" ? <Gauge className="size-5" strokeWidth={1.75} /> : <Loader2 className="size-5 animate-spin" />}
              </span>
              <div className="min-w-0">
                <p id="net-status-title" className="text-base font-bold text-primary">{v.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{v.lines[0]}</p>
              </div>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              {[
                { k: "Paket", v: USER.packageName },
                { k: "Bağlantı", v: "Fiber · ana hat" },
                { k: "Son ölçülen hız", v: `${speed} Mbps` },
              ].map((r) => (
                <div key={r.k} className="grid grid-cols-[112px_1fr] gap-3">
                  <dt className="text-xs font-medium leading-5 text-muted-foreground">{r.k}</dt>
                  <dd className="font-semibold leading-5 text-foreground">{r.v}</dd>
                </div>
              ))}
            </dl>
            <Link to="/hiz-testi" className="mt-4 inline-flex min-h-9 items-center text-sm font-semibold text-magenta">
              Hız testi yap
            </Link>
          </section>
        )}

        <section className={card}>
          <p className="text-base font-bold text-foreground">Bağlantı durumları</p>
          <dl className="mt-3 space-y-3">
            {rows.map((r) => (
              <div key={r.label} className="flex items-center justify-between gap-3">
                <dt className="text-sm text-muted-foreground">{r.label}</dt>
                <dd><StatusPill label={r.value} tone={rowTone(r.value)} /></dd>
              </div>
            ))}
          </dl>

          {showNote && (
            <div className="mt-4 rounded-2xl bg-muted px-3.5 py-3 text-xs text-foreground/80">
              <p className="font-semibold text-foreground">{v.title}</p>
              {v.lines.map((l) => <p key={l} className="mt-0.5">{l}</p>)}
            </div>
          )}

          {v.showOpen && v.canOpen && (
            <Button size="xl" className="mt-4 w-full rounded-full" onClick={openBox} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <Power />} {busy ? "Aktive Ediliyor..." : "NetBox'u etkinleştir"}
            </Button>
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
        </section>

        <section className={card}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-base font-bold text-foreground">Kalan yedek internet</p>
            <span className="rounded-full bg-icon-box px-2.5 py-1 text-xs font-semibold text-primary">Demo</span>
          </div>
          <div className="mt-3 flex justify-between text-sm">
            <span className="text-muted-foreground">Kalan</span>
            <span className="font-semibold text-foreground">{fmtUsage(left)} / {fmtUsage(HYBRID_BACKUP_QUOTA_MB)}</span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${(left / HYBRID_BACKUP_QUOTA_MB) * 100}%` }} />
          </div>
        </section>

        <section className={card}>
          <label htmlFor="hybrid-auto" className="flex items-center justify-between gap-3">
            <span className="text-base font-bold text-foreground">Otomatik yedek geçiş</span>
            <Switch id="hybrid-auto" checked={h.autoFailover} onCheckedChange={(val) => setAutoFailover(val)} className="data-[state=checked]:bg-magenta" />
          </label>
          <p className="mt-3 text-sm text-muted-foreground">
            Açtığında, kesinti 24 saati aşarsa mobil yedek bağlantın otomatik açılır. Ana internetin geri geldiğinde sistem sabit bağlantıya döner.
          </p>
        </section>

        <TechDetails>
          <dl className="space-y-1.5 text-xs">
            {[
              ["Cihaz", hasDevice ? "Uyumlu Hibrit Box · bağlı" : "Evde uyumlu cihaz yok"],
              ["SIM", hasDevice ? (backupOn ? "Aktif" : "Hazır") : "Yok"],
              ["Mobil bağlantı", backupOn ? "Bağlı · 4.5G · sinyal iyi" : "Beklemede"],
              ["Bağlantı modu", backupOn ? "Mobil yedek" : v.main === "Kesik" ? "Bağlantı yok" : "Ana hat (fiber)"],
              ["Açan", h.activatedBy === "auto" ? "Otomatik yedek geçişi" : h.activatedBy === "customer" ? "Sen (manuel)" : "—"],
            ].map(([k, val]) => (
              <div key={k} className="flex gap-2">
                <dt className="w-28 shrink-0 text-muted-foreground">{k}</dt>
                <dd className="font-semibold text-foreground">{val}</dd>
              </div>
            ))}
          </dl>
          {(h.checks || h.status === "checking") && (
            <div>
              <p className="mb-2 text-xs font-semibold text-primary">Uygunluk kontrolü</p>
              <ChecksList checks={h.checks} checking={h.status === "checking"} />
            </div>
          )}
          {o && !ongoing && <OutageMeta o={o} now={now} />}
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
