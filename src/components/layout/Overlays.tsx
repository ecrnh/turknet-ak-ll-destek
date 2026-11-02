import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, LifeBuoy, Megaphone, ReceiptText, Users, X, ArrowLeftRight } from "lucide-react";
import { useEffect } from "react";
import { useAppStore, type NotifKind } from "@/features/core/appStore";
import { useActingAccount, useFamilyStore } from "@/features/family/store";
import { TurknetLogo } from "./headers";
import { GigaAvatar } from "@/features/giga/GigaAvatar";

export const NOTIF_ICON: Record<NotifKind, typeof Bot> = {
  agent: Bot,
  support: LifeBuoy,
  family: Users,
  campaign: Megaphone,
  bill: ReceiptText,
};

/** Simulated push notification that slides in at the top of the device. */
export function PushBanner() {
  const push = useAppStore((s) => s.push);
  const dismiss = useAppStore((s) => s.dismissPush);
  const markRead = useAppStore((s) => s.markRead);
  const navigate = useNavigate();

  useEffect(() => {
    if (!push) return;
    const t = setTimeout(dismiss, 5500);
    return () => clearTimeout(t);
  }, [push, dismiss]);

  return (
    <AnimatePresence>
      {push && (
        <motion.div
          key={push.id}
          initial={{ y: -120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -120, opacity: 0 }}
          className="fixed inset-x-3 top-3 z-[80]"
        >
          <div className="flex items-start gap-3 rounded-3xl bg-card/95 p-3.5 shadow-device backdrop-blur">
            <button
              className="flex flex-1 items-start gap-3 text-left"
              onClick={() => {
                markRead(push.id);
                dismiss();
                if (push.to) navigate({ to: push.to as "/" });
              }}
            >
              {push.from === "giga" || push.kind === "agent" ? (
                <GigaAvatar size={40} mood="listening" label={false} />
              ) : (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <TurknetLogo className="text-2xl text-primary-foreground" />
                </span>
              )}
              <span className="flex-1">
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{push.from === "giga" ? "GIGA Takip · TürkNet · şimdi" : push.kind === "agent" ? "GIGA · TürkNet · şimdi" : "Turknet · şimdi"}</span>
                <span className="block text-sm font-semibold text-foreground">{push.title}</span>
                <span className="line-clamp-2 block text-xs text-muted-foreground">{push.body}</span>
              </span>
            </button>
            <button onClick={dismiss} aria-label="Bildirimi kapat" className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
              <X className="size-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Persistent orange strip while acting on behalf of a family member. */
export function ActingBanner() {
  const acc = useActingAccount();
  const switchTo = useFamilyStore((s) => s.switchTo);
  if (!acc) return null;
  return (
    <div className="z-40 flex items-center gap-2 bg-campaign px-4 py-2 text-primary-foreground" role="status">
      <Users className="size-4 shrink-0" />
      <p className="flex-1 text-sm font-semibold">{acc.short} adına işlem yapıyorsun</p>
      <button onClick={() => switchTo(null)} className="flex min-h-9 items-center gap-1 rounded-full bg-primary-foreground/20 px-3 text-xs font-semibold">
        <ArrowLeftRight className="size-3.5" /> Hesabıma dön
      </button>
    </div>
  );
}

export function Splash() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-plum">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex h-24 w-24 items-center justify-center rounded-[28px] bg-card">
        <TurknetLogo className="text-6xl" />
      </motion.div>
      <p className="mt-5 text-sm font-medium text-primary-foreground/80">Yükleniyor…</p>
    </div>
  );
}
