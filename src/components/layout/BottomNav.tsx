import { Link, useRouterState } from "@tanstack/react-router";
import { House, LayoutGrid, ReceiptText, UserRound } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { GigaAvatar } from "@/features/giga/GigaAvatar";

const OPS_PREFIXES = ["/islemler", "/yardim", "/islem/", "/qr", "/goruntulu-destek", "/hiz-testi", "/dijital-onarim", "/ajanlar/hiz", "/hibrit", "/destek-kayitlari", "/takip", "/surec", "/tasinma", "/ai-usta", "/baglanti", "/fatura-kalkani", "/hallet", "/canli-destek"];
const ACC_PREFIXES = ["/hesabim", "/aile", "/tercihler", "/islem-gecmisi"];

function activeTab(path: string) {
  if (path === "/") return "home";
  if (path.startsWith("/faturalar") || path.startsWith("/otomatik-odeme")) return "bills";
  if (ACC_PREFIXES.some((p) => path.startsWith(p))) return "account";
  if (OPS_PREFIXES.some((p) => path.startsWith(p))) return "ops";
  return null;
}

export function BottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const active = activeTab(path);

  const Tab = ({ id, to, label, Icon }: { id: string; to: "/" | "/islemler" | "/faturalar" | "/hesabim"; label: string; Icon: typeof House }) => {
    const on = active === id;
    return (
      <Link to={to} className={cn("relative flex h-full flex-1 flex-col items-center justify-center gap-1 text-[0.8rem]", on ? "font-semibold text-primary" : "text-muted-foreground")} aria-current={on ? "page" : undefined}>
        <Icon className="size-6" strokeWidth={on ? 2 : 1.5} />
        <span>{label}</span>
        {on && <motion.span layoutId="tab-underline" className="absolute bottom-0 h-1 w-16 rounded-full bg-magenta" />}
      </Link>
    );
  };

  return (
    <nav aria-label="Ana menü" className="absolute inset-x-0 bottom-0 z-40 h-[76px] rounded-t-[24px] bg-card shadow-[0_-8px_24px_-12px_color-mix(in_oklab,var(--primary)_25%,transparent)]">
      <div className="flex h-full items-stretch">
        <Tab id="home" to="/" label="Ana Sayfa" Icon={House} />
        <Tab id="ops" to="/islemler" label="İşlemler" Icon={LayoutGrid} />
        <div className="flex w-[84px] shrink-0 items-end justify-center pb-2.5 text-[0.8rem] font-bold tracking-[0.08em] text-primary" aria-hidden>GIGA</div>
        <Tab id="bills" to="/faturalar" label="Faturalarım" Icon={ReceiptText} />
        <Tab id="account" to="/hesabim" label="Hesabım" Icon={UserRound} />
      </div>
      <Link
        to="/ajanlar"
        aria-label="GIGA"
        aria-current={path === "/ajanlar" || path === "/ajanlar/" ? "page" : undefined}
        className="absolute left-1/2 top-0 flex h-[66px] w-[66px] -translate-x-1/2 -translate-y-[42%] items-center justify-center rounded-full bg-card shadow-float ring-4 ring-card transition-transform active:scale-95"
      >
        <GigaAvatar size={54} label={false} />
      </Link>
    </nav>
  );
}
