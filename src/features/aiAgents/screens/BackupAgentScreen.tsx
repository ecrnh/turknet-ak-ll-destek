import { motion } from "framer-motion";
import { Route as RouteIcon, ShieldCheck, Timer } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/headers";
import { Banner, StatRow, ToggleRow } from "@/components/tn/primitives";
import { Button } from "@/components/ui/button";
import { BACKUP_POP } from "@/data/mock";
import { useAppStore } from "@/features/core/appStore";
import { switchToBackup } from "@/features/demo/scenarios";
import { useAgentsStore } from "../store";
import { fmtDuration } from "@/lib/format";
import { useFlow } from "@/lib/analytics";

const IST = { x: 250, y: 92 };
const TEK = { x: 112, y: 104 };

/** Simplified Marmara map: sea, coastlines and the two POPs. */
function MarmaraMap({ active, returning }: { active: boolean; returning: boolean }) {
  return (
    <svg viewBox="0 0 340 200" className="h-auto w-full" role="img" aria-label="Marmara bölgesi haritası: İstanbul ve Tekirdağ altyapı noktaları">
      <rect width="340" height="200" rx="20" fill="var(--secondary)" />
      <path d="M0 120 C 60 112, 100 128, 150 124 C 200 120, 230 132, 270 126 C 300 122, 320 134, 340 130 L340 200 L0 200 Z" fill="var(--icon-box-border)" opacity="0.7" />
      <path d="M40 140 C 90 132, 140 150, 200 142 C 250 136, 290 150, 330 146" fill="none" stroke="var(--card)" strokeWidth="18" strokeLinecap="round" opacity="0.8" />
      <path d="M262 40 C 266 70, 258 100, 268 130" fill="none" stroke="var(--card)" strokeWidth="6" strokeLinecap="round" />
      <text x="160" y="175" fontSize="10" fill="var(--muted-foreground)" textAnchor="middle">Marmara Denizi</text>
      <text x="300" y="50" fontSize="10" fill="var(--muted-foreground)">Karadeniz</text>
      {active && (
        <motion.path
          d={`M${IST.x} ${IST.y} Q 181 50 ${TEK.x} ${TEK.y}`}
          fill="none"
          stroke="var(--magenta)"
          strokeWidth="3"
          strokeDasharray="6 6"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: returning ? 0 : 1, strokeDashoffset: [0, -24] }}
          transition={{ pathLength: { duration: 1.2 }, strokeDashoffset: { repeat: Infinity, duration: 1, ease: "linear" } }}
        />
      )}
      <g>
        <circle cx={IST.x} cy={IST.y} r="14" fill={active && !returning ? "var(--destructive)" : "var(--success)"} opacity="0.2" />
        <circle cx={IST.x} cy={IST.y} r="7" fill={active && !returning ? "var(--destructive)" : "var(--success)"} />
        <text x={IST.x} y={IST.y - 18} fontSize="11" fontWeight="600" fill="var(--primary)" textAnchor="middle">İstanbul · Ümraniye</text>
      </g>
      <g>
        <circle cx={TEK.x} cy={TEK.y} r="14" fill="var(--magenta)" opacity={active ? 0.25 : 0.1} />
        <circle cx={TEK.x} cy={TEK.y} r="7" fill={active ? "var(--magenta)" : "var(--muted-foreground)"} />
        <text x={TEK.x} y={TEK.y - 18} fontSize="11" fontWeight="600" fill="var(--primary)" textAnchor="middle">Tekirdağ · Çorlu POP</text>
      </g>
    </svg>
  );
}

export function BackupAgentScreen() {
  useFlow("ai_backup_agent");
  const backup = useAgentsStore((s) => s.backup);
  const status = useAppStore((s) => s.net.status);
  const consent = useAppStore((s) => s.prefs.backupConsent);
  const setPref = useAppStore((s) => s.setPref);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const elapsed = backup.since ? Math.floor((now - backup.since) / 1000) : 0;
  const out = status === "outage";

  return (
    <div>
      <PageHeader title="Kesinti Yedekleme Ajanı" />
      <div className="space-y-4 px-4">
        <div className="overflow-hidden rounded-card bg-card p-4 shadow-card">
          <MarmaraMap active={backup.active} returning={backup.returning} />
          <div className="mt-3 flex items-center gap-2">
            <span className={backup.active ? "h-2.5 w-2.5 animate-pulse rounded-full bg-orange" : "h-2.5 w-2.5 rounded-full bg-success"} />
            <p className="font-semibold text-primary">
              {backup.returning ? "Ana hatta geri dönülüyor…" : backup.active ? "Geçici Bağlantı Aktif" : out ? "Ana hatta kesinti var" : "Ana hat aktif"}
            </p>
          </div>
        </div>

        {backup.active && (
          <div className="rounded-card bg-card p-5 shadow-card">
            <StatRow label="Bağlanılan altyapı" value={BACKUP_POP.name} />
            <StatRow label="Gecikme farkı" value={`ping +${BACKUP_POP.pingDelta} ms`} />
            <StatRow label="Hız farkı" value={`%${Math.abs(BACKUP_POP.speedDelta)} daha düşük`} />
            <StatRow label="Süre" value={<span className="inline-flex items-center gap-1"><Timer className="size-3.5" /> {fmtDuration(elapsed)}</span>} />
            <Banner tone="info" className="mt-3">Ana hat düzelince otomatik geri döneceğim. Bir şey yapmana gerek yok.</Banner>
          </div>
        )}

        {consent !== true ? (
          <div className="rounded-card border-gradient p-5 shadow-card">
            <ShieldCheck className="size-7 text-magenta" />
            <p className="mt-2 font-semibold text-primary">Yedek altyapı izni</p>
            <p className="mt-1 text-sm text-muted-foreground">Bölgende arıza olduğunda seni en yakın sağlıklı altyapıdan geçici olarak bağlayabilirim. Trafiğin şifreli kalır; izni Tercihlerim'den istediğin an kapatabilirsin.</p>
            <Button
              size="lg"
              className="mt-4 w-full"
              onClick={() => {
                setPref("backupConsent", true);
                toast.success("İzin verildi", { action: { label: "Geri al", onClick: () => setPref("backupConsent", null) } });
                if (out) switchToBackup();
              }}
            >
              Yedek altyapıdan bağlanmama izin veriyorum
            </Button>
          </div>
        ) : (
          <div className="rounded-card bg-card px-5 py-1 shadow-card">
            <ToggleRow id="consent2" title="Yedek altyapı izni" desc="Tercihlerim'den de yönetebilirsin" checked={consent === true} onChange={(v) => setPref("backupConsent", v)} />
          </div>
        )}

        {consent === true && out && !backup.active && (
          <Button size="xl" variant="magenta" className="w-full rounded-full" onClick={switchToBackup}>
            <RouteIcon /> Yedek altyapıya geç
          </Button>
        )}
      </div>
    </div>
  );
}
