import { ChevronRight, HandCoins, MailOpen, Users } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { iconFor } from "./icons";
import { AppLink, IconBox, NewBadge } from "./primitives";
import type { OpItem } from "@/data/mock";

export function CampaignCard({ className }: { className?: string }) {
  return (
    <AppLink to="/islem/fiyat-sabitle" className={cn("block rounded-card bg-campaign p-5 text-primary-foreground shadow-card", className)}>
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-card text-primary">
          <HandCoins className="size-6" strokeWidth={1.75} />
        </span>
        <p className="flex-1 text-lg font-semibold leading-snug">12 Aylık Peşin Ödemede İndirimli Fiyat Fırsatı</p>
        <ChevronRight className="mt-1 size-5 shrink-0" />
      </div>
      <p className="mt-3 text-sm leading-relaxed text-primary-foreground/95">
        12 aylık peşin ödeyerek yılda ₺2.400 tasarruf edebilir ve 12 ay boyunca fiyatı sabitleyebilirsin. Böylece 2.5 ayın ücreti cebinde kalır. Peşin fiyatına 3 taksit imkanı da var.
      </p>
    </AppLink>
  );
}

export function ReferralCard({ className }: { className?: string }) {
  return (
    <AppLink to="/islem/arkadasini-getir" className={cn("block rounded-card border border-icon-box-border bg-referral p-5 shadow-card", className)}>
      <div className="flex items-center gap-3">
        <IconBox icon={MailOpen} className="bg-card" />
        <p className="flex-1 text-lg font-semibold text-primary">Arkadaşını Getir</p>
        <ChevronRight className="size-5 text-primary" />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">Turknet'e arkadaşını getirerek ücretsiz internet kullanabilirsin.</p>
      <div className="mt-4 flex items-center justify-between rounded-full bg-card px-5 py-3">
        <span className="font-semibold text-primary">Sayenizde Turknet'li Olanlar</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">1</span>
      </div>
      <p className="mt-4 flex items-center gap-2 text-sm">
        <Users className="size-5 text-primary" strokeWidth={1.75} />
        <span className="font-semibold text-magenta">+600.000</span>
        <span className="text-foreground">kullanıcı Arkadaşını Getirdi</span>
      </p>
    </AppLink>
  );
}

/** Vertical tile used in horizontally scrolling rows on the home page. */
export function ActionTile({ item }: { item: OpItem }) {
  const Icon = iconFor(item.icon);
  return (
    <AppLink
      to={item.to}
      className="relative flex h-[132px] w-[118px] shrink-0 snap-start flex-col items-center justify-center gap-2.5 rounded-tile bg-card px-2 text-center shadow-card transition-transform active:scale-95"
    >
      {item.isNew && <NewBadge className="absolute right-2 top-2" />}
      <IconBox icon={Icon} />
      <span className="text-[0.95rem] font-semibold leading-tight text-primary">{item.title}</span>
    </AppLink>
  );
}

export function TileScroller({ children }: { children: ReactNode }) {
  return <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 no-scrollbar">{children}</div>;
}

/** Horizontal two-column tile used on the İşlemler page. */
export function ActionRow({ item }: { item: OpItem }) {
  const Icon = iconFor(item.icon);
  return (
    <AppLink to={item.to} className="relative flex min-h-[64px] items-center gap-3 rounded-tile bg-card px-3.5 py-3 shadow-card transition-transform active:scale-[0.98]">
      <IconBox icon={Icon} />
      <span className="text-[0.95rem] font-semibold leading-tight text-primary">{item.title}</span>
      {item.isNew && <NewBadge className="absolute -top-1.5 right-2" />}
    </AppLink>
  );
}

export function ListCard({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("divide-y divide-border rounded-card bg-card px-5 shadow-card", className)}>{children}</div>;
}

export function ListRow({ title, to, onClick, right, badge, desc, icon }: { title: string; to?: string; onClick?: () => void; right?: ReactNode; badge?: ReactNode; desc?: string; icon?: ReactNode }) {
  const inner = (
    <>
      {icon}
      <div className="flex-1 text-left">
        <span className="flex items-center gap-2 text-[1.02rem] font-semibold text-foreground">
          {title}
          {badge}
        </span>
        {desc && <span className="block text-xs text-muted-foreground">{desc}</span>}
      </div>
      {right ?? <ChevronRight className="size-5 text-muted-foreground" />}
    </>
  );
  const cls = "flex min-h-[60px] w-full items-center gap-3 py-4";
  if (to)
    return (
      <AppLink to={to} className={cls}>
        {inner}
      </AppLink>
    );
  return (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}
