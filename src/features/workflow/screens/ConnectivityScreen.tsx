import { Link } from "@tanstack/react-router";
import { Router, Smartphone } from "lucide-react";
import { PageHeader } from "@/components/layout/headers";
import { SectionTitle } from "@/components/tn/primitives";
import { HYBRID_OFFER, TEMP_MOBILE_OFFER } from "@/data/mock";
import { useWorkflowStore } from "@/features/workflow";
import { ConnectivityPanel } from "../components/panels";
import { DemoNote, WorkflowCard } from "../components/ui";

const TYPES = ["outage_recovery", "proactive_fault", "temp_internet", "ai_usta"];

export function ConnectivityScreen() {
  const related = useWorkflowStore((s) => s.workflows).filter((w) => TYPES.includes(w.type)).sort((a, b) => b.updatedAt - a.updatedAt);
  return (
    <div>
      <PageHeader title="Bağlantım" />
      <div className="space-y-4 px-4">
        <ConnectivityPanel />

        {related.length > 0 && (
          <>
            <SectionTitle className="mt-5">Bağlantı süreçleri</SectionTitle>
            <div className="space-y-3">
              {related.map((w) => (
                <WorkflowCard key={w.id} wf={w} />
              ))}
            </div>
          </>
        )}

        <SectionTitle className="mt-5">İnternetsiz kalmamak için</SectionTitle>
        <p className="-mt-1 px-1 text-sm text-muted-foreground">İki farklı hizmet; teknik ve ticari koşulları farklıdır.</p>
        {[
          { o: TEMP_MOBILE_OFFER, Icon: Smartphone, use: "Sabit internet henüz kurulamadıysa (taşınma, gecikme)" },
          { o: HYBRID_OFFER, Icon: Router, use: "Sabit hat kesildiğinde modem otomatik mobil yedeğe geçer" },
        ].map(({ o, Icon, use }) => (
          <div key={o.title} className="rounded-card bg-card p-5 shadow-card">
            <p className="flex items-center gap-2 font-semibold text-primary">
              <Icon className="size-5" /> {o.title}
            </p>
            <p className="mt-1 text-xs font-semibold text-magenta">{use}</p>
            <dl className="mt-3 space-y-1 text-xs">
              {[
                ["Cihaz", o.device],
                ["Ücret", o.price],
                ["Kapsama", o.coverage],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <dt className="w-16 shrink-0 text-muted-foreground">{k}</dt>
                  <dd className="text-foreground">{v}</dd>
                </div>
              ))}
            </dl>
            <ul className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
              {o.terms.map((t) => (
                <li key={t}>• {t}</li>
              ))}
            </ul>
          </div>
        ))}
        <Link to="/ai-usta" className="block rounded-card border-gradient p-4 text-center font-semibold text-primary shadow-card">
          Bağlantımda sorun var → AI Usta
        </Link>
        <DemoNote className="pb-2">Kapsama, cihaz ve fiyat bilgileri demo verisidir; gerçek operatör anlaşması yoktur.</DemoNote>
      </div>
    </div>
  );
}
