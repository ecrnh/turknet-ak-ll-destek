import { useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Check, Download, Loader2, LogIn, QrCode, UserCheck } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/layout/headers";
import { Card, Chip, PlainNote, ToggleRow } from "@/components/tn/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PERSONAS, useEvimStore } from "../store";
import { qrNextStep, resolveRole, ROLE_LABEL } from "../rules";

const CHECKS = [
  { key: "install", label: "Uygulama yüklü mü?", icon: Download },
  { key: "login", label: "Giriş yapılmış mı?", icon: LogIn },
  { key: "role", label: "Abonelikteki rolün", icon: UserCheck },
] as const;

/** Simulated modem QR scan: runs the three checks in order and routes to the right screen. */
export function QrEntryScreen() {
  const navigate = useNavigate();
  const s = useEvimStore();
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const role = resolveRole(s.persona, s.members);

  const scan = () => {
    setRunning(true);
    setDone(0);
    const next = qrNextStep(s);
    const stopAt = next === "install" ? 1 : next === "login" ? 2 : 3;
    let i = 0;
    const tick = () => {
      i += 1;
      setDone(i);
      if (i < stopAt) window.setTimeout(tick, 650);
      else
        window.setTimeout(() => {
          setRunning(false);
          if (next === "install") navigate({ to: "/evim/yukle" });
          else if (next === "login") navigate({ to: "/evim/giris" });
          else if (role === "unauthorized") navigate({ to: "/evim" });
          else navigate({ to: "/onarim", search: { kaynak: "genel" } });
        }, 700);
    };
    window.setTimeout(tick, 650);
  };

  return (
    <div className="pb-8">
      <PageHeader title="QR ile devam et" />
      <div className="space-y-4 px-4">
        <Card className="flex flex-col items-center text-center">
          <span className="relative flex h-36 w-36 items-center justify-center rounded-3xl bg-icon-box">
            <QrCode className="size-20 text-primary" strokeWidth={1.25} />
            {running && <span className="absolute inset-x-4 top-4 h-1 rounded-full bg-magenta shadow-[0_0_16px_var(--magenta)] scan-line" />}
          </span>
          <p className="mt-4 text-lg font-semibold text-primary">Modemindeki QR kodu okut</p>
          <p className="mt-1 text-sm text-muted-foreground">Kontrolleri sırayla yapıp seni doğru TürkNet Evim ekranına götürürüz.</p>
          <div className="mt-4 w-full space-y-2 text-left">
            {CHECKS.map((c, i) => {
              const ok = done > i;
              const active = running && done === i;
              return (
                <div key={c.key} className={cn("flex items-center gap-3 rounded-2xl border border-border px-3 py-2.5 text-sm", ok && "border-success/30 bg-success-soft")}>
                  <c.icon className="size-4 text-primary" />
                  <span className="flex-1 font-medium">{c.label}</span>
                  {ok ? <Check className="size-4 text-success" /> : active ? <Loader2 className="size-4 animate-spin text-magenta" /> : null}
                </div>
              );
            })}
          </div>
          <Button size="xl" variant="magenta" className="mt-5 w-full rounded-full" onClick={scan} disabled={running}>
            {running ? <Loader2 className="animate-spin" /> : <QrCode />} QR Kodu Okut
          </Button>
        </Card>

        <Card>
          <p className="text-[11px] font-bold uppercase tracking-wide text-magenta">Demo ayarları</p>
          <ToggleRow id="evim-installed" title="Uygulama yüklü" checked={s.appInstalled} onChange={(v) => s.setDemo({ appInstalled: v, loggedIn: v ? s.loggedIn : false })} />
          <ToggleRow id="evim-logged" title="Giriş yapılmış" checked={s.loggedIn} disabled={!s.appInstalled} onChange={(v) => s.setDemo({ loggedIn: v })} />
          <p className="pb-2 pt-3 text-sm font-semibold text-foreground">QR'ı okutan kişi</p>
          <div className="flex flex-wrap gap-2">
            {PERSONAS.map((p) => (
              <Chip key={p.id} active={s.persona === p.id} onClick={() => s.setDemo({ persona: p.id })}>
                {p.name.split(" ")[0]}
              </Chip>
            ))}
          </div>
          <motion.p key={s.persona + role} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 text-xs text-muted-foreground">
            Bu kişinin rolü: <b className="text-primary">{ROLE_LABEL[role]}</b>
          </motion.p>
        </Card>
        <PlainNote>Çağrı abonelik sahibi, Elif yetkili aile üyesi, Can ise bu aboneliğe henüz bağlı değil.</PlainNote>
      </div>
    </div>
  );
}
