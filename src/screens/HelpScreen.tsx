import { Link } from "@tanstack/react-router";
import { ChevronRight, HeartPulse, QrCode, ScanEye, Video, Wifi } from "lucide-react";
import modemImg from "@/assets/modem.png";
import { PageHeader } from "@/components/layout/headers";
import { FeedbackButton } from "@/components/tn/FeedbackButton";
import { iconFor } from "@/components/tn/icons";
import { NewBadge } from "@/components/tn/primitives";
import { HELP_CATEGORIES } from "@/data/mock";
import { useAppStore } from "@/features/core/appStore";

export function HelpScreen() {
  const openHelp = useAppStore((s) => s.openHelp);
  return (
    <div>
      <PageHeader title="Yardım" />
      <div className="space-y-4 px-4 pt-2">
        <div className="rounded-card border-gradient p-5 shadow-card">
          <div className="flex items-center gap-4">
            <img src={modemImg} alt="Modem" width={816} height={816} loading="lazy" className="h-24 w-24 object-contain" />
            <h2 className="text-[1.35rem] font-bold leading-tight text-primary">İnternet Sağlığınızı Kontrol Edin</h2>
          </div>
          <p className="mt-3 text-muted-foreground">İnternet bağlantı problemi yaşıyorsanız veya bir arıza ile karşılaştıysanız hemen hat değerlerinizi kontrol edebilirsiniz.</p>
          <Link to="/dijital-onarim" className="mt-5 flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-primary px-5 text-[1.05rem] font-medium text-primary-foreground shadow-float">
            Dijital Onarımı Çalıştır <HeartPulse className="size-5" />
          </Link>
        </div>

        <div className="rounded-card bg-card p-5 shadow-card">
          <h2 className="text-[1.25rem] font-semibold text-primary">Teknik Destek</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Link to="/ai-usta" className="relative flex min-h-[112px] flex-col justify-between rounded-2xl bg-plum p-4 text-primary-foreground">
              <NewBadge className="absolute right-3 top-3" />
              <ScanEye className="size-7" strokeWidth={1.5} />
              <span className="font-semibold leading-tight">GIGA Teknik ile Çöz</span>
            </Link>
            <Link to="/baglanti" className="flex min-h-[112px] flex-col justify-between rounded-2xl border border-border p-4 text-primary">
              <Wifi className="size-7" strokeWidth={1.5} />
              <span className="font-semibold leading-tight">Bağlantım</span>
            </Link>
          </div>
        </div>

        <div className="rounded-card bg-card p-5 shadow-card">
          <h2 className="text-[1.25rem] font-semibold text-primary">Size nasıl yardımcı olabiliriz?</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Link to="/goruntulu-destek" className="relative flex min-h-[112px] flex-col justify-between rounded-2xl bg-plum p-4 text-primary-foreground">
              <NewBadge className="absolute right-3 top-3" />
              <Video className="size-7" strokeWidth={1.5} />
              <span className="font-semibold leading-tight">Görüntülü Destek</span>
            </Link>
            <Link to="/qr" className="relative flex min-h-[112px] flex-col justify-between rounded-2xl bg-magenta-grad p-4 text-primary-foreground">
              <NewBadge className="absolute right-3 top-3 bg-card text-magenta" />
              <QrCode className="size-7" strokeWidth={1.5} />
              <span className="font-semibold leading-tight">QR ile Destek Talebi</span>
            </Link>
          </div>
          <div className="mt-3 space-y-3">
            {HELP_CATEGORIES.map((c) => {
              const Icon = iconFor(c.icon);
              return (
                <button key={c.title} onClick={() => openHelp(c.prompt)} className="flex min-h-[60px] w-full items-center gap-4 rounded-xl border border-border px-4 text-left">
                  <Icon className="size-7 text-primary" strokeWidth={1.25} />
                  <span className="flex-1 font-medium text-foreground">{c.title}</span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        </div>

        <Link to="/destek-kayitlari" className="flex min-h-[60px] items-center justify-between rounded-card bg-card px-5 font-semibold text-primary shadow-card">
          Tüm Destek Kayıtlarım <ChevronRight className="size-5" />
        </Link>
        <FeedbackButton />
      </div>
    </div>
  );
}
