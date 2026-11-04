import { Link } from "@tanstack/react-router";
import { CheckCircle2, CloudOff, Loader2, Power, Router, Signal, Smartphone, Truck, WifiOff, XCircle } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useNow } from "@/hooks/use-now";
import { fmtDateTime, fmtRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { HYBRID_COPY as C } from "../copy";
import { runOverdueOps } from "../engine";
import { fmtRemaining, hybridSwitchView, outageRemainingH, type HybridSwitchView } from "../hybridView";
import { hybridOfferOpen, hybridUsageMb } from "../rules";
import { activateHybrid, checkHybrid, declineHybrid, dismissOutage, outageHours, setHybridOn } from "../services/hybrid";
import { useWorkflowStore } from "../store";
import type { DeviceRequest, HybridChecks, OutageState } from "../types";

export const fmtOutageDuration = (h: number) => (h < 1 ? `${Math.max(1, Math.round(h * 60))} dakika` : `${Math.floor(h)} saat`);
/** "45 dakikadır" / "25 saattir" */
export const fmtOngoing = (h: number) => (h < 1 ? `${Math.max(1, Math.round(h * 60))} dakikadır` : `${Math.floor(h)} saattir`);
export const fmtUsage = (mb: number) => (mb < 1024 ? `${mb} MB` : `${(mb / 1024).toFixed(1).replace(".", ",")} GB`);

export function FreeBadge({ onDark, className, label }: { onDark?: boolean; className?: string; label?: string }) {
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold", onDark ? "bg-neon-lime text-primary-deep" : "bg-success-soft text-success", className)}>{label ?? C.freeBadge}</span>;
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

/**
 * Hibrit İnternet on/off service control: router icon, name and "free" line on the left,
 * a switch with its state label on the right. A running command shows a spinner in the
 * thumb and locks the switch so it can't be tapped twice.
 */
export function HybridSwitchCard({ sw, active, auto, note, onChange }: { sw: HybridSwitchView; active: boolean; auto: boolean; note: string | null; onChange: (on: boolean) => void }) {
  const locked = !sw.canToggle;
  return (
    <div className={cn("mt-3 rounded-2xl border p-3 transition-colors", sw.on && !sw.busy ? "border-success/30 bg-success-soft/40" : "border-border")}>
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-icon-box-border bg-icon-box text-primary">
          <Router className="size-5" strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p id="hybrid-switch-title" className="text-sm font-semibold text-primary">Hibrit İnternet</p>
          <p className="text-xs text-muted-foreground">Ücretsiz, aboneliğinize dahil</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <button
            type="button"
            role="switch"
            aria-checked={sw.on}
            aria-labelledby="hybrid-switch-title"
            aria-describedby="hybrid-switch-state"
            aria-busy={!!sw.busy}
            disabled={locked}
            onClick={() => onChange(!sw.on)}
            className={cn(
              "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              sw.on ? "bg-magenta" : "bg-input",
              locked && !sw.busy && "cursor-not-allowed opacity-50",
              sw.busy && "cursor-wait",
            )}
          >
            <span className={cn("flex size-6 items-center justify-center rounded-full bg-card shadow-md transition-transform duration-200", sw.on ? "translate-x-5" : "translate-x-0")}>
              {sw.busy && <Loader2 className="size-3.5 animate-spin text-magenta" aria-hidden />}
            </span>
          </button>
          <span id="hybrid-switch-state" className={cn("text-[11px] font-semibold", sw.busy ? "text-muted-foreground" : sw.on ? "text-success" : "text-muted-foreground")}>
            {sw.label}
          </span>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">İnternet kesintisi sırasında alternatif bağlantınızı kullanabilirsiniz.</p>
      {active && !sw.busy && (
        <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-success-soft px-2.5 py-2 text-xs font-semibold text-success">
          <CheckCircle2 className="mt-px size-3.5 shrink-0" aria-hidden />
          {auto ? "Hibrit İnternet, önceden verdiğiniz izinle devreye alındı." : "Hibrit İnternet devreye alındı. Yedek bağlantıyla internete bağlısınız."}
        </p>
      )}
      {note && <p className="mt-1.5 text-xs font-semibold text-foreground/80">{note}</p>}
    </div>
  );
}

const PRIMARY = "mt-4 flex min-h-12 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-float";

/** Home outage card: the problem, how long it has lasted, the estimated fix and the Hibrit İnternet action. */
export function OutageHomeCard() {
  const o = useWorkflowStore((s) => s.outage);
  const h = useWorkflowStore((s) => s.hybrid);
  const regional = useWorkflowStore((s) => s.workflows.find((w) => w.id === s.outage?.wfId)?.data["outageType"] === "regional");
  const verifying = useWorkflowStore((s) => s.workflows.find((w) => w.id === s.outage?.wfId)?.steps.find((st) => st.key === "verify")?.status !== "done");
  // Never behind the last state change (the presenter can move the outage start).
  const now = Math.max(useNow(10_000), o?.lastUpdateAt ?? 0);
  const busy = h.status === "checking" || h.status === "activating" || !!h.switching;
  useEffect(() => {
    if (!busy) return;
    const t = window.setInterval(() => runOverdueOps(), 2500);
    return () => window.clearInterval(t);
  }, [busy]);

  // Result toast for a command the customer gave here (toggle or button), once the mock finishes.
  const pending = useRef<"on" | "off" | null>(null);
  useEffect(() => {
    const p = pending.current;
    if (!p || h.switching) return;
    const done = (fn: () => void) => {
      pending.current = null;
      fn();
    };
    if (p === "on") {
      if (h.status === "active" && !h.pausedAt) done(() => toast.success("Hibrit İnternet aktif", { description: "Ana bağlantınız düzelene kadar yedek bağlantıyla internete bağlısınız." }));
      else if (h.status === "failed") done(() => toast.error("Hibrit İnternet açılamadı", { description: "Yedek cihaz mobil ağa bağlanamadı. Tekrar deneyebilirsiniz." }));
      else if (h.status === "no_coverage") done(() => toast.error("Hibrit İnternet şu an açılamıyor", { description: "Adresinizde yeterli mobil kapsama yok. Arıza takibiniz sürüyor." }));
      else if (h.status === "no_device") done(() => toast.error("Uyumlu Hibrit Box bulunamadı", { description: "Yedek cihazı ücretsiz gönderebiliriz." }));
    } else if (h.status !== "active" || h.pausedAt) {
      done(() => toast("Hibrit İnternet kapatıldı", { description: "İstediğiniz zaman yeniden açabilirsiniz." }));
    }
  }, [h.status, h.pausedAt, h.switching]);

  /** Toggle and big button share this one command. */
  const change = (on: boolean) => {
    if (setHybridOn(on)) pending.current = on ? "on" : "off";
    else
      toast.error(on ? "Hibrit Box şu an açılamıyor" : "Hibrit İnternet şu an kapatılamıyor", {
        description: on ? "Kesinti 24 saati aştığında ya da aşması beklendiğinde açılabilir." : "Lütfen birkaç saniye sonra tekrar deneyin.",
      });
  };

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
  const active = h.status === "active" && !h.pausedAt && h.switching !== "off";
  const remaining = fmtRemaining(outageRemainingH(hours, o.etaH, regional));
  const sw = hybridSwitchView({ status: h.status, paused: !!h.pausedAt, switching: h.switching, openRequested: h.openRequested, offerOpen: after24 });

  const title = active ? "İnternet kesintisi sürüyor · yedek bağlantı aktif" : regional ? "Bölgenizde internet kesintisi var" : "İnternet bağlantınızda kesinti var";
  const facts: [string, string][] = [
    ["Sorun", regional ? "Bölgesel altyapı arızası" : "Hattınızda bağlantı kesintisi"],
    ["Süre", `${fmtOngoing(hours)} sürüyor`],
    ["Tahmini çözüm", `${remaining} (demo)`],
    ["Durum", o.repairNote || "Teknik ekibimiz çalışıyor"],
  ];

  // Why the toggle can't be used right now (only when there is a reason to tell).
  let hybridNote: string | null = null;
  if (sw.busy || active) hybridNote = null;
  else if (!after24) hybridNote = h.autoFailover ? "Kesinti 24 saati aşarsa otomatik açılacak." : "Kesinti 24 saati aşarsa ücretsiz açabilirsiniz.";
  else if (h.status === "no_coverage") hybridNote = "Adresinizde yedek bağlantı için yeterli mobil kapsama yok.";
  else if (h.status === "no_device") hybridNote = h.device ? `Yedek cihazınız · ${C.device[h.device.status]}` : "Evinizde uyumlu Hibrit Box bulunamadı.";
  else if (h.status === "failed") hybridNote = "Son deneme başarısız oldu. Tekrar açmayı deneyebilirsiniz.";

  return (
    <div className={cn("rounded-card bg-card p-5 shadow-card", sw.ctaEnabled && "border-gradient")} role="status" aria-live="polite">
      <div className="flex items-start gap-3">
        <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", active ? "bg-orange-soft text-orange-deep" : "bg-destructive-soft text-destructive")}>
          {active ? <Smartphone className="size-6" /> : <CloudOff className="size-6" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug text-primary">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{active ? "Ana bağlantınız düzelince otomatik olarak ana bağlantıya döneceksiniz." : "Teknik ekibimiz çalışıyor; gelişmeleri size bildireceğiz."}</p>
        </div>
      </div>

      <dl className="mt-4 space-y-1.5 rounded-2xl bg-muted p-3 text-xs">
        {facts.map(([k, v]) => (
          <div key={k} className="flex gap-2">
            <dt className="w-24 shrink-0 text-muted-foreground">{k}</dt>
            <dd className="font-semibold text-foreground">{v}</dd>
          </div>
        ))}
      </dl>

      <HybridSwitchCard sw={sw} active={active} auto={h.activatedBy === "auto"} note={hybridNote} onChange={change} />

      {sw.cta ? (
        <button
          type="button"
          onClick={() => change(true)}
          disabled={!sw.ctaEnabled}
          aria-busy={!!sw.busy}
          className={cn(PRIMARY, "disabled:cursor-default", sw.on && !sw.busy && "bg-success-soft text-success shadow-none", sw.busy && "opacity-80")}
        >
          {sw.busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : sw.on ? <CheckCircle2 className="mr-2 size-4" /> : <Power className="mr-2 size-4" />} {sw.cta}
        </button>
      ) : h.status === "no_device" && after24 && !h.device ? (
        <Link to="/hibrit" className={PRIMARY}>
          {C.noDevice.cta}
        </Link>
      ) : null}
      <Link to="/hibrit" className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-primary">
        Detayları Gör
      </Link>
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
