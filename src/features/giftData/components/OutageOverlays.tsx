import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Gift, HeartHandshake, PartyPopper } from "lucide-react";
import { useAppStore } from "@/features/core/appStore";
import { useGiftStore } from "../store";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";

/** Calm full-screen card shown when an outage crosses a gift tier. */
export function OutageOverlay() {
  const status = useAppStore((s) => s.net.status);
  const giftGB = useGiftStore((s) => s.giftGB);
  const seen = useGiftStore((s) => s.overlaySeen);
  const activated = useGiftStore((s) => s.activated);
  const hours = useGiftStore((s) => s.outageHours);
  const seeOverlay = useGiftStore((s) => s.seeOverlay);
  const navigate = useNavigate();
  const show = !seen && giftGB > 0 && (status === "outage" || status === "backup");

  return (
    <AnimatePresence>
      {show && (
        <motion.div className="fixed inset-0 z-[75] flex flex-col bg-plum p-6 text-primary-foreground" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <motion.div
              className="flex h-28 w-28 items-center justify-center rounded-full bg-primary-foreground/10"
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
            >
              <HeartHandshake className="size-14" strokeWidth={1.25} />
            </motion.div>
            <h2 className="mt-8 text-3xl font-semibold leading-tight">Sakin ol, farkındayız.</h2>
            <p className="mt-3 max-w-xs text-primary-foreground/85">Bölgende {hours} saattir süren bir kesinti var. Sorunu çözmek için çalışıyoruz.</p>
            <div className="mt-8 rounded-card bg-primary-foreground/10 px-8 py-5">
              <p className="text-sm text-primary-foreground/80">Bu sürede sana</p>
              <p className="text-5xl font-bold">
                {giftGB} <span className="text-2xl">GB</span>
              </p>
              <p className="text-sm text-primary-foreground/80">hediye ettik</p>
            </div>
            <p className="mt-4 text-xs text-primary-foreground/70">Hangi operatörü kullanırsan kullan hattına tanımlanır.</p>
          </div>
          <div className="space-y-3">
            <Button
              variant="white"
              size="xl"
              className="w-full rounded-full"
              onClick={() => {
                seeOverlay();
                track("cta_clicked", "gift_data", { action: "overlay_activate" });
                navigate({ to: activated ? "/hediye" : "/hediye/aktiflestir" });
              }}
            >
              <Gift /> {activated ? "Hediye Cüzdanımı Gör" : "Hediyeyi Aktifleştir"}
            </Button>
            <Button variant="glass" size="lg" className="w-full" onClick={() => { seeOverlay(); navigate({ to: "/hediye" }); }}>
              Arıza durumunu gör
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function RestoredOverlay() {
  const pending = useGiftStore((s) => s.restoredPending);
  const setRestored = useGiftStore((s) => s.setRestored);
  const activated = useGiftStore((s) => s.activated);
  const navigate = useNavigate();
  return (
    <AnimatePresence>
      {pending && (
        <motion.div className="fixed inset-0 z-[75] flex flex-col items-center justify-center bg-background/95 p-6 text-center backdrop-blur" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          {Array.from({ length: 18 }).map((_, i) => (
            <motion.span
              key={i}
              className={i % 3 === 0 ? "absolute h-2.5 w-2.5 rounded-full bg-magenta" : i % 3 === 1 ? "absolute h-2 w-2 rounded-sm bg-orange" : "absolute h-2 w-2 rounded-full bg-primary"}
              initial={{ x: 0, y: 0, opacity: 1 }}
              animate={{ x: Math.cos(i) * 160, y: Math.sin(i * 1.7) * 220 - 40, opacity: 0, rotate: 180 }}
              transition={{ duration: 1.6, ease: "easeOut" }}
              style={{ top: "38%", left: "50%" }}
            />
          ))}
          <motion.div initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: "spring" }} className="flex h-24 w-24 items-center justify-center rounded-full bg-success-soft text-success">
            <PartyPopper className="size-12" />
          </motion.div>
          <h2 className="mt-6 text-3xl font-semibold text-primary">Hizmet geri geldi!</h2>
          <p className="mt-3 max-w-xs text-muted-foreground">Yaşadığın kesinti için özür dileriz. Sabrın için teşekkür ederiz.{activated ? " Hediye internetin 30 gün boyunca kullanılabilir." : ""}</p>
          <div className="mt-8 w-full space-y-3">
            <Button size="lg" className="w-full" onClick={() => setRestored(false)}>
              Harika, devam et
            </Button>
            <Button size="lg" variant="outline" className="w-full" onClick={() => { setRestored(false); navigate({ to: "/hediye" }); }}>
              Hediye Cüzdanım
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
