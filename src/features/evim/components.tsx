import { Crown, Lock, ShieldCheck, UserX, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/layout/headers";
import { AppLink, EmptyState } from "@/components/tn/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PERSONAS, useEvimStore } from "./store";
import { permsFor, resolveRole, ROLE_LABEL, type EvimPerm, type EvimRole } from "./rules";

export function useEvim() {
  const persona = useEvimStore((s) => s.persona);
  const members = useEvimStore((s) => s.members);
  const role = resolveRole(persona, members);
  const perms = permsFor(persona, members);
  const user = PERSONAS.find((p) => p.id === persona) ?? PERSONAS[0]!;
  return { persona, role, perms, user, members };
}

const ROLE_ICON: Record<EvimRole, LucideIcon> = { owner: Crown, member: ShieldCheck, unauthorized: UserX };

export function RoleBadge({ role, className }: { role: EvimRole; className?: string }) {
  const Icon = ROLE_ICON[role];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold",
        role === "owner" ? "bg-primary text-primary-foreground" : role === "member" ? "bg-magenta-soft text-magenta" : "bg-muted text-muted-foreground",
        className,
      )}
    >
      <Icon className="size-3.5" /> {ROLE_LABEL[role]}
    </span>
  );
}

/** Page header for every TürkNet Evim screen: the current role is always visible. */
export function EvimHeader({ title }: { title: string }) {
  const { role } = useEvim();
  return <PageHeader title={title} right={<RoleBadge role={role} className="mr-1" />} />;
}

export function ServiceRow({ icon: Icon, title, desc, to, onClick, locked, badge }: { icon: LucideIcon; title: string; desc?: string; to?: string; onClick?: () => void; locked?: boolean; badge?: ReactNode }) {
  const inner = (
    <>
      <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-icon-box text-primary", locked && "opacity-50")}>
        <Icon className="size-6" strokeWidth={1.5} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 font-semibold text-primary">{title}{badge}</span>
        {desc && <span className="block text-xs text-muted-foreground">{desc}</span>}
      </span>
      {locked ? <Lock className="size-4 text-muted-foreground" /> : <ChevronRight className="size-5 text-muted-foreground" />}
    </>
  );
  const cls = "flex w-full items-center gap-4 rounded-card bg-card p-4 text-left shadow-card";
  if (locked) return <div className={cn(cls, "cursor-not-allowed")} aria-disabled>{inner}</div>;
  if (to) return <AppLink to={to} className={cls}>{inner}</AppLink>;
  return <button type="button" onClick={onClick} className={cls}>{inner}</button>;
}

/** Blocks a screen when the current persona lacks the permission (direct URL access included). */
export function RequirePerm({ perm, owner, children }: { perm?: EvimPerm; owner?: boolean; children: ReactNode }) {
  const { role, perms } = useEvim();
  const ok = owner ? role === "owner" : perm ? perms[perm] : true;
  if (ok) return <>{children}</>;
  return (
    <EmptyState
      icon={Lock}
      title="Bu işlem için yetkin yok"
      text={owner ? "Bu alanı yalnızca abonelik sahibi yönetebilir." : "Abonelik sahibi bu işlem için sana yetki vermedi."}
      action={<Button asChild><AppLink to="/evim">TürkNet Evim'e dön</AppLink></Button>}
    />
  );
}
