import { Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowDown, CheckCircle2, Clock3, Home, Info, Loader2, MapPinned, Router, SearchCheck, Sparkles, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/headers";
import { Banner, ToggleRow } from "@/components/tn/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CURRENT_ADDRESS, DEMO_MOVE_DATE, DEMO_NEW_ADDRESS, SUBSCRIPTION, type DemoAddress } from "@/data/mock";
import { useScenarioStore } from "@/features/scenario/store";
import { previewAddress, startRelocation, useWorkflowStore } from "@/features/workflow";
import { cn } from "@/lib/utils";
import { isActive, type EligibilityResult } from "../rules";
import { DemoNote } from "../components/ui";

type Stage = "intent" | "address" | "checking" | "result" | "started";
type Mode = "move" | "check";
type Fields = { city: string; district: string; neighborhood: string; street: string; building: string; moveDate: string };

const EMPTY: Fields = { city: "İstanbul", district: "", neighborhood: "", street: "", building: "", moveDate: "" };
const today = () => new Date().toISOString().slice(0, 10);

/** Form validation. Returns a message per invalid field. */
export function validateAddress(f: Fields, needDate: boolean): Partial<Record<keyof Fields, string>> {
  const e: Partial<Record<keyof Fields, string>> = {};
  if (f.city.trim().length < 2) e.city = "İl girin";
  if (f.district.trim().length < 2) e.district = "İlçe girin";
  if (f.neighborhood.trim().length < 3) e.neighborhood = "Mahalle girin";
  if (f.street.trim().length < 3) e.street = "Cadde veya sokak girin";
  if (!/\d/.test(f.building)) e.building = "Bina ve daire numarası girin (ör. No:48 D:3)";
  if (needDate && !f.moveDate) e.moveDate = "Taşınma tarihini seçin";
  else if (needDate && f.moveDate < today()) e.moveDate = "Geçmiş bir tarih seçilemez";
  return e;
}

const toAddress = (f: Fields): DemoAddress => ({
  id: "ADR-NEW",
  line: `${f.neighborhood.trim()} ${f.street.trim()} ${f.building.trim()}`,
  district: f.district.trim(),
  city: f.city.trim(),
  neighborhood: f.neighborhood.trim(),
  street: f.street.trim(),
  building: f.building.trim(),
});

const CHECK_LINES = ["Adres bilgileri doğrulanıyor", "Bölgedeki altyapı sorgulanıyor", "Binadaki bağlantı uygunluğu kontrol ediliyor"];

function NextSteps({ result }: { result: EligibilityResult }) {
  const steps =
    result === "no_port"
      ? ["Altyapı ekibine bağlantı talebi açarız", "Hazır olana kadar geçici internet seçeneğini sunarız", "Bağlantı hazır olunca uygun kurulum ekibini buluruz", "Eski hattınızı yeni bağlantı doğrulanınca kapatırız"]
      : result === "no_response"
        ? ["Altyapı sistemini sizin için tekrar sorgularız", "Sonuç gelince size haber veririz", "Uygunsa kurulum randevusu için uygun ekibi buluruz"]
        : ["Taşınma talebinizi oluştururuz", ...(result === "eligible_external" ? ["Altyapı sağlayıcısından bağlantı isteriz"] : []), "Size uygun zamanı seçersiniz, uygun ekibi biz buluruz", "Kurulumdan sonra bağlantınızı doğrularız", "Eski hattınızı yeni bağlantı doğrulanınca kapatırız"];
  return (
    <ol className="space-y-2">
      {steps.map((s, i) => (
        <li key={s} className="flex gap-2.5 text-sm">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-icon-box text-[11px] font-bold text-primary">{i + 1}</span>
          <span className="text-foreground">{s}</span>
        </li>
      ))}
    </ol>
  );
}

export function RelocationStartScreen() {
  const navigate = useNavigate();
  const draft = useScenarioStore((s) => s.draft);
  const existing = useWorkflowStore((s) => s.workflows.find((w) => w.type === "relocation" && isActive(w)));
  const ownDevice = useWorkflowStore((s) => s.config.hybridDevice);
  const [stage, setStage] = useState<Stage>("intent");
  const [mode, setMode] = useState<Mode>("move");
  const [f, setF] = useState<Fields>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({});
  const [checkLine, setCheckLine] = useState(0);
  const [result, setResult] = useState<{ result: EligibilityResult; reason: string } | null>(null);
  const [wantsTemp, setWantsTemp] = useState(true);
  const [showTemp, setShowTemp] = useState(false);
  const [startedId, setStartedId] = useState<string | null>(null);

  const fill = () =>
    setF({ city: DEMO_NEW_ADDRESS.city, district: DEMO_NEW_ADDRESS.district, neighborhood: DEMO_NEW_ADDRESS.neighborhood ?? "", street: DEMO_NEW_ADDRESS.street ?? "", building: DEMO_NEW_ADDRESS.building ?? "", moveDate: DEMO_MOVE_DATE < today() ? today() : DEMO_MOVE_DATE });

  useEffect(() => {
    if (!draft) return;
    setMode("move");
    fill();
    setStage("address");
  }, [draft]);

  // Animated, simulated address check.
  useEffect(() => {
    if (stage !== "checking") return;
    setCheckLine(0);
    const timers = CHECK_LINES.map((_, i) => window.setTimeout(() => setCheckLine(i + 1), 700 * (i + 1)));
    const done = window.setTimeout(() => {
      setResult(previewAddress(toAddress(f)));
      setStage("result");
    }, 700 * CHECK_LINES.length + 500);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(done);
    };
  }, [stage, f]);

  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setF((p) => ({ ...p, [k]: e.target.value }));
    setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const submitAddress = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateAddress(f, mode === "move");
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setStage("checking");
  };

  const start = () => {
    const errs = validateAddress(f, true);
    if (errs.moveDate) {
      setErrors(errs);
      return;
    }
    const id = startRelocation({ address: toAddress(f), moveDate: f.moveDate, wantsTemp: result?.result === "no_port" ? wantsTemp : true });
    setStartedId(id);
    setStage("started");
  };

  const Field = ({ k, label, placeholder, type = "text", className }: { k: keyof Fields; label: string; placeholder?: string; type?: string; className?: string }) => (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={`ra-${k}`}>{label}</Label>
      <Input id={`ra-${k}`} type={type} value={f[k]} onChange={set(k)} placeholder={placeholder} min={type === "date" ? today() : undefined} aria-invalid={!!errors[k]} className={cn(errors[k] && "border-destructive")} />
      {errors[k] && <p className="text-xs font-medium text-destructive">{errors[k]}</p>}
    </div>
  );

  const ok = result && (result.result === "eligible" || result.result === "eligible_external");

  return (
    <div>
      <PageHeader title="Taşınma ve Nakil" />
      <div className="space-y-4 px-4 pb-4">
        {existing && stage !== "started" && (
          <Banner tone="info" title="Devam eden bir taşınma işleminiz var" action={<Link to="/surec/$id" params={{ id: existing.id }} className="font-semibold text-magenta">Detayları Gör →</Link>}>
            Aynı talep için yeni kayıt açmıyoruz; mevcut işleminizi takip ediyoruz.
          </Banner>
        )}

        {stage === "intent" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className="rounded-card bg-plum p-5 text-primary-foreground shadow-float">
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary-foreground/70">Otonom taşınma</p>
              <h2 className="mt-1 text-xl font-semibold leading-snug">Yeni bir adrese mi taşınıyorsunuz?</h2>
              <p className="mt-1 text-sm text-primary-foreground/80">Adres kontrolünü, kurulum ekibini ve eski hattınızın kapatılmasını sizin için yönetelim.</p>
            </div>
            <button type="button" onClick={() => { setMode("move"); setStage("address"); }} disabled={!!existing} className="flex w-full items-center gap-3 rounded-card bg-card p-5 text-left shadow-card disabled:opacity-50">
              <MapPinned className="size-6 text-magenta" />
              <span className="flex-1 text-lg font-semibold text-primary">Evet, taşınacağım</span>
            </button>
            <button type="button" onClick={() => { setMode("check"); setStage("address"); }} className="flex w-full items-center gap-3 rounded-card bg-card p-5 text-left shadow-card">
              <SearchCheck className="size-6 text-primary" />
              <span className="flex-1">
                <span className="block font-semibold text-primary">Sadece yeni adresin internet durumunu öğrenmek istiyorum</span>
                <span className="block text-xs text-muted-foreground">Hiçbir işlem başlatılmaz</span>
              </span>
            </button>
          </motion.div>
        )}

        {stage === "address" && (
          <form noValidate onSubmit={submitAddress} className="space-y-4 rounded-card bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 font-semibold text-primary">
                <MapPinned className="size-5" /> Yeni adresiniz
              </p>
              <button type="button" onClick={fill} className="flex items-center gap-1 text-xs font-semibold text-magenta">
                <Sparkles className="size-3.5" /> Örnek adres
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {Field({ k: "city", label: "İl" })}
              {Field({ k: "district", label: "İlçe", placeholder: "Kadıköy" })}
            </div>
            {Field({ k: "neighborhood", label: "Mahalle", placeholder: "Caferağa Mah." })}
            {Field({ k: "street", label: "Cadde / Sokak", placeholder: "Moda Cd." })}
            {Field({ k: "building", label: "Bina ve daire", placeholder: "No:48 D:3" })}
            {mode === "move" && Field({ k: "moveDate", label: "Taşınma tarihi", type: "date" })}
            <p className="flex gap-2 text-xs text-muted-foreground">
              <Info className="size-4 shrink-0 text-magenta" /> Yalnızca adres bilgisi istiyoruz; kimlik veya ödeme bilgisi gerekmez.
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="lg" className="flex-1" onClick={() => setStage("intent")}>
                Geri
              </Button>
              <Button type="submit" size="lg" className="flex-[2]">
                Adresi Kontrol Et
              </Button>
            </div>
          </form>
        )}

        {stage === "checking" && (
          <div className="rounded-card bg-card p-6 text-center shadow-card" role="status" aria-live="polite">
            <Loader2 className="mx-auto size-10 animate-spin text-magenta" />
            <p className="mt-3 text-lg font-semibold text-primary">Yeni adresinizi kontrol ediyoruz...</p>
            <ul className="mt-4 space-y-2 text-left text-sm">
              {CHECK_LINES.map((l, i) => (
                <li key={l} className="flex items-center gap-2">
                  {i < checkLine ? <CheckCircle2 className="size-4 text-success" /> : <Loader2 className={cn("size-4 text-muted-foreground", i === checkLine && "animate-spin")} />}
                  <span className={i < checkLine ? "text-foreground" : "text-muted-foreground"}>{l}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {stage === "result" && result && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className={cn("rounded-card p-5 shadow-card", ok ? "bg-success-soft" : "bg-card")}>
              <p className="flex items-start gap-2 text-lg font-semibold leading-snug text-primary">
                {ok ? <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-success" /> : result.result === "no_port" ? <Clock3 className="mt-0.5 size-6 shrink-0 text-warning" /> : <TriangleAlert className="mt-0.5 size-6 shrink-0 text-warning" />}
                {ok
                  ? "Harika! Yeni adresinizde TürkNet hizmeti sunulabiliyor."
                  : result.result === "no_port"
                    ? "Yeni adresinizde bağlantı için biraz beklememiz gerekebilir."
                    : "Altyapı sisteminden şu an yanıt alamadık."}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {ok
                  ? result.result === "eligible_external"
                    ? "Bağlantı için altyapı sağlayıcısından bağlantı noktası isteyeceğiz; bu süreci sizin için takip ederiz."
                    : "Bağlantınızı yeni adrese taşıyabiliriz."
                  : result.result === "no_port"
                    ? "Binadaki bağlantı noktaları şu an dolu. Bu süreçte internetsiz kalmanızı istemiyoruz."
                    : "Sonucu tahmin etmiyoruz. Süreci başlatırsanız sizin için tekrar kontrol edip haber vereceğiz."}
              </p>
            </div>

            {result.result === "no_port" && (
              <div className="rounded-card border-gradient p-5 shadow-card">
                <p className="flex items-center gap-2 font-semibold text-primary">
                  <Router className="size-5 text-magenta" /> Yeni adresinizde bağlantınız hazır olana kadar internetsiz kalmanızı istemiyoruz.
                </p>
                <button type="button" onClick={() => setShowTemp((v) => !v)} className="mt-3 text-sm font-semibold text-magenta" aria-expanded={showTemp}>
                  {showTemp ? "Gizle" : "Geçici internet çözümünü incele"}
                </button>
                {showTemp && (
                  <div className="mt-3 space-y-2 rounded-2xl bg-muted p-3 text-sm">
                    <p className="font-semibold text-foreground">{ownDevice ? "Evinizde uyumlu bir Hibrit Box var" : "Size uygun bir cihaz gönderebiliriz"}</p>
                    <p className="text-muted-foreground">
                      {ownDevice ? "Mevcut cihazınızı yeni adreste geçici internet için kullanabilirsiniz; cihaz gönderimi gerekmez." : "SIM kartlı bir cihazı adresinize gönderir, teslimatı sizin için takip ederiz."} Uygunluk ve koşullar süreç içinde size gösterilir; onayınız olmadan hiçbir şey başlatılmaz.
                    </p>
                  </div>
                )}
                <div className="mt-3">
                  <ToggleRow id="ra-temp" title="Geçici internet seçeneğini bana sun" desc="Süreç içinde koşulları görüp onaylarsınız" checked={wantsTemp} onChange={setWantsTemp} />
                </div>
              </div>
            )}

            <div className="rounded-card bg-card p-5 shadow-card">
              <p className="mb-3 text-sm font-semibold text-primary">Özet</p>
              <div className="flex gap-3">
                <Home className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                <div className="text-sm">
                  <p className="text-[11px] font-semibold uppercase text-muted-foreground">Mevcut adres</p>
                  <p className="font-semibold text-foreground">
                    {CURRENT_ADDRESS.line}, {CURRENT_ADDRESS.district}
                  </p>
                </div>
              </div>
              <ArrowDown className="my-1 ml-0.5 size-4 text-muted-foreground" />
              <div className="flex gap-3">
                <MapPinned className="mt-0.5 size-5 shrink-0 text-magenta" />
                <div className="text-sm">
                  <p className="text-[11px] font-semibold uppercase text-muted-foreground">Yeni adres</p>
                  <p className="font-semibold text-foreground">
                    {toAddress(f).line}, {f.district}/{f.city}
                  </p>
                  <p className={cn("mt-0.5 text-xs font-semibold", ok ? "text-success" : "text-warning")}>{ok ? "Hizmet verilebilir" : result.result === "no_port" ? "Bağlantı noktası bekleniyor" : "Sonuç bekleniyor"}</p>
                </div>
              </div>
              <p className="mb-2 mt-4 text-xs font-semibold text-foreground">Bundan sonra ne olacak?</p>
              <NextSteps result={result.result} />
              <p className="mt-3 text-xs text-muted-foreground">
                {SUBSCRIPTION.packageName} paketiniz ve taahhüdünüz aynen devam eder. Eski hattınız, yeni adreste bağlantınız doğrulanmadan kapatılmaz.
              </p>
            </div>

            {mode === "check" && <div className="rounded-card bg-card p-5 shadow-card">{Field({ k: "moveDate", label: "Taşınmaya karar verirseniz: taşınma tarihi", type: "date" })}</div>}

            <Button size="xl" className="w-full" onClick={start} disabled={!!existing}>
              Taşınma sürecimi başlat
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStage("address")}>
                Adresi Düzenle
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => navigate({ to: "/" })}>
                Ana Sayfaya Dön
              </Button>
            </div>
          </motion.div>
        )}

        {stage === "started" && startedId && (
          <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-card bg-card p-6 text-center shadow-card">
            <CheckCircle2 className="mx-auto size-14 text-success" />
            <p className="mt-3 text-xl font-semibold text-primary">Taşınma işleminizi sizin için başlattık.</p>
            <p className="mt-1 text-sm text-muted-foreground">Gelişmeleri buradan ve İşlemlerim'den takip edebilirsiniz. Kararınız gerektiğinde size haber vereceğiz.</p>
            <Button size="lg" className="mt-5 w-full" onClick={() => navigate({ to: "/surec/$id", params: { id: startedId } })}>
              İşlemimi Takip Et
            </Button>
            <Button variant="outline" size="lg" className="mt-2 w-full" onClick={() => navigate({ to: "/" })}>
              Ana Sayfaya Dön
            </Button>
          </motion.div>
        )}

        <DemoNote>Adres kontrolü ve ekip eşleştirmesi bu prototipte simülasyondur; gerçek altyapı veya saha sistemine bağlanılmaz.</DemoNote>
      </div>
    </div>
  );
}
