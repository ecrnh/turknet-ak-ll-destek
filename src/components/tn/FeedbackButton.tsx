import { CheckCircle2, Mail } from "lucide-react";
import { useState } from "react";
import { useAppStore } from "@/features/core/appStore";
import { track } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ListCard, ListRow } from "./cards";
import { BottomSheet } from "./Sheet";
import { IconBox } from "./primitives";

/** Talep ve öneri kutusu — customer requests and suggestions, routed to the relevant team. */
export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const addFeedback = useAppStore((s) => s.addFeedback);

  const close = () => {
    setOpen(false);
    setSent(false);
    setText("");
  };

  const submit = () => {
    if (!text.trim()) return;
    addFeedback("Talep ve öneri", text);
    track("flow_completed", "missing_op_feedback", { op: "talep_oneri" });
    setSent(true);
  };

  return (
    <>
      <ListCard className="mt-5">
        <ListRow
          title="Talep ve Öneri Kutusu"
          icon={<IconBox icon={Mail} />}
          onClick={() => {
            setOpen(true);
            track("feature_opened", "missing_op_feedback");
          }}
        />
      </ListCard>
      <BottomSheet open={open} onClose={close} title="Talep ve Öneri Kutusu">
        {sent ? (
          <div className="pb-2">
            <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
              <p className="text-sm font-semibold text-foreground">Talebin doğrudan ilgili ekibe yönlendirildi.</p>
            </div>
            <Button size="lg" className="mt-5 w-full" onClick={close}>
              Kapat
            </Button>
          </div>
        ) : (
          <>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Talebini veya önerini buraya yazabilirsin." className="mt-1 rounded-2xl" aria-label="Talep veya öneri" />
            <p className="mt-2 text-xs text-muted-foreground">Not: Talebin doğrudan ilgili ekibe yönlendirilir.</p>
            <Button size="lg" className="mt-5 w-full" disabled={!text.trim()} onClick={submit}>
              Gönder
            </Button>
          </>
        )}
      </BottomSheet>
    </>
  );
}
