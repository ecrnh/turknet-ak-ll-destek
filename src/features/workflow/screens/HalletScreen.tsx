import { Link } from "@tanstack/react-router";
import { ChevronRight, ListChecks, MapPinned, ShieldCheck, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/headers";
import { useWorkflowStore } from "../store";
import { isActive } from "../rules";
import { StatusPill } from "../components/ui";

const ACTIONS = [
  { to: "/tasinma", icon: MapPinned, title: "Taşınacağım", text: "Yeni adresinizi kontrol edelim, taşınmayı ve kurulumu sizin için yönetelim.", type: "relocation" },
  { to: "/fatura-kalkani", icon: ShieldCheck, title: "Faturamı kontrol et", text: "Faturanızı, ödemelerinizi ve indirimlerinizi sizin için karşılaştıralım.", type: "billing_check" },
  { to: "/takip", icon: ListChecks, title: "Devam eden işlemlerimi takip et", text: "Tüm işlemlerinizin durumu ve sıradaki adımı tek yerde.", type: null },
] as const;

/** "Benim İçin Hallet": the customer only says what they need. */
export function HalletScreen() {
  const workflows = useWorkflowStore((s) => s.workflows);
  const activeCount = workflows.filter(isActive).length;
  return (
    <div>
      <PageHeader title="Benim İçin Hallet" />
      <div className="space-y-4 px-4 pb-4">
        <div className="rounded-card bg-plum p-5 text-primary-foreground shadow-float">
          <h2 className="text-2xl font-bold leading-tight">Siz söyleyin, biz halledelim.</h2>
          <p className="mt-2 text-sm text-primary-foreground/85">İhtiyacınızı seçin. Geri kalanını sizin için takip edelim.</p>
        </div>

        <div className="space-y-3">
          {ACTIONS.map((a) => {
            const running = a.type ? workflows.find((w) => w.type === a.type && isActive(w)) : null;
            return (
              <Link key={a.to} to={a.to} className="flex items-start gap-4 rounded-card bg-card p-5 shadow-card transition-transform active:scale-[0.99]">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-icon-box-border bg-icon-box text-primary">
                  <a.icon className="size-6" strokeWidth={1.75} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-semibold leading-tight text-primary">{a.title}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{a.text}</span>
                  {running && (
                    <span className="mt-2 flex items-center gap-2 text-xs">
                      <StatusPill status={running.status} /> <span className="text-muted-foreground">Devam eden işleminiz var</span>
                    </span>
                  )}
                  {!a.type && activeCount > 0 && <span className="mt-2 block text-xs font-semibold text-magenta">{activeCount} işlem takipte</span>}
                </span>
                <ChevronRight className="mt-1 size-5 text-muted-foreground" />
              </Link>
            );
          })}
        </div>

        <Link to="/aile" className="flex items-center gap-3 rounded-card border border-primary/10 bg-card p-4">
          <Users className="size-5 text-magenta" />
          <span className="flex-1">
            <span className="block text-sm font-semibold text-primary">Aile Yetkilendirmesi</span>
            <span className="block text-xs text-muted-foreground">Yakınlarınız seçtiğiniz işlemleri sizin adınıza takip etsin.</span>
          </span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
      </div>
    </div>
  );
}
