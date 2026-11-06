import { MessageSquareWarning } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { MISSING_OPS } from "@/data/mock";
import { useAppStore } from "@/features/core/appStore";
import { track } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BottomSheet } from "./Sheet";
import { Chip } from "./primitives";

/** "Bu işlemi uygulamadan yapamadın mı?" — answers the case's customer feedback directly. */
export function FeedbackButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [op, setOp] = useState<string | null>(null);
  const [text, setText] = useState("");
  const addFeedback = useAppStore((s) => s.addFeedback);

  const submit = () => {
    if (!op) return;
    addFeedback(op, text);
    track("flow_completed", "missing_op_feedback", { op });
    toast.success("Talep Kutusu'na eklendi", { description: "Bu işlemi uygulamaya eklemek için değerlendireceğiz." });
    setOpen(false);
    setOp(null);
    setText("");
  };

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          track("feature_opened", "missing_op_feedback");
        }}
        className={className ?? "flex w-full items-center gap-3 rounded-card border border-dashed border-magenta/40 bg-card p-4 text-left"}
      >
        <MessageSquareWarning className="size-6 shrink-0 text-magenta" strokeWidth={1.75} />
        <span className="flex-1">
          <span className="block font-semibold text-primary">Bu işlemi uygulamadan yapamadın mı?</span>
          <span className="block text-xs text-muted-foreground">Bize söyle, bu işlemi uygulamadan kolayca yapabilmen için geliştirelim.</span>
        </span>
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title="Bize söyle">
        <p className="text-sm text-muted-foreground">Uygulamada bulamadığın işlemi seç. Talebin doğrudan ürün ekibine gider.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {MISSING_OPS.map((o) => (
            <Chip key={o} active={op === o} onClick={() => setOp(o)}>
              {o}
            </Chip>
          ))}
        </div>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Ne yapmaya çalışıyordun? (opsiyonel)" className="mt-4 rounded-2xl" aria-label="Açıklama" />
        <Button size="lg" className="mt-5 w-full" disabled={!op} onClick={submit}>
          Talep Kutusu'na Gönder
        </Button>
      </BottomSheet>
    </>
  );
}
