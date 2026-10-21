import { useAppStore, type NetStatus } from "@/features/core/appStore";
import { cn } from "@/lib/utils";

export const NET_LABEL: Record<NetStatus, string> = {
  online: "Çevrimiçi",
  slow: "Yavaş",
  outage: "Kesinti",
  backup: "Yedek Altyapıda",
};

export const NET_DOT: Record<NetStatus, string> = {
  online: "bg-success",
  slow: "bg-warning",
  outage: "bg-destructive",
  backup: "bg-orange",
};

export const NET_TEXT: Record<NetStatus, string> = {
  online: "text-success",
  slow: "text-warning",
  outage: "text-destructive",
  backup: "text-orange",
};

export function NetBadge({ className, onDark }: { className?: string; onDark?: boolean }) {
  const status = useAppStore((s) => s.net.status);
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold", onDark ? "bg-primary-foreground/15" : "bg-card shadow-card", className)}>
      <span className="relative flex h-2 w-2">
        <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", NET_DOT[status])} />
        <span className={cn("relative inline-flex h-2 w-2 rounded-full", NET_DOT[status])} />
      </span>
      <span className={onDark ? "text-primary-foreground" : "text-foreground"}>İnternet: {NET_LABEL[status]}</span>
    </span>
  );
}
