import { Link, useNavigate } from "@tanstack/react-router";
import { Activity, BarChart3, ChevronRight, CloudOff, Gauge, PlugZap, QrCode, RotateCcw, Route, Video, EyeOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";
import { useAppStore } from "@/features/core/appStore";
import { useGiftStore } from "@/features/giftData/store";
import { useAgentsStore } from "@/features/aiAgents/store";
import { useActingAccount } from "@/features/family/store";
import { giftForOutage } from "@/features/giftData/gift";
import { NET_LABEL, NET_TEXT } from "@/components/tn/NetStatus";
import { cn } from "@/lib/utils";
import { elderVideoScenario, qrFaultScenario, resetAll, restoreLine, simulateSpeedDrop, startOutage, switchToBackup } from "./scenarios";

function Btn({ icon: Icon, label, onClick, tone = "default" }: { icon: typeof Gauge; label: string; onClick: () => void; tone?: "default" | "danger" | "ok" }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex min-h-11 w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-sm font-semibold transition-colors",
        tone === "danger" && "border-destructive/30 bg-destructive-soft text-destructive hover:bg-destructive/10",
        tone === "ok" && "border-success/30 bg-success-soft text-success hover:bg-success/10",
        tone === "default" && "border-border bg-card text-primary hover:bg-accent",
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="flex-1">{label}</span>
      <ChevronRight className="size-4 opacity-50" />
    </button>
  );
}

/** Presenter-only control panel. Not part of the product. */
export function DemoPanel({ onHide }: { onHide?: () => void }) {
  const navigate = useNavigate();
  const net = useAppStore((s) => s.net);
  const giftGB = useGiftStore((s) => s.giftGB);
  const outageHours = useGiftStore((s) => s.outageHours);
  const backup = useAgentsStore((s) => s.backup);
  const acting = useActingAccount();
  const [hours, setHours] = useState(outageHours || 10);

  const isOut = net.status === "outage" || net.status === "backup";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-magenta">Sunum Aracı</p>
          <h2 className="text-lg font-semibold text-primary">Demo Kontrol Paneli</h2>
        </div>
        {onHide && (
          <button onClick={onHide} aria-label="Paneli gizle" className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
            <EyeOff className="size-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-muted p-3 text-xs">
        <div>
          <p className="text-muted-foreground">İnternet</p>
          <p className={cn("font-bold", NET_TEXT[net.status])}>{NET_LABEL[net.status]}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Hız</p>
          <p className="font-bold text-foreground">{net.speed} Mbps</p>
        </div>
        <div>
          <p className="text-muted-foreground">Hediye</p>
          <p className="font-bold text-foreground">{giftGB} GB</p>
        </div>
        <div>
          <p className="text-muted-foreground">Profil</p>
          <p className="font-bold text-foreground">{acting ? acting.short : "Çağrı (Ben)"}</p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Ajan senaryoları</p>
        <Btn icon={Gauge} label="Hız düşüşü simüle et" onClick={() => { simulateSpeedDrop(); navigate({ to: "/" }); }} />
        <Btn icon={Route} label={backup.active ? "Yedek altyapı aktif" : "Yedek altyapıya geç"} onClick={() => { switchToBackup(); navigate({ to: "/ajanlar/yedek" }); }} />
      </div>

      <div className="space-y-3 rounded-2xl border border-border bg-card p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-primary">Kesinti süresi</p>
          <p className="text-sm font-bold text-magenta">
            {hours} saat → {giftForOutage(hours)} GB
          </p>
        </div>
        <Slider
          value={[hours]}
          min={0}
          max={96}
          step={1}
          onValueChange={([v = 0]) => {
            setHours(v);
            if (isOut) startOutage(v);
          }}
          aria-label="Kesinti süresi (saat)"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>0</span>
          <span>6s · 5GB</span>
          <span>24s · 10GB</span>
          <span>72s · 20GB</span>
        </div>
        <Btn icon={CloudOff} tone="danger" label={isOut ? "Kesinti sürüyor (slider canlı)" : "Kesinti başlat"} onClick={() => startOutage(hours)} />
        <Btn icon={PlugZap} tone="ok" label="Hat düzeldi" onClick={restoreLine} />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Destek senaryoları</p>
        <Btn icon={Video} label="Yaşlı yakın görüntülü destek" onClick={() => { elderVideoScenario(); navigate({ to: "/goruntulu-destek" }); }} />
        <Btn icon={QrCode} label="QR ile arıza senaryosu" onClick={() => { qrFaultScenario(); navigate({ to: "/qr/tara" }); }} />
      </div>

      <div className="space-y-2">
        <Link to="/dashboard" className="flex min-h-11 items-center gap-2.5 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground">
          <BarChart3 className="size-4" /> Etki Panosu'nu aç
        </Link>
        <Btn
          icon={RotateCcw}
          label="Sıfırla"
          onClick={() => {
            resetAll();
            navigate({ to: "/" });
            toast.success("Demo sıfırlandı");
          }}
        />
      </div>
      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Activity className="size-3" /> Analitik olaylar konsola ve Etki Panosu'na yazılır.
      </p>
    </div>
  );
}
