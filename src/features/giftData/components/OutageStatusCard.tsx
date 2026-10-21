import { Link } from "@tanstack/react-router";
import { CloudOff, Gift, Route as RouteIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useAppStore } from "@/features/core/appStore";
import { useGiftStore } from "../store";
import { OUTAGE_CAUSE } from "@/data/mock";
import { fmtClock, fmtRelative } from "@/lib/format";
import { Progress } from "@/components/ui/progress";

/** Live "Arıza Durumu" card: cause, ETA, progress and last update. */
export function OutageStatusCard({ compact }: { compact?: boolean }) {
  const net = useAppStore((s) => s.net);
  const giftGB = useGiftStore((s) => s.giftGB);
  const hours = useGiftStore((s) => s.outageHours);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);
  if (net.status !== "outage" && net.status !== "backup") return null;
  const start = net.outageStartedAt ?? now;
  const eta = net.etaAt ?? now + 3_600_000;
  const pct = Math.min(96, Math.max(5, ((now - start) / (eta - start)) * 100));

  return (
    <div className="rounded-card border border-destructive/20 bg-card p-5 shadow-card" role="status">
      <div className="flex items-center gap-3">
        <span className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-destructive-soft text-destructive">
          <CloudOff className="size-5" />
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 animate-pulse rounded-full bg-destructive ring-2 ring-card" />
        </span>
        <div className="flex-1">
          <p className="font-semibold text-primary">Arıza Durumu</p>
          <p className="text-xs text-muted-foreground">{OUTAGE_CAUSE}</p>
        </div>
      </div>
      <div className="mt-4">
        <div className="mb-1.5 flex justify-between text-xs">
          <span className="text-muted-foreground">{hours} saattir sürüyor</span>
          <span className="font-semibold text-foreground">Tahmini düzelme {fmtClock(eta)}</span>
        </div>
        <Progress value={pct} className="h-2.5 bg-muted [&>div]:bg-magenta" aria-label="Onarım ilerlemesi" />
        <p className="mt-1.5 text-[11px] text-muted-foreground">Son güncelleme: {fmtRelative(net.lastUpdate ?? now, now)} · Ekipler sahada</p>
      </div>
      {!compact && (
        <div className="mt-4 flex flex-wrap gap-2">
          {giftGB > 0 && (
            <Link to="/hediye" className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-magenta-soft px-3.5 text-sm font-semibold text-magenta">
              <Gift className="size-4" /> {giftGB} GB hediyen hazır
            </Link>
          )}
          <Link to="/ajanlar/yedek" className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-orange-soft px-3.5 text-sm font-semibold text-orange-deep">
            <RouteIcon className="size-4" /> {net.status === "backup" ? "Yedek altyapıdasın" : "Yedek altyapı"}
          </Link>
        </div>
      )}
    </div>
  );
}
