import { useNavigate } from "@tanstack/react-router";
import { Camera, CameraOff, Check, Mic, MicOff, PhoneOff, RefreshCcw, Signal, Volume2, VolumeX, Wifi, Cable, Radio, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import modemBackImg from "@/assets/modem-back.jpg";
import { USER, VIDEO_TOPICS } from "@/data/mock";
import { useAppStore } from "@/features/core/appStore";
import { useFamilyStore } from "@/features/family/store";
import { useVideoStore } from "../store";
import { useCamera } from "../useCamera";
import { fmtDuration, uid } from "@/lib/format";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { GigaAvatar } from "@/features/giga/GigaAvatar";

type Scenario = "lights" | "cable" | "regional" | "wifi" | "place";
type Choice = { label: string; value: string };
const scenarioFor = (topic: string | null): Scenario => topic === "cable" ? "cable" : topic === "wifi" ? "wifi" : topic === "other" ? "regional" : "lights";
const titles: Record<Scenario, string> = { lights: "Modem ışığı", cable: "Kablo bağlantısı", regional: "Bölgesel arıza", wifi: "Wi-Fi bağlantısı", place: "Modem konumu" };
type VisionId = "lights" | "cable" | "wifi" | "place" | "devices";
const VISION: { id: VisionId; label: string; ok: string; pos: string }[] = [
  { id: "lights", label: "Modem ışıkları", ok: "Güç ve internet ışıkları yeşil", pos: "left-[18%] top-[30%]" },
  { id: "cable", label: "Kablo bağlantısı", ok: "Fiber ve güç kablosu yerinde", pos: "left-[55%] top-[42%]" },
  { id: "wifi", label: "Wi-Fi sinyali", ok: "Wi-Fi yayını açık, sinyal iyi", pos: "left-[30%] top-[18%]" },
  { id: "place", label: "Modem konumu", ok: "Açık ve yüksek bir yerde", pos: "left-[8%] top-[52%]" },
  { id: "devices", label: "Çevredeki cihazlar", ok: "Parazit yapan cihaz görünmüyor", pos: "left-[60%] top-[24%]" },
];
const ISSUES: Record<Scenario, Partial<Record<VisionId, string>>> = {
  lights: { lights: "LOS ışığı kırmızı yanıyor" },
  cable: { cable: "Fiber kablo yuvasına tam oturmamış" },
  wifi: { wifi: "Sinyal duvarlarda zayıflıyor" },
  place: { place: "Kapalı dolabın içinde, yere yakın", devices: "Yakında mikrodalga fırın ve telsiz telefon" },
  regional: {},
};
const prompts: Record<Scenario, string> = {
  lights: "Görüntüde modeminin ön panelini inceledim: LOS ışığı kırmızı yanıyor gibi görünüyor. Sen de böyle görüyor musun?",
  cable: "Görüntüde modemin arkasındaki fiber kablonun yuvasına tam oturmadığını görüyorum. Kontrol edebilir misin?",
  regional: "Önce demo bölgesel arıza bilgisini kontrol edeyim. Bu adımda modemini sıfırlamana gerek yok.",
  wifi: "Wi-Fi sorunu hangi durumda belirginleşiyor? Modemin yanındayken ve sorun yaşadığın odadayken farkı birlikte değerlendirelim.",
  place: "Görüntüde modemin kapalı bir dolapta ve yere yakın durduğunu, yanında mikrodalga fırın ile telsiz telefon olduğunu görüyorum. Bunlar Wi-Fi sinyalini zayıflatır. Modemi açık, yüksek bir yere ve bu cihazlardan en az 1 metre uzağa alabilir misin?",
};
const options: Record<Scenario, Choice[]> = {
  lights: [{ label: "LOS kırmızı yanıyor", value: "los" }, { label: "Işıklar normal görünüyor", value: "normal" }, { label: "Emin değilim", value: "unsure" }],
  cable: [{ label: "Bir kablo gevşek", value: "loose" }, { label: "Kablolar yerinde", value: "secure" }, { label: "Kontrol edemedim", value: "unsure" }],
  regional: [{ label: "Bölgesel durumu kontrol et", value: "check" }],
  wifi: [{ label: "Modemin yanında iyi, diğer odada zayıf", value: "room" }, { label: "Her yerde zayıf", value: "everywhere" }, { label: "Wi-Fi ağına bağlanamıyorum", value: "join" }],
  place: [{ label: "Modemi taşıdım", value: "moved" }, { label: "Taşıyamıyorum", value: "still" }],
};

interface Recognition {
  lang: string; interimResults: boolean; maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null; onend: (() => void) | null; start: () => void; stop: () => void;
}
type RecognitionCtor = new () => Recognition;

export function VideoCallScreen() {
  const navigate = useNavigate();
  const topic = useVideoStore((s) => s.topic);
  const invitees = useVideoStore((s) => s.invitees);
  const setLastCall = useVideoStore((s) => s.setLastCall);
  const managed = useFamilyStore((s) => s.managed);
  const actingAs = useFamilyStore((s) => s.actingAs);
  const addRecord = useAppStore((s) => s.addRecord);
  const addHistory = useAppStore((s) => s.addHistory);
  const cam = useCamera(false);
  const [scenario, setScenario] = useState<Scenario>(scenarioFor(topic));
  const [answered, setAnswered] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sec, setSec] = useState(0);
  const [videoOn, setVideoOn] = useState(true);
  const [listening, setListening] = useState(false);
  const [speechOn, setSpeechOn] = useState(true);
  const [turn, setTurn] = useState(`Merhaba! Ben GIGA. Modemini hesap bilginden tanıdım. ${prompts[scenarioFor(topic)]}`);
  const [history, setHistory] = useState<string[]>([]);
  const [finding, setFinding] = useState("");
  const [actions, setActions] = useState<string[]>([]);
  const [test, setTest] = useState("");
  const [nextChoices, setNextChoices] = useState<Choice[] | null>(options[scenarioFor(topic)]);
  const [text, setText] = useState("");
  const [facing, setFacing] = useState<"user" | "environment">("environment");
  const [guestJoined, setGuestJoined] = useState(false);
  const [scanned, setScanned] = useState(0);
  const issues = ISSUES[scenario];
  useEffect(() => {
    setScanned(0);
    const t = window.setInterval(() => setScanned((n) => { if (n >= VISION.length) { window.clearInterval(t); return n; } return n + 1; }), 650);
    return () => window.clearInterval(t);
  }, [scenario]);
  const startedAt = useRef(Date.now());
  const recognition = useRef<Recognition | null>(null);
  const guest = invitees[0] ?? null;
  const guestName = guest ? managed.find((m) => m.name === guest)?.honorific ?? guest : "";
  const topicLabel = VIDEO_TOPICS.find((t) => t.id === topic)?.label ?? "İnternet bağlantısı";

  useEffect(() => {
    void cam.start("environment");
    const timer = window.setInterval(() => setSec((v) => v + 1), 1000);
    return () => { window.clearInterval(timer); recognition.current?.stop(); cam.stop(); window.speechSynthesis?.cancel(); };
    // start the rear camera once at call entry
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (guest && !guestJoined) {
      const timer = window.setTimeout(() => { setGuestJoined(true); toast(`${guestName} görüşmeye katıldı (demo katılımcı)`); }, 1800);
      return () => window.clearTimeout(timer);
    }
    return;
  }, [guest, guestJoined, guestName]);

  const speak = useCallback((message: string) => {
    if (!speechOn || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = "tr-TR";
    window.speechSynthesis.speak(utterance);
  }, [speechOn]);

  const say = useCallback((message: string, steps?: string[]) => {
    setTurn(message);
    setHistory((old) => [...old, message]);
    setNextChoices(null);
    speak(message);
    if (steps) setActions((old) => [...old, ...steps]);
  }, [speak]);

  const finishDiagnosis = useCallback((resolved: boolean, result: string) => {
    setBusy(false);
    setAnswered(true);
    setFinding(result);
    const msg = resolved ? "Kontrolü tamamladık. Seçtiğin adımın ardından bağlantı testi normale döndü." : "Bu kontroller sorunu çözemedi. Yaptığımız incelemeyi ve yanıtlarını canlı teknik desteğe aktarabilirim.";
    setTest(resolved ? "Bağlantı yeniden kontrol edildi · 96 Mbps (demo)" : "Bağlantı testi · sorun sürüyor (demo)");
    say(msg, [resolved ? "Bağlantı yeniden test edildi" : "Canlı desteğe aktarım için görüşme özeti hazırlandı"]);
  }, [say]);

  const runChoice = useCallback((value: string, label: string) => {
    setHistory((old) => [...old, `Sen: ${label}`]);
    setBusy(true);
    setNextChoices(null);
    if (scenario === "lights") {
      if (value === "los") {
        setFinding("Kullanıcı LOS ışığının kırmızı olduğunu bildirdi; fiber sinyali kontrol edilmeli.");
        say("LOS kırmızıysa fiber sinyalinde sorun olabilir. Bu bilgiyi not ettim; bölgesel durumu ve hattını kontrol ediyorum.", ["LOS ışık durumu kullanıcı tarafından bildirildi"]);
        window.setTimeout(() => { setBusy(false); say("Demo hat kontrolünde bağlantı sinyali düşük görünüyor. Fiber kablonun modem ve duvar prizindeki bağlantısını nazikçe kontrol edebilir misin?", ["Demo hat kontrolü tamamlandı"]); setNextChoices([{ label: "Kabloyu yerine oturttum", value: "fixed" }, { label: "Bağlantı yerinde, sorun sürüyor", value: "still" }]); }, 1100);
      } else if (value === "fixed") finishDiagnosis(true, "Fiber kablo bağlantısı yenilendi");
      else if (value === "still") finishDiagnosis(false, "LOS ışığı / hat sinyali sorunu devam ediyor");
      else { setFinding("Modem ışık durumu netleşmedi."); setBusy(false); say("Sorun değil. Modemin üzerindeki bağlantıları birlikte kontrol edebiliriz. İnternet ışığının durumunu gördüğünde söyle."); setNextChoices([{ label: "LOS kırmızı", value: "los" }, { label: "Işıklar normal", value: "normal" }, { label: "Hâlâ emin değilim", value: "still" }]); }
    } else if (scenario === "cable") {
      if (value === "loose") { setFinding("Kullanıcı bir kablonun gevşek olduğunu belirtti."); say("Gevşek kablo bağlantısı interneti kesebilir. Ucu zorlamadan yerine oturt; hazır olduğunda bağlantıyı tekrar kontrol edeceğim."); setNextChoices([{ label: "Kabloyu yerine oturttum", value: "fixed" }, { label: "Sorun devam ediyor", value: "still" }]); setBusy(false); }
      else if (value === "fixed") finishDiagnosis(true, "Kablo bağlantısı yeniden oturtuldu");
      else finishDiagnosis(false, value === "still" ? "Kablo bağlantısı kontrol edildi ancak sorun sürüyor" : "Kablo bağlantısı doğrulanamadı");
    } else if (scenario === "regional") {
      setFinding("Bölgede bilinen kesinti var (demo).");
      say("Bölgen için bilinen bir kesinti görünüyor (demo). Tahmini çözüm süresi 2 saat. Modemini sıfırlamana gerek yok; gelişme olduğunda uygulamadan takip edebilirsin.", ["Bölgesel arıza kontrol edildi"]);
      window.setTimeout(() => finishDiagnosis(false, "Bölgesel kesinti · tahmini 2 saat (demo)"), 1600);
    } else if (scenario === "place") {
      if (value === "moved") finishDiagnosis(true, "Modem açık ve yüksek bir yere, parazit yapan cihazlardan uzağa taşındı");
      else finishDiagnosis(false, "Modem konumu değiştirilemedi; parazit kaynakları yakında");
    } else {
      if (value === "room") { setFinding("Wi-Fi sinyali modemden uzak odada zayıflıyor olabilir."); say("Bu, ev içi Wi-Fi sinyalinden kaynaklanıyor olabilir. Modemi açık, merkezi ve yerden yüksek bir noktaya alıp kalın duvarlardan uzaklaştır. Sonra sorun yaşadığın odada tekrar deneyelim."); setNextChoices([{ label: "Modemin yerini değiştirdim", value: "moved" }, { label: "Sorun hâlâ sürüyor", value: "still" }]); setBusy(false); }
      else if (value === "moved") finishDiagnosis(true, "Modem konumu düzenlendi; sorun yaşanan odada bağlantı yeniden kontrol edildi");
      else finishDiagnosis(false, value === "everywhere" ? "Wi-Fi zayıflığı tüm alanlarda sürüyor" : "Cihaz Wi-Fi ağına bağlanamıyor");
    }
  }, [scenario, say, finishDiagnosis]);

  const startVoice = () => {
    if (listening) { recognition.current?.stop(); setListening(false); return; }
    const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
    const Speech = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Speech) { toast("Sesli yazıya dönüştürme bu tarayıcıda kullanılamıyor", { description: "Mesajını aşağıdaki alana yazabilirsin." }); return; }
    try {
      const r = new Speech(); r.lang = "tr-TR"; r.interimResults = false; r.maxAlternatives = 1;
      r.onresult = (e) => { const heard = e.results[0]?.[0]?.transcript?.trim(); if (heard) { setText(heard); setHistory((old) => [...old, `Sen: ${heard}`]); say(`Seni duydum: ${heard}. Bunu not ettim; aşağıdaki seçeneklerden devam edebilirsin.`); } };
      r.onerror = () => { setListening(false); toast("Mikrofona erişilemedi", { description: "Yazılı olarak devam edebilirsin." }); };
      r.onend = () => setListening(false); recognition.current = r; setListening(true); r.start();
    } catch { setListening(false); toast("Sesli giriş başlatılamadı"); }
  };

  const submitText = () => {
    const value = text.trim(); if (!value) return;
    setText(""); setHistory((old) => [...old, `Sen: ${value}`]);
    say("Mesajını aldım. En doğru kontrolü seçebilmem için aşağıdaki seçeneklerden durumuna uygun olanı işaretleyebilirsin.");
  };

  const switchScenario = (next: Scenario) => {
    if (next === scenario) return;
    setScenario(next); setAnswered(false); setActions([]); setFinding(""); setTest(""); setHistory([]); setBusy(false);
    say(prompts[next]); setNextChoices(options[next]);
  };

  const endCall = () => {
    cam.stop(); recognition.current?.stop(); window.speechSynthesis?.cancel();
    const participants = ["GIGA AI", actingAs ? `${USER.firstName} Koyuncu (yetkili)` : `${USER.firstName} Koyuncu`, ...(guestJoined && guest ? [`${guest} (demo katılımcı)`] : [])];
    const completedSteps = actions.length ? actions : ["GIGA ile görüntülü teknik inceleme başlatıldı"];
    const recordId = addRecord({ channel: "Görüntülü", title: `GIGA görüntülü destek: ${titles[scenario]}`, summary: `${fmtDuration(sec)} görüşme · ${cam.status === "live" ? "kamera görüntüsü açık" : "örnek modem görüntüsü"} · ${answered ? "teşhis tamamlandı" : "görüşme sonlandırıldı"}`, status: "Sonuç bekleniyor", details: [`Süre: ${fmtDuration(sec)}`, `Katılımcılar: ${participants.join(", ")}`, `Görüntü: ${cam.status === "live" ? "Gerçek kamera önizlemesi; otomatik vision analizi yok" : "Demo modem görseli"}`, `Teşhis: ${finding || "Tamamlanmadı"}`, ...completedSteps.map((x) => `✓ ${x}`), ...(test ? [test] : [])] });
    addHistory("GIGA görüntülü destek görüşmesi", `${titles[scenario]} · ${fmtDuration(sec)}`);
    setLastCall({ id: uid(), recordId, startedAt: startedAt.current, durationSec: sec, participants, steps: completedSteps, topic: titles[scenario], resolved: null, finding: finding || "Teşhis tamamlanmadı", actions: completedSteps, connectionTest: test || "Henüz bağlantı testi yapılmadı" });
    track("flow_completed", "video_support_call", { duration: sec, steps: completedSteps.length, scenario, resolved: answered && test.includes("96 Mbps") });
    navigate({ to: "/goruntulu-destek/sonuc" });
  };

  const choices = nextChoices ?? (answered ? [] : options[scenario]);
  const sampleMode = cam.status !== "live" || !videoOn;
  const toggleVideo = () => {
    if (cam.status !== "live") { setVideoOn(true); void cam.start(facing); return; }
    const next = !videoOn; setVideoOn(next); cam.setEnabled(next);
  };
  const flipCamera = async () => { const next = facing === "environment" ? "user" : "environment"; setFacing(next); await cam.start(next); };

  return <div className="relative flex h-full min-h-[760px] flex-col overflow-hidden bg-[#170d1b] text-white">
    <div className="absolute inset-0">
      {cam.status === "live" && videoOn ? <video ref={cam.videoRef} autoPlay playsInline muted className="h-full w-full object-cover" /> : <img src={modemBackImg} alt="Örnek modem görüntüsü · demo" className="h-full w-full object-cover opacity-80" />}
      <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/5 to-black/90" />
      {VISION.slice(0, scanned).map((v) => { const bad = issues[v.id]; return <div key={v.id} className={cn("absolute rounded-md border-2 px-1.5 py-0.5 text-[10px] font-bold backdrop-blur-sm animate-in fade-in zoom-in-95", v.pos, bad ? "border-red-400 bg-red-600/70" : "border-emerald-300 bg-emerald-600/60")}>{bad ? "⚠" : "✓"} {v.label}</div>; })}
      {scanned < VISION.length && <div className="pointer-events-none absolute inset-x-0 top-1/4 h-0.5 animate-pulse bg-fuchsia-300/80 shadow-[0_0_12px_rgba(240,171,252,.9)]" />}
    </div>
    <div className="relative z-10 flex items-center gap-2 px-4 pt-4">
      <span className="rounded-full bg-red-600/90 px-3 py-1 text-xs font-bold">● {fmtDuration(sec)}</span><span className="flex-1 text-sm font-semibold">GIGA AI · Görüntülü destek</span>
      <button onClick={endCall} aria-label="Görüşmeyi bitir" className="rounded-full bg-red-600 p-2.5"><PhoneOff className="size-5" /></button>
    </div>
    <div className="relative z-10 mx-3 mt-2 rounded-xl border border-white/20 bg-black/55 px-3 py-2 text-xs leading-snug backdrop-blur">
      <div className="mb-1 flex items-center gap-1.5 font-bold text-fuchsia-200">{scanned < VISION.length ? <><Loader2 className="size-3 animate-spin"/> GIGA görüntüyü inceliyor…</> : <><Check className="size-3"/> GIGA görüntüyü inceledi</>}</div>
      <ul className="space-y-0.5">{VISION.map((v, i) => { const bad = issues[v.id]; const done = i < scanned; return <li key={v.id} className="flex gap-1.5"><span className={cn("w-3 shrink-0", !done ? "text-white/40" : bad ? "text-red-300" : "text-emerald-300")}>{!done ? "•" : bad ? "⚠" : "✓"}</span><span className="font-semibold">{v.label}:</span><span className={cn(!done ? "text-white/50" : bad ? "text-red-200" : "text-white/80")}>{!done ? "bakılıyor" : bad ?? v.ok}</span></li>; })}</ul>
      <span className="mt-1 block text-[10px] text-white/55">{sampleMode ? "Örnek modem görüntüsü · görsel analiz simülasyondur (demo)" : "Kamera açık · görsel analiz simülasyondur (demo)"}</span>
      {cam.status === "pending" && <span className="ml-2 inline-flex items-center gap-1"><Loader2 className="size-3 animate-spin"/>Kamera açılıyor</span>}
      {(cam.status === "denied" || cam.status === "unavailable") && <span className="block mt-1">Kamera izni alınamadı. Görüşme demo görseli ve senaryo yanıtlarıyla sürüyor.</span>}
    </div>
    <div className="relative z-10 mt-auto space-y-3 px-3 pb-3">
      <div className="ml-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-white/50 bg-purple-950 shadow-lg"><GigaAvatar size={62} mood={busy ? "working" : "listening"}/><span className="absolute right-5 top-[calc(100%-108px)] rounded bg-black/60 px-1.5 py-0.5 text-[10px]">GIGA AI</span></div>
      {guestJoined && <div className="absolute right-3 top-28 flex w-24 flex-col items-center gap-1 rounded-2xl border border-fuchsia-300 bg-purple-950/90 p-2 text-center shadow-lg"><span className="flex size-10 items-center justify-center rounded-full bg-fuchsia-500 text-sm font-bold">{guest?.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span><span className="text-[10px] font-semibold leading-tight">{guestName}</span><span className="text-[9px] text-white/65">Demo katılımcı</span></div>}
      <div className="rounded-2xl border border-white/15 bg-black/70 p-3.5 backdrop-blur-md" aria-live="polite">
        <div className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-fuchsia-300"><Signal className="size-3.5"/> {busy ? "Kontrol sürüyor" : titles[scenario]}</div>
        {history.slice(-2).map((line, index) => <p key={`${line}-${index}`} className="mb-1 text-xs text-white/65">{line}</p>)}
        <p className="text-sm leading-snug">{turn}</p>
      </div>
      {answered && <div className="rounded-xl bg-white/10 px-3 py-2 text-xs"><b>Tespit:</b> {finding}<br/><b>Son bağlantı testi:</b> {test}</div>}
      {!answered && <div className="flex flex-wrap gap-2">
        {choices.map((choice) => <button key={choice.value} disabled={busy} onClick={() => runChoice(choice.value, choice.label)} className="min-h-10 rounded-full border border-fuchsia-200/60 bg-purple-950/80 px-3 text-xs font-semibold disabled:opacity-50">{busy ? <Loader2 className="inline size-3 animate-spin"/> : null} {choice.label}</button>)}
      </div>}
      <div className="flex gap-1 overflow-x-auto pb-1">{(Object.keys(titles) as Scenario[]).map((key) => <button key={key} onClick={() => switchScenario(key)} className={cn("shrink-0 rounded-full px-2.5 py-1 text-[10px]", scenario === key ? "bg-fuchsia-500 text-white" : "bg-white/15")}> {titles[key]} </button>)}</div>
      <div className="flex gap-2">
        <button onClick={startVoice} className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full", listening ? "bg-fuchsia-500" : "bg-white/15")} aria-label={listening ? "Dinlemeyi durdur" : "GIGA ile konuş"}>{listening ? <Mic className="size-5 animate-pulse"/> : <MicOff className="size-5"/>}</button>
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submitText(); }} placeholder="GIGA'ya mesaj yaz…" className="min-w-0 flex-1 rounded-full bg-white/15 px-4 text-sm outline-none placeholder:text-white/65" />
        <button onClick={submitText} className="rounded-full bg-fuchsia-500 px-4 text-xs font-bold">Gönder</button>
      </div>
      <div className="flex items-center justify-center gap-5">
        <button onClick={toggleVideo} aria-label={videoOn ? "Kamerayı kapat" : "Kamerayı aç"} className="rounded-full bg-white/15 p-3">{videoOn ? <Camera className="size-5"/> : <CameraOff className="size-5"/>}</button>
        <button onClick={flipCamera} aria-label="Kamerayı çevir" className="rounded-full bg-white/15 p-3"><RefreshCcw className="size-5"/></button>
        <button onClick={() => { const value = !speechOn; setSpeechOn(value); if (!value) window.speechSynthesis?.cancel(); }} aria-label={speechOn ? "Sesli yanıtı kapat" : "Sesli yanıtı aç"} className="rounded-full bg-white/15 p-3">{speechOn ? <Volume2 className="size-5"/> : <VolumeX className="size-5"/>}</button>
        <button onClick={endCall} className="rounded-full bg-red-600 p-3"><PhoneOff className="size-5"/></button>
      </div>
      {answered && <button onClick={endCall} className="w-full rounded-full bg-fuchsia-500 py-3 text-sm font-bold">Görüşme özetini gör</button>}
      <p className="text-center text-[10px] text-white/70">Demo: GIGA'nın görüntü tespitleri senaryoya göre simüle edilir.</p>
    </div>
  </div>;
}

