import { useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Camera, Check, Clock, Link2, MessageSquare, Mic, ShieldCheck, Truck, UserPlus, Video, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/headers";
import { iconFor } from "@/components/tn/icons";
import { Banner } from "@/components/tn/primitives";
import { Button } from "@/components/ui/button";
import { USER, VIDEO_TOPICS } from "@/data/mock";
import { useActingAccount, useCan, useFamilyStore } from "@/features/family/store";
import { useVideoStore } from "../store";
import { useCamera } from "../useCamera";
import { track, useFlow } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export function VideoIntroScreen() {
  useFlow("video_support_intro");
  const navigate = useNavigate();
  const topic = useVideoStore((s) => s.topic);
  const setTopic = useVideoStore((s) => s.setTopic);
  const invitees = useVideoStore((s) => s.invitees);
  const setInvitees = useVideoStore((s) => s.setInvitees);
  const managed = useFamilyStore((s) => s.managed);
  const delegates = useFamilyStore((s) => s.delegates);
  const acting = useActingAccount();
  const canVideo = useCan("tech");
  const [step, setStep] = useState<"info" | "perm">("info");
  const cam = useCamera(false);

  const family = [
    ...managed.map((m) => ({ name: m.name, sub: `${m.relation} · Yönettiğin hesap`, initials: m.initials })),
    ...delegates.filter((d) => d.status === "active").map((d) => ({ name: d.name, sub: `${d.relation} · Yetkili kişi`, initials: d.name.split(" ").map((p) => p[0]).join("").slice(0, 2) })),
  ];

  useEffect(() => {
    if (acting && invitees.length === 0) setInvitees([acting.name]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acting]);

  const toggleInvite = (n: string) => setInvitees(invitees.includes(n) ? invitees.filter((x) => x !== n) : [...invitees, n]);

  const start = () => {
    cam.stop();
    track("flow_started", "video_support", { topic: topic ?? "other", invitees: invitees.length });
    navigate({ to: "/goruntulu-destek/gorusme" });
  };

  if (!canVideo)
    return (
      <div>
        <PageHeader title="Görüntülü Destek" />
        <div className="px-4">
          <Banner tone="warning" title="Görüntülü destek yetkin yok">{acting?.honorific} bu yetkiyi vermedi.</Banner>
        </div>
      </div>
    );

  return (
    <div>
      <PageHeader title="Görüntülü Destek" />
      {step === "info" ? (
        <div className="space-y-4 px-4">
          <div className="relative overflow-hidden rounded-card bg-plum p-5 text-primary-foreground shadow-float">
            <motion.div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-magenta/40 blur-2xl" animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 4 }} />
            <Video className="relative size-9" strokeWidth={1.5} />
            <p className="relative mt-3 text-2xl font-semibold leading-tight">Uzmanımız modemini görsün, birlikte çözelim</p>
            <span className="relative mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3 py-1.5 text-sm font-semibold">
              <Clock className="size-4" /> Ortalama bekleme: 2 dk
            </span>
          </div>

          <div className="rounded-card bg-card p-5 shadow-card">
            <p className="font-semibold text-primary">Neden görüntülü destek?</p>
            <ul className="mt-3 space-y-2.5 text-sm">
              <li className="flex gap-2.5"><Truck className="size-5 shrink-0 text-magenta" /> Saha ekibini beklemeden, bugün çözüm</li>
              <li className="flex gap-2.5"><Zap className="size-5 shrink-0 text-magenta" /> Uzman ekranında işaretleyerek gösterir, sen sadece takip et</li>
              <li className="flex gap-2.5"><UserPlus className="size-5 shrink-0 text-magenta" /> Annen, baban görüşmeye katılabilir — sen uzaktan yönet</li>
            </ul>
          </div>

          <div className="rounded-card bg-card p-5 shadow-card">
            <p className="font-semibold text-primary">Konu nedir?</p>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              {VIDEO_TOPICS.map((t) => {
                const Icon = iconFor(t.icon);
                const on = topic === t.id;
                return (
                  <button key={t.id} onClick={() => setTopic(t.id)} aria-pressed={on} className={cn("flex min-h-14 items-center gap-2.5 rounded-2xl border-2 px-3 text-left text-sm font-semibold", on ? "border-magenta bg-magenta-soft text-primary" : "border-border text-foreground")}>
                    <Icon className={cn("size-5", on ? "text-magenta" : "text-primary")} /> {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-card bg-card p-5 shadow-card">
            <p className="font-semibold text-primary">Sorunun sahibini davet et</p>
            <p className="text-xs text-muted-foreground">Davetli katıldığında görüşmede 3 kişi olursunuz: uzman, sen ve yakının.</p>
            <div className="mt-3 space-y-2">
              {family.map((f) => {
                const on = invitees.includes(f.name);
                return (
                  <button key={f.name} onClick={() => toggleInvite(f.name)} aria-pressed={on} className={cn("flex min-h-14 w-full items-center gap-3 rounded-2xl border-2 px-3 text-left", on ? "border-magenta bg-magenta-soft" : "border-border")}>
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-deep text-sm font-semibold text-primary-foreground">{f.initials}</span>
                    <span className="flex-1">
                      <span className="block text-sm font-semibold">{f.name}</span>
                      <span className="block text-xs text-muted-foreground">{f.sub}</span>
                    </span>
                    <span className={cn("flex h-6 w-6 items-center justify-center rounded-full", on ? "bg-magenta text-magenta-foreground" : "border-2 border-border")}>{on && <Check className="size-4" />}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => toast.success("Davet linki kopyalandı", { description: "turknet.app/v/8KQ2-X1" })}>
                <Link2 /> Link ile
              </Button>
              <Button variant="outline" onClick={() => toast.success("SMS daveti gönderildi")}>
                <MessageSquare /> SMS ile
              </Button>
            </div>
          </div>

          <Button size="xl" className="w-full rounded-full" disabled={!topic} onClick={() => setStep("perm")}>
            Devam
          </Button>
          {!topic && <p className="text-center text-xs text-muted-foreground">Devam etmek için bir konu seç.</p>}
        </div>
      ) : (
        <div className="space-y-4 px-4">
          <div className="rounded-card bg-card p-5 text-center shadow-card">
            <div className="relative mx-auto aspect-[3/4] w-48 overflow-hidden rounded-3xl bg-call">
              {cam.status === "live" ? (
                <video ref={cam.videoRef} autoPlay playsInline muted className="h-full w-full -scale-x-100 object-cover" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-call-foreground/80">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground">{USER.initials}</span>
                  <span className="text-xs">{cam.status === "pending" ? "Kamera açılıyor…" : "Kamera önizlemesi"}</span>
                </div>
              )}
            </div>
            <p className="mt-4 text-lg font-semibold text-primary">Kamera ve mikrofon izni</p>
            <p className="mt-1 text-sm text-muted-foreground">Uzmanımız yalnızca görüşme süresince görüntünü görür. Görüşme kaydedilmez; sadece yapılan adımların özeti hesabına eklenir.</p>
            <div className="mt-4 flex justify-center gap-6 text-sm">
              <span className="flex items-center gap-1.5"><Camera className="size-4 text-magenta" /> Kamera</span>
              <span className="flex items-center gap-1.5"><Mic className="size-4 text-magenta" /> Mikrofon</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="size-4 text-success" /> KVKK</span>
            </div>
          </div>
          {(cam.status === "denied" || cam.status === "unavailable") && (
            <Banner tone="warning" title="Kameraya erişilemedi">
              Önizleme ortamında kamera kapalı olabilir. Görüşme demo görüntüsüyle devam edecek.
            </Banner>
          )}
          {cam.status !== "live" && cam.status !== "denied" && cam.status !== "unavailable" ? (
            <Button size="xl" className="w-full rounded-full" onClick={cam.start} disabled={cam.status === "pending"}>
              <Camera /> İzin Ver ve Önizle
            </Button>
          ) : null}
          <Button size="xl" variant={cam.status === "idle" ? "outline" : "magenta"} className="w-full rounded-full" onClick={start}>
            <Video /> Görüşmeyi Başlat
          </Button>
        </div>
      )}
    </div>
  );
}
