import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Grid3x3, Loader2, MessageSquareText, Mic, MicOff, PhoneOff, Volume2, VolumeX } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { USER } from "@/data/mock";
import { GigaAvatar } from "@/features/giga/GigaAvatar";
import { TurknetLogo } from "@/components/layout/headers";
import { useNow } from "@/hooks/use-now";
import { cn } from "@/lib/utils";
import { decide, getWf } from "../engine";
import { endUstaCall, openUstaSms } from "../services/aiUsta";
import { useWorkflowStore } from "../store";
import type { Workflow } from "../types";

const mmss = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

/** Scripted subtitles of the GIGA voice call, derived from the real workflow steps. */
function callLines(call: Workflow): { who: "giga" | "me"; text: string }[] {
  const st = (k: string) => call.steps.find((x) => x.key === k)?.status;
  const said = (k: string) => call.decisions.find((d) => d.key === k)?.label;
  const lines: { who: "giga" | "me"; text: string }[] = [
    { who: "giga", text: "Merhaba, ben GIGA. TürkNet'e hoş geldin. Sana yardımcı olabilmem için önce bağlantını kontrol edelim." },
    { who: "giga", text: `Numarandan aboneliğini buldum, ${USER.firstName}. Şifre veya kimlik bilgisi sormayacağım.` },
    { who: "giga", text: "Bağlantında bir sorun olduğunu görüyorum. İnternetin hiç mi çalışmıyor, yoksa yavaş mı?" },
  ];
  const menu = said("usta_ivr_menu");
  if (menu) {
    lines.push({ who: "me", text: menu.replace(/^\d — /, "") });
    lines.push({ who: "giga", text: "Anladım. Önce bölgende bilinen bir kesinti olup olmadığını kontrol ediyorum." });
  }
  if (st("ivr_check") === "done") {
    lines.push({ who: "giga", text: "Bölgende genel bir kesinti görünmüyor. Sorunu birlikte inceleyebiliriz." });
    lines.push({ who: "giga", text: "Telefonundan birkaç basit kontrol yaparak sorunu çözmeyi deneyebiliriz. Sana bir bağlantı göndermemi ister misin?" });
  }
  const sms = said("usta_ivr");
  if (sms) {
    lines.push({ who: "me", text: sms });
    lines.push({ who: "giga", text: "Bağlantıyı SMS ile gönderdim. Görüşmeyi kapatabilirsin; uygulamada kaldığımız yerden devam edeceğiz." });
  }
  return lines;
}

