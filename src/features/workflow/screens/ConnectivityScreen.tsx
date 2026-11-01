import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Gauge, Router, ScanEye, Smartphone } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/layout/headers";
import { SectionTitle } from "@/components/tn/primitives";
import { HYBRID_OFFER, TEMP_MOBILE_OFFER } from "@/data/mock";
import { startSpeedCheck, useWorkflowStore } from "@/features/workflow";
import { isActive } from "../rules";
import { BoxCard, ConnectivityPanel, HealthCard } from "../components/panels";
import { DemoNote, TechDetails, WorkflowCard } from "../components/ui";

const TYPES = ["outage_recovery", "proactive_fault", "speed_optimize", "temp_internet", "ai_usta"];

/** Bağlantım: health, speed, outage state, Box / hybrid and temporary internet in one place. */
export function ConnectivityScreen() {
  const navigate = useNavigate();
  const workflows = useWorkflowStore((s) => s.workflows);
  const connectivity = useWorkflowStore((s) => s.connectivity);
  const related = workflows.filter((w) => TYPES.includes(w.type) && isActive(w)).sort((a, b) => b.updatedAt - a.updatedAt);
  const offerWf = workflows.find((w) => isActive(w) && (w.decision?.key === "outage_alt" || w.decision?.key === "relocation_temp"));
  const [showTemp, setShowTemp] = useState(false);

  return (
    <div>
      <PageHeader title="Bağlantım" />
      <div className="space-y-4 px-4">
        <HealthCard />

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              const id = startSpeedCheck();
              navigate({ to: "/surec/$id", params: { id } });
            }}
            className="flex min-h-[96px] flex-col justify-between rounded-card bg-card p-4 text-left shadow-card"
          >
            <Gauge className="size-6 text-magenta" />
            <span className="font-semibold leading-tight text-primary">Hızımı Kontrol Et</span>
          </button>
          <Link to="/ai-usta" className="flex min-h-[96px] flex-col justify-between rounded-card bg-card p-4 shadow-card">
            <ScanEye className="size-6 text-magenta" />
            <span className="font-semibold leading-tight text-primary">Sorunu AI Usta ile Çöz</span>
          </Link>
        </div>

        {related.length > 0 && (
          <>
            <SectionTitle className="mt-5">Bağlantı işlemleriniz</SectionTitle>
            <div className="space-y-3">
              {related.map((w) => (
                <WorkflowCard key={w.id} wf={w} />
              ))}
            </div>
          </>
        )}

        <BoxCard />

        {connectivity.hybridEnabled && (
          <div className="rounded-card bg-card p-5 shadow-card">
            <p className="flex items-center gap-2 font-semibold text-primary">
              <Router className="size-5" /> Hibrit bağlantı
            </p>
            <ol className="mt-3 flex items-center gap-1 text-[11px] font-semibold">
              {[
                ["Sabit aktif", connectivity.mode === "fixed" && connectivity.fixed === "up"],
                ["Mobil yedek aktif", connectivity.mode === "hybrid_backup"],
                ["Bağlantı geri döndü", connectivity.mode === "fixed" && connectivity.mobile === "standby"],
              ].map(([l, on]) => (
                <li key={l as string} className={`flex-1 rounded-xl px-2 py-2 text-center ${on ? "bg-magenta text-magenta-foreground" : "bg-muted text-muted-foreground"}`}>
                  {l as string}
                </li>
              ))}
            </ol>
          </div>
        )}

        <SectionTitle className="mt-5">İnternetsiz kalmayın</SectionTitle>
        <div className="rounded-card bg-card p-5 shadow-card">
          <p className="font-semibold text-primary">Geçici internet</p>
          <p className="mt-1 text-sm text-muted-foreground">Sabit internetiniz kesildiğinde veya yeni adresinizde kurulum beklerken bağlantıda kalabilirsiniz.</p>
          {offerWf ? (
            <Link to="/surec/$id" params={{ id: offerWf.id }} className="mt-4 flex min-h-12 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-float">
              Size Özel Teklifi İnceleyin
            </Link>
          ) : (
            <button type="button" onClick={() => setShowTemp((v) => !v)} className="mt-4 flex min-h-12 w-full items-center justify-center gap-1 rounded-full border border-primary/20 text-sm font-semibold text-primary">
              Geçici İnterneti İncele <ChevronRight className="size-4" />
            </button>
          )}
          {!offerWf && showTemp && (
            <div className="mt-4 space-y-3">
              <p className="rounded-2xl bg-muted p-3 text-xs text-muted-foreground">
                {connectivity.fixed === "up" ? "Sabit internetiniz şu an çalışıyor. Bir kesinti veya taşınma olduğunda size uygun seçeneği otomatik olarak sunarız." : "Uygunluğunuzu kontrol ediyoruz; size uygun teklif işlem sayfanızda görünecek."}
              </p>
              {[
                { o: TEMP_MOBILE_OFFER, Icon: Smartphone, use: "Ayrı, SIM kartlı cihaz · uygulamadan açıp kapatılır" },
                { o: HYBRID_OFFER, Icon: Router, use: "Mevcut modeminiz kesintide otomatik yedeğe geçer" },
              ].map(({ o, Icon, use }) => (
                <div key={o.title} className="rounded-2xl border border-border p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <Icon className="size-4" /> {o.title}
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-magenta">{use}</p>
                  <dl className="mt-2 space-y-1 text-xs">
                    {[
                      ["Cihaz", o.device],
                      ["Ücret", o.price],
                      ["Kota", o.quota],
                    ].map(([k, v]) => (
                      <div key={k} className="flex gap-2">
                        <dt className="w-12 shrink-0 text-muted-foreground">{k}</dt>
                        <dd className="text-foreground">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          )}
        </div>

        <TechDetails>
          <ConnectivityPanel />
          <DemoNote>Kapsama, cihaz, hız ve fiyat bilgileri demo verisidir; gerçek operatör anlaşması veya cihaz bağlantısı yoktur.</DemoNote>
        </TechDetails>
        <div className="pb-2" />
      </div>
    </div>
  );
}
