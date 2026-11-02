import { useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { CheckCircle2, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/layout/headers";
import { Csat } from "@/components/tn/Csat";
import { Banner, Chip, ToggleRow } from "@/components/tn/primitives";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { defaultScopes, RELATIONS, SCOPE_GROUPS, SCOPES, USER, type ScopeKey } from "@/data/mock";
import { GigaNote } from "@/features/giga/GigaAvatar";
import { useAppStore } from "@/features/core/appStore";
import { useFamilyStore, type Duration } from "../store";
import { useFlow } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const STEP_TITLES = ["Kişi bilgileri", "Yetkiler", "Onay", "Kimlik doğrulama"];

export function NewDelegateScreen() {
  const navigate = useNavigate();
  const flow = useFlow("family_authorization");
  const addDelegate = useFamilyStore((s) => s.addDelegate);
  const addHistory = useAppStore((s) => s.addHistory);
  const notify = useAppStore((s) => s.notify);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relation, setRelation] = useState<string>("Anne");
  const [scopes, setScopes] = useState<Record<ScopeKey, boolean>>(defaultScopes);
  const [duration, setDuration] = useState<Duration>("unlimited");
  const [kvkk, setKvkk] = useState(false);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);

  const phoneOk = phone.replace(/\D/g, "").length >= 10;

  const next = () => {
    setError(null);
    if (step === 0 && (!name.trim() || !phoneOk)) return setError("Ad soyad ve geçerli bir telefon numarası gir.");
    if (step === 2 && !kvkk) return setError("Devam etmek için KVKK aydınlatma metnini onayla.");
    if (step === 3) {
      if (otp.length < 6) return setError("6 haneli kodu eksiksiz gir.");
      addDelegate({ name: name.trim(), phone, relation, scopes, duration });
      addHistory("Aile yetkisi verildi", `${name} (${relation})`);
      notify({ kind: "family", title: "Yetkilendirme tamamlandı", body: `${name} daveti kabul ettiğinde seçtiğin işlemleri yönetebilecek.`, to: "/aile", from: "giga" }, false);
      flow.complete({ relation, duration });
    }
    setStep((s) => s + 1);
  };

  if (step === 4)
    return (
      <div>
        <PageHeader title="Aile Yetkilendirme" />
        <div className="space-y-4 px-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-card bg-card p-6 text-center shadow-card">
            <CheckCircle2 className="mx-auto size-16 text-success" />
            <p className="mt-3 text-xl font-semibold text-primary">Yetkilendirme tamamlandı.</p>
            <p className="mt-1 text-sm text-muted-foreground">Artık seçtiğin işlemleri {name} de yönetebilir. Davet {phone} numarasına SMS ile gönderildi (demo); kabul ettiğinde yetkiler aktifleşir.</p>
            <Button size="lg" className="mt-5 w-full" onClick={() => navigate({ to: "/aile" })}>
              Yetkili Kişilere Dön
            </Button>
          </motion.div>
          <GigaNote>
            {name} {SCOPES.filter((x) => scopes[x.key] && !x.ownerApproval).map((x) => x.label.toLocaleLowerCase("tr-TR")).join(", ") || "hiçbir işlem"} yapabilecek. Ödeme, iptal ve paket değişikliği gibi işlemler yine her seferinde senin onayını gerektirir; abonelik sahipliği devredilemez.
          </GigaNote>
          <Csat feature="family_authorization" />
        </div>
      </div>
    );

  return (
    <div>
      <PageHeader title="Yeni Kişi Yetkilendir" />
      <div className="px-4">
        <div className="mb-4 flex gap-1.5" aria-label={`Adım ${step + 1} / 4`}>
          {STEP_TITLES.map((t, i) => (
            <div key={t} className="flex-1">
              <div className={cn("h-1.5 rounded-full", i <= step ? "bg-magenta" : "bg-border")} />
              <p className={cn("mt-1 text-[10px] font-semibold", i === step ? "text-primary" : "text-muted-foreground")}>{t}</p>
            </div>
          ))}
        </div>

        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4 rounded-card bg-card p-5 shadow-card">
          {step === 0 && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="d-name">Ad Soyad</Label>
                <Input id="d-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Örn. Ayşe Koyuncu" className="h-12 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="d-phone">Cep telefonu</Label>
                <Input id="d-phone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05xx xxx xx xx" className="h-12 rounded-xl" />
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Yakınlık</p>
                <div className="flex flex-wrap gap-2">
                  {RELATIONS.map((r) => (
                    <Chip key={r} active={relation === r} onClick={() => setRelation(r)}>
                      {r}
                    </Chip>
                  ))}
                </div>
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <p className="font-semibold text-primary">Bu kişinin hesabında hangi işlemleri yapabilmesini istiyorsun?</p>
              {SCOPE_GROUPS.map((g) => (
                <div key={g.id}>
                  <p className="pt-2 text-xs font-bold uppercase tracking-wide text-magenta">{g.title}</p>
                  <div className="divide-y divide-border">
                    {SCOPES.filter((s) => s.group === g.id).map((s) => (
                      <ToggleRow key={s.key} id={`scope-${s.key}`} title={s.ownerApproval ? `${s.label} · ek onayınla` : s.label} desc={s.desc} checked={scopes[s.key]} onChange={(v) => setScopes((p) => ({ ...p, [s.key]: v }))} />
                    ))}
                  </div>
                </div>
              ))}
              <Banner tone={scopes.payment || scopes.cancel || scopes.plan ? "warning" : "info"} title="Güvenliğin için">
                Ödeme, iptal, iade ve abonelik değişiklikleri her seferinde senin ek onayını gerektirir. Aile üyesi abonelik sahipliğini değiştiremez, şifre veya kart bilgisi göremez.
              </Banner>
              <div>
                <p className="mb-2 text-sm font-medium">Süre</p>
                <div className="flex gap-2">
                  {([["unlimited", "Süresiz"], ["30", "30 gün"], ["7", "7 gün"]] as const).map(([v, l]) => (
                    <Chip key={v} active={duration === v} onClick={() => setDuration(v)}>
                      {l}
                    </Chip>
                  ))}
                </div>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <p className="font-semibold text-primary">Özet</p>
              <p className="text-sm">
                <b>{name}</b> ({relation}) — {duration === "unlimited" ? "süresiz" : `${duration} gün`}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SCOPES.filter((s) => scopes[s.key]).map((s) => (
                  <span key={s.key} className="rounded-full bg-icon-box px-2.5 py-1 text-xs font-semibold text-primary">
                    {s.label}
                  </span>
                ))}
              </div>
              <div className="rounded-2xl bg-muted p-4 text-xs leading-relaxed text-muted-foreground">
                <p className="mb-1 flex items-center gap-1.5 font-semibold text-foreground">
                  <ShieldAlert className="size-4" /> KVKK Aydınlatma Metni
                </p>
                Yetkilendirdiğin kişinin ad, telefon ve işlem kayıtları yalnızca hesabındaki işlemleri yürütmek amacıyla işlenir. Yetkiyi dilediğin an iptal edebilirsin; tüm erişimler Yetki Geçmişi'nde kayıt altındadır.
              </div>
              <label htmlFor="kvkk" className="flex min-h-11 items-start gap-3">
                <Checkbox id="kvkk" checked={kvkk} onCheckedChange={(v) => setKvkk(v === true)} className="mt-0.5 size-5 data-[state=checked]:bg-magenta data-[state=checked]:border-magenta" />
                <span className="text-sm">KVKK aydınlatma metnini okudum, açık rıza veriyorum.</span>
              </label>
            </>
          )}
          {step === 3 && (
            <div className="text-center">
              <p className="font-semibold text-primary">Kimliğini doğrula</p>
              <p className="mt-1 text-sm text-muted-foreground">Yetkiyi abonelik sahibi olarak verdiğini doğrulamak için {USER.phone} numarana gönderilen 6 haneli kodu gir. Şifre veya kimlik numarası istemiyoruz. (Demo: herhangi bir kod)</p>
              <div className="mt-5 flex justify-center">
                <InputOTP maxLength={6} value={otp} onChange={setOtp} aria-label="Doğrulama kodu">
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot key={i} index={i} className="h-12 w-11 text-lg" />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <button className="mt-3 text-sm font-semibold text-magenta" onClick={() => setOtp("482915")}>
                Kodu otomatik doldur
              </button>
            </div>
          )}
          {error && <Banner tone="error">{error}</Banner>}
        </motion.div>

        <div className="mt-5 flex gap-3">
          {step > 0 && (
            <Button variant="outline" size="lg" className="flex-1" onClick={() => setStep((s) => s - 1)}>
              Geri
            </Button>
          )}
          <Button size="lg" className="flex-1" onClick={next}>
            {step === 3 ? "Yetkilendirmeyi tamamla" : "Devam"}
          </Button>
        </div>
      </div>
    </div>
  );
}
