import { useNavigate } from "@tanstack/react-router";
import { Send } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { log } from "../engine";
import { detectIntent, type Intent } from "../rules";
import { startAiUsta } from "../services/aiUsta";
import { runBillingShield } from "../services/billing";
import { startSpeedCheck } from "../services/proactive";

const LABEL: Record<Intent, string> = {
  relocation: "Taşınma",
  billing: "Fatura Kalkanı",
  ai_usta: "AI Usta",
  temp_internet: "Bağlantım · Hibrit İnternet",
  speed: "Hız kontrolü",
  track: "İşlemlerim",
};

export const QUICK_INTENTS = ["Taşınacağım", "İnternetim çok yavaş", "Faturamda tutarsızlık var", "İnternetim kesildi", "İşlemim ne durumda?"];

const CLARIFY: { label: string; intent: Intent }[] = [
  { label: "Taşınma", intent: "relocation" },
  { label: "İnternet çalışmıyor", intent: "ai_usta" },
  { label: "Yavaş internet", intent: "speed" },
  { label: "Fatura", intent: "billing" },
  { label: "İşlem durumu", intent: "track" },
];

/**
 * "Size nasıl yardımcı olabilirim?": detects the request and really starts the
 * matching flow (not a decorative chat box). Asks for a short clarification when unsure.
 */
export function IntentBox({ onDark, className }: { onDark?: boolean; className?: string }) {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [unsure, setUnsure] = useState(false);

  const run = (intent: Intent, said: string) => {
    log(null, "customer", "info", `Talep: “${said}” → ${LABEL[intent]}`, "Talep algılama: anahtar kelime eşleşmesi (demo)");
    setText("");
    setUnsure(false);
    switch (intent) {
      case "relocation":
        return navigate({ to: "/tasinma" });
      case "billing": {
        const r = runBillingShield();
        return r.wfId ? navigate({ to: "/surec/$id", params: { id: r.wfId } }) : navigate({ to: "/fatura-kalkani" });
      }
      case "ai_usta":
        return navigate({ to: "/surec/$id", params: { id: startAiUsta() } });
      case "speed":
        return navigate({ to: "/surec/$id", params: { id: startSpeedCheck() } });
      case "temp_internet":
        return navigate({ to: openOutage() ? "/hibrit" : "/baglanti" });
      case "track":
        return navigate({ to: "/takip" });
    }
  };

  const go = (t: string) => {
    const intent = detectIntent(t);
    if (!intent) {
      if (t.trim()) log(null, "customer", "info", `Talep anlaşılamadı: “${t}”`, "Emin olunamayan talepte kullanıcıdan kısa açıklama istenir");
      setUnsure(true);
      return;
    }
    run(intent, t);
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
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Talebinizi yazın…" aria-label="Talebinizi yazın" className="h-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground" />
        <button type="submit" aria-label="Gönder" className="flex h-9 w-9 items-center justify-center rounded-full bg-magenta text-magenta-foreground">
          <Send className="size-4" />
        </button>
      </form>
      {unsure ? (
        <div className={cn("mt-2.5 rounded-2xl p-3", onDark ? "bg-primary-foreground/10" : "bg-muted")} role="status">
          <p className={cn("text-sm font-semibold", onDark ? "text-primary-foreground" : "text-foreground")}>Tam anlayamadım. Konu hangisine yakın?</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {CLARIFY.map((c) => (
              <button key={c.label} type="button" onClick={() => run(c.intent, c.label)} className={cn("rounded-full px-3 py-1.5 text-xs font-semibold", onDark ? "bg-card text-primary" : "border border-primary/20 bg-card text-primary")}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {QUICK_INTENTS.map((q) => (
            <button key={q} type="button" onClick={() => go(q)} className={cn("rounded-full px-3 py-1.5 text-xs font-semibold", onDark ? "bg-primary-foreground/15 text-primary-foreground" : "border border-primary/20 bg-card text-primary")}>
              {q}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
