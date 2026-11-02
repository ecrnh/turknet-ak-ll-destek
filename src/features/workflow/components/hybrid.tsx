import { Link } from "@tanstack/react-router";
import { CheckCircle2, CloudOff, Loader2, Router, Signal, Smartphone, Truck, WifiOff, XCircle } from "lucide-react";
import { useNow } from "@/hooks/use-now";
import { fmtDateTime, fmtRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { HYBRID_COPY as C } from "../copy";
import { hybridOfferOpen, hybridUsageMb } from "../rules";
import { activateHybrid, checkHybrid, declineHybrid, dismissOutage, outageHours } from "../services/hybrid";
import { useWorkflowStore } from "../store";
import type { DeviceRequest, HybridChecks, OutageState } from "../types";

export const fmtOutageDuration = (h: number) => (h < 1 ? `${Math.max(1, Math.round(h * 60))} dakika` : `${Math.floor(h)} saat`);
/** "45 dakikadır" / "25 saattir" */
export const fmtOngoing = (h: number) => (h < 1 ? `${Math.max(1, Math.round(h * 60))} dakikadır` : `${Math.floor(h)} saattir`);
export const fmtUsage = (mb: number) => (mb < 1024 ? `${mb} MB` : `${(mb / 1024).toFixed(1).replace(".", ",")} GB`);

export function FreeBadge({ onDark, className }: { onDark?: boolean; className?: string }) {
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold", onDark ? "bg-neon-lime text-primary-deep" : "bg-success-soft text-success", className)}>{C.freeBadge}</span>;
}

/** Start time, duration, repair status and last update of the outage. */
export function OutageMeta({ o, now, className }: { o: OutageState; now: number; className?: string }) {
  const rows: [string, string][] = [
    ["Başlangıç", fmtDateTime(o.startedAt)],
    ["Süre", o.restoredAt ? `${fmtOutageDuration(outageHours(o, o.restoredAt))} sürdü` : `${fmtOngoing(outageHours(o, now))} sürüyor`],
    ["Çözüm durumu", o.repairNote],
    ["Son güncelleme", fmtRelative(o.lastUpdateAt, now)],
  ];
  return (
    <dl className={cn("space-y-1.5 rounded-2xl bg-muted p-3 text-xs", className)}>
      {rows.map(([k, v]) => (
        <div key={k} className="flex gap-2">
          <dt className="w-28 shrink-0 text-muted-foreground">{k}</dt>
          <dd className="font-semibold text-foreground">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Main line vs backup line, device and demo usage. */
export function LinkStatus({ now }: { now: number }) {
  const c = useWorkflowStore((s) => s.connectivity);
  const h = useWorkflowStore((s) => s.hybrid);
  const mainUp = c.fixed === "up";
  const backupOn = c.mode === "hybrid_backup" && c.mobile === "active";
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div className={cn("rounded-2xl p-3", mainUp ? "bg-success-soft" : "bg-destructive-soft")}>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {mainUp ? <Router className="size-4 text-success" /> : <WifiOff className="size-4 text-destructive" />} Ana bağlantı
          </p>
          <p className={cn("mt-1 font-bold", mainUp ? "text-success" : "text-destructive")}>{mainUp ? "Aktif" : "Kesik"}</p>
        </div>
        <div className={cn("rounded-2xl p-3", backupOn ? "bg-orange-soft" : "bg-muted")}>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Smartphone className={cn("size-4", backupOn ? "text-orange-deep" : "text-muted-foreground")} /> Yedek bağlantı
          </p>
          <p className={cn("mt-1 font-bold", backupOn ? "text-orange-deep" : "text-foreground")}>{backupOn ? "Aktif" : h.status === "ended" ? "Kapatıldı" : "Kapalı"}</p>
        </div>
      </div>
      {(backupOn || h.status === "ended") && (
        <dl className="space-y-1.5 rounded-2xl border border-border p-3 text-xs">
          <div className="flex justify-between gap-2">
            <dt className="flex items-center gap-1.5 text-muted-foreground">
              <Signal className="size-3.5" /> Yedek cihaz
            </dt>
            <dd className="font-semibold text-foreground">{backupOn ? "Bağlı · mobil sinyal iyi" : "Beklemede"}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Kullanılan yedek internet</dt>
            <dd className="font-semibold text-foreground">{fmtUsage(hybridUsageMb(h.activatedAt, backupOn ? now : (h.endedAt ?? now)))}</dd>
          </div>
        </dl>
      )}
    </div>
  );
}

/** Device / SIM / coverage check results. */
export function ChecksList({ checks, checking }: { checks: HybridChecks | null; checking: boolean }) {
  const rows: [string, boolean | undefined][] = [
    ["Uyumlu yedek internet cihazı", checks?.device],
    ["Aktif SIM", checks?.sim],
    ["Yeterli mobil kapsama", checks?.coverage],
  ];
  return (
    <ul className="space-y-2">
      {rows.map(([label, ok]) => (
        <li key={label} className="flex items-center gap-2.5 text-sm">
          {checking || ok === undefined ? (
            <Loader2 className={cn("size-5 text-muted-foreground", checking && "animate-spin")} />
          ) : ok ? (
            <CheckCircle2 className="size-5 text-success" />
          ) : (
            <XCircle className="size-5 text-destructive" />
          )}
          <span className="flex-1 text-foreground">{label}</span>
          <span className={cn("text-xs font-semibold", checking || ok === undefined ? "text-muted-foreground" : ok ? "text-success" : "text-destructive")}>
            {checking || ok === undefined ? "Kontrol ediliyor" : ok ? "Uygun" : "Uygun değil"}
          </span>
        </li>
      ))}
    </ul>
  );
}

const DEVICE_ORDER: DeviceRequest["status"][] = ["requested", "preparing", "on_the_way", "delivered"];

export function DeviceTracker({ d }: { d: DeviceRequest }) {
  const idx = DEVICE_ORDER.indexOf(d.status);
  return (
    <div>
      <p className="flex items-center gap-2 text-sm font-semibold text-primary">
        <Truck className="size-4" /> Yedek cihazınız · {C.device[d.status]}
      </p>
      <div className="mt-3 flex gap-1">
        {DEVICE_ORDER.map((st, i) => (
          <div key={st} className="flex-1">
            <div className={cn("h-1.5 rounded-full", i <= idx ? "bg-magenta" : "bg-border")} />
            <p className={cn("mt-1 text-center text-[10px]", i <= idx ? "font-semibold text-primary" : "text-muted-foreground")}>{C.device[st]}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">Takip no {d.trackingNo} · teslimat demo olarak simüle edilir</p>
    </div>
  );
}

const PRIMARY = "mt-4 flex min-h-12 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-float";

/** Home outage card: one calm message and at most one primary action. */
export function OutageHomeCard() {
  const o = useWorkflowStore((s) => s.outage);
  const h = useWorkflowStore((s) => s.hybrid);
  const verifying = useWorkflowStore((s) => s.workflows.find((w) => w.id === s.outage?.wfId)?.steps.find((st) => st.key === "verify")?.status !== "done");
  // Never behind the last state change (the presenter can move the outage start).
  const now = Math.max(useNow(30_000), o?.lastUpdateAt ?? 0);
  if (!o || o.dismissed) return null;

  if (o.restoredAt) {
    const used = h.status === "ended" || h.status === "active";
    return (
      <div className="rounded-card bg-card p-5 shadow-card" role="status">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-success-soft text-success">
            {verifying ? <Loader2 className="size-6 animate-spin" /> : <CheckCircle2 className="size-6" />}
          </span>
          <div>
            <p className="font-semibold leading-snug text-primary">{verifying ? "Ana bağlantınız doğrulanıyor" : used ? C.restored.title : "İnternetiniz normale döndü"}</p>
            <p className="mt-1 text-sm text-muted-foreground">{verifying ? "Bağlantınız kararlı çalışınca yedek bağlantıyı kapatacağız." : used ? C.restored.text : C.restored.plain}</p>
          </div>
        </div>
        {!verifying && (
          <button type="button" onClick={dismissOutage} className={PRIMARY}>
            Tamam
          </button>
        )}
      </div>
    );
  }

  const hours = outageHours(o, now);
  const after24 = hybridOfferOpen(hours, o.etaH);
  const active = h.status === "active";

  let title: string = C.detected.title;
  let text: string = C.detected.text;
  let cta: string | null = null;
  if (active) {
    title = C.active.title;
    text = C.active.text;
  } else if (after24) {
    if (h.status === "no_coverage") {
      title = C.noCoverage.title;
      text = `${C.noCoverage.text} ${C.noCoverage.after}`;
    } else if (h.status === "no_device" && h.device) {
      title = "Yedek cihazınız yolda";
      text = `Cihazınız teslim edilince ücretsiz Hibrit İnternet'i etkinleştirebilirsiniz. Durum: ${C.device[h.device.status]}.`;
    } else if (h.status === "checking" || h.status === "activating") {
      title = C.offer.title;
      text = h.status === "checking" ? "Yedek bağlantı uygunluğunuzu kontrol ediyoruz." : "Yedek bağlantınız etkinleştiriliyor.";
    } else {
      title = C.offer.title;
      text = C.offer.text;
      cta = h.status === "failed" ? C.failed.cta : h.status === "no_device" ? C.noDevice.cta : C.offer.cta;
    }
  }

  return (
    <div className={cn("rounded-card bg-card p-5 shadow-card", after24 && !active && cta && "border-gradient")} role="status" aria-live="polite">
      <div className="flex items-start gap-3">
        <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", active ? "bg-orange-soft text-orange-deep" : "bg-destructive-soft text-destructive")}>
          {active ? <Smartphone className="size-6" /> : <CloudOff className="size-6" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug text-primary">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{text}</p>
        </div>
      </div>
      {active ? (
        <div className="mt-4">
          <LinkStatus now={now} />
        </div>
      ) : (
        <OutageMeta o={o} now={now} className="mt-4" />
      )}
      {cta ? (
        <>
          <Link to="/hibrit" className={PRIMARY}>
            {cta}
          </Link>
          <p className="mt-2 text-center text-xs font-semibold text-success">{C.included}</p>
        </>
      ) : (
        <Link to="/hibrit" className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-primary">
          Detayları Gör
        </Link>
      )}
    </div>
  );
}

/** Main fixed line ↔ Hibrit Box ↔ mobile backup, with the path in use highlighted. */
export function ConnectionDiagram() {
  const c = useWorkflowStore((s) => s.connectivity);
  const h = useWorkflowStore((s) => s.hybrid);
  const backupOn = h.status === "active" && !h.pausedAt;
  const fixedUp = c.fixed === "up";
  const Node = ({ icon: Icon, label, state, on, bad }: { icon: typeof Router; label: string; state: string; on: boolean; bad?: boolean }) => (
    <div className="flex flex-1 flex-col items-center text-center">
      <span className={cn("flex h-12 w-12 items-center justify-center rounded-2xl", on ? "bg-success-soft text-success" : bad ? "bg-destructive-soft text-destructive" : "bg-muted text-muted-foreground")}>
        <Icon className="size-6" strokeWidth={1.5} />
      </span>
      <span className="mt-1.5 text-[11px] font-semibold text-foreground">{label}</span>
      <span className={cn("text-[10px] font-semibold", on ? "text-success" : bad ? "text-destructive" : "text-muted-foreground")}>{state}</span>
    </div>
  );
  const Line = ({ on }: { on: boolean }) => <div className={cn("mt-6 h-1 w-6 shrink-0 rounded-full", on ? "bg-success" : "bg-border")} />;
  return (
    <div className="flex items-start" aria-label={`Kullanılan bağlantı: ${fixedUp ? "ana internet" : backupOn ? "mobil yedek" : "yok"}`}>
      <Node icon={fixedUp ? Router : WifiOff} label="Ana internet" state={fixedUp ? "Kullanılıyor" : "Kesik"} on={fixedUp} bad={!fixedUp} />
      <Line on={fixedUp} />
      <Node icon={Router} label="Hibrit Box" state={fixedUp ? "Hazır" : backupOn ? "Yedekte" : "Beklemede"} on={fixedUp || backupOn} />
      <Line on={backupOn} />
      <Node icon={Signal} label="Mobil yedek" state={backupOn ? "Kullanılıyor" : "Kapalı"} on={backupOn} />
    </div>
  );
}

/**
 * Regional outage found during a GIGA conversation: plain explanation, the
 * estimated duration and — when it is expected to exceed 24 h — the free
 * Hibrit İnternet with an explicit eligibility check and activation consent.
 */
export function HybridOfferInline() {
  const o = useWorkflowStore((s) => s.outage);
  const h = useWorkflowStore((s) => s.hybrid);
  const now = Math.max(useNow(30_000), o?.lastUpdateAt ?? 0);
  if (!o || o.restoredAt) return null;
  const offer = hybridOfferOpen(outageHours(o, now), o.etaH);
  const btn = "flex min-h-11 w-full items-center justify-center rounded-full text-sm font-semibold";
  return (
    <div className="rounded-card bg-card p-4 shadow-card" aria-live="polite">
      <p className="flex items-center gap-2 text-sm font-semibold text-primary">
        <CloudOff className="size-4 text-warning" /> Bölgesel kesinti
      </p>
      <p className="mt-1 text-sm text-foreground">Sorun evindeki bağlantıdan değil, bölgendeki bir arızadan kaynaklanıyor. Teknik ekibimiz çalışıyor; modeminde bir şey yapmana gerek yok.</p>
      {o.etaH ? <p className="mt-2 text-xs font-semibold text-muted-foreground">Tahmini çözüm süresi: yaklaşık {o.etaH} saat</p> : null}

      {offer && h.status !== "active" && (
        <div className="mt-3 rounded-2xl bg-muted/60 p-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Router className="size-4 text-magenta" /> Hibrit İnternet ile bağlı kal <FreeBadge />
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Aboneliğine dahil yedek bağlantı. Uyumlu cihaz, aktif SIM ve yeterli mobil kapsama gerekir; önce uygunluğunu kontrol ederiz.</p>
          {(h.status === "checking" || h.checks) && h.status !== "offered" && (
            <div className="mt-3">
              <ChecksList checks={h.checks} checking={h.status === "checking"} />
            </div>
          )}
          <div className="mt-3 space-y-2">
            {h.status === "offered" && !h.declinedAt && (
              <>
                <button type="button" onClick={() => checkHybrid()} className={cn(btn, "bg-primary text-primary-foreground shadow-float")}>Uygunluğumu kontrol et</button>
                <button type="button" onClick={() => declineHybrid()} className={cn(btn, "border border-primary/20 bg-card text-primary")}>Şimdi değil</button>
              </>
            )}
            {h.status === "offered" && h.declinedAt && (
              <button type="button" onClick={() => checkHybrid()} className={cn(btn, "border border-primary/20 bg-card text-primary")}>Uygunluğumu kontrol et</button>
            )}
            {(h.status === "ready" || h.status === "failed") && (
              <>
                {h.status === "failed" && <p className="text-xs font-semibold text-destructive">Yedek bağlantı açılamadı. Tekrar deneyebilirsin.</p>}
                <button type="button" onClick={() => activateHybrid()} className={cn(btn, "bg-primary text-primary-foreground shadow-float")}>{h.status === "failed" ? "Tekrar Dene" : "Ücretsiz Olarak Etkinleştir"}</button>
              </>
            )}
            {h.status === "activating" && (
              <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin text-magenta" /> Yedek bağlantın açılıyor…</p>
            )}
            {h.status === "no_device" && (
              <>
                <p className="text-xs text-foreground">Uyumlu yedek cihaz veya aktif SIM bulunamadı. Cihazı ücretsiz gönderebiliriz.</p>
                <Link to="/hibrit" className={cn(btn, "bg-primary text-primary-foreground shadow-float")}>Cihaz Talep Et</Link>
              </>
            )}
            {h.status === "no_coverage" && <p className="text-xs text-foreground">Adresinde yedek bağlantı için yeterli mobil kapsama yok. Arıza takibin devam ediyor; çözülünce haber veririz.</p>}
          </div>
        </div>
      )}
      {h.status === "active" && (
        <p className="mt-3 flex items-center gap-2 rounded-2xl bg-success-soft px-3 py-2 text-sm font-semibold text-success">
          <CheckCircle2 className="size-4" /> Yedek bağlantın aktif; ana bağlantın düzelince haber vereceğiz.
        </p>
      )}
      <Link to="/hibrit" className="mt-3 inline-flex min-h-9 items-center text-sm font-semibold text-magenta">Kesinti durumunu gör</Link>
    </div>
  );
}
