import { useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { CheckCircle2, ChevronDown, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/layout/headers";
import { Csat } from "@/components/tn/Csat";
import { Banner, Chip, PlainNote, ToggleRow } from "@/components/tn/primitives";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { defaultScopes, RELATIONS, SCOPE_GROUPS, SCOPES, USER, type ScopeKey } from "@/data/mock";
import { useAppStore } from "@/features/core/appStore";
import { useFamilyStore, type Duration } from "../store";
import { useFlow } from "@/lib/analytics";
import { cn } from "@/lib/utils";


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
  const [showScopes, setShowScopes] = useState(false);
  const [kvkk, setKvkk] = useState(false);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fillDemo = () => {
    const samples = [
      { name: "Ayşe Koyuncu", phone: "0533 742 18 90", relation: "Anne" },
      { name: "Mehmet Koyuncu", phone: "0542 315 66 27", relation: "Baba" },
      { name: "Zeynep Koyuncu", phone: "0555 904 23 11", relation: "Kardeş" },
    ];
    const i = (samples.findIndex((x) => x.name === name) + 1) % samples.length;
    const smp = samples[i]!;
    setName(smp.name); setPhone(smp.phone);
    if ((RELATIONS as readonly string[]).includes(smp.relation)) setRelation(smp.relation);
    setKvkk(true); setError(null);
  };

  const phoneOk = phone.replace(/\D/g, "").length >= 10;

  const next = () => {
    setError(null);
    if (!name.trim() || !phoneOk) return setError("Ad soyad ve geçerli bir telefon numarası gir.");
    if (!kvkk) return setError("Devam etmek için KVKK aydınlatma metnini onayla.");
    addDelegate({ name: name.trim(), phone, relation, scopes, duration });
    addHistory("Aile yetkisi verildi", `${name} (${relation})`);
    notify({ kind: "family", title: "Kişi eklendi", body: `${name} daveti kabul ettiğinde seçtiğin işlemleri yönetebilecek.`, to: "/aile" }, false);
    flow.complete({ relation, duration });
    setStep(4);
  };

  if (step === 4)
    return (
      <div>
        <PageHeader title="TürkNet Evim" />
        <div className="space-y-4 px-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-card bg-card p-6 text-center shadow-card">
            <CheckCircle2 className="mx-auto size-16 text-success" />
            <p className="mt-3 text-xl font-semibold text-primary">Kişi eklendi.</p>
            <p className="mt-1 text-sm text-muted-foreground">Artık seçtiğin işlemleri {name} de yönetebilir. Davet {phone} numarasına SMS ile gönderildi (demo); kabul ettiğinde yetkiler aktifleşir.</p>
            <Button size="lg" className="mt-5 w-full" onClick={() => navigate({ to: "/aile" })}>
              TürkNet Evim'e Dön
            </Button>
          </motion.div>
          <PlainNote>
            {name} {SCOPES.filter((x) => scopes[x.key] && !x.ownerApproval).map((x) => x.label.toLocaleLowerCase("tr-TR")).join(", ") || "hiçbir işlem"} yapabilecek. Ödeme, iptal ve paket değişikliği gibi işlemler yine her seferinde senin onayını gerektirir; abonelik sahipliği devredilemez.
          </PlainNote>
          <Csat feature="family_authorization" />
        </div>
      </div>
    );

  return (
    <div>
      <PageHeader title="Yeni Kişi Ekle" />
      <div className="px-4">
        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4 rounded-card bg-card p-5 shadow-card">
          {step === 0 && (
            <>
              <button type="button" onClick={fillDemo} className="w-full rounded-xl border border-dashed border-magenta/50 py-2 text-sm font-semibold text-magenta">
                Örnek bilgilerle doldur (demo)
              </button>
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
              <button type="button" aria-expanded={showScopes} onClick={() => setShowScopes((v) => !v)} className="flex w-full items-center justify-between rounded-xl bg-muted px-4 py-3 text-left">
                <span>
                  <span className="block font-semibold text-primary">Yetkiler</span>
                  <span className="block text-xs text-muted-foreground">{SCOPES.filter((x) => scopes[x.key]).length} işlem seçili</span>
                </span>
                <ChevronDown className={cn("size-5 text-muted-foreground transition-transform", showScopes && "rotate-180")} />
              </button>
              {showScopes && (<>
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
              </>)}
              <Banner tone={scopes.payment || scopes.cancel || scopes.plan ? "warning" : "info"} title="Güvenliğin için">
                Ödeme, iptal, iade ve abonelik değişiklikleri her seferinde senin ek onayını gerektirir. Aile üyesi abonelik sahipliğini değiştiremez, şifre veya kart bilgisi göremez.
              </Banner>
              <label htmlFor="kvkk" className="flex min-h-11 items-start gap-3">
                <Checkbox id="kvkk" checked={kvkk} onCheckedChange={(v) => setKvkk(v === true)} className="mt-0.5 size-5 data-[state=checked]:bg-magenta data-[state=checked]:border-magenta" />
                <span className="text-sm">Kişi bilgilerinin yalnızca hesap işlemleri için kullanılmasını onaylıyorum (KVKK).</span>
              </label>
            </>
          )}
          {error && <Banner tone="error">{error}</Banner>}
        </motion.div>

        <div className="mt-5 flex gap-3">
          <Button size="lg" className="flex-1" onClick={next}>
            Kişiyi Ekle
          </Button>
        </div>
      </div>
    </div>
  );
}