function CallScreen({ call }: { call: Workflow }) {
  const now = useNow(1000);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(false);
  const [keypad, setKeypad] = useState(true);
  const started = Number(call.data["callStartedAt"] ?? call.createdAt);
  const lines = callLines(call);
  const d = call.decision;
  const deciding = d?.key === "usta_ivr_menu" || d?.key === "usta_ivr";
  const busy = !deciding && call.steps.find((x) => x.key === "sms")?.status !== "waiting";

  const hangUp = () => {
    endUstaCall(call.id);
    toast("Görüşme sonlandı", { description: "İşlemin açık kalıyor; İşlemlerim'den devam edebilirsin." });
  };

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-plum px-5 pb-8 pt-10 text-primary-foreground" role="dialog" aria-label="TürkNet görüşmesi (simülasyon)">
      <div className="flex flex-col items-center text-center">
        <TurknetLogo className="text-2xl text-primary-foreground" />
        <p className="mt-1 text-xs text-primary-foreground/70">TürkNet 0850 · GIGA sesli destek · demo</p>
        <GigaAvatar size={72} mood={deciding ? "listening" : busy ? "thinking" : "idle"} className="mt-4" />
        <p className="mt-2 font-mono text-lg">{mmss(now - started)}</p>
        <p className="text-xs text-primary-foreground/75">{deciding ? "GIGA seni dinliyor" : busy ? "GIGA kontrol ediyor…" : "GIGA konuşuyor"}</p>
      </div>

      <div className="mt-4 flex-1 space-y-2 overflow-y-auto no-scrollbar" aria-live="polite">
        {lines.map((l, i) => (
          <motion.p key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cn("max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm", l.who === "giga" ? "bg-primary-foreground/15" : "ml-auto bg-magenta text-magenta-foreground")}>
            {l.text}
          </motion.p>
        ))}
        {busy && (
          <p className="flex items-center gap-2 text-xs text-primary-foreground/70">
            <Loader2 className="size-3.5 animate-spin" /> Kontrol ediliyor…
          </p>
        )}
      </div>

      {deciding && keypad && d && (
        <div className="mt-3 space-y-2">
          {d.options.map((o) => (
            <button key={o.id} type="button" onClick={() => decide(call.id, o.id, "customer")} className={cn("flex min-h-12 w-full items-center justify-center rounded-full px-4 text-sm font-semibold", o.primary ? "bg-card text-primary" : "bg-primary-foreground/15")}>
              {o.label}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 grid grid-cols-3 gap-3 text-center text-[11px]">
        <button type="button" onClick={() => setMuted((v) => !v)} aria-pressed={muted} className="flex flex-col items-center gap-1">
          <span className={cn("flex h-12 w-12 items-center justify-center rounded-full", muted ? "bg-card text-primary" : "bg-primary-foreground/15")}>{muted ? <MicOff className="size-5" /> : <Mic className="size-5" />}</span>
          Sessiz
        </button>
        <button type="button" onClick={() => setKeypad((v) => !v)} aria-pressed={keypad} className="flex flex-col items-center gap-1">
          <span className={cn("flex h-12 w-12 items-center justify-center rounded-full", keypad ? "bg-card text-primary" : "bg-primary-foreground/15")}><Grid3x3 className="size-5" /></span>
          Tuş takımı
        </button>
        <button type="button" onClick={() => setSpeaker((v) => !v)} aria-pressed={speaker} className="flex flex-col items-center gap-1">
          <span className={cn("flex h-12 w-12 items-center justify-center rounded-full", speaker ? "bg-card text-primary" : "bg-primary-foreground/15")}>{speaker ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}</span>
          Hoparlör
        </button>
      </div>
      <button type="button" onClick={hangUp} aria-label="Görüşmeyi sonlandır" className="mx-auto mt-5 flex h-16 w-16 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
        <PhoneOff className="size-7" />
      </button>
    </div>
  );
}

/** "Uygulama yüklü değil" path: store landing, simulated install, then the app opens with context. */
function InstallLanding({ onOpen, onClose }: { onOpen: () => void; onClose: () => void }) {
  const [stage, setStage] = useState<"store" | "installing" | "ready">("store");
  const install = () => {
    setStage("installing");
    setTimeout(() => setStage("ready"), 1400);
  };
  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-background px-6 pb-10 pt-14 text-center" role="dialog" aria-label="Uygulama indirme sayfası (simülasyon)">
      <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-[26px] bg-plum shadow-float">
        <TurknetLogo className="text-4xl text-primary-foreground" />
      </span>
      <p className="mt-4 text-xl font-semibold text-primary">TürkNet uygulaması</p>
      <p className="mt-1 text-sm text-muted-foreground">İnternetin, faturaların ve işlemlerin tek yerde. GIGA Teknik ile sorununu adım adım birlikte çözelim.</p>
      <div className="mt-5 flex items-center justify-center gap-2">
        <GigaAvatar size={36} mood="listening" />
        <p className="text-left text-xs text-muted-foreground">Telefon görüşmemizdeki bilgiler hazır; kurulumdan sonra kaldığımız yerden devam edeceğiz.</p>
      </div>
      {stage === "store" && (
        <div className="mt-8 grid gap-3">
          <button type="button" onClick={install} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-foreground text-sm font-semibold text-background">
            App Store'dan indir
          </button>
          <button type="button" onClick={install} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-foreground text-sm font-semibold text-background">
            ▶ Google Play'den indir
          </button>
        </div>
      )}
      {stage === "installing" && (
        <p className="mt-8 flex items-center justify-center gap-2 text-sm font-semibold text-primary">
          <Loader2 className="size-5 animate-spin" /> Uygulama yükleniyor…
        </p>
      )}
      {stage === "ready" && (
        <button type="button" onClick={onOpen} className="mt-8 flex min-h-14 items-center justify-center rounded-full bg-primary text-base font-semibold text-primary-foreground shadow-float">
          Uygulamayı aç
        </button>
      )}
      <button type="button" onClick={onClose} className="mt-3 min-h-11 text-sm font-semibold text-muted-foreground">
        Vazgeç
      </button>
      <p className="mt-auto text-[11px] text-muted-foreground">Mağaza ekranı ve kurulum simülasyondur; gerçek indirme yapılmaz.</p>
    </div>
  );
}

/**
 * Simulated GIGA voice call and SMS hand-off to GIGA Teknik. Rendered inside the
 * phone frame (position: fixed within the transformed frame). No real call or SMS.
 */
export function CallSmsLayer() {
  const navigate = useNavigate();
  const appInstalled = useWorkflowStore((s) => s.config.appInstalled);
  const call = useWorkflowStore((s) => s.workflows.find((w) => w.type === "ai_usta" && w.data["channel"] === "ivr" && !w.data["callEnded"] && w.steps.find((x) => x.key === "sms")?.status !== "done" && !w.handoff && w.status !== "completed"));
  const sms = useWorkflowStore((s) => s.sms.find((m) => !m.opened && m.kind !== "appointment" && m.kind !== "netbox"));
  const apptSms = useWorkflowStore((s) => s.sms.find((m) => !m.opened && m.kind === "appointment"));
  const closeAppt = (id: string) => useWorkflowStore.setState((s) => ({ sms: s.sms.map((m) => (m.id === id ? { ...m, opened: true } : m)) }));
  const [installFor, setInstallFor] = useState<string | null>(null);

  const open = (wfId: string) => {
    setInstallFor(null);
    if (openUstaSms(wfId)) navigate({ to: "/surec/$id", params: { id: wfId } });
  };

  const showSms = sms && !getWf(sms.workflowId)?.handoff;

  return (
    <>
      {call && <CallScreen call={call} />}
      <AnimatePresence>
        {showSms && !installFor && (
          <motion.div key={sms.id} initial={{ y: -120, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -120, opacity: 0 }} className="fixed inset-x-3 top-10 z-[85] rounded-3xl bg-card p-4 shadow-device" role="alert">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MessageSquareText className="size-4 text-success" />
              <span className="font-semibold text-foreground">Mesajlar · TürkNet</span>
              <span className="ml-auto">şimdi</span>
            </div>
            <p className="mt-2 text-sm text-foreground">
              {sms.body}{" "}
              <button type="button" onClick={() => (appInstalled ? open(sms.workflowId) : setInstallFor(sms.workflowId))} className="font-semibold text-magenta underline underline-offset-2">
                {sms.link}
              </button>
            </p>
            <button
              type="button"
              onClick={() => (appInstalled ? open(sms.workflowId) : setInstallFor(sms.workflowId))}
              className="mt-3 flex min-h-12 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-float"
            >
              GIGA Teknik'i Aç
            </button>
            <p className="mt-2 text-center text-[10px] text-muted-foreground">Demo SMS · gerçek mesaj gönderilmedi{appInstalled ? "" : " · uygulama yüklü değil"}</p>
          </motion.div>
        )}
        {!showSms && apptSms && (
          <motion.div key={apptSms.id} initial={{ y: -120, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -120, opacity: 0 }} className="fixed inset-x-3 top-10 z-[85] rounded-3xl bg-card p-4 shadow-device" role="alert">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MessageSquareText className="size-4 text-success" />
              <span className="font-semibold text-foreground">Mesajlar · TürkNet</span>
              <span className="ml-auto">şimdi</span>
            </div>
            <p className="mt-2 text-sm text-foreground">{apptSms.body} <span className="font-semibold text-magenta">{apptSms.link}</span></p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => closeAppt(apptSms.id)} className="flex min-h-11 flex-1 items-center justify-center rounded-full border border-border text-sm font-semibold text-foreground">Kapat</button>
              <button type="button" onClick={() => { closeAppt(apptSms.id); navigate({ to: "/surec/$id", params: { id: apptSms.workflowId } }); }} className="flex min-h-11 flex-1 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">Randevuyu gör</button>
            </div>
            <p className="mt-2 text-center text-[10px] text-muted-foreground">Demo SMS · gerçek mesaj gönderilmedi</p>
          </motion.div>
        )}
      </AnimatePresence>
      {installFor && <InstallLanding onOpen={() => open(installFor)} onClose={() => setInstallFor(null)} />}
    </>
  );
}
