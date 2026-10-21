import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, CameraOff, Check, Flashlight, Lightbulb, Mic, MicOff, PhoneOff, RefreshCcw, Signal, UserPlus, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import expertImg from "@/assets/expert.jpg";
import momImg from "@/assets/mom.jpg";
import modemBackImg from "@/assets/modem-back.jpg";
import { BottomSheet } from "@/components/tn/Sheet";
import { CALL_CHECKLIST, LED_GUIDE, USER, VIDEO_TOPICS } from "@/data/mock";
import { useAppStore } from "@/features/core/appStore";
import { useFamilyStore } from "@/features/family/store";
import { useVideoStore } from "../store";
import { useCamera } from "../useCamera";
import { MarkCanvas, type Mark } from "../components/MarkCanvas";
import { fmtDuration, uid } from "@/lib/format";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

type Stage = { caption: string; auto?: number; user?: string; marks?: Mark[]; view?: "expert" | "rear" };

const PON: Mark = { type: "ring", x: 0.13, y: 0.37, r: 0.1, label: "Fiber kablo" };
const POWER: Mark = { type: "ring", x: 0.76, y: 0.36, r: 0.08, label: "Adaptör" };
const ONOFF: Mark = { type: "ring", x: 0.89, y: 0.37, r: 0.07, label: "Aç/Kapa" };
const CABLE: Mark = { type: "arrow", x: 0.15, y: 0.5, fromX: 0.4, fromY: 0.72, label: "Kablo ucu" };

function buildScript(hasGuest: boolean, guest: string, name: string): Stage[] {
  return [
    { caption: "Uzmana bağlanılıyor…", auto: 2500, view: "expert" },
    { caption: `Merhaba ${name}, ben Turknet uzmanı Zeynep. Modeminize birlikte bakalım.`, auto: 3200, view: "expert" },
    ...(hasGuest ? [{ caption: `${guest} da aramıza katıldı, hoş geldiniz!`, auto: 2600, view: "expert" as const }] : []),
    { caption: "Arka kamerayı modemin arkasına çevirir misiniz? Kameranızı otomatik çeviriyorum.", auto: 2800, view: "expert" },
    { caption: "Yeşil fiber kablo yerine tam oturmamış görünüyor. Klik sesi gelene kadar itin.", user: "Kabloyu taktım", marks: [PON], view: "rear" },
    { caption: "Harika! Hat bağlandı, sinyal değeriniz ideal.", auto: 2400, marks: [PON], view: "rear" },
    { caption: "Adaptör prizde ve modeme takılı görünüyor, bu adım tamam.", auto: 3000, marks: [POWER], view: "rear" },
    { caption: "Şimdi Aç/Kapa düğmesiyle modemi kapatıp 10 saniye sonra açın.", user: "Yeniden başlattım", marks: [ONOFF], view: "rear" },
    { caption: "Modem açılıyor, hat değerleri geliyor…", auto: 4000, marks: [], view: "rear" },
    { caption: "Kablo uçlarında kırılma ya da bükülme yok. Harika.", auto: 3000, marks: [CABLE], view: "rear" },
    { caption: "Her şey yolunda! Hattınız 100 Mbps senkron. Görüşmeyi bitirebilirsiniz.", view: "expert" },
  ];
}

function CtrlBtn({ on = true, onClick, label, children, danger }: { on?: boolean; onClick: () => void; label: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <button onClick={onClick} aria-label={label} aria-pressed={!danger ? on : undefined} className={cn("flex h-12 w-12 items-center justify-center rounded-full transition-colors [&_svg]:size-5", danger ? "bg-destructive text-destructive-foreground" : on ? "bg-call-foreground/15 text-call-foreground" : "bg-call-foreground text-call")}>
      {children}
    </button>
  );
}

