import { Link } from "@tanstack/react-router";
import { ChevronRight, HeartPulse, QrCode } from "lucide-react";
import modemImg from "@/assets/modem.png";
import { PageHeader } from "@/components/layout/headers";
import { iconFor } from "@/components/tn/icons";
import { NewBadge, SectionTitle } from "@/components/tn/primitives";
import { HELP_CATEGORIES, HELP_FEATURES } from "@/data/mock";

export function HelpScreen() {
  return (
    <div>
      <PageHeader title="Yardım & Destek" />
      <div className="space-y-4 px-4 pt-2">
        <div className="mx-1 rounded-card border-gradient p-4 shadow-card">
          <div className="flex items-center gap-4">
            <img src={modemImg} alt="Modem" width={816} height={816} loading="lazy" className="h-24 w-24 object-contain" />
            <h2 className="text-[1.35rem] font-bold leading-tight text-primary">İnternet Sağlığınızı Kontrol Edin</h2>
          </div>
          <p className="mt-3 text-muted-foreground">İnternet bağlantı problemi yaşıyorsanız veya bir arıza ile karşılaştıysanız hemen hat değerlerinizi kontrol edebilirsiniz.</p>
          <Link to="/dijital-onarim" className="mt-5 flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-primary px-5 text-[1.05rem] font-medium text-primary-foreground shadow-float">
            Dijital Onarımı Çalıştır <HeartPulse className="size-5" />
          </Link>
        </div>

        <Link to={HELP_FEATURES.qr.to as "/"} className="mx-1 flex items-center gap-3 rounded-2xl border border-magenta/20 bg-magenta-soft p-3 text-primary">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-card text-magenta"><QrCode className="size-5" strokeWidth={1.7} /></span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 text-sm font-semibold">{HELP_FEATURES.qr.title} <NewBadge /></span>
            <span className="mt-1 block text-[11px] leading-snug text-muted-foreground">{HELP_FEATURES.qr.desc}</span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-magenta" />
        </Link>

        <div>
          <SectionTitle className="mt-2">Size nasıl yardımcı olabiliriz?</SectionTitle>
          <div className="space-y-1">
            {HELP_CATEGORIES.map((category) => {
              const Icon = iconFor(category.icon);
              return (
                <div key={category.title}>
                  <Link to={category.to as "/"} className="flex min-h-[52px] w-full items-center gap-3 rounded-xl bg-card px-4 py-3 text-left shadow-sm">
                    <Icon className="size-5 shrink-0 text-primary" strokeWidth={1.6} />
                    <span className="flex-1 text-sm font-medium text-foreground">{category.title}</span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        <Link to="/destek-kayitlari" className="flex min-h-[60px] items-center justify-between rounded-card bg-card px-5 font-semibold text-primary shadow-card">
          Tüm Destek Kayıtlarım <ChevronRight className="size-5" />
        </Link>
      </div>
    </div>
  );
}

