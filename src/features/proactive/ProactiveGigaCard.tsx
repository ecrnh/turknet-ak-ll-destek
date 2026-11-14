import { useNavigate } from "@tanstack/react-router";
import { GigaAvatar } from "@/features/giga/GigaAvatar";
import { useGigaChat } from "@/features/giga/chatStore";
import type { Intent } from "@/features/workflow/rules";
import { proactiveMessage } from "./rules";
import { useProactive } from "./store";

/** GIGA's proactive offer, shown inside the phone frame (fixed, no portal). */
export function ProactiveGigaCard() {
  const s = useProactive((st) => st.pending);
  const visible = useProactive((st) => st.visible);
  const close = useProactive((st) => st.close);
  const navigate = useNavigate();
  if (!s || !visible) return null;
  const text = proactiveMessage(s);

  const accept = () => {
    const chat = useGigaChat.getState();
    chat.add({ from: "bot", text: `${text.replace(" Yardım etmemi ister misiniz?", "")} Buradayım; ${s.intent ? "istersen hemen başlatabilirim, \"evet\" demen yeterli" : "yaşadığın sorunu kısaca yazabilirsin"}.` });
    if (s.intent) chat.setOffer(s.intent as Intent);
    close(true);
    navigate({ to: "/ajanlar" });
  };

  return (
    <div data-proactive-ignore role="dialog" aria-label="GIGA yardım teklifi" className="fixed inset-x-3 bottom-24 z-[60] rounded-card border border-border bg-card p-3 shadow-float animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-start gap-2.5">
        <GigaAvatar size={34} label={false} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wide text-magenta">GIGA</p>
          <p className="text-sm text-foreground">{text}</p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button onClick={accept} className="min-h-10 flex-1 rounded-full bg-primary px-3 text-sm font-semibold text-primary-foreground">Evet, yardım et</button>
        <button onClick={() => close(false)} className="min-h-10 flex-1 rounded-full bg-muted px-3 text-sm font-semibold text-foreground">Şimdi değil</button>
      </div>
    </div>
  );
}
