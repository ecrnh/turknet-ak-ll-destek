import { useNavigate } from "@tanstack/react-router";
import { Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { log } from "../engine";
import { detectIntent, type Intent } from "../rules";

const ROUTE: Record<Intent, string> = {
  relocation: "/tasinma",
  billing: "/fatura-kalkani",
  ai_usta: "/ai-usta",
  temp_internet: "/baglanti",
  track: "/takip",
};

const LABEL: Record<Intent, string> = {
  relocation: "Taşınma",
  billing: "Fatura Kalkanı",
  ai_usta: "AI Usta",
  temp_internet: "Bağlantı seçenekleri",
  track: "Süreç takibi",
};

export const QUICK_INTENTS = ["Taşınacağım", "İnternetim çalışmıyor", "Ödememi yaptım ama borç görünüyor", "Talebim ne durumda?"];

/** "Sen talebini söyle": free-text intent detection that routes to the right flow. */
export function IntentBox({ onDark, className }: { onDark?: boolean; className?: string }) {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const go = (t: string) => {
    const intent = detectIntent(t);
    if (!intent) {
      toast("Tam anlayamadım", { description: "Aşağıdaki seçeneklerden birini seçebilir veya farklı yazabilirsin." });
      return;
    }
    log(null, "customer", "info", `Talep: “${t}” → ${LABEL[intent]}`, "Talep algılama: anahtar kelime eşleşmesi (demo)");
    setText("");
    navigate({ to: ROUTE[intent] as "/" });
  };
  return (
    <div className={className}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go(text);
        }}
        className={cn("flex h-12 items-center gap-2 rounded-full pl-4 pr-1.5", onDark ? "bg-card" : "border border-border bg-card shadow-sm")}
      >
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ne yapmak istiyorsun?" aria-label="Talebini yaz" className="h-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground" />
        <button type="submit" aria-label="Gönder" className="flex h-9 w-9 items-center justify-center rounded-full bg-magenta text-magenta-foreground">
          <Send className="size-4" />
        </button>
      </form>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {QUICK_INTENTS.map((q) => (
          <button key={q} type="button" onClick={() => go(q)} className={cn("rounded-full px-3 py-1.5 text-xs font-semibold", onDark ? "bg-primary-foreground/15 text-primary-foreground" : "border border-primary/20 bg-card text-primary")}>
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
