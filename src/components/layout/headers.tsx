import { Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Bell, Search } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { unreadCount, useAppStore } from "@/features/core/appStore";
import { SmartSearchBar } from "@/features/giga/SmartSearch";

export function TurknetLogo({ className }: { className?: string }) {
  return (
    <span aria-label="Turknet" className={cn("select-none font-extrabold leading-none tracking-tighter text-primary", className)}>
      t
    </span>
  );
}

export function BellButton({ small }: { small?: boolean }) {
  const count = useAppStore(unreadCount);
  return (
    <Link to="/bildirimler" aria-label={`Bildirimler, ${count} okunmamış`} className={cn("relative flex shrink-0 items-center", small ? "h-9 w-9" : "h-11 w-11", " justify-center rounded-full text-muted-foreground hover:bg-muted")}>
      <Bell className={small ? "size-5" : "size-7"} strokeWidth={1.5} />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex min-w-5 h-5 items-center justify-center rounded-full bg-magenta px-1 text-[10px] font-bold text-magenta-foreground ring-2 ring-card">
          {count}
        </span>
      )}
    </Link>
  );
}

export function HomeTopBar() {
  return (
    <div className="sticky top-0 z-30 flex items-center gap-2 rounded-b-[28px] bg-card px-3 pb-3 pt-3 shadow-card">
      <TurknetLogo className="text-[2.2rem]" />
      <SmartSearchBar />
      <BellButton small />
    </div>
  );
}

export function TabHeader({ title, search = true }: { title: string; search?: boolean }) {
  return (
    <div className="sticky top-0 z-30 flex items-center bg-background/95 px-5 pb-2 pt-4 backdrop-blur">
      <h1 className="flex-1 text-2xl font-semibold tracking-tight text-primary">{title}</h1>
      {search && (
        <Link to="/arama" aria-label="Ara" className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
          <Search className="size-7" strokeWidth={1.5} />
        </Link>
      )}
      <BellButton />
    </div>
  );
}

export function PageHeader({ title, right, dark, className }: { title: ReactNode; right?: ReactNode; dark?: boolean; className?: string }) {
  const router = useRouter();
  const back = () => {
    if (window.history.length > 1) router.history.back();
    else router.navigate({ to: "/" });
  };
  return (
    <div className={cn("sticky top-0 z-30 flex items-center gap-2 px-3 pb-2 pt-3", dark ? "bg-transparent text-call-foreground" : "bg-background/95 backdrop-blur", className)}>
      <button onClick={back} aria-label="Geri" className={cn("flex h-11 w-11 items-center justify-center rounded-full", dark ? "hover:bg-call-foreground/10" : "text-primary hover:bg-muted")}>
        <ArrowLeft className="size-6" />
      </button>
      <h1 className={cn("flex-1 truncate text-xl font-semibold tracking-tight", dark ? "text-call-foreground" : "text-primary")}>{title}</h1>
      {right}
    </div>
  );
}

