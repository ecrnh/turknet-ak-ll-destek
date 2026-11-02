import { Power, Router, Signal, Smartphone, Wifi } from "lucide-react";
import { toast } from "sonner";
import { ToggleRow } from "@/components/tn/primitives";
import { Button } from "@/components/ui/button";
import { useNow } from "@/hooks/use-now";
import { cn } from "@/lib/utils";
import { hybridUsageMb } from "../rules";
import { activateHybrid, pauseHybrid, resumeHybrid, setAutoFailover } from "../services/hybrid";
import { useWorkflowStore } from "../store";
import { fmtUsage } from "./hybrid";

/** Demo allowance of the backup SIM; usage comes from hybridUsageMb (no real meter). */
const BACKUP_QUOTA_MB = 50 * 1024;

/**
 * "Evdeki Hibrit Box": device, SIM, mobile link and remaining demo data, with
 * on/off controls. The backup can only be switched on under the 24-hour rule.
 */
export function HybridBoxCard() {
  const h = useWorkflowStore((s) => s.hybrid);
  const c = useWorkflowStore((s) => s.connectivity);
  const hasDevice = useWorkflowStore((s) => s.config.hybridDevice);
  const outage = useWorkflowStore((s) => s.outage);
  const now = useNow(10_000);
  const fixedUp = c.fixed === "up";
  const backupOn = h.status === "active" && !h.pausedAt;
  const used = h.activatedAt ? hybridUsageMb(h.activatedAt, h.pausedAt ?? h.endedAt ?? now) : 0;
  const left = Math.max(0, BACKUP_QUOTA_MB - used);

  const rows: { icon: typeof Router; label: string; value: string; ok: boolean }[] = [
    { icon: Router, label: "Cihaz", value: hasDevice ? "Bağlı · çalışıyor" : "Evde uyumlu cihaz yok", ok: hasDevice },
    { icon: Smartphone, label: "SIM", value: hasDevice ? (backupOn ? "Aktif" : "Hazır") : "Yok", ok: hasDevice },
    { icon: Signal, label: "Mobil bağlantı", value: backupOn ? "Bağlı · 4.5G" : "Beklemede", ok: backupOn },
    { icon: Wifi, label: "Ana internet", value: fixedUp ? "Aktif" : "Kesik", ok: fixedUp },
  ];

  const canSwitchOn = (h.status === "active" && !!h.pausedAt) || h.status === "ready" || h.status === "failed";
  const on = () => {
    const ok = h.status === "active" ? resumeHybrid() : activateHybrid();
    if (!ok) toast("Yedek bağlantı şu an açılamıyor", { description: "Yedek bağlantı, kesinti 24 saati aştığında ve uygunluk kontrolünden sonra açılabilir." });
  };

  return (
    <div className="rounded-card bg-card p-5 shadow-card">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-primary">Evdeki Hibrit Box</p>
        <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", backupOn ? "bg-success-soft text-success" : fixedUp ? "bg-icon-box text-primary" : "bg-warning-soft text-warning")}>
          {backupOn ? "Yedek bağlantı aktif" : fixedUp ? "Ana bağlantı kullanılıyor" : "Yedek kapalı"}
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2">
        {rows.map((r) => (
          <div key={r.label} className="rounded-2xl bg-muted p-3">
            <dt className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <r.icon className="size-3.5" /> {r.label}
            </dt>
            <dd className={cn("mt-0.5 text-sm font-semibold", r.ok ? "text-foreground" : "text-muted-foreground")}>{r.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Kalan yedek internet (demo)</span>
          <span className="font-semibold text-foreground">{fmtUsage(left)} / {fmtUsage(BACKUP_QUOTA_MB)}</span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-magenta" style={{ width: `${(left / BACKUP_QUOTA_MB) * 100}%` }} />
        </div>
      </div>

      {fixedUp ? (
        <p className="mt-3 text-sm text-muted-foreground">Şu anda ana internet bağlantını kullanıyorsun.</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button onClick={on} disabled={backupOn || !canSwitchOn}>
            <Power /> Yedek bağlantıyı aç
          </Button>
          <Button variant="outline" onClick={() => pauseHybrid() && toast("Yedek bağlantı kapatıldı", { description: "İstediğin an tekrar açabilirsin." })} disabled={!backupOn}>
            Yedek bağlantıyı kapat
          </Button>
        </div>
      )}
      {!fixedUp && !canSwitchOn && !backupOn && outage && !outage.restoredAt && (
        <p className="mt-2 text-xs text-muted-foreground">Yedek bağlantı, kesinti 24 saati aştığında ve cihaz/kapsama kontrolünden sonra açılabilir.</p>
      )}
      <div className="mt-3 border-t border-border pt-1">
        <ToggleRow
          id="hybrid-auto"
          title="Otomatik yedek geçişi"
          desc="Kesinti 24 saati aşarsa yedek bağlantı senin önceden verdiğin izinle otomatik açılsın."
          checked={h.autoFailover}
          onChange={(v) => setAutoFailover(v)}
        />
      </div>
    </div>
  );
}
