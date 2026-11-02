import { Link } from "@tanstack/react-router";
import { ChevronRight, ListChecks, MapPinned, MessageCircle, ShieldCheck, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/headers";
import { useAppStore } from "@/features/core/appStore";
import { GigaNote } from "@/features/giga/GigaAvatar";
import { useWorkflowStore } from "@/features/workflow/store";
import { isActive } from "@/features/workflow/rules";
import { useFlow } from "@/lib/analytics";

const ACTIONS = [
  { to: "/tasinma", icon: MapPinned, title: "Taşınacağım", desc: "Yeni adresini kontrol eder, randevuya kadar süreci yönetiriz" },
  { to: "/fatura-kalkani", icon: ShieldCheck, title: "Faturamı kontrol et", desc: "Faturanı ödemelerinle karşılaştırır, farklılığı açıklarız" },
  { to: "/takip", icon: ListChecks, title: "Devam eden işlemlerimi takip et", desc: "Bütün süreçlerin tek yerde, adım adım" },
] as const;

/** "Benim İçin Hallet": the customer says what they need; GIGA follows the rest. */
export function BenimIcinHalletScreen() {
  useFlow("benim_icin_hallet");
  const openHelp = useAppStore((s) => s.openHelp);
  const workflows = useWorkflowStore((s) => s.workflows);
  const active = workflows.filter(isActive);
  const waiting = active.filter((w) => w.decision).length;

  return (
    <div>
      <PageHeader title="Benim İçin Hallet" />
      <div className="space-y-4 px-4">
        <div className="rounded-card bg-plum p-5 text-primary-foreground shadow-float">
          <p className="text-2xl font-semibold leading-snug">Sen söyle, biz halledelim.</p>
          <p className="mt-1 text-sm text-primary-foreground/80">İhtiyacını seç. Geri kalanını senin için takip edelim.</p>
          {active.length > 0 && (
            <p className="mt-3 text-xs font-semibold text-primary-foreground/85">
              Şu an {active.length} işlemin takipte{waiting ? ` · ${waiting} tanesi onayını bekliyor` : ""}
            </p>
          )}
        </div>

        <div className="space-y-2.5">
          {ACTIONS.map((a) => (
            <Link key={a.to} to={a.to} className="flex items-center gap-4 rounded-card bg-card p-4 shadow-card">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-icon-box text-primary">
                <a.icon className="size-6" strokeWidth={1.5} />
              </span>
              <span className="flex-1">
                <span className="block font-semibold text-primary">{a.title}</span>
                <span className="block text-xs text-muted-foreground">{a.desc}</span>
              </span>
              <ChevronRight className="size-5 text-muted-foreground" />
            </Link>
          ))}
        </div>

        <GigaNote>İhtiyacını söyle, mümkün olan işlemleri senin için kolaylaştıralım. Onayın gereken her adımda önce sana sorarım.</GigaNote>
        <button type="button" onClick={() => openHelp()} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-primary/20 bg-card text-sm font-semibold text-primary">
          <MessageCircle className="size-4" /> GIGA'ya yaz
        </button>

        <Link to="/aile" className="flex items-center gap-3 rounded-card bg-card p-4 shadow-card">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-icon-box text-primary">
            <Users className="size-5" />
          </span>
          <span className="flex-1">
            <span className="block font-semibold text-primary">Aile ve Yetkilendirme</span>
            <span className="block text-xs text-muted-foreground">Yakınların seçtiğin işlemleri senin adına yönetsin</span>
          </span>
          <ChevronRight className="size-5 text-muted-foreground" />
        </Link>
      </div>
    </div>
  );
}
