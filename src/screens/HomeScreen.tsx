import { Link } from "@tanstack/react-router";
import { ChevronRight, Gauge, LifeBuoy, ListChecks, MapPinned, MessageCircleQuestion, ReceiptText, Router, ShieldCheck, Smartphone, Sparkles, Video, Wifi, WifiOff } from "lucide-react";
import { HomeTopBar } from "@/components/layout/headers";
import { SectionTitle } from "@/components/tn/primitives";
import { USER } from "@/data/mock";
import { useAppStore } from "@/features/core/appStore";
import { useActingAccount } from "@/features/family/store";
import { OutageHomeCard } from "@/features/workflow/components/hybrid";
import { StatusPill } from "@/features/workflow/components/ui";
import { customerAction } from "@/features/workflow/copy";
import { isActive } from "@/features/workflow/rules";
import { useWorkflowStore } from "@/features/workflow/store";
import { useNow } from "@/hooks/use-now";
import { cn } from "@/lib/utils";

/** Simulated live speed: small jitter around the last measured value (demo, not a real test). */
function useLiveSpeed(base: number) {
  const t = useNow(2_000);
  if (base <= 0) return 0;
  const wobble = Math.round(Math.sin(t / 2_300) * 3 + Math.cos(t / 3_700) * 2);
  return Math.max(1, base + wobble);
}

function Greeting() {
  const acting = useActingAccount();
  return (
    <div className="px-5 pb-2 pt-5 text-primary-foreground">
      <p className="text-sm text-primary-foreground/80">Merhaba, hoş geldiniz.</p>
      <p className="text-[1.75rem] font-bold leading-tight">{acting ? acting.short : USER.firstName}</p>
      <p className="mt-1 flex items-center gap-1.5 text-xs text-primary-foreground/80">
        <span className="h-1.5 w-1.5 rounded-full bg-neon-lime" /> Aboneliğiniz aktif · {acting ? acting.packageName : USER.packageName}
      </p>
    </div>
  );
}

function ConnectionCard() {
  const net = useAppStore((s) => s.net);
  const live = useLiveSpeed(net.status === "online" || net.status === "slow" || net.status === "mobile" ? net.speed : 0);
  const down = net.status === "down";
  const mobile = net.status === "mobile";
  const slow = net.status === "slow";
  const title = down ? "İnternetinizde kesinti var" : mobile ? "Yedek bağlantınız aktif" : slow ? "İnternetiniz yavaş görünüyor" : "İnternetiniz aktif";
  const sub = down ? "Durumu sizin için takip ediyoruz." : mobile ? "Ana bağlantınız düzelene kadar yedek bağlantıdasınız." : slow ? "Birlikte hızınızı iyileştirmeyi deneyebiliriz." : "Bağlantınız normal çalışıyor.";
  const to = down || mobile ? "/hibrit" : slow ? "/ajanlar/hiz" : "/baglanti";
  const Icon = down ? WifiOff : mobile ? Smartphone : slow ? Gauge : Wifi;
  return (
    <Link to={to as "/"} className={cn("mx-4 block rounded-card bg-card p-5 shadow-card transition-transform active:scale-[0.99]", down && "ring-2 ring-destructive/30")} aria-live="polite">
      <div className="flex items-start gap-3">
        <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", down ? "bg-destructive-soft text-destructive" : mobile || slow ? "bg-warning-soft text-warning" : "bg-success-soft text-success")}>
          <Icon className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold leading-tight text-primary">{title}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{sub}</p>
        </div>
        <ChevronRight className="mt-1 size-5 text-muted-foreground" />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-muted px-2 py-2">
          <p className="text-[11px] text-muted-foreground">Paketiniz</p>
          <p className="font-semibold text-foreground">{USER.packageSpeed} Mbps</p>
        </div>
        <div className="rounded-xl bg-muted px-2 py-2">
          <p className="text-[11px] text-muted-foreground">Anlık hız</p>
          <p className={cn("font-semibold tabular-nums", down ? "text-destructive" : slow ? "text-warning" : "text-foreground")}>{down ? "—" : `${live} Mbps`}</p>
        </div>
        <div className="rounded-xl bg-muted px-2 py-2">
          <p className="text-[11px] text-muted-foreground">Bağlantı</p>
          <p className="font-semibold text-foreground">{down ? "Kesik" : mobile ? "Yedek" : "Fiber"}</p>
        </div>
      </div>
      <p className="mt-2 text-right text-[10px] text-muted-foreground">Anlık hız demo verisidir</p>
    </Link>
  );
}

const QUICK = [
  { to: "/hallet", label: "Benim İçin Hallet", icon: Sparkles },
  { to: "/yardim", label: "İnternetimle İlgili Yardım", icon: LifeBuoy },
  { to: "/hibrit", label: "Hibrit İnternet", icon: Router },
  { to: "/faturalar", label: "Faturalarım", icon: ReceiptText },
] as const;

function QuickActions() {
  return (
    <div className="grid grid-cols-4 gap-2 px-4">
      {QUICK.map(({ to, label, icon: Icon }) => (
        <Link key={to} to={to} className="flex flex-col items-center gap-2 rounded-2xl bg-card px-1 py-3 text-center shadow-card">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-icon-box-border bg-icon-box text-primary">
            <Icon className="size-5" strokeWidth={1.75} />
          </span>
          <span className="text-[11px] font-semibold leading-tight text-primary">{label}</span>
        </Link>
      ))}
    </div>
  );
}

