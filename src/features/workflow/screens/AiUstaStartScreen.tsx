import { useNavigate } from "@tanstack/react-router";
import { Camera, Headset, ListChecks, ScanEye } from "lucide-react";
import { PageHeader } from "@/components/layout/headers";
import { Button } from "@/components/ui/button";
import { MODEM_LED_DEMO } from "@/data/mock";
import { startAiUsta, useWorkflowStore } from "@/features/workflow";
import { isActive } from "../rules";
import { ModemFront } from "../components/Modem";
import { DemoNote, StatusPill } from "../components/ui";

export function AiUstaStartScreen() {
  const navigate = useNavigate();
  const active = useWorkflowStore((s) => s.workflows.find((w) => w.type === "ai_usta" && isActive(w)));
  const regional = useWorkflowStore((s) => s.workflows.find((w) => w.type === "outage_recovery" && isActive(w) && w.data["outageType"] === "regional"));

  return (
    <div>
      <PageHeader title="AI Usta" />
      <div className="space-y-4 px-4 pb-4">
        <div className="rounded-card bg-plum p-5 text-primary-foreground shadow-float">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary-foreground/70">Görsel teknik destek</p>
          <h2 className="mt-1 text-2xl font-bold">AI Usta yanınızda.</h2>
          <p className="mt-1 text-sm text-primary-foreground/85">Modeminizi gösterin, birlikte kontrol edelim.</p>
          <ModemFront leds={MODEM_LED_DEMO} className="mt-4" />
        </div>

        {regional && (
          <div className="rounded-2xl border border-warning/30 bg-warning-soft p-3.5 text-sm">
            <p className="font-semibold">Bölgenizde bilinen bir arıza var</p>
            <p className="text-muted-foreground">Sorun sizden kaynaklı görünmüyor; modeminizde bir şey yapmanıza gerek yok. Gelişmeleri sizin için takip ediyoruz.</p>
          </div>
        )}

        {active ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-card bg-card p-4 shadow-card">
              <span className="font-semibold text-primary">Devam eden oturumunuz var</span>
              <StatusPill status={active.status} />
            </div>
            <Button size="xl" className="w-full" onClick={() => navigate({ to: "/ai-usta/$id", params: { id: active.id } })}>
              Kaldığım Yerden Devam Et
            </Button>
          </div>
        ) : (
          <Button
            size="xl"
            className="w-full"
            disabled={!!regional}
            onClick={() => {
              const id = startAiUsta({ issue: "down" });
              navigate({ to: "/ai-usta/$id", params: { id } });
            }}
          >
            <Camera /> Kamerayı aç
          </Button>
        )}

        <div className="grid grid-cols-3 gap-2">
          {[
            [ScanEye, "Işıkları birlikte okuruz"],
            [ListChecks, "Tek seferde bir güvenli adım"],
            [Headset, "Gerekirse bağlamla canlı destek"],
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
        <p className="px-1 text-xs text-muted-foreground">Kamera izni vermezseniz örnek bir modem görüntüsüyle devam edebilirsiniz. Çağrı merkezini aradıysanız, SMS'teki bağlantı sizi doğrudan buraya getirir.</p>
        <DemoNote>Görsel analiz bu prototipte simülasyondur; gerçek bir görüntü modeli kullanılmaz.</DemoNote>
      </div>
    </div>
  );
}
