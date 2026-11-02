import { Link } from "@tanstack/react-router";
import { ChevronRight, MessageCircleQuestion, ReceiptText, Video, WifiOff } from "lucide-react";
import { HomeTopBar } from "@/components/layout/headers";
import { ActionTile, CampaignCard, TileScroller } from "@/components/tn/cards";
import { NET_DOT, NET_LABEL, NET_TEXT } from "@/components/tn/NetStatus";
import { SectionTitle } from "@/components/tn/primitives";
import { INTERNET_OPS, SUBSCRIPTION_OPS, SUPPORT_OPS, USER } from "@/data/mock";
import { useAppStore } from "@/features/core/appStore";
import { useActingAccount } from "@/features/family/store";
import { AgentActivityCard } from "@/features/aiAgents/components/AgentActivityCard";
import { OutageHomeCard } from "@/features/workflow/components/hybrid";
import { cn } from "@/lib/utils";
import { HeroCarousel } from "./home/HeroCarousel";

function StatusPill() {
  const status = useAppStore((s) => s.net.status);
  const acting = useActingAccount();
  const to = status === "down" || status === "mobile" ? "/hibrit" : status === "slow" ? "/ajanlar/hiz" : "/hiz-testi";
  return (
    <div className="mx-auto -mt-1 flex w-[88%] overflow-hidden rounded-full bg-primary-deep/85 text-primary-foreground shadow-float backdrop-blur">
      <Link to="/hesabim" className="flex flex-1 flex-col justify-center rounded-full border border-primary-foreground/10 bg-primary/40 px-5 py-2.5">
        <span className="text-xs text-primary-foreground/70">Hesabım</span>
        <span className="text-sm font-medium">{acting ? acting.location : USER.location}</span>
      </Link>
      <Link to={to as "/"} className="flex flex-1 flex-col items-center justify-center px-3 py-2.5" aria-live="polite">
        <span className="text-sm">İnternet Durumu:</span>
        <span className={cn("flex items-center gap-1.5 text-sm font-semibold", status === "online" ? "text-neon-lime" : NET_TEXT[status])}>
          {NET_LABEL[status]} <span className={cn("h-1.5 w-1.5 rounded-full", status === "online" ? "bg-neon-lime" : NET_DOT[status])} />
        </span>
      </Link>
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
    <div className="mt-5 grid grid-cols-2 gap-3">
      <Big icon={ReceiptText} label="Faturam" to="/faturalar" />
      <Big icon={WifiOff} label="İnternetim çalışmıyor" to="/ai-usta" />
      <Big icon={Video} label="Görüntülü yardım al" to="/goruntulu-destek" />
      <Big icon={MessageCircleQuestion} label="GIGA'ya sor" onClick={() => openHelp()} />
    </div>
  );
}

export function HomeScreen() {
  const simple = useAppStore((s) => s.prefs.simpleMode);

  return (
    <div>
      <HomeTopBar />
      <div className="-mt-7 bg-hero pb-6 pt-7">
        {!simple && <HeroCarousel />}
        <div className={simple ? "pt-4" : ""}>
          <StatusPill />
        </div>
      </div>

      <div className="space-y-4 px-4">
        <OutageHomeCard />
        {simple ? (
          <SimpleHome />
        ) : (
          <>
            <AgentActivityCard />
            <CampaignCard />
          </>
        )}
      </div>

      <div className="px-4">
        <SectionTitle>Destek İşlemlerim</SectionTitle>
        <TileScroller>
          {SUPPORT_OPS.map((o) => (
            <ActionTile key={o.slug} item={o} />
          ))}
        </TileScroller>
        <Link to="/goruntulu-destek" className="mt-3 flex items-center gap-3 rounded-card border-gradient p-4 shadow-card">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-magenta text-magenta-foreground">
            <Video className="size-5" />
          </span>
          <span className="flex-1">
            <span className="block font-semibold text-primary">Modem sorunu mu? Uzman görsün</span>
            <span className="block text-xs text-muted-foreground">Ortalama bekleme 2 dk · saha ekibi beklemeden çözüm</span>
          </span>
          <ChevronRight className="size-5 text-primary" />
        </Link>

        <SectionTitle>Abonelik İşlemlerim</SectionTitle>
        <TileScroller>
          {SUBSCRIPTION_OPS.map((o) => (
            <ActionTile key={o.slug} item={o} />
          ))}
        </TileScroller>

        <SectionTitle>İnternet İşlemlerim</SectionTitle>
        <TileScroller>
          {INTERNET_OPS.map((o) => (
            <ActionTile key={o.slug} item={o} />
          ))}
        </TileScroller>
      </div>
    </div>
  );
}
