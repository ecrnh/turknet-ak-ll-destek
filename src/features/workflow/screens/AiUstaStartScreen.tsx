import { Link, useNavigate } from "@tanstack/react-router";
import { Camera, Headset, ListChecks, ScanEye, WifiOff } from "lucide-react";
import modemImg from "@/assets/modem.png";
import { PageHeader } from "@/components/layout/headers";
import { Button } from "@/components/ui/button";
import { startAiUsta, useWorkflowStore } from "@/features/workflow";
import { isActive } from "../rules";
import { DemoNote, StatusPill } from "../components/ui";
import { GigaAvatar } from "@/features/giga/GigaAvatar";

export function AiUstaStartScreen() {
  const navigate = useNavigate();
  const active = useWorkflowStore((s) => s.workflows.find((w) => w.type === "ai_usta" && isActive(w)));
  const regional = useWorkflowStore((s) => s.workflows.find((w) => w.type === "outage_recovery" && isActive(w) && w.data["outageType"] === "regional"));

  return (
    <div>
      <PageHeader title="GIGA Teknik" />
      <div className="space-y-4 px-4">
        <div className="rounded-card bg-plum p-5 text-primary-foreground shadow-float">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <img src={modemImg} alt="Modem" width={96} height={96} className="h-20 w-20 object-contain" />
              <GigaAvatar size={40} mood={active ? "working" : "listening"} className="absolute -right-2 -top-3" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary-foreground/70">GIGA Teknik · görsel destek</p>
              <p className="text-lg font-semibold leading-snug">Ben GIGA. Modemini göster, sorunu birlikte çözelim.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            [Camera, "Görsel yönlendirme"],
            [ListChecks, "Adım adım doğrulama"],
            [Headset, "Bağlamlı aktarım"],
          ].map(([I, l]) => {
            const Icon = I as typeof Camera;
            return (
              <div key={l as string} className="flex flex-col items-center gap-2 rounded-2xl bg-card p-3 text-center shadow-card">
                <Icon className="size-5 text-magenta" />
                <span className="text-xs font-semibold text-primary">{l as string}</span>
              </div>
            );
          })}
        </div>

        {regional && (
          <div className="rounded-2xl border border-warning/30 bg-warning-soft p-3.5 text-sm">
            <p className="font-semibold">Bölgende olası bir arıza var</p>
            <p className="text-muted-foreground">Sorun senden kaynaklı görünmüyor; modeminde bir şey yapmana gerek yok.</p>
          </div>
        )}

        {active ? (
          <Link to="/surec/$id" params={{ id: active.id }} className="flex items-center justify-between rounded-card bg-card p-4 shadow-card">
            <span className="font-semibold text-primary">Devam eden GIGA Teknik oturumun</span>
            <StatusPill status={active.status} />
          </Link>
        ) : (
          <Button
            size="xl"
            className="w-full"
            onClick={() => {
              const id = startAiUsta();
              navigate({ to: "/surec/$id", params: { id } });
            }}
          >
            <WifiOff /> İnternetim Çalışmıyor
          </Button>
        )}

        <div className="rounded-card bg-card p-5 text-sm text-muted-foreground shadow-card">
          <p className="flex items-center gap-2 font-semibold text-primary">
            <ScanEye className="size-5" /> GIGA Teknik nasıl çalışır?
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Bağlantını, modem durumunu ve açık arıza kayıtlarını kontrol ederim.</li>
            <li>Modem ışıklarının fotoğrafını ister, ne anlama geldiklerini açıklarım.</li>
            <li>Tek seferde bir güvenli adım gösteririm; izin verdiğin uzaktan düzeltmeleri ben yaparım, sonucu birlikte doğrularız.</li>
            <li>Çözülmezse yaptığımız her şeyi uzmana iletirim; sorunu baştan anlatmazsın.</li>
          </ol>
        </div>
        <p className="px-1 text-xs text-muted-foreground">Çağrı merkezini aradıysan, GIGA'nın gönderdiği SMS'teki bağlantı seni doğrudan buraya getirir; sorununu tekrar anlatmana gerek kalmaz.</p>
        <DemoNote className="pb-2">Görsel analiz bu prototipte simülasyondur; gerçek bir görüntü modeli kullanılmaz.</DemoNote>
      </div>
    </div>
  );
}
