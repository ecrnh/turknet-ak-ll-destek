import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Gauge, HeartPulse, Phone, QrCode, Router, Video, Wifi, WifiOff } from "lucide-react";
import { TabHeader } from "@/components/layout/headers";
import { FeedbackButton } from "@/components/tn/FeedbackButton";
import { ListCard, ListRow } from "@/components/tn/cards";
import { USER } from "@/data/mock";
import { startAiUsta, startSpeedCheck, useWorkflowStore } from "@/features/workflow";
import { isActive } from "@/features/workflow/rules";
import { useActingAccount, useCan } from "@/features/family/store";
import { cn } from "@/lib/utils";

/** "Akıllı Teknik Destek" landing: try to solve together first, then live support. */
export function HelpScreen() {
  const navigate = useNavigate();
  const acting = useActingAccount();
  const canTech = useCan("tech");
  const usta = useWorkflowStore((s) => s.workflows.find((w) => w.type === "ai_usta" && isActive(w)));
  const speed = useWorkflowStore((s) => s.workflows.find((w) => w.type === "speed_optimize" && isActive(w)));
  const by = acting ? `${USER.firstName} · ${acting.short} adına` : undefined;

  const entries = [
    {
      icon: WifiOff,
      title: "İnternetim çalışmıyor",
      text: "Modeminizi birlikte kontrol edelim",
      go: () => navigate({ to: "/ai-usta/$id", params: { id: usta?.id ?? startAiUsta({ issue: "down", initiatedBy: by }) } }),
    },
    {
      icon: Gauge,
      title: "İnternetim yavaş",
      text: "Hızınızı ölçüp iyileştirmeyi deneyelim",
      go: () => navigate({ to: "/surec/$id", params: { id: speed?.id ?? startSpeedCheck() } }),
    },
    {
      icon: Router,
      title: "Modemimde sorun var",
      text: "Işıklarına birlikte bakalım",
      go: () => navigate({ to: "/ai-usta/$id", params: { id: usta?.id ?? startAiUsta({ issue: "modem", initiatedBy: by }) } }),
    },
  ];

  return (
    <div>
      <TabHeader title="Destek" />
      <div className="space-y-4 px-4 pb-4 pt-2">
        <div className="rounded-card bg-plum p-5 text-primary-foreground shadow-float">
          <h2 className="text-2xl font-bold leading-tight">İnternetinizle ilgili bir sorun mu var?</h2>
          <p className="mt-1 text-sm text-primary-foreground/85">Merak etmeyin, birlikte çözebiliriz.</p>
        </div>

        {!canTech && <p className="rounded-2xl bg-warning-soft p-3 text-sm">Bu hesapta teknik destek başlatma yetkiniz yok. Hesap sahibinden yetki isteyebilirsiniz.</p>}

        <div className="space-y-3">
          {entries.map((e) => (
            <button key={e.title} type="button" disabled={!canTech} onClick={e.go} className="flex w-full items-center gap-4 rounded-card bg-card p-5 text-left shadow-card transition-transform active:scale-[0.99] disabled:opacity-50">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-icon-box-border bg-icon-box text-primary">
                <e.icon className="size-6" strokeWidth={1.75} />
              </span>
              <span className="flex-1">
                <span className="block text-lg font-semibold leading-tight text-primary">{e.title}</span>
                <span className="block text-sm text-muted-foreground">{e.text}</span>
              </span>
              <ChevronRight className="size-5 text-muted-foreground" />
            </button>
          ))}
        </div>

        <Link to="/telefon-destek" className="flex items-center gap-3 rounded-card border border-primary/15 bg-card p-4">
          <Phone className="size-5 text-magenta" />
          <span className="flex-1 font-semibold text-primary">Telefonla destek almak istiyorum</span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>

        <p className="px-1 pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Diğer destek seçenekleri</p>
        <ListCard>
          <ListRow title="Bağlantım" to="/baglanti" desc="Bağlantı sağlığı ve yedek bağlantı" icon={<Wifi className="size-5 text-primary" />} />
          <ListRow title="Dijital Onarım" to="/dijital-onarim" desc="Hat değerlerinizi kontrol edin" icon={<HeartPulse className="size-5 text-primary" />} />
          <ListRow title="Görüntülü Destek" to="/goruntulu-destek" desc="Uzmanımız modeminizi görsün" icon={<Video className="size-5 text-primary" />} />
          <ListRow title="QR ile Destek Talebi" to="/qr" desc="Modem etiketini okutun" icon={<QrCode className="size-5 text-primary" />} />
        </ListCard>
        <Link to="/destek-kayitlari" className={cn("flex min-h-[56px] items-center justify-between rounded-card bg-card px-5 font-semibold text-primary shadow-card")}>
          Tüm Destek Kayıtlarım <ChevronRight className="size-5" />
        </Link>
        <FeedbackButton />
      </div>
    </div>
  );
}