export function VideoCallScreen() {
  const navigate = useNavigate();
  const topic = useVideoStore((s) => s.topic);
  const invitees = useVideoStore((s) => s.invitees);
  const setInvitees = useVideoStore((s) => s.setInvitees);
  const setLastCall = useVideoStore((s) => s.setLastCall);
  const managed = useFamilyStore((s) => s.managed);
  const actingAs = useFamilyStore((s) => s.actingAs);
  const addRecord = useAppStore((s) => s.addRecord);
  const addHistory = useAppStore((s) => s.addHistory);
  const cam = useCamera(true);

  const guest = invitees[0] ?? null;
  const guestShort = guest ? (managed.find((m) => m.name === guest)?.honorific ?? guest) : "";
  const script = useMemo(() => buildScript(!!guest, guestShort, USER.firstName), [guest, guestShort]);
  const [stage, setStage] = useState(0);
  const [sec, setSec] = useState(0);
  const [mic, setMic] = useState(true);
  const [video, setVideo] = useState(true);
  const [flash, setFlash] = useState(false);
  const [shot, setShot] = useState(false);
  const [ledOpen, setLedOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [rearOverride, setRearOverride] = useState<boolean | null>(null);
  const startedAt = useRef(Date.now());

  const s = script[stage]!;
  const base = guest ? 1 : 0;
  // checklist index boundaries depend on whether the guest stage exists
  const idx = { pon: 3 + base, ponDone: 4 + base, power: 5 + base, restart: 6 + base, restarting: 7 + base, cable: 8 + base, end: 9 + base };
  const done = [stage >= idx.ponDone, stage >= idx.restart, stage >= idx.cable, stage >= idx.end];
  const activeCheck = stage < idx.pon ? -1 : stage < idx.power ? 0 : stage < idx.restart ? 1 : stage < idx.cable ? 2 : stage < idx.end ? 3 : 4;
  const guestJoined = !!guest && stage >= 2;
  const view = rearOverride === null ? (s.view ?? "expert") : rearOverride ? "rear" : "expert";

  const health =
    stage < idx.ponDone
      ? { line: "Bağlı değil (LOS)", signal: "—", tone: "bad" as const }
      : stage === idx.restarting
        ? { line: "Yeniden başlatılıyor", signal: "…", tone: "wait" as const }
        : stage < idx.restarting
          ? { line: "Hat Bağlandı ✔", signal: "-19,8 dBm", tone: "ok" as const }
          : { line: "Bağlı · 100/50 Mbps", signal: "-19,6 dBm", tone: "ok" as const };

  useEffect(() => {
    const t = setInterval(() => setSec((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setRearOverride(null);
    if (!s.auto) return;
    const t = setTimeout(() => setStage((v) => Math.min(script.length - 1, v + 1)), s.auto);
    return () => clearTimeout(t);
  }, [stage, s.auto, script.length]);

  useEffect(() => {
    if (stage === 2 && guest) toast(`${guestShort} görüşmeye katıldı`);
  }, [stage, guest, guestShort]);

  const endCall = () => {
    cam.stop();
    const steps = CALL_CHECKLIST.filter((_, i) => done[i]);
    const participants = ["Turknet Uzmanı (Zeynep)", actingAs ? `Çağrı Koyuncu (yetkili)` : "Çağrı Koyuncu", ...(guestJoined && guest ? [guest] : [])];
    const topicLabel = VIDEO_TOPICS.find((t) => t.id === topic)?.label ?? "Diğer";
    const recordId = addRecord({
      channel: "Görüntülü",
      title: `Görüntülü destek: ${topicLabel}`,
      summary: `${fmtDuration(sec)} görüşme · ${participants.length} katılımcı · ${steps.length}/4 adım`,
      status: "Sonuç bekleniyor",
      details: [`Süre: ${fmtDuration(sec)}`, `Katılımcılar: ${participants.join(", ")}`, ...steps.map((x) => `✔ ${x}`)],
    });
    addHistory("Görüntülü destek görüşmesi", `${topicLabel} · ${fmtDuration(sec)}`);
    setLastCall({ id: uid(), recordId, startedAt: startedAt.current, durationSec: sec, participants, steps, topic: topicLabel, resolved: null });
    track("flow_completed", "video_support_call", { duration: sec, steps: steps.length });
    navigate({ to: "/goruntulu-destek/sonuc" });
  };

  const SelfTile = (
    <div className="relative h-full w-full overflow-hidden bg-call-surface">
      {cam.status === "live" && video ? (
        <video ref={cam.videoRef} autoPlay playsInline muted className="h-full w-full -scale-x-100 object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{USER.initials}</span>
        </div>
      )}
      <span className="absolute bottom-1 left-1.5 text-[10px] font-semibold text-call-foreground">Sen</span>
    </div>
  );
  const ExpertTile = (
    <div className="relative h-full w-full overflow-hidden">
      <img src={expertImg} alt="Turknet uzmanı Zeynep" className="h-full w-full object-cover" />
      <span className="absolute bottom-1 left-1.5 text-[10px] font-semibold text-call-foreground drop-shadow">Zeynep</span>
    </div>
  );
  const GuestTile = (
    <div className="relative h-full w-full overflow-hidden">
      <img src={momImg} alt={guest ?? ""} className="h-full w-full object-cover" />
      <span className="absolute bottom-1 left-1.5 text-[10px] font-semibold text-call-foreground drop-shadow">{guestShort}</span>
    </div>
  );

  if (stage === 0)
    return (
      <div className="flex h-full min-h-full flex-col items-center justify-center bg-call px-6 text-center text-call-foreground">
        <motion.div className="relative flex h-32 w-32 items-center justify-center" initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
          {[0, 1, 2].map((i) => (
            <motion.span key={i} className="absolute inset-0 rounded-full border-2 border-magenta" animate={{ scale: [1, 1.8], opacity: [0.7, 0] }} transition={{ repeat: Infinity, duration: 2, delay: i * 0.6 }} />
          ))}
          <img src={expertImg} alt="" className="h-28 w-28 rounded-full object-cover" />
        </motion.div>
        <p className="mt-8 text-xl font-semibold">Uzmana bağlanılıyor…</p>
        <p className="mt-1 text-sm text-call-foreground/70">Tahmini bekleme: 2 dk · sıradaki sensin</p>
        <button onClick={() => { cam.stop(); navigate({ to: "/goruntulu-destek" }); }} className="mt-10 flex h-14 w-14 items-center justify-center rounded-full bg-destructive text-destructive-foreground" aria-label="Vazgeç">
          <PhoneOff className="size-6" />
        </button>
      </div>
    );

  return (
    <div className="relative flex h-full min-h-full flex-col bg-call text-call-foreground">
      {/* Main video */}
      <div className="absolute inset-0">
        <AnimatePresence mode="wait">
          {view === "expert" ? (
            <motion.div key="expert" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.img src={expertImg} alt="Turknet uzmanı Zeynep" className="h-full w-full object-cover" animate={{ scale: [1, 1.025, 1] }} transition={{ repeat: Infinity, duration: 6 }} />
            </motion.div>
          ) : (
            <motion.div key="rear" className="absolute inset-0 flex items-center justify-center bg-call" initial={{ opacity: 0, rotateY: 90 }} animate={{ opacity: 1, rotateY: 0 }} exit={{ opacity: 0 }}>
              <div className="relative aspect-[2/3] w-full">
                <img src={modemBackImg} alt="Arka kamera: modemin arka paneli" className="h-full w-full object-cover" />
                <MarkCanvas marks={s.marks ?? []} />
              </div>
              {flash && <div className="pointer-events-none absolute inset-0 bg-call-foreground/15" />}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-call/90 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-call via-call/80 to-transparent" />
        <AnimatePresence>{shot && <motion.div className="absolute inset-0 bg-call-foreground" initial={{ opacity: 0.9 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} />}</AnimatePresence>
      </div>

      {/* Top bar */}
      <div className="relative z-10 px-4 pt-3">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-destructive px-2.5 py-1 text-xs font-bold">
            <span className="h-2 w-2 animate-pulse rounded-full bg-call-foreground" /> {fmtDuration(sec)}
          </span>
          <span className="flex-1 truncate text-sm font-semibold">{view === "rear" ? "Arka kamera · Uzman işaretliyor" : "Turknet Uzmanı · Zeynep"}</span>
        </div>
        <motion.div
          key={health.line}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={cn("mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold backdrop-blur", health.tone === "ok" ? "bg-success/85" : health.tone === "bad" ? "bg-destructive/85" : "bg-warning/85")}
          aria-live="polite"
        >
          {health.tone === "wait" ? <Loader2 className="size-3.5 animate-spin" /> : <Signal className="size-3.5" />}
          {health.line} · Sinyal {health.signal}
        </motion.div>
        {/* Checklist stepper */}
        <div className="mt-2 flex gap-1.5">
          {CALL_CHECKLIST.map((c, i) => (
            <div key={c} className={cn("flex flex-1 items-center gap-1 rounded-xl px-1.5 py-1.5 text-[10px] font-semibold leading-tight backdrop-blur", done[i] ? "bg-success/80" : activeCheck === i ? "bg-magenta/90" : "bg-call-foreground/10")}>
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-call-foreground/25">{done[i] ? <Check className="size-3" /> : i + 1}</span>
              <span className="line-clamp-2">{c}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Participant tiles */}
      <div className="absolute right-3 top-[150px] z-10 flex flex-col gap-2">
        <motion.div drag dragMomentum={false} className="h-32 w-24 overflow-hidden rounded-2xl ring-2 ring-call-foreground/30">
          {view === "rear" ? ExpertTile : SelfTile}
        </motion.div>
        {view === "rear" && <div className="h-24 w-24 overflow-hidden rounded-2xl ring-2 ring-call-foreground/30">{SelfTile}</div>}
        {guestJoined && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="h-24 w-24 overflow-hidden rounded-2xl ring-2 ring-magenta">
            {GuestTile}
          </motion.div>
        )}
      </div>

      <div className="flex-1" />

      {/* Caption + action */}
      <div className="relative z-10 space-y-3 px-4 pb-3">
        <button onClick={() => setLedOpen(true)} className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-call-foreground/15 px-3.5 text-xs font-semibold backdrop-blur">
          <Lightbulb className="size-4" /> Modem Işık Rehberi
        </button>
        <motion.div key={stage} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-call-surface/90 p-3.5 backdrop-blur">
          <p className="text-[11px] font-bold uppercase tracking-wide text-magenta">Zeynep · Turknet Uzmanı</p>
          <p className="mt-0.5 text-[0.95rem] leading-snug">{s.caption}</p>
        </motion.div>
        {s.user && (
          <motion.button initial={{ scale: 0.9 }} animate={{ scale: 1 }} onClick={() => setStage((v) => v + 1)} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-magenta text-lg font-semibold text-magenta-foreground shadow-float">
            <Check className="size-5" /> {s.user}
          </motion.button>
        )}
        {stage === script.length - 1 && (
          <button onClick={endCall} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-success text-lg font-semibold text-success-foreground">
            Görüşmeyi Bitir
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="relative z-10 flex items-center justify-between px-3 pb-5 pt-1">
        <CtrlBtn on={mic} onClick={() => setMic((v) => !v)} label={mic ? "Mikrofonu kapat" : "Mikrofonu aç"}>{mic ? <Mic /> : <MicOff />}</CtrlBtn>
        <CtrlBtn on={video} onClick={() => setVideo((v) => !v)} label={video ? "Kamerayı kapat" : "Kamerayı aç"}>{video ? <Camera /> : <CameraOff />}</CtrlBtn>
        <CtrlBtn onClick={() => setRearOverride(view !== "rear")} label="Kamerayı çevir"><RefreshCcw /></CtrlBtn>
        <CtrlBtn on={!flash} onClick={() => setFlash((v) => !v)} label="El feneri"><Flashlight /></CtrlBtn>
        <CtrlBtn onClick={() => { setShot(true); setTimeout(() => setShot(false), 500); toast.success("Fotoğraf uzmana iletildi"); }} label="Fotoğraf çek ve paylaş"><Camera /></CtrlBtn>
        <CtrlBtn onClick={() => setAddOpen(true)} label="Katılımcı ekle"><UserPlus /></CtrlBtn>
        <CtrlBtn danger onClick={endCall} label="Görüşmeyi kapat"><PhoneOff /></CtrlBtn>
      </div>

      <BottomSheet open={ledOpen} onClose={() => setLedOpen(false)} title="Modem Işık Rehberi">
        <div className="space-y-3">
          {LED_GUIDE.map((l) => {
            const live = l.key === "fiber" ? (stage < idx.ponDone ? "Kırmızı (LOS)" : "Yeşil sabit") : l.key === "internet" ? (stage < idx.ponDone || stage === idx.restarting ? "Kapalı" : "Yeşil sabit") : l.key === "wifi" ? "Yeşil yanıp sönüyor" : "Yeşil sabit";
            const bad = live.startsWith("Kırmızı") || live === "Kapalı";
            return (
              <div key={l.key} className="rounded-2xl bg-card p-4 shadow-card">
                <div className="flex items-center gap-2">
                  <span className={cn("h-3 w-3 rounded-full", bad ? "bg-destructive" : "bg-success")} />
                  <p className="flex-1 font-semibold text-primary">{l.name}</p>
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", bad ? "bg-destructive-soft text-destructive" : "bg-success-soft text-success")}>Şu an: {live}</span>
                </div>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {l.states.map(([k, v]) => (
                    <li key={k}>
                      <b className="text-foreground">{k}:</b> {v}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </BottomSheet>

      <BottomSheet open={addOpen} onClose={() => setAddOpen(false)} title="Katılımcı ekle">
        <div className="space-y-2">
          {managed.map((m) => (
            <button
              key={m.id}
              disabled={invitees.includes(m.name)}
              onClick={() => {
                setInvitees([...invitees, m.name]);
                setAddOpen(false);
                toast.success(`${m.honorific} davet edildi`);
              }}
              className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-border bg-card px-3 text-left text-foreground disabled:opacity-50"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-deep text-sm font-semibold text-primary-foreground">{m.initials}</span>
              <span className="flex-1 text-sm font-semibold">{m.name}</span>
              <span className="text-xs text-muted-foreground">{invitees.includes(m.name) ? "Görüşmede" : "Davet et"}</span>
            </button>
          ))}
          <button onClick={() => { toast.success("Davet linki SMS ile gönderildi"); setAddOpen(false); }} className="min-h-12 w-full rounded-2xl border border-dashed border-primary/30 text-sm font-semibold text-primary">
            Link / SMS ile davet et
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
