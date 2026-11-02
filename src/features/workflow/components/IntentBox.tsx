import { Send } from "lucide-react";
import { useState } from "react";
import { GIGA } from "@/data/mock";
import { useAppStore } from "@/features/core/appStore";
import { cn } from "@/lib/utils";

/**
 * "Talebini yaz": every free-text request goes to GIGA, which understands it
 * and starts the matching flow (one place for request understanding).
 */
export function IntentBox({ onDark, className }: { onDark?: boolean; className?: string }) {
  const openHelp = useAppStore((s) => s.openHelp);
  const [text, setText] = useState("");

  const go = (t: string) => {
    setText("");
    openHelp(t.trim() || undefined);
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
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="GIGA'ya talebinizi yazın…" aria-label="GIGA'ya talebinizi yazın" className="h-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground" />
        <button type="submit" aria-label="Gönder" className="flex h-9 w-9 items-center justify-center rounded-full bg-magenta text-magenta-foreground">
          <Send className="size-4" />
        </button>
      </form>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {GIGA.starters.map((q) => (
          <button key={q} type="button" onClick={() => go(q)} className={cn("rounded-full px-3 py-1.5 text-xs font-semibold", onDark ? "bg-primary-foreground/15 text-primary-foreground" : "border border-primary/20 bg-card text-primary")}>
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