function ForYou() {
  const net = useAppStore((s) => s.net.status);
  const workflows = useWorkflowStore((s) => s.workflows);
  const has = (type: string) => workflows.some((w) => w.type === type && isActive(w));
  const cards: { to: string; icon: typeof Wifi; text: string }[] = [];
  if (net === "down" && !has("ai_usta") && !has("outage_recovery")) cards.push({ to: "/yardim", icon: WifiOff, text: "İnternet bağlantınızı birlikte kontrol edebiliriz." });
  if (net === "slow" && !has("speed_optimize")) cards.push({ to: "/ajanlar/hiz", icon: Gauge, text: "İnternetiniz beklenenden yavaş. Birlikte iyileştirmeyi deneyelim." });
  if (!has("relocation")) cards.push({ to: "/tasinma", icon: MapPinned, text: "Taşınmayı mı planlıyorsunuz? Yeni adresinizi birlikte kontrol edelim." });
  if (!has("billing_check")) cards.push({ to: "/fatura-kalkani", icon: ShieldCheck, text: "Faturanızda kontrol etmemizi istediğiniz bir şey var mı?" });
  if (net === "online") cards.push({ to: "/yardim", icon: Wifi, text: "İnternet bağlantınızı birlikte kontrol edebiliriz." });
  return (
    <div className="space-y-2.5">
      {cards.slice(0, 3).map((c) => (
        <Link key={c.text} to={c.to as "/"} className="flex items-center gap-3 rounded-card bg-card p-4 shadow-card">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-magenta-soft text-magenta">
            <c.icon className="size-5" />
          </span>
          <span className="flex-1 text-sm font-semibold leading-snug text-primary">{c.text}</span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
      ))}
    </div>
  );
}

function OngoingProcesses() {
  const workflows = useWorkflowStore((s) => s.workflows);
  const active = workflows.filter(isActive).sort((a, b) => Number(!!b.decision) - Number(!!a.decision) || b.updatedAt - a.updatedAt);
  if (!active.length)
    return (
      <Link to="/takip" className="flex items-center gap-3 rounded-card bg-card p-4 shadow-card">
        <ListChecks className="size-5 text-muted-foreground" />
        <span className="flex-1 text-sm text-muted-foreground">Şu an devam eden bir işleminiz yok.</span>
        <ChevronRight className="size-4 text-muted-foreground" />
      </Link>
    );
  return (
    <div className="space-y-2.5">
      {active.slice(0, 2).map((w) => {
        const a = customerAction(w);
        return (
          <Link key={w.id} to="/surec/$id" params={{ id: w.id }} className="block rounded-card bg-card p-4 shadow-card">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold leading-tight text-primary">{w.title}</p>
              <StatusPill status={w.status} />
            </div>
            <p className={cn("mt-2 text-xs", a.needed ? "font-semibold text-magenta" : "text-muted-foreground")}>{a.needed && w.decision ? `Sizden beklenen: ${w.decision.prompt}` : a.text}</p>
          </Link>
        );
      })}
      {active.length > 2 && (
        <Link to="/takip" className="flex min-h-10 items-center justify-center text-sm font-semibold text-magenta">
          Tüm işlemlerim ({active.length})
        </Link>
      )}
    </div>
  );
}

function SimpleHome() {
  const openHelp = useAppStore((s) => s.openHelp);
  const Big = ({ icon: Icon, label, to, onClick }: { icon: typeof Video; label: string; to?: string; onClick?: () => void }) => {
    const cls = "flex min-h-[120px] flex-col items-center justify-center gap-3 rounded-card bg-card p-4 text-center shadow-card";
    const inner = (
      <>
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-icon-box text-primary">
          <Icon className="size-8" strokeWidth={1.5} />
        </span>
        <span className="text-lg font-semibold leading-tight text-primary">{label}</span>
      </>
    );
    return to ? (
      <Link to={to as "/"} className={cls}>
        {inner}
      </Link>
    ) : (
      <button onClick={onClick} className={cls}>
        {inner}
      </button>
    );
  };
  return (
    <div className="grid grid-cols-2 gap-3 px-4">
      <Big icon={ReceiptText} label="Faturam" to="/faturalar" />
      <Big icon={WifiOff} label="İnternetim çalışmıyor" to="/ai-usta" />
      <Big icon={Video} label="Görüntülü yardım al" to="/goruntulu-destek" />
      <Big icon={MessageCircleQuestion} label="Soru sor" onClick={() => openHelp()} />
    </div>
  );
}

export function HomeScreen() {
  const simple = useAppStore((s) => s.prefs.simpleMode);

  return (
    <div className="pb-4">
      <HomeTopBar />
      <div className="-mt-7 bg-hero pb-16 pt-7">
        <Greeting />
      </div>
      <div className="-mt-14 space-y-4">
        <ConnectionCard />
        <div className="px-4 empty:hidden">
          <OutageHomeCard />
        </div>
        {simple ? (
          <SimpleHome />
        ) : (
          <>
            <QuickActions />
            <div className="px-4">
              <SectionTitle>Sizin için buradayız</SectionTitle>
              <ForYou />
              <SectionTitle action={<Link to="/takip" className="text-sm font-semibold text-magenta">Tümü</Link>}>Devam Eden İşlemlerim</SectionTitle>
              <OngoingProcesses />
              <Link to="/islemler" className="mt-4 flex min-h-12 items-center justify-center gap-1 rounded-full border border-primary/15 bg-card text-sm font-semibold text-primary">
                Tüm işlemler ve hizmetler <ChevronRight className="size-4" />
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
