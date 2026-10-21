import { useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { CheckCircle2, Gift, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/headers";
import { Banner, Chip } from "@/components/tn/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { OPERATORS, USER, detectOperator, type Operator } from "@/data/mock";
import { useAppStore } from "@/features/core/appStore";
import { useGiftStore } from "../store";
import { useFlow } from "@/lib/analytics";

export function GiftActivateScreen() {
  const flow = useFlow("gift_activation");
  const navigate = useNavigate();
  const giftGB = useGiftStore((s) => s.giftGB);
  const activated = useGiftStore((s) => s.activated);
  const activate = useGiftStore((s) => s.activate);
  const addHistory = useAppStore((s) => s.addHistory);
  const notify = useAppStore((s) => s.notify);
  const [phone, setPhone] = useState(USER.phone);
  const [op, setOp] = useState<Operator>(detectOperator(USER.phone));
  const [auto, setAuto] = useState(true);
  const [step, setStep] = useState<"phone" | "otp" | "done">("phone");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (auto) setOp(detectOperator(phone));
  }, [phone, auto]);

  if (giftGB === 0 && !activated)
    return (
      <div>
        <PageHeader title="Hediyeyi Aktifleştir" />
        <div className="px-4">
          <Banner tone="info" title="Aktifleştirilecek hediye yok">Kesinti 6 saati geçtiğinde hediyen burada görünecek.</Banner>
        </div>
      </div>
    );

  return (
    <div>
      <PageHeader title="Hediyeyi Aktifleştir" />
      <div className="space-y-4 px-4">
        {step === "done" ? (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-card bg-card p-6 text-center shadow-card">
            <motion.div animate={{ rotate: [0, -10, 10, 0] }} transition={{ duration: 0.8 }} className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-magenta-soft text-magenta">
              <Sparkles className="size-10" />
            </motion.div>
            <p className="mt-4 text-2xl font-semibold text-primary">{giftGB} GB hattında!</p>
            <p className="mt-1 text-sm text-muted-foreground">{phone} · {op} hattına tanımlandı. 30 gün geçerli.</p>
            <Button size="xl" className="mt-6 w-full rounded-full" onClick={() => navigate({ to: "/hediye" })}>
              Hediye Cüzdanıma Git
            </Button>
          </motion.div>
        ) : (
          <>
            <div className="flex items-center gap-4 rounded-card bg-plum p-5 text-primary-foreground shadow-float">
              <Gift className="size-10" />
              <div>
                <p className="text-3xl font-bold">{giftGB} GB</p>
                <p className="text-sm text-primary-foreground/80">Hangi operatörü kullanırsan kullan</p>
              </div>
            </div>
            {step === "phone" ? (
              <div className="space-y-4 rounded-card bg-card p-5 shadow-card">
                <div className="space-y-1.5">
                  <Label htmlFor="g-phone">Cep telefonu numaran</Label>
                  <Input id="g-phone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-12 rounded-xl text-lg" />
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium">Operatör</p>
                    {auto && <span className="text-xs font-semibold text-success">Otomatik tespit edildi</span>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {OPERATORS.map((o) => (
                      <Chip key={o} active={op === o} onClick={() => { setAuto(false); setOp(o); }}>{o}</Chip>
                    ))}
                  </div>
                </div>
                {error && <Banner tone="error">{error}</Banner>}
                <Button
                  size="xl"
                  className="w-full rounded-full"
                  onClick={() => {
                    if (phone.replace(/\D/g, "").length < 10) return setError("Geçerli bir cep telefonu numarası gir.");
                    setError(null);
                    setStep("otp");
                  }}
                >
                  Doğrulama Kodu Gönder
                </Button>
              </div>
            ) : (
              <div className="rounded-card bg-card p-5 text-center shadow-card">
                <p className="font-semibold text-primary">SMS kodunu gir</p>
                <p className="mt-1 text-sm text-muted-foreground">{phone} numarasına gönderdik. (Demo: herhangi bir kod)</p>
                <div className="mt-5 flex justify-center">
                  <InputOTP maxLength={6} value={otp} onChange={setOtp} aria-label="Doğrulama kodu">
                    <InputOTPGroup>
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <InputOTPSlot key={i} index={i} className="h-12 w-11 text-lg" />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <button className="mt-3 text-sm font-semibold text-magenta" onClick={() => setOtp("130724")}>Kodu otomatik doldur</button>
                {error && <Banner tone="error" className="mt-3 text-left">{error}</Banner>}
                <Button
                  size="xl"
                  className="mt-5 w-full rounded-full"
                  onClick={() => {
                    if (otp.length < 6) return setError("6 haneli kodu eksiksiz gir.");
                    activate(phone, op);
                    addHistory("Hediye internet aktifleştirildi", `${giftGB} GB · ${op}`);
                    notify({ kind: "gift", title: `${giftGB} GB hattına tanımlandı`, body: `${op} hattında 30 gün geçerli. Sosyal medya ücretsiz!`, to: "/hediye" }, false);
                    flow.complete({ operator: op, gb: giftGB });
                    setStep("done");
                  }}
                >
                  <CheckCircle2 /> Hediyeyi Aktifleştir
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
