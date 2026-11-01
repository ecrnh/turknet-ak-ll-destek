import { motion } from "framer-motion";
import { Gauge, RotateCcw, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/headers";
import { Banner, EmptyState } from "@/components/tn/primitives";
import { RingChart } from "@/components/tn/RingChart";
import { Button } from "@/components/ui/button";
import { USER } from "@/data/mock";
import { useAppStore } from "@/features/core/appStore";
import { useFlow } from "@/lib/analytics";

export function SpeedTestScreen() {
  const net = useAppStore((s) => s.net);
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [value, setValue] = useState(0);
  const flow = useFlow("speed_test");

  const run = () => {
    setPhase("running");
    setValue(0);
  };

  useEffect(() => {
    if (phase !== "running") return;
    const target = net.speed;
    let v = 0;
    const t = setInterval(() => {
      v = Math.min(target, v + Math.max(1, target / 25) + Math.random() * 4);
      setValue(Math.round(v));
      if (v >= target) {
        clearInterval(t);
        setValue(target);
        setPhase("done");
        flow.complete({ speed: target });
      }
    }, 80);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  if (net.status === "down")
    return (
      <div>
        <PageHeader title="Hız Testi" />
        <EmptyState icon={WifiOff} title="Bağlantı yok" text="Ana bağlantınızdaki kesinti nedeniyle hız testi yapılamıyor." />
      </div>
    );

  const tone = value < 40 ? "warning" : "success";
  return (
    <div>
      <PageHeader title="Hız Testi" />
      <div className="flex flex-col items-center px-4 pt-6">
        <RingChart value={value} max={USER.packageSpeed} size={230} stroke={18} tone={phase === "idle" ? "primary" : tone} label="Ölçülen hız">
          <Gauge className="size-6 text-muted-foreground" />
          <motion.p className="text-5xl font-bold text-primary">{value}</motion.p>
          <p className="text-sm text-muted-foreground">Mbps</p>
        </RingChart>
        <div className="mt-6 grid w-full grid-cols-3 gap-3 text-center">
          {[
            ["Paket", `${USER.packageSpeed} Mbps`],
            ["Ping", phase === "done" ? `${net.ping} ms` : "—"],
            ["Bağlantı", net.status === "mobile" ? "Yedek" : "Fiber"],
          ].map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-card p-3 shadow-card">
              <p className="text-xs text-muted-foreground">{k}</p>
              <p className="font-semibold text-foreground">{v}</p>
            </div>
          ))}
        </div>
        {phase === "done" && net.speed < 40 && (
          <Banner tone="warning" className="mt-4 w-full" title="Hızın paketinin altında">
            Hız Koruyucu Ajan bunu inceleyebilir.
          </Banner>
        )}
        {phase === "done" && net.speed >= 90 && (
          <Banner tone="success" className="mt-4 w-full" title="Hızın paketine uygun">
            {net.speed} Mbps — paketinin %{Math.round((net.speed / USER.packageSpeed) * 100)}'ü.
          </Banner>
        )}
        <Button size="xl" className="mt-6 w-full rounded-full" onClick={run} disabled={phase === "running"}>
          {phase === "done" ? <><RotateCcw /> Tekrar Ölç</> : phase === "running" ? "Ölçülüyor…" : "Testi Başlat"}
        </Button>
      </div>
    </div>
  );
}
