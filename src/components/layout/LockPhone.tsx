import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { BatteryMedium, Camera, EyeOff, Flashlight, Lock, Signal, Wifi } from "lucide-react";
import { useEffect, useState } from "react";
import { useAppStore } from "@/features/core/appStore";
import { GigaAvatar } from "@/features/giga/GigaAvatar";
import { fmtClock, fmtRelative } from "@/lib/format";
import { TurknetLogo } from "./headers";

/**
 * Presenter tool: a second, locked phone next to the app. Every push the app would
 * deliver lands on its lock screen, so the audience sees what reaches the customer
 * while the app is closed. Tapping a card opens that page in the main app.
 */
export function LockPhone({ onHide }: { onHide: () => void }) {
  const list = useAppStore((s) => s.lockScreen);
  const markRead = useAppStore((s) => s.markRead);
  const dismissLock = useAppStore((s) => s.dismissLock);
  const clearLock = useAppStore((s) => s.clearLock);
  const navigate = useNavigate();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);
  // Refresh "şimdi / 2 dk önce" as soon as a new push lands.
  const latest = list[0]?.id;
  useEffect(() => setNow(Date.now()), [latest]);

  const date = new Date(now).toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="hidden shrink-0 flex-col items-center xl:flex">
      <div className="mb-3 flex w-[280px] items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-magenta">Sunum aracı</p>
          <p className="text-sm font-semibold text-primary">Uygulama kapalıyken telefon</p>
        </div>
        <button type="button" onClick={onHide} aria-label="Kilitli telefonu gizle" className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-card">
          <EyeOff className="size-4" />
        </button>
      </div>

      <div
        role="region"
        aria-label="Kilitli telefon bildirimleri"
        className="relative h-[606px] w-[280px] overflow-hidden rounded-[40px] border-[8px] border-device bg-gradient-to-b from-primary-deep via-primary to-primary-deep shadow-device"
      >
        <div className="pointer-events-none absolute -right-16 top-24 size-56 rounded-full bg-magenta/35 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -left-20 bottom-24 size-56 rounded-full bg-orange/25 blur-3xl" aria-hidden />

        <div className="relative flex h-full flex-col text-primary-foreground">
          <div className="flex h-7 items-center justify-end gap-1 px-5 pt-1 text-primary-foreground/90" aria-hidden>
            <Wifi className="size-3" />
            <Signal className="size-3" />
            <BatteryMedium className="size-3.5" />
          </div>

          <div className="mt-3 text-center">
            <Lock className="mx-auto size-4 text-primary-foreground/80" aria-hidden />
            <p className="mt-1 text-xs font-medium capitalize text-primary-foreground/80">{date}</p>
            <p className="text-6xl font-light leading-none tracking-tight">{fmtClock(now)}</p>
          </div>

          <div className="mt-5 flex-1 space-y-2 overflow-y-auto px-3 no-scrollbar">
            <AnimatePresence initial={false}>
              {list.map((n) => (
                <motion.button
                  key={n.id}
                  layout
                  type="button"
                  initial={{ opacity: 0, y: -24, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 60 }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  onClick={() => {
                    markRead(n.id);
                    dismissLock(n.id);
                    if (n.to) navigate({ to: n.to as "/" });
                  }}
                  className="flex w-full items-start gap-2.5 rounded-2xl bg-card/85 p-2.5 text-left text-foreground shadow-card backdrop-blur-md"
                >
                  {n.kind === "agent" ? (
                    <GigaAvatar size={32} mood="listening" label={false} />
                  ) : (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <TurknetLogo className="text-lg text-primary-foreground" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <span className="truncate">{n.kind === "agent" ? "GIGA · TürkNet" : "TürkNet"}</span>
                      <span className="shrink-0 normal-case">{fmtRelative(n.time, now)}</span>
                    </span>
                    <span className="block text-[13px] font-semibold leading-snug">{n.title}</span>
                    <span className="line-clamp-2 block text-[11px] leading-snug text-muted-foreground">{n.body}</span>
                    {n.count && n.count > 1 ? <span className="mt-0.5 block text-[10px] font-semibold text-magenta">{n.count} güncelleme birleştirildi</span> : null}
                  </span>
                </motion.button>
              ))}
            </AnimatePresence>
            {list.length === 0 && (
              <p className="pt-10 text-center text-xs text-primary-foreground/70">
                Bildirim yok.
                <br />
                Demo panelinden bir şey değiştirin; telefona giden bildirimler burada görünür.
              </p>
            )}
            {list.length > 1 && (
              <button type="button" onClick={clearLock} className="mx-auto block rounded-full bg-card/20 px-3 py-1 text-[11px] font-semibold text-primary-foreground backdrop-blur">
                Tümünü temizle
              </button>
            )}
          </div>

          <div className="flex items-center justify-between px-6 pb-3 pt-2" aria-hidden>
            <span className="flex size-9 items-center justify-center rounded-full bg-card/20 backdrop-blur">
              <Flashlight className="size-4" />
            </span>
            <span className="text-[10px] text-primary-foreground/70">Açmak için yukarı kaydırın</span>
            <span className="flex size-9 items-center justify-center rounded-full bg-card/20 backdrop-blur">
              <Camera className="size-4" />
            </span>
          </div>
          <div className="mx-auto mb-2 h-1 w-24 rounded-full bg-primary-foreground/70" aria-hidden />
        </div>
      </div>
    </div>
  );
}
