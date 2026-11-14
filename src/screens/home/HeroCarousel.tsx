import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import heroImg from "@/assets/hero-campaign.jpg";
import { HERO_SLIDES } from "@/data/mock";
import { iconFor } from "@/components/tn/icons";
import { AppLink } from "@/components/tn/primitives";
import { cn } from "@/lib/utils";
import { GigaAvatar, GigaName } from "@/features/giga/GigaAvatar";

function CampaignSlide() {
  return (
    <AppLink to="/islem/fiyat-sabitle" className="relative block h-full w-full overflow-hidden">
      <img src={heroImg} alt="" width={1200} height={912} className="absolute inset-0 h-full w-full object-cover object-[70%_center]" />
      <div className="absolute inset-0 bg-gradient-to-r from-primary-deep via-primary-deep/70 to-transparent" />
      <div className="relative flex h-full flex-col justify-center gap-3 px-5 pb-6">
        <p className="max-w-[60%] text-[1.35rem] leading-tight">
          <span className="font-bold text-magenta">12 Aylık Peşin Ödeme ile</span>
          <br />
          <span className="text-primary-foreground">Sabit Fiyat Avantajını Yakala</span>
        </p>
        <div className="flex items-end gap-2">
          <div className="relative rounded-2xl border-2 border-magenta bg-primary-deep/60 px-3 py-2 text-primary-foreground shadow-[0_0_18px_var(--magenta)]">
            <p className="text-[10px]">Aylık</p>
            <p className="text-[10px] line-through opacity-80">₺949,90 yerine</p>
            <p className="text-xl font-bold leading-none">
              ₺749,90<span className="text-[9px] font-normal">'den</span>
            </p>
            <p className="text-[10px]">Fiyatını Sabitle</p>
            <span className="absolute -bottom-2.5 right-2 rounded-md bg-magenta px-1.5 py-0.5 text-[9px] font-bold text-magenta-foreground">₺2.400 Tasarruf Et</span>
          </div>
          <span className="rounded-lg bg-neon-lime px-2 py-1 text-[9px] font-bold leading-tight text-primary-deep">
            Vade Farksız
            <br />3 Taksit İmkanı
          </span>
          <span className="rounded-lg bg-neon-cyan px-2 py-1 text-[9px] font-bold leading-tight text-primary-deep">
            Ayrılırsan Kalan
            <br />
            Aylar İade
          </span>
        </div>
      </div>
    </AppLink>
  );
}

function FeatureSlide({ s }: { s: Extract<(typeof HERO_SLIDES)[number], { kind: "feature" }> }) {
  if (s.id === "agents") return <GigaSupportSlide s={s} />;
  const Icon = iconFor(s.icon);
  return (
    <div className="relative flex h-full w-full items-center gap-3 overflow-hidden px-5 pb-6">
      <motion.div
        className="absolute -right-10 top-4 h-48 w-48 rounded-full bg-magenta/30 blur-2xl"
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ repeat: Infinity, duration: 5 }}
      />
      <div className="relative z-10 flex-1">
        <p className="text-[10px] font-bold tracking-widest text-magenta">{s.eyebrow}</p>
        <p className="mt-1 text-[1.45rem] font-semibold leading-tight text-primary-foreground">{s.title}</p>
        <p className="mt-2 text-xs leading-relaxed text-primary-foreground/80">{s.text}</p>
        <AppLink to={s.to} className="mt-3 inline-flex min-h-10 items-center rounded-full bg-card px-4 text-sm font-semibold text-primary">
          {s.cta}
        </AppLink>
      </div>
      <div className="relative z-10 flex h-28 w-28 shrink-0 items-center justify-center rounded-[32px] border border-primary-foreground/20 bg-primary-foreground/10 backdrop-blur">
        <Icon className="size-14 text-primary-foreground" strokeWidth={1.25} />
      </div>
    </div>
  );
}

function GigaSupportSlide({ s }: { s: Extract<(typeof HERO_SLIDES)[number], { kind: "feature" }> }) {
  return (
    <div className="relative h-full overflow-hidden bg-gradient-to-br from-primary-deep via-primary to-[#481064] px-5 py-5 text-primary-foreground">
      <motion.div
        className="pointer-events-none absolute -right-8 -top-12 size-56 rounded-full bg-magenta/30 blur-3xl"
        animate={{ scale: [1, 1.12, 1], opacity: [0.65, 0.9, 0.65] }}
        transition={{ repeat: Infinity, duration: 5 }}
      />
      <div className="relative z-10 flex h-full items-center">
        <div className="flex-1 pr-2">
          <p className="mb-2 inline-flex rounded-full border border-magenta/40 bg-magenta/15 px-2.5 py-1 text-[9px] font-bold tracking-[0.14em] text-magenta">{s.eyebrow}</p>
          <p className="text-[1.55rem] font-bold leading-[1.08]">Bağlantın için yeni destek deneyimi</p>
          <p className="mt-2 text-lg font-extrabold leading-tight text-magenta"><GigaName />, her şartta seninle.</p>
          <p className="mt-2 max-w-[245px] text-[11px] leading-relaxed text-primary-foreground/80">{s.text}</p>
          <AppLink to={s.to} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full bg-card px-4 text-xs font-bold text-primary shadow-float transition-transform active:scale-[0.98]">
            {s.cta} <ArrowRight className="size-4" />
          </AppLink>
        </div>
        <div className="relative ml-1 flex size-[100px] shrink-0 items-center justify-center rounded-[34px] border border-primary-foreground/15 bg-primary-foreground/10 shadow-[0_18px_44px_hsl(280_70%_8%/0.3)] backdrop-blur-sm">
          <span className="absolute inset-2 rounded-[28px] border border-magenta/20" />
          <GigaAvatar size={72} mood="idle" label={false} />
          <span className="absolute -bottom-2 -right-2 rounded-full border-2 border-primary bg-neon-lime px-2 py-1 text-[8px] font-bold text-primary-deep">AI</span>
        </div>
      </div>
    </div>
  );
}

export function HeroCarousel() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setI((v) => (v + 1) % HERO_SLIDES.length), 5000);
    return () => clearInterval(t);
  }, [paused]);
  const slide = HERO_SLIDES[i % HERO_SLIDES.length] ?? HERO_SLIDES[0]!;

  return (
    <div className="relative" onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)} aria-roledescription="carousel" aria-label="Kampanyalar ve yenilikler">
      <div className="relative h-[320px] overflow-hidden">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={slide.id}
            className="absolute inset-0"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(_, info) => {
              if (info.offset.x < -50) setI((v) => (v + 1) % HERO_SLIDES.length);
              if (info.offset.x > 50) setI((v) => (v - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
            }}
          >
            {slide.kind === "campaign" ? <CampaignSlide /> : <FeatureSlide s={slide} />}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="flex justify-center gap-1.5 pb-1 pt-1">
        {HERO_SLIDES.map((s, idx) => (
          <button key={s.id} onClick={() => setI(idx)} aria-label={`Slayt ${idx + 1}`} className="flex h-6 items-center">
            <span className={cn("block h-2 rounded-full transition-all", idx === i ? "w-8 bg-magenta" : "w-2 bg-card")} />
          </button>
        ))}
      </div>
    </div>
  );
}

