import { useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ChevronLeft, Grid3x3, Headset, Loader2, MessageSquareText, Mic, MicOff, Phone, PhoneOff, Smartphone, Volume2 } from "lucide-react";
import { useState } from "react";
import { IVR_MENU } from "@/data/mock";
import { useNow } from "@/hooks/use-now";
import { cn } from "@/lib/utils";
import { decide, hasOp } from "../engine";
import { endCall, ISSUE_LABEL, openUstaSms } from "../services/aiUsta";
import { useWorkflowStore } from "../store";
import type { Workflow } from "../types";
import { TurknetLogo } from "@/components/layout/headers";

const mmss = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

type Line = { who: "ivr" | "me" | "agent"; text: string };

/** Subtitles derived only from the workflow state, so panel and phone never diverge. */
function transcript(wf: Workflow): Line[] {
  const st = (k: string) => wf.steps.find((x) => x.key === k)?.status;
  const choice = (k: string) => wf.decisions.find((d) => d.key === k);
  const lines: Line[] = [{ who: "ivr", text: "Merhaba, TürkNet'e hoş geldiniz. Size yardımcı olabilmem için önce bağlantınızı kontrol edelim." }];
  if (st("call") === "done") lines.push({ who: "ivr", text: "Numaranızdan aboneliğinizi tanıdım. Şifre veya kimlik bilgisi sormayacağım." });
  if (wf.decision?.key === "usta_menu" || choice("usta_menu")) lines.push({ who: "ivr", text: "Bağlantınızda bir sorun olduğunu görüyorum. İnternetiniz hiç mi çalışmıyor, yoksa yavaş mı?" });
  const menu = choice("usta_menu");
  if (menu) {
    lines.push({ who: "me", text: menu.label });
    lines.push({ who: "ivr", text: "Anladım. Önce bölgenizde bilinen bir kesinti olup olmadığını kontrol ediyorum." });
  }
  if (st("ivr_check") === "done") {
    lines.push({ who: "ivr", text: wf.data["issue"] === "slow" ? "Bölgenizde genel bir kesinti görünmüyor, ancak hızınız paketinizin altında." : "Bölgenizde genel bir kesinti görünmüyor. Sorunu birlikte inceleyebiliriz." });
    const ask = wf.decision?.key === "usta_ivr" ? wf.decision.prompt : wf.decisions.find((d) => d.key === "usta_ivr") ? null : null;
    if (ask) lines.push({ who: "ivr", text: ask });
  }
  const ivr = choice("usta_ivr");
  if (ivr) {
    lines.push({ who: "me", text: ivr.label });
    if (ivr.optionId === "sms") lines.push({ who: "ivr", text: "Bağlantıyı SMS ile gönderdim. Görüşmeyi sonlandırıp mesajı açabilirsiniz. İyi günler dilerim." });
    else {
      lines.push({ who: "ivr", text: "Sizi temsilcimize aktarıyorum. Yaptığımız kontrolleri ilettim." });
      lines.push({ who: "agent", text: "Merhaba, ben Selin. Yaptığınız kontrolleri görüyorum; sorununuzu tekrar anlatmanıza gerek yok. Şimdi birlikte devam edelim." });
    }
  }
  return lines;
}

