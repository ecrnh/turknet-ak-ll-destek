import { Link } from "@tanstack/react-router";
import { ChevronRight, LifeBuoy, ReceiptText, Router, Sparkles } from "lucide-react";
import { USER } from "@/data/mock";
import { useAppStore } from "@/features/core/appStore";
import { useActingAccount } from "@/features/family/store";
import { GigaAvatar } from "@/features/giga/GigaAvatar";
import { useWorkflowStore } from "@/features/workflow/store";
import { isActive, STATUS_LABEL } from "@/features/workflow/rules";
import { whatsNext } from "@/features/workflow/copy";
import { StatusPill } from "@/features/workflow/components/ui";
import { useNow } from "@/hooks/use-now";
import { cn } from "@/lib/utils";

/** Greeting + main connection card. Speed is a simulated live value. */
export function HomeWelcome() {
  const net = useAppStore((s) => s.net);
  const acting = useActingAccount();
  const tick = useNow(3000);
  const live = net.status === "online" ? net.speed - ((tick / 3000) % 5) : net.speed;
  const down = net.status === "down";
  const label = { online: "İnternetin aktif", slow: "İnternetin beklenenden yavaş", down: "İnternetinde kesinti var", mobile: "Yedek bağlantıdasın" }[net.status];
  const to = down || net.status === "mobile" ? "/hibrit" : net.status === "slow" ? "/ai-usta" : "/hiz-testi";
  return (
    <Link to={to as "/"} className={cn("block rounded-card p-5 shadow-card", down ? "border border-destructive/30 bg-destructive-soft" : "bg-card")} aria-live="polite">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Merhaba, hoş geldin.</p>
          <p className="text-2xl font-semibold text-primary">{acting ? acting.short : USER.firstName}</p>
        </div>
        <span className="rounded-full bg-success-soft px-2.5 py-1 text-[11px] font-bold text-success">Abonelik aktif</span>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <span className={cn("h-3 w-3 shrink-0 rounded-full", down ? "bg-destructive" : net.status === "online" ? "animate-pulse bg-success" : "bg-warning")} />
        <div className="flex-1">
          <p className={cn("font-semibold", down ? "text-destructive" : "text-foreground")}>{label}</p>
          <p className="text-xs text-muted-foreground">
            {USER.packageName}
            {!down && ` · şu an ~${Math.max(0, Math.round(live))} Mbps (demo)`}
            {down && " · GIGA kesintiyi senin için takip ediyor"}
          </p>
        </div>
        <ChevronRight className="size-5 text-muted-foreground" />
      </div>
    </Link>
  );
}

const QUICK = [
  { to: "/hallet", label: "Benim İçin Hallet", icon: Sparkles },
  { to: "/ai-usta", label: "İnternetimle İlgili Yardım", icon: LifeBuoy },
  { to: "/hibrit", label: "Hibrit İnternet", icon: Router },
  { to: "/faturalar", label: "Faturalarım", icon: ReceiptText },
] as const;

export function QuickActions() {
  return (
    <nav aria-label="Hızlı işlemler" className="grid grid-cols-4 gap-2">
      {QUICK.map((q) => (
        <Link key={q.to} to={q.to} className="flex min-h-[96px] flex-col items-center justify-start gap-2 rounded-2xl bg-card px-1.5 py-3 text-center shadow-card">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-icon-box-border bg-icon-box text-primary">
            <q.icon className="size-5" strokeWidth={1.5} />
          </span>
          <span className="text-[11px] font-semibold leading-tight text-primary">{q.label}</span>
        </Link>
      ))}
    </nav>
  );
}

/** "Senin için buradayız": at most three suggestions chosen from the current state. */
export function ForYouCards() {
  const net = useAppStore((s) => s.net.status);
  const workflows = useWorkflowStore((s) => s.workflows);
  const autoPayOn = useWorkflowStore((s) => s.autoPay.status === "active");
  const moving = workflows.some((w) => w.type === "relocation" && isActive(w));
  const billing = workflows.some((w) => w.type === "billing_check" && isActive(w));
  const cards: { to: string; text: string }[] = [];
  if (net === "down" || net === "slow") cards.push({ to: "/ai-usta", text: "GIGA ile internet bağlantını birlikte kontrol edebiliriz." });
  if (!moving) cards.push({ to: "/tasinma", text: "Taşınmayı mı planlıyorsun? GIGA ile yeni adresini birlikte kontrol edelim." });
  if (!billing) cards.push({ to: "/fatura-kalkani", text: "Faturanda kontrol etmemizi istediğin bir şey var mı?" });
  if (!autoPayOn) cards.push({ to: "/otomatik-odeme", text: "Ödeme tarihini takip etmek zorunda kalma. Otomatik ödemeyi birlikte ayarlayalım." });
  if (net === "online") cards.push({ to: "/ai-usta", text: "GIGA ile internet bağlantını birlikte kontrol edebiliriz." });
  const list = cards.filter((c, i) => cards.findIndex((x) => x.to === c.to) === i).slice(0, 3);
  return (
    <section aria-labelledby="for-you">
      <h2 id="for-you" className="mb-2 text-[1.15rem] font-semibold text-primary">Senin için buradayız</h2>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 no-scrollbar">
        {list.map((c) => (
          <Link key={c.to} to={c.to as "/"} className="flex w-60 shrink-0 flex-col justify-between gap-3 rounded-card bg-referral p-4 shadow-card">
            <GigaAvatar size={30} label={false} />
            <p className="text-sm font-semibold leading-snug text-primary">{c.text}</p>
            <span className="flex items-center gap-1 text-xs font-semibold text-magenta">Başlayalım <ChevronRight className="size-3.5" /></span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/** "Devam Eden İşlemlerim": the most relevant active processes (decisions first). */
export function OngoingProcesses() {
  const workflows = useWorkflowStore((s) => s.workflows);
  const active = workflows.filter(isActive).sort((a, b) => Number(!!b.decision) - Number(!!a.decision) || b.updatedAt - a.updatedAt);
  if (!active.length) return null;
  return (
    <section aria-labelledby="ongoing">
      <div className="mb-2 flex items-center justify-between">
        <h2 id="ongoing" className="text-[1.15rem] font-semibold text-primary">Devam Eden İşlemlerim</h2>
        <Link to="/takip" className="text-sm font-semibold text-magenta">Tümü</Link>
      </div>
      <div className="space-y-2">
        {active.slice(0, 2).map((w) => (
          <Link key={w.id} to="/surec/$id" params={{ id: w.id }} className="block rounded-card bg-card p-4 shadow-card">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate font-semibold text-foreground">{w.title}</p>
              <StatusPill status={w.status} />
            </div>
            <p className={cn("mt-1 text-xs", w.decision ? "font-semibold text-warning" : "text-muted-foreground")}>
              {w.decision ? "Senden onay bekliyoruz" : `${STATUS_LABEL[w.status]} · ${whatsNext(w)}`}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
