import { Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowDown, CheckCircle2, Home, Info, Loader2, MapPinned, Search, Sparkles, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/headers";
import { Banner, PlainNote } from "@/components/tn/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CURRENT_ADDRESS, DEMO_MOVE_DATE, DEMO_NEW_ADDRESS_PARTS, RELOCATION_GUIDANCE, SUBSCRIPTION } from "@/data/mock";
import { useScenarioStore } from "@/features/scenario/store";
import { startRelocation, useWorkflowStore } from "@/features/workflow";
import { useFlow } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { MockInfraAPI } from "../mockServices";
import { isActive, type EligibilityResult } from "../rules";
import { DemoNote } from "../components/ui";

type Stage = "intent" | "address" | "checking" | "result" | "summary" | "started";
interface Addr {
  city: string;
  district: string;
  neighborhood: string;
  street: string;
  building: string;
}
const EMPTY: Addr = { city: "İstanbul", district: "", neighborhood: "", street: "", building: "" };
const FIELDS: { key: keyof Addr; label: string; placeholder: string }[] = [
  { key: "city", label: "İl", placeholder: "İstanbul" },
  { key: "district", label: "İlçe", placeholder: "Kadıköy" },
  { key: "neighborhood", label: "Mahalle", placeholder: "Caferağa Mah." },
  { key: "street", label: "Cadde / sokak", placeholder: "Moda Cd." },
  { key: "building", label: "Bina no / daire", placeholder: "No:48 D:3" },
];

const RESULT_TEXT: Record<EligibilityResult, { title: string; giga: string; tone: "ok" | "wait" | "unknown" }> = {
  eligible: { title: "Harika! Yeni adresinde TürkNet hizmeti sunulabiliyor.", giga: "Yeni adresinde fiber altyapı ve boş bağlantı noktası var. Süreci başlatırsan randevuya kadar her adımı İşlemlerim'den görebilirsin.", tone: "ok" },
  eligible_external: { title: "Harika! Yeni adresinde TürkNet hizmeti sunulabiliyor.", giga: "Bu adreste bağlantı için altyapı sağlayıcısından bir izin istememiz gerekiyor. Bu izni biz takip ederiz; senin bir şey yapman gerekmiyor.", tone: "ok" },
  no_port: { title: "Yeni adresinde şu an boş bağlantı noktası yok.", giga: "Altyapı ekibine port takibi açıyoruz. Uygunluk oluştuğunda taşınma ve kurulum adımlarını sürdüreceğiz.", tone: "wait" },
  no_response: { title: "Şu an yeni adresin için yanıt alamadık.", giga: "Sonucu tahmin etmek istemiyoruz. Süreci başlatırsan kontrolü tekrar dener ve sonucu sana bildiririz.", tone: "unknown" },
};

/** Taşınma ve Nakil: intent → address → availability check → summary → start. No long support form. */
export function RelocationStartScreen() {
  useFlow("relocation_wizard");
  const navigate = useNavigate();
  const draft = useScenarioStore((s) => s.draft);
  const existing = useWorkflowStore((s) => s.workflows.find((w) => w.type === "relocation" && isActive(w)));
  const [stage, setStage] = useState<Stage>("intent");
  const [mode, setMode] = useState<"move" | "check">("move");
  const [addr, setAddr] = useState<Addr>(EMPTY);
  const [date, setDate] = useState("");
  const [errors, setErrors] = useState<Partial<Record<keyof Addr | "date", string>>>({});
  const [result, setResult] = useState<EligibilityResult | null>(null);
  const [startedId, setStartedId] = useState<string | null>(null);

  const fillDemo = () => {
    setAddr({ ...DEMO_NEW_ADDRESS_PARTS });
    setDate(DEMO_MOVE_DATE);
  };
  useEffect(() => {
    if (draft) {
      fillDemo();
      setStage("address");
    }
  }, [draft]);

  const line = `${addr.neighborhood.trim()} ${addr.street.trim()} ${addr.building.trim()}`.replace(/\s+/g, " ").trim();
  const newAddressText = `${line}, ${addr.district.trim()}/${addr.city.trim()}`;

  const validate = () => {
    const e: typeof errors = {};
    FIELDS.forEach((f) => {
      if (addr[f.key].trim().length < 2) e[f.key] = `${f.label} gerekli`;
    });
    if (mode === "move") {
      if (!date) e.date = "Taşınma tarihini seç";
      else if (date < new Date().toISOString().slice(0, 10)) e.date = "Geçmiş bir tarih seçilemez";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const runCheck = () => {
    if (!validate()) return;
    setStage("checking");
    setTimeout(() => {
      setResult(MockInfraAPI.checkAddress({ id: "ADR-NEW", line, district: addr.district.trim(), city: addr.city.trim() }).result);
      setStage("result");
    }, 1900);
  };

  const start = () => {
    if (mode === "move" && !validate()) return;
    useWorkflowStore.setState({ autoFollowUp: true });
    const id = startRelocation({ address: { id: "ADR-NEW", line, district: addr.district.trim(), city: addr.city.trim() }, moveDate: date, wantsTemp: false, ...(result ? { eligibility: result } : {}) });
    setStartedId(id);
    setStage("started");
  };

  const r = result ? RESULT_TEXT[result] : null;

  return (
    <div>
      <PageHeader title="Taşınma ve Nakil" />
      <div className="space-y-4 px-4">
        {existing && stage !== "started" && (
          <Banner tone="info" title="Devam eden bir taşınma işleminiz var" action={<Link to="/surec/$id" params={{ id: existing.id }} className="font-semibold text-magenta">Detayları Gör →</Link>}>
            Aynı talep için yeni kayıt açmıyoruz; mevcut işleminizi takip ediyoruz.
          </Banner>
        )}

        {stage === "intent" && (
          <>
            <div className="rounded-card border border-magenta/15 bg-magenta-soft p-5 shadow-card">
              <p className="text-xl font-semibold leading-snug text-primary">İnternetini Yeni Adresine Taşı</p>
              <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-magenta"><Info className="size-4 shrink-0" /> 2–3 adımda talebini oluşturabilirsin</p>
              <ul className="mt-4 space-y-2.5 text-sm text-primary">
                <li className="flex gap-2"><span aria-hidden>•</span><span>İnternetini kolayca yeni adresine taşı</span></li>
                <li className="flex gap-2"><span aria-hidden>•</span><span>{RELOCATION_GUIDANCE.firstMove}</span></li>
                <li className="flex gap-2"><span aria-hidden>•</span><span>{RELOCATION_GUIDANCE.repeatMove}</span></li>
              </ul>
            </div>
            <button type="button" onClick={() => { setMode("move"); setStage("address"); }} className="flex w-full items-center gap-4 rounded-card bg-card p-4 text-left shadow-card">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-icon-box text-primary"><MapPinned className="size-6" strokeWidth={1.5} /></span>
              <span className="flex-1 font-semibold text-primary">Taşınma talebi oluştur</span>
            </button>
            <button type="button" onClick={() => { setMode("check"); setStage("address"); }} className="flex w-full items-center gap-4 rounded-card bg-card p-4 text-left shadow-card">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-icon-box text-primary"><Search className="size-6" strokeWidth={1.5} /></span>
              <span className="flex-1 font-semibold text-primary">Sadece adres uygunluğunu kontrol et</span>
            </button>
          </>
        )}

        {stage === "address" && (
          <form
            noValidate
            className="space-y-4 rounded-card bg-card p-5 shadow-card"
            onSubmit={(e) => {
              e.preventDefault();
              runCheck();
            }}
          >
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 font-semibold text-primary">
                <MapPinned className="size-5" /> Yeni adresin
              </p>
              <button type="button" onClick={fillDemo} className="flex items-center gap-1 text-xs font-semibold text-magenta">
                <Sparkles className="size-3.5" /> Örnek adres
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {FIELDS.map((f) => (
                <div key={f.key} className={cn("space-y-1.5", (f.key === "street" || f.key === "neighborhood") && "col-span-2")}>
                  <Label htmlFor={`ra-${f.key}`}>{f.label}</Label>
                  <Input id={`ra-${f.key}`} value={addr[f.key]} aria-invalid={!!errors[f.key]} onChange={(e) => setAddr((a) => ({ ...a, [f.key]: e.target.value }))} placeholder={f.placeholder} />
                  {errors[f.key] && <p className="text-xs font-semibold text-destructive">{errors[f.key]}</p>}
                </div>
              ))}
            </div>
            {mode === "move" && (
              <div className="space-y-1.5">
                <Label htmlFor="ra-date">Taşınma tarihi</Label>
                <Input id="ra-date" type="date" value={date} aria-invalid={!!errors.date} onChange={(e) => setDate(e.target.value)} />
                {errors.date && <p className="text-xs font-semibold text-destructive">{errors.date}</p>}
              </div>
            )}
            <p className="flex gap-2 text-xs text-muted-foreground">
              <Info className="size-4 shrink-0 text-magenta" /> Yalnızca adresini soruyoruz. Abonelik ve ödeme bilgilerin sistemde zaten var.
            </p>
            <Button type="submit" size="xl" className="w-full">
              Adresimi kontrol et
            </Button>
          </form>
        )}

        {stage === "checking" && (
          <div className="rounded-card bg-card p-6 text-center shadow-card" aria-live="polite">
            <Loader2 className="mx-auto size-12 animate-spin text-magenta" strokeWidth={1.5} aria-hidden />
            <p className="mt-3 text-lg font-semibold text-primary">Yeni adresini kontrol ediyoruz...</p>
            <ul className="mx-auto mt-3 max-w-[240px] space-y-1.5 text-left text-sm text-muted-foreground">
              {["Adres bilgisi eşleştiriliyor", "Fiber altyapı sorgulanıyor", "Bağlantı noktası kontrol ediliyor"].map((t, i) => (
                <motion.li key={t} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.5 }} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-magenta" /> {t}
                </motion.li>
              ))}
            </ul>
          </div>
        )}

        {stage === "result" && r && result && (
          <>
            {r.tone !== "ok" && (
              <div className={cn("rounded-card p-5 shadow-card", r.tone === "wait" ? "bg-warning-soft" : "bg-card")}>
                <p className="flex items-start gap-2 text-lg font-semibold leading-snug text-foreground">
                  <TriangleAlert className="mt-1 size-5 shrink-0 text-warning" />
                  {r.title}
                </p>
              </div>
            )}
            <PlainNote>{r.giga}</PlainNote>
            {result === "no_port" && (
              <Button variant="outline" className="w-full" onClick={() => navigate({ to: "/hibrit" })}>
                NetBox’u etkinleştir
              </Button>
            )}
            {mode === "move" && (
              <>
                <section className="rounded-card bg-card p-4 shadow-card" aria-label="Taşınma bağlantı özeti">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-base font-semibold text-primary">İnternet hızın</h2>
                    <span className="text-xs text-muted-foreground">Paketin</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 rounded-2xl bg-gradient-to-r from-magenta-soft via-pink-100 to-magenta-soft p-1.5">
                    <div className="flex min-h-[104px] flex-col justify-center rounded-xl px-3 py-3">
                      <p className="text-xs font-medium text-primary/65">Mevcut hızın</p>
                      <p className="mt-1 whitespace-nowrap text-[28px] font-bold leading-none tracking-tight text-primary/70">
                        {SUBSCRIPTION.speed}<span className="ml-1 text-base font-semibold">Mbps</span>
                      </p>
                    </div>
                    <div className="flex min-h-[104px] flex-col justify-center rounded-xl border-2 border-magenta bg-white px-3 py-3 shadow-[0_4px_14px_hsl(var(--magenta)/0.16)]">
                      <p className="text-xs font-semibold text-magenta">Yeni adres hızı</p>
                      {result === "no_port" || result === "no_response" ? (
                        <p className="mt-1.5 text-sm font-semibold leading-snug text-primary">Port uygunluğu netleşince belli olacak</p>
                      ) : (
                        <p className="mt-1 whitespace-nowrap text-[28px] font-bold leading-none tracking-tight text-primary">
                          {SUBSCRIPTION.speed}<span className="ml-1 text-base font-semibold">Mbps</span>
                        </p>
                      )}
                    </div>
                  </div>
                </section>
                <section className="space-y-3 rounded-card bg-card p-5 shadow-card">
                  <div>
                    <h2 className="text-base font-semibold text-primary">Modem bilgisi</h2>
                    <p className="mt-1 text-sm leading-relaxed text-foreground">{RELOCATION_GUIDANCE.modem}</p>
                  </div>
                  <div className="border-t border-border pt-3">
                    <h2 className="text-base font-semibold text-primary">Kurulum bilgisi</h2>
                    <p className="mt-1 text-sm leading-relaxed text-foreground">{RELOCATION_GUIDANCE.setupWindow}</p>
                  </div>
                </section>
              </>
            )}
            {mode === "check" ? (
              <div className="grid gap-2">
                <Button size="xl" className="w-full" onClick={() => { setMode("move"); setStage(date ? "summary" : "address"); }} disabled={!!existing}>
                  Taşınma sürecimi başlat
                </Button>
                <Button variant="outline" className="w-full" onClick={() => navigate({ to: "/" })}>
                  Ana sayfaya dön
                </Button>
              </div>
            ) : (
              <Button size="xl" className="w-full" onClick={() => setStage("summary")} disabled={!!existing}>
                Devam et
              </Button>
            )}
          </>
        )}

        {stage === "summary" && result && (
          <>
            <div className="rounded-card bg-card p-5 shadow-card">
              <div className="flex gap-3">
                <Home className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                <div className="text-sm">
                  <p className="text-[11px] font-semibold uppercase text-muted-foreground">Mevcut adres</p>
                  <p className="font-semibold text-foreground">{CURRENT_ADDRESS.line}, {CURRENT_ADDRESS.district}</p>
                  <p className="text-xs text-muted-foreground">{SUBSCRIPTION.packageName}</p>
                </div>
              </div>
              <ArrowDown className="my-1 ml-0.5 size-4 text-muted-foreground" />
              <div className="flex gap-3">
                <MapPinned className="mt-0.5 size-5 shrink-0 text-magenta" />
                <div className="text-sm">
                  <p className="text-[11px] font-semibold uppercase text-muted-foreground">Yeni adres · {date}</p>
                  <p className="font-semibold text-foreground">{newAddressText}</p>
                  <p className={cn("mt-1 text-xs font-semibold", r?.tone === "ok" ? "text-success" : "text-orange-deep")}>{r?.tone === "ok" ? "Hizmet sunulabiliyor" : r?.tone === "wait" ? "Bağlantı için bekleme gerekebilir" : "Sonuç bekleniyor"}</p>
                </div>
              </div>
              {result === "no_port" && <PlainNote className="mt-4">Boş port için altyapı takibi başlatacağız. Port açılınca nakil ve kurulum süreci kaldığı yerden devam edecek.</PlainNote>}
              <p className="mb-1.5 mt-4 text-xs font-semibold text-foreground">Sonraki adımlar</p>
              <ol className="list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
                {result === "no_port" && <li>Port için altyapı ekibine takip talebi açar, NetBox bağlantı seçeneğini gösteririz</li>}
                {result === "no_response" && <li>Adres kontrolünü tekrar deneriz ve sonucu sana bildiririz</li>}
                <li>Taşınma talebini başlatırız</li>
                <li>Seçtiğin zaman için uygun saha ekibini buluruz</li>
                <li>Kurulum yapılır, yeni bağlantın doğrulanır</li>
                <li>Eski adresindeki hizmet ancak yeni bağlantın çalıştıktan sonra kapatılır</li>
              </ol>
            </div>
            <Button size="xl" className="w-full" onClick={start} disabled={!!existing}>
              Taşınma sürecimi başlat
            </Button>
            <button type="button" onClick={() => setStage("address")} className="flex min-h-11 w-full items-center justify-center text-sm font-semibold text-primary">
              Adresi düzenle
            </button>
          </>
        )}

        {stage === "started" && startedId && (
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-4">
            <div className="rounded-card bg-card p-6 text-center shadow-card">
              <CheckCircle2 className="mx-auto size-14 text-success" strokeWidth={1.5} aria-hidden />
              <p className="mt-3 text-xl font-semibold text-primary">Taşınma işlemini senin için başlattık.</p>
              <p className="mt-1 text-sm text-muted-foreground">Gelişmeleri İşlemlerim'den takip edebilirsin.</p>
            </div>
            <PlainNote>Randevu zamanı geldiğinde tarih ve saat tercihini sana soracağız.</PlainNote>
            <Button size="xl" className="w-full" onClick={() => navigate({ to: "/surec/$id", params: { id: startedId } })}>
              Süreci takip et
            </Button>
          </motion.div>
        )}

        <DemoNote className="pb-2">Adres kontrolü, ekip eşleştirme ve geçici internet bu prototipte demo verisiyle çalışır.</DemoNote>
      </div>
    </div>
  );
}