function CallScreen({ wf }: { wf: Workflow }) {
  const navigate = useNavigate();
  const now = useNow(1000);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(false);
  const [pad, setPad] = useState(false);
  const lines = transcript(wf);
  const d = wf.decision;
  const listening = !!d;
  const thinking = hasOp(wf.id);
  const started = Number(wf.data["callStartedAt"] ?? wf.createdAt);
  const ended = wf.data["callEndedAt"] ? Number(wf.data["callEndedAt"]) : null;
  const menuOpen = d?.key === "usta_menu";
  const pressKey = (k: string) => {
    const m = IVR_MENU.find((x) => x.key === k);
    if (menuOpen && m) decide(wf.id, m.id, "customer");
  };

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-plum px-5 pb-7 pt-10 text-primary-foreground" role="dialog" aria-label="TürkNet görüşmesi (simülasyon)">
      <div className="text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-card">
          <TurknetLogo className="text-4xl" />
        </span>
        <p className="mt-2 text-xl font-semibold">TürkNet Müşteri Hizmetleri</p>
        <p className="text-sm tabular-nums text-primary-foreground/80">{ended ? "Görüşme sona erdi" : mmss(now - started)}</p>
        <p className="mx-auto mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-semibold">
          {wf.handoff ? (
            <>
              <Headset className="size-3.5" /> Temsilci bağlandı
            </>
          ) : listening ? (
            <>
              <Mic className="size-3.5" /> Sesli asistan sizi dinliyor
            </>
          ) : (
            <>
              <span className="flex h-3 items-end gap-0.5" aria-hidden>
                {[0, 1, 2, 3].map((i) => (
                  <motion.span key={i} className="w-0.5 rounded-full bg-neon-lime" animate={{ height: thinking ? [3, 12, 5, 10, 3] : 3 }} transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.12 }} />
                ))}
              </span>
              Sesli asistan konuşuyor
            </>
          )}
        </p>
      </div>

      <div className="mt-4 flex-1 space-y-2 overflow-y-auto" aria-live="polite">
        {lines.map((l, i) => (
          <motion.p key={`${i}-${l.text}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cn("max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm", l.who === "me" ? "ml-auto bg-magenta text-magenta-foreground" : l.who === "agent" ? "bg-card text-foreground" : "bg-primary-foreground/15")}>
            {l.who === "agent" && <span className="mb-0.5 block text-[10px] font-bold uppercase text-magenta">Temsilci</span>}
            {l.text}
          </motion.p>
        ))}
        {d?.key === "usta_ivr" && <p className="max-w-[88%] rounded-2xl bg-primary-foreground/15 px-3.5 py-2.5 text-sm">{d.prompt}</p>}
        {thinking && !d && <Loader2 className="size-4 animate-spin text-primary-foreground/70" />}
      </div>

      {menuOpen && !pad && (
        <div className="mt-3 space-y-1.5">
          {d!.options.map((o) => (
            <button key={o.id} type="button" onClick={() => decide(wf.id, o.id, "customer")} className="flex min-h-11 w-full items-center rounded-2xl bg-primary-foreground/15 px-4 text-left text-sm font-semibold">
              {o.label}
            </button>
          ))}
        </div>
      )}
      {menuOpen && pad && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((k) => (
            <button key={k} type="button" onClick={() => pressKey(k)} className="min-h-12 rounded-full bg-primary-foreground/15 text-lg font-semibold">
              {k}
            </button>
          ))}
        </div>
      )}
      {d?.key === "usta_ivr" && (
        <div className="mt-3 space-y-2">
          {d.options.map((o) => (
            <button key={o.id} type="button" onClick={() => decide(wf.id, o.id, "customer")} className={cn("flex min-h-12 w-full items-center justify-center rounded-full text-sm font-semibold", o.primary ? "bg-card text-primary" : "bg-primary-foreground/15")}>
              {o.label}
            </button>
          ))}
        </div>
      )}
      {wf.handoff && (
        <button
          type="button"
          onClick={() => {
            endCall(wf.id);
            navigate({ to: "/canli-destek/$id", params: { id: wf.id } });
          }}
          className="mt-3 flex min-h-12 w-full items-center justify-center rounded-full bg-card text-sm font-semibold text-primary"
        >
          Görüşmeye yazılı devam et
        </button>
      )}

      <div className="mt-5 grid grid-cols-4 items-center gap-3">
        <button type="button" onClick={() => setMuted((v) => !v)} aria-pressed={muted} className="flex flex-col items-center gap-1 text-[11px]">
          <span className={cn("flex h-12 w-12 items-center justify-center rounded-full", muted ? "bg-card text-primary" : "bg-primary-foreground/15")}>{muted ? <MicOff className="size-5" /> : <Mic className="size-5" />}</span>
          {muted ? "Sessizde" : "Sessiz"}
        </button>
        <button type="button" onClick={() => setPad((v) => !v)} aria-pressed={pad} disabled={!menuOpen} className="flex flex-col items-center gap-1 text-[11px] disabled:opacity-40">
          <span className={cn("flex h-12 w-12 items-center justify-center rounded-full", pad ? "bg-card text-primary" : "bg-primary-foreground/15")}>
            <Grid3x3 className="size-5" />
          </span>
          Tuş takımı
        </button>
        <button type="button" onClick={() => setSpeaker((v) => !v)} aria-pressed={speaker} className="flex flex-col items-center gap-1 text-[11px]">
          <span className={cn("flex h-12 w-12 items-center justify-center rounded-full", speaker ? "bg-card text-primary" : "bg-primary-foreground/15")}>
            <Volume2 className="size-5" />
          </span>
          Hoparlör
        </button>
        <button type="button" onClick={() => endCall(wf.id)} aria-label="Görüşmeyi bitir" className="flex flex-col items-center gap-1 text-[11px]">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive">
            <PhoneOff className="size-5" />
          </span>
          Bitir
        </button>
      </div>
      {muted && <p className="mt-2 text-center text-[11px] text-primary-foreground/70">Mikrofonunuz kapalı; menüden seçim yapmaya devam edebilirsiniz.</p>}
      <p className="mt-2 text-center text-[10px] text-primary-foreground/60">Simüle görüşme · gerçek arama yapılmaz</p>
    </div>
  );
}

function SmsScreen({ smsId, wfId }: { smsId: string; wfId: string }) {
  const navigate = useNavigate();
  const sms = useWorkflowStore((s) => s.sms.find((m) => m.id === smsId));
  const installed = useWorkflowStore((s) => s.config.appInstalled);
  const issue = useWorkflowStore((s) => s.workflows.find((w) => w.id === wfId)?.data["issue"]);
  const [landing, setLanding] = useState<"none" | "store" | "installing" | "ready">("none");
  if (!sms) return null;
  const setInstalled = (v: boolean) => useWorkflowStore.setState((s) => ({ config: { ...s.config, appInstalled: v } }));
  const open = () => {
    const to = openUstaSms(wfId);
    if (to) navigate({ to: to as "/" });
  };

  if (landing !== "none")
    return (
      <div className="fixed inset-0 z-[80] flex flex-col bg-background px-5 pb-8 pt-10" role="dialog" aria-label="Uygulama indirme sayfası (simülasyon)">
        <button type="button" onClick={() => setLanding("none")} className="flex items-center gap-1 text-sm font-semibold text-primary">
          <ChevronLeft className="size-4" /> Mesajlar
        </button>
        <div className="mt-6 flex-1 text-center">
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-card shadow-card">
            <TurknetLogo className="text-5xl" />
          </span>
          <p className="mt-4 text-2xl font-bold text-primary">TürkNet uygulaması</p>
          <p className="mt-1 text-sm text-muted-foreground">Arızanızı adım adım çözün, işlemlerinizi takip edin. Sorununuz bu cihazda sizi bekliyor: {ISSUE_LABEL[(issue as keyof typeof ISSUE_LABEL) ?? "down"]}.</p>
          {landing === "store" && (
            <div className="mt-6 space-y-2">
              {["App Store'dan indir", "Google Play'den al"].map((l) => (
                <button key={l} type="button" onClick={() => { setLanding("installing"); window.setTimeout(() => setLanding("ready"), 1800); }} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-foreground text-sm font-semibold text-background">
                  <Smartphone className="size-5" /> {l}
                </button>
              ))}
            </div>
          )}
          {landing === "installing" && (
            <p className="mt-8 flex items-center justify-center gap-2 font-semibold text-primary">
              <Loader2 className="size-5 animate-spin text-magenta" /> Uygulama yükleniyor (demo)…
            </p>
          )}
          {landing === "ready" && (
            <button
              type="button"
              onClick={() => {
                setInstalled(true);
                open();
              }}
              className="mt-8 flex min-h-14 w-full items-center justify-center rounded-full bg-primary text-base font-semibold text-primary-foreground shadow-float"
            >
              Uygulamayı aç
            </button>
          )}
        </div>
        <p className="text-center text-[10px] text-muted-foreground">Mağaza ve yükleme simülasyondur; gerçek bir uygulama indirilmez.</p>
      </div>
    );

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-background" role="dialog" aria-label="SMS (simülasyon)">
      <div className="border-b border-border bg-card px-4 pb-3 pt-10 text-center">
        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-icon-box">
          <MessageSquareText className="size-5 text-primary" />
        </span>
        <p className="mt-1 font-semibold text-foreground">TürkNet</p>
        <p className="text-[11px] text-muted-foreground">Kısa mesaj · şimdi</p>
      </div>
      <div className="flex-1 px-4 py-5">
        <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-muted px-4 py-3 text-sm text-foreground">
          {sms.body}{" "}
          <button type="button" onClick={() => (installed ? open() : setLanding("store"))} className="font-semibold text-magenta underline underline-offset-2">
            {sms.link}
          </button>
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">Demo SMS · gerçek mesaj gönderilmedi</p>
      </div>
      <div className="border-t border-border bg-card px-4 pb-6 pt-3">
        <label className="flex min-h-11 items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>Demo: TürkNet uygulaması bu telefonda yüklü</span>
          <input type="checkbox" checked={installed} onChange={(e) => setInstalled(e.target.checked)} className="h-5 w-5 accent-primary" />
        </label>
        <button type="button" onClick={() => (installed ? open() : setLanding("store"))} className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-float">
          <Phone className="size-4" /> Bağlantıyı aç
        </button>
      </div>
    </div>
  );
}

/**
 * Simulated phone call (voice triage) and SMS hand-off, rendered inside the phone
 * frame (position: fixed within the transformed frame). No real call or SMS.
 */
export function CallSmsLayer() {
  const call = useWorkflowStore((s) =>
    s.workflows.find((w) => w.type === "ai_usta" && w.data["channel"] === "ivr" && !w.data["callClosed"] && !w.data["callEndedAt"] && w.status !== "completed" && w.status !== "failed"),
  );
  const sms = useWorkflowStore((s) => s.sms.find((m) => !m.opened && s.workflows.some((w) => w.id === m.workflowId && !w.handoff && w.status !== "failed")));
  if (call) return <CallScreen wf={call} />;
  if (sms) return <SmsScreen smsId={sms.id} wfId={sms.workflowId} />;
  return null;
}
