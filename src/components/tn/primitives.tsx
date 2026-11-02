import { Link, type LinkProps } from "@tanstack/react-router";
import { cva, type VariantProps } from "class-variance-authority";
import { AlertTriangle, CheckCircle2, Info, XCircle, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

/** Link that accepts any app path string (mock data holds paths as strings). */
export function AppLink({ to, className, children, onClick, ...rest }: { to: string; className?: string; children: ReactNode; onClick?: () => void } & Omit<LinkProps, "to" | "children">) {
  return (
    <Link to={to as "/"} className={className} onClick={onClick} {...rest}>
      {children}
    </Link>
  );
}

export function IconBox({ icon: Icon, className, size = "md" }: { icon: LucideIcon; className?: string; size?: "sm" | "md" | "lg" }) {
  const s = size === "sm" ? "h-9 w-9 rounded-lg [&_svg]:size-4" : size === "lg" ? "h-14 w-14 rounded-2xl [&_svg]:size-7" : "h-11 w-11 rounded-xl [&_svg]:size-5";
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center border border-icon-box-border bg-icon-box text-primary", s, className)}>
      <Icon strokeWidth={1.75} aria-hidden />
    </span>
  );
}

export function SectionTitle({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-3 mt-7 flex items-center justify-between px-1", className)}>
      <h2 className="text-[1.35rem] font-semibold tracking-tight text-primary">{children}</h2>
      {action}
    </div>
  );
}

export function NewBadge({ className, children = "Yeni" }: { className?: string; children?: ReactNode }) {
  return <span className={cn("inline-flex items-center rounded-full bg-magenta px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-magenta-foreground", className)}>{children}</span>;
}

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-card bg-card p-5 shadow-card", className)} {...rest}>
      {children}
    </div>
  );
}

const bannerVariants = cva("flex items-start gap-3 rounded-2xl border p-3.5 text-sm", {
  variants: {
    tone: {
      info: "border-magenta/20 bg-magenta-soft text-foreground [&_svg.ic]:text-magenta",
      success: "border-success/25 bg-success-soft text-foreground [&_svg.ic]:text-success",
      warning: "border-warning/30 bg-warning-soft text-foreground [&_svg.ic]:text-warning",
      error: "border-destructive/25 bg-destructive-soft text-foreground [&_svg.ic]:text-destructive",
    },
  },
  defaultVariants: { tone: "info" },
});

const bannerIcon = { info: Info, success: CheckCircle2, warning: AlertTriangle, error: XCircle };

export function Banner({ tone = "info", title, children, className, action }: VariantProps<typeof bannerVariants> & { title?: ReactNode; children?: ReactNode; className?: string; action?: ReactNode }) {
  const Icon = bannerIcon[tone ?? "info"];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn(bannerVariants({ tone }), className)}>
      <Icon className="ic mt-0.5 size-5 shrink-0" />
      <div className="flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="text-muted-foreground">{children}</div>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <span className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-magenta-soft text-magenta">
        <Icon className="size-9" strokeWidth={1.5} />
      </span>
      <p className="text-lg font-semibold text-primary">{title}</p>
      {text && <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ToggleRow({ title, desc, checked, onChange, disabled, id }: { title: string; desc?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; id: string }) {
  return (
    <label htmlFor={id} className={cn("flex min-h-14 items-center gap-3 py-3", disabled && "opacity-60")}>
      <div className="flex-1">
        <p className="font-semibold text-foreground">{title}</p>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} className="data-[state=checked]:bg-magenta" />
    </label>
  );
}

export function Chip({ active, children, onClick, className }: { active?: boolean; children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "min-h-11 rounded-full border px-4 text-sm font-semibold transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "border-primary/25 bg-card text-primary hover:bg-accent",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function StatRow({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between border-b border-border py-2.5 text-sm last:border-0", className)}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}

/** Calm, first-level explanation inside an ordinary feature (no assistant identity). */
export function PlainNote({ children, className, icon: Icon = Info }: { children: ReactNode; className?: string; icon?: LucideIcon }) {
  return (
    <div className={cn("flex items-start gap-2.5 rounded-2xl bg-card px-3.5 py-3 text-sm leading-relaxed text-foreground shadow-card", className)} role="note">
      <Icon className="mt-0.5 size-4 shrink-0 text-magenta" aria-hidden />
      <div className="flex-1">{children}</div>
    </div>
  );
}
