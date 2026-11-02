import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Gauge, Phone, Router, ScanEye, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/headers";
import { GigaAvatar, GigaNote } from "@/features/giga/GigaAvatar";
import { startAiUsta, startSpeedCheck, startUstaCall, useWorkflowStore } from "@/features/workflow";
import { isActive } from "../rules";
import { openOutage } from "../services/hybrid";
import { DemoNote, StatusPill } from "../components/ui";

/** GIGA Teknik landing: "İnternetinle ilgili bir sorun mu var?" — app, phone and live support meet here. */
export function AiUstaStartScreen() {
  const navigate = useNavigate();
  const active = useWorkflowStore((s) => s.workflows.find((w) => w.type === "ai_usta" && isActive(w)));
  const regional = useWorkflowStore((s) => s.workflows.find((w) => w.type === "outage_recovery" && isActive(w) && w.data["outageType"] === "regional"));

  const go = (id: string) => navigate({ to: "/surec/$id", params: { id } });
  const notWorking = (issue: "no_internet" | "modem") => {
    if (issue === "no_internet" && openOutage()) {
      navigate({ to: "/hibrit" });
      return;
    }
    go(startAiUsta(issue));
  };
  const call = () => {
    if (active && active.data["channel"] !== "ivr") {
      toast("Devam eden bir GIGA Teknik oturumun var", { description: "Kaldığın yerden devam edelim; tekrar anlatmana gerek yok." });
      go(active.id);
      return;
    }
    startUstaCall();
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
        <div className="rounded-card bg-plum p-5 text-primary-foreground shadow-float">
          <div className="flex items-center gap-4">
            <GigaAvatar size={58} mood={active ? "working" : "listening"} />
            <div>
              <p className="text-lg font-semibold leading-snug">İnternetinle ilgili bir sorun mu var?</p>
              <p className="mt-1 text-sm text-primary-foreground/80">GIGA yanında. Merak etme, birlikte çözebiliriz.</p>
            </div>
          </div>
        </div>

        {regional && (
          <div className="rounded-2xl border border-warning/30 bg-warning-soft p-3.5 text-sm">
            <p className="font-semibold">Bölgende olası bir arıza var</p>
            <p className="text-muted-foreground">Sorunun bölgendeki bağlantıyla ilgili olduğunu belirledik ve ilgili ekibe bilgi verdik. Modeminde bir şey yapmana gerek yok.</p>
          </div>
        )}

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
        </div>

        <div className="rounded-card bg-card p-5 shadow-card">
          <p className="font-semibold text-primary">Telefonla destek almak istiyorum</p>
          <p className="mt-1 text-sm text-muted-foreground">GIGA telefonda da yanında. İstersen sana SMS ile bir bağlantı gönderirim; uygulamada kaldığımız yerden devam ederiz.</p>
          <button type="button" onClick={call} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-success text-sm font-semibold text-success-foreground">
            <Phone className="size-4" /> TürkNet'i ara
          </button>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">Gerçek arama yapılmaz · görüşme simülasyondur</p>
        </div>

        <div className="rounded-card bg-card p-5 text-sm text-muted-foreground shadow-card">
          <p className="flex items-center gap-2 font-semibold text-primary">
            <ScanEye className="size-5" /> GIGA Teknik nasıl çalışır?
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Bağlantını, modem durumunu ve açık arıza kayıtlarını kontrol ederim.</li>
            <li>Kamerayla modem ışıklarına bakar, ne anlama geldiklerini açıklarım.</li>
            <li>Tek seferde bir güvenli adım gösteririm; sonucu birlikte doğrularız.</li>
            <li>Çözülmezse yaptığımız her şeyi uzmana iletirim; sorunu baştan anlatmazsın.</li>
          </ol>
        </div>
        <GigaNote>Önce birlikte çözmeyi deneyelim. Çözdüğümüz sorunlar için destek kaydı açmam; yalnızca uzman gerekirse kayıt oluştururum.</GigaNote>
        <DemoNote className="pb-2">Görsel analiz ve telefon görüşmesi bu prototipte simülasyondur; gerçek görüntü modeli veya arama kullanılmaz.</DemoNote>
      </div>
    </div>
  );
}
