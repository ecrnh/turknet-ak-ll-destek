import { useNavigate } from "@tanstack/react-router";
import { MessageSquareText, Phone, PhoneOff } from "lucide-react";
import { CUSTOMER } from "@/data/mock";
import { cn } from "@/lib/utils";
import { decide, getWf } from "../engine";
import { openUstaSms } from "../services/aiUsta";
import { useWorkflowStore } from "../store";

/**
 * Simulated call-centre voice triage and SMS hand-off to AI Usta. Rendered inside
 * the phone frame (position: fixed within the transformed frame). No real call or SMS.
 */
export function CallSmsLayer() {
  const navigate = useNavigate();
  const call = useWorkflowStore((s) => s.workflows.find((w) => w.type === "ai_usta" && w.data["channel"] === "ivr" && w.steps.find((x) => x.key === "sms")?.status !== "done" && !w.handoff && w.status !== "completed"));
  const sms = useWorkflowStore((s) => s.sms.find((m) => !m.opened));

  if (sms && !getWf(sms.workflowId)?.handoff) {
    return (
      <div className="fixed inset-x-3 top-10 z-[80] rounded-3xl bg-card p-4 shadow-device" role="alert">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MessageSquareText className="size-4 text-success" />
          <span className="font-semibold text-foreground">Mesajlar · TurkNet</span>
          <span className="ml-auto">şimdi</span>
        </div>
        <p className="mt-2 text-sm text-foreground">{sms.body}</p>
        <p className="mt-1 text-xs font-semibold text-magenta">{sms.link}</p>
        <button
          type="button"
          onClick={() => {
            if (openUstaSms(sms.workflowId)) navigate({ to: "/surec/$id", params: { id: sms.workflowId } });
          }}
          className="mt-3 flex min-h-12 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-float"
        >
          AI Usta'yı Aç
        </button>
        <p className="mt-2 text-center text-[10px] text-muted-foreground">Uygulama yüklü değilse bağlantı indirme sayfasını açar · demo SMS</p>
      </div>
    );
  }

  if (!call) return null;
  const st = (k: string) => call.steps.find((x) => x.key === k)?.status;
  const lines: { who: "ivr" | "me"; text: string }[] = [
    { who: "ivr", text: `Merhaba ${CUSTOMER.firstName} Bey, numaranızdan aboneliğinizi tanıdım. Sorununuzu kısaca anlatır mısınız?` },
    { who: "me", text: "İnternetim çalışmıyor." },
  ];
  if (st("ivr_check") === "done") lines.push({ who: "ivr", text: "Bağlantınızı kontrol ettim. Bölgenizde arıza görünmüyor ama modeminiz internete bağlanamıyor. Modeminizi görüntülü kontrol etmek için size AI Usta bağlantısı gönderebilirim." });
  else lines.push({ who: "ivr", text: "Teşekkürler. Bağlantınızı kontrol ediyorum, lütfen hatta kalın…" });

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-plum px-5 pb-8 pt-12 text-primary-foreground">
      <div className="text-center">
        <p className="text-xs text-primary-foreground/70">Sesli Yanıt Sistemi · demo</p>
        <p className="mt-1 text-2xl font-semibold">TürkNet 0850</p>
        <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-primary-foreground/80">
          <Phone className="size-4" /> Görüşme devam ediyor
        </p>
      </div>
      <div className="mt-6 flex-1 space-y-2 overflow-y-auto">
        {lines.map((l, i) => (
          <p key={i} className={cn("max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm", l.who === "ivr" ? "bg-primary-foreground/15" : "ml-auto bg-magenta text-magenta-foreground")}>
            {l.text}
          </p>
        ))}
      </div>
      {call.decision?.key === "usta_ivr" ? (
        <div className="space-y-2">
          {call.decision.options.map((o) => (
            <button key={o.id} type="button" onClick={() => decide(call.id, o.id, "customer")} className={cn("flex min-h-14 w-full items-center justify-center rounded-full text-base font-semibold", o.primary ? "bg-card text-primary" : "bg-primary-foreground/15")}>
              {o.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive" aria-label="Görüşme sürüyor">
          <PhoneOff className="size-7" />
        </div>
      )}
    </div>
  );
}
