import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/features/core/appStore";
import { track } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const FACES = [
  { v: 1, e: "😞", l: "Çok kötü" },
  { v: 2, e: "🙁", l: "Kötü" },
  { v: 3, e: "😐", l: "Orta" },
  { v: 4, e: "🙂", l: "İyi" },
  { v: 5, e: "😍", l: "Harika" },
];

/** One-tap CSAT + optional comment + NPS. Shown at the end of every flow. */
export function Csat({ feature, title = "Bu deneyimi nasıl buldun?", className }: { feature: string; title?: string; className?: string }) {
  const addRating = useAppStore((s) => s.addRating);
  const [csat, setCsat] = useState<number | null>(null);
  const [nps, setNps] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [sent, setSent] = useState(false);

  const submit = () => {
    if (csat == null) return;
    addRating({ feature, csat, nps, comment });
    track("cta_clicked", feature, { action: "csat_submit", csat, nps: nps ?? -1 });
    setSent(true);
    toast.success("Teşekkürler! Geri bildirimin bize ulaştı.");
  };

  if (sent)
    return (
      <div className={cn("flex items-center gap-3 rounded-card bg-success-soft p-4 text-sm", className)}>
        <CheckCircle2 className="size-6 text-success" />
        <span className="font-semibold">Geri bildirimin için teşekkürler.</span>
      </div>
    );

  return (
    <div className={cn("rounded-card bg-card p-5 shadow-card", className)}>
      <p className="font-semibold text-primary">{title}</p>
      <div className="mt-3 flex justify-between" role="radiogroup" aria-label="Memnuniyet">
        {FACES.map((f) => (
          <button
            key={f.v}
            role="radio"
            aria-checked={csat === f.v}
            aria-label={f.l}
            onClick={() => setCsat(f.v)}
            className={cn("flex h-12 w-12 items-center justify-center rounded-full text-2xl transition-all", csat === f.v ? "scale-110 bg-magenta-soft ring-2 ring-magenta" : "bg-muted grayscale-[40%]")}
          >
            {f.e}
          </button>
        ))}
      </div>
      {csat != null && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden">
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Yorumun (opsiyonel)" className="mt-4 rounded-2xl" aria-label="Yorum" />
          <p className="mt-4 text-sm font-semibold text-foreground">Bu özelliği bir yakınına önerir misin?</p>
          <div className="mt-2 grid grid-cols-11 gap-1">
            {Array.from({ length: 11 }, (_, i) => (
              <button
                key={i}
                onClick={() => setNps(i)}
                aria-label={`${i} puan`}
                className={cn("h-9 rounded-lg text-xs font-bold", nps === i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}
              >
                {i}
              </button>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
            <span>Hiç önermem</span>
            <span>Kesinlikle öneririm</span>
          </div>
          <Button className="mt-4 w-full" onClick={submit}>
            Gönder
          </Button>
        </motion.div>
      )}
    </div>
  );
}
