import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Bottom sheet rendered with position:fixed. The phone frame is transformed, so fixed
 * elements stay inside the device frame.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
  className,
  full,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
  full?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <motion.button
            aria-label="Kapat"
            className="absolute inset-0 bg-primary-deep/50 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={cn("relative flex max-h-[92%] flex-col rounded-t-[28px] bg-background shadow-device", full && "h-[94%]", className)}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            <div className="mx-auto mt-2.5 h-1.5 w-12 rounded-full bg-border" />
            {title !== undefined && (
              <div className="flex items-center justify-between px-5 pb-2 pt-3">
                <h2 className="text-lg font-semibold text-primary">{title}</h2>
                <button onClick={onClose} aria-label="Kapat" className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
                  <X className="size-5" />
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto px-5 pb-6 no-scrollbar">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function ConfirmDialog({
  open,
  title,
  text,
  confirmLabel = "Onayla",
  cancelLabel = "Vazgeç",
  destructive,
  onConfirm,
  onCancel,
  children,
}: {
  open: boolean;
  title: string;
  text?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
          <motion.div className="absolute inset-0 bg-primary-deep/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onCancel} />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            className="relative w-full rounded-card bg-card p-6 shadow-device"
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
          >
            <h2 className="text-lg font-semibold text-primary">{title}</h2>
            {text && <div className="mt-2 text-sm text-muted-foreground">{text}</div>}
            {children}
            <div className="mt-6 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={onCancel}>
                {cancelLabel}
              </Button>
              <Button variant={destructive ? "destructive" : "default"} className="flex-1" onClick={onConfirm}>
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
