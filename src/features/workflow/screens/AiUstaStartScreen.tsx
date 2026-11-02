import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Gauge, HelpCircle, Router, TriangleAlert, WifiOff } from "lucide-react";
import { PageHeader } from "@/components/layout/headers";
import { GigaAvatar, GigaNote } from "@/features/giga/GigaAvatar";
import { startAiUsta, startSpeedCheck, useWorkflowStore } from "@/features/workflow";
import { isActive } from "../rules";
import { openOutage } from "../services/hybrid";
import { DemoNote, StatusPill } from "../components/ui";

/** GIGA Teknik landing: "İnternetinle ilgili bir sorun mu var?" — app, phone and live support meet here. */
export function AiUstaStartScreen() {
  const navigate = useNavigate();
  const active = useWorkflowStore((s) => s.workflows.find((w) => w.type === "ai_usta" && isActive(w)));
  const regional = useWorkflowStore((s) => s.workflows.find((w) => w.type === "outage_recovery" && isActive(w) && w.data["outageType"] === "regional"));
  const outage = useWorkflowStore((s) => s.outage);
  const proactive = useWorkflowStore((s) => s.workflows.find((w) => w.type === "proactive_fault" && isActive(w)));
  /** A known technical problem that is not caused by the customer: shown first. */
  const known = outage && !outage.restoredAt
    ? { title: regional ? "Bölgende bir arıza var" : "İnternet bağlantında kesinti var", text: "Sorun senden kaynaklanmıyor; teknik ekibimiz çözüm için çalışıyor. Modeminde bir şey yapmana gerek yok.", to: "/hibrit" }
    : proactive
      ? { title: "Bağlantında bir sorun tespit ettik", text: "Sorun senden kaynaklanmıyor; gerekli teknik kontrolleri yapıyoruz. Şu an bir şey yapmana gerek yok.", to: `/surec/${proactive.id}` }
      : null;

  const go = (id: string) => navigate({ to: "/surec/$id", params: { id } });
  const notWorking = (issue: "no_internet" | "modem") => {
    if (issue === "no_internet" && openOutage()) {
      navigate({ to: "/hibrit" });
      return;
    }
    go(startAiUsta(issue));
  };
  const Entry = ({ icon: Icon, title, desc, onClick }: { icon: typeof WifiOff; title: string; desc: string; onClick: () => void }) => (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-4 rounded-card bg-card p-4 text-left shadow-card">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-icon-box text-primary">
        <Icon className="size-6" strokeWidth={1.5} />
      </span>
      <span className="flex-1">
        <span className="block font-semibold text-primary">{title}</span>
        <span className="block text-xs text-muted-foreground">{desc}</span>
      </span>
      <ChevronRight className="size-5 text-muted-foreground" />
    </button>
  );

  return (
    <div>
      <PageHeader title="GIGA Teknik" />
      <div className="space-y-4 px-4">
        {known && (
          <div className="rounded-card border border-warning/30 bg-warning-soft p-4 shadow-card" role="status">
            <p className="flex items-center gap-2 font-semibold text-foreground"><TriangleAlert className="size-5 shrink-0 text-warning" /> {known.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{known.text}</p>
            <Link to={known.to as "/"} className="mt-3 inline-flex min-h-10 items-center gap-1 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground">
              Durumu gör <ChevronRight className="size-4" />
            </Link>
          </div>
        )}
        <div className="rounded-card bg-plum p-5 text-primary-foreground shadow-float">
          <div className="flex items-center gap-4">
            <GigaAvatar size={58} mood={active ? "working" : "listening"} />
            <div>
              <p className="text-lg font-semibold leading-snug">İnternetinle ilgili bir sorun mu var?</p>
              <p className="mt-1 text-sm text-primary-foreground/80">GIGA yanında. Merak etme, birlikte çözebiliriz.</p>
            </div>
          </div>
        </div>

        {active && (
          <Link to="/surec/$id" params={{ id: active.id }} className="flex items-center justify-between rounded-card bg-card p-4 shadow-card">
            <span className="font-semibold text-primary">Devam eden GIGA Teknik oturumun</span>
            <StatusPill status={active.status} />
          </Link>
        )}

        <div className="space-y-2.5">
          <Entry icon={WifiOff} title="İnternetim çalışmıyor" desc="Bağlantını kontrol edip adım adım birlikte çözelim" onClick={() => notWorking("no_internet")} />
          <Entry icon={Gauge} title="İnternetim yavaş" desc="Hızını ölçer, uzaktan iyileştirebileceğimi denerim" onClick={() => go(startSpeedCheck())} />
          <Entry icon={Router} title="Modemimde sorun var" desc="Modem ışıklarını kamerayla birlikte kontrol edelim" onClick={() => notWorking("modem")} />
          <Link to="/yardim" className="flex w-full items-center gap-4 rounded-card border border-dashed border-border bg-card p-4 text-left">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-icon-box text-primary"><HelpCircle className="size-6" strokeWidth={1.5} /></span>
            <span className="flex-1">
              <span className="block font-semibold text-primary">Farklı bir sorun mu yaşıyorsun?</span>
              <span className="block text-xs text-muted-foreground">Görüntülü destek, QR ile destek ve diğer yardım seçenekleri</span>
            </span>
            <ChevronRight className="size-5 text-muted-foreground" />
          </Link>
        </div>
        <GigaNote>Önce birlikte çözmeyi deneyelim. Çözdüğümüz sorunlar için destek kaydı açmam; yalnızca uzman gerekirse kayıt oluştururum.</GigaNote>
        <DemoNote className="pb-2">Görsel analiz ve telefon görüşmesi bu prototipte simülasyondur; gerçek görüntü modeli veya arama kullanılmaz.</DemoNote>
      </div>
    </div>
  );
}
