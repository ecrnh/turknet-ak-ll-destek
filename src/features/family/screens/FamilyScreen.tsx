import { Link } from "@tanstack/react-router";
import { History, ShieldCheck, ShieldOff, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/headers";
import { Chip, EmptyState, ToggleRow } from "@/components/tn/primitives";
import { ConfirmDialog } from "@/components/tn/Sheet";
import { Button } from "@/components/ui/button";
import { SCOPE_GROUPS, SCOPES, type ScopeKey } from "@/data/mock";
import { GigaNote } from "@/features/giga/GigaAvatar";
import { useFamilyStore, type Delegate } from "../store";
import { ProfileSwitcher } from "@/screens/AccountScreen";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { useFlow } from "@/lib/analytics";
import { cn } from "@/lib/utils";

function ScopeChips({ scopes }: { scopes: Record<string, boolean> }) {
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {SCOPES.filter((s) => scopes[s.key]).map((s) => (
        <span key={s.key} className="rounded-full bg-icon-box px-2.5 py-1 text-[11px] font-semibold text-primary">
          {s.label}
        </span>
      ))}
    </div>
  );
}

function ScopeEditor({ initial, onSave, onCancel }: { initial: Record<ScopeKey, boolean>; onSave: (s: Record<ScopeKey, boolean>) => void; onCancel: () => void }) {
  const [sc, setSc] = useState(initial);
  return (
    <div className="mt-3 rounded-2xl bg-muted p-3">
      <p className="text-sm font-semibold text-primary">Bu kişinin hesabında hangi işlemleri yapabilmesini istiyorsun?</p>
      {SCOPE_GROUPS.map((g) => (
        <div key={g.id}>
          <p className="pt-2 text-[11px] font-bold uppercase tracking-wide text-magenta">{g.title}</p>
          {SCOPES.filter((s) => s.group === g.id).map((s) => (
            <ToggleRow key={s.key} id={`edit-${s.key}`} title={s.ownerApproval ? `${s.label} · ek onayınla` : s.label} desc={s.desc} checked={sc[s.key]} onChange={(v) => setSc((p) => ({ ...p, [s.key]: v }))} />
          ))}
        </div>
      ))}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={onCancel}>Vazgeç</Button>
        <Button onClick={() => onSave(sc)}>Kaydet</Button>
      </div>
    </div>
  );
}

export function FamilyScreen() {
  useFlow("family_auth_list");
  const delegates = useFamilyStore((s) => s.delegates);
  const managed = useFamilyStore((s) => s.managed);
  const log = useFamilyStore((s) => s.log);
  const revoke = useFamilyStore((s) => s.revoke);
  const restore = useFamilyStore((s) => s.restore);
  const switchTo = useFamilyStore((s) => s.switchTo);
  const [tab, setTab] = useState<"mine" | "managed" | "log">("mine");
  const [confirm, setConfirm] = useState<Delegate | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const acceptInvite = useFamilyStore((s) => s.acceptInvite);
  const updateScopes = useFamilyStore((s) => s.updateScopes);
  const lastEvent = log[0];

  const doRevoke = () => {
    if (!confirm) return;
    const d = confirm;
    revoke(d.id);
    setConfirm(null);
    toast.success(`${d.name} için yetki iptal edildi`, { action: { label: "Geri al", onClick: () => restore(d.id) } });
  };

  return (
    <div>
      <PageHeader title="Aile Yetkilendirme" />
      <div className="space-y-4 px-4">
        <div className="rounded-card bg-referral p-5 shadow-card">
          <Users className="size-7 text-magenta" />
          <p className="mt-2 font-semibold text-primary">Yakınların adına güvenle işlem yap</p>
          <p className="mt-1 text-sm text-muted-foreground">Teknolojiye uzak bir yakınının destek taleplerini sen yönet, görüntülü destekte onu da görüşmeye ekle. Fatura ödeme ve iptal varsayılan olarak kapalıdır.</p>
        </div>

        {lastEvent && (lastEvent.kind === "edit" || lastEvent.kind === "invite" || lastEvent.kind === "revoke") && (
          <GigaNote>
            {lastEvent.kind === "revoke"
              ? `${lastEvent.text}. Bu kişi artık hesabında işlem yapamaz.`
              : lastEvent.kind === "invite"
                ? "Daveti gönderdim. Kişi kabul edene kadar hiçbir işlem yapamaz; ödeme ve iptal gibi işlemler her zaman senin onayını gerektirir."
                : "Yetkileri güncelledim. Hassas işlemler yine senin ek onayınla yapılır."}
          </GigaNote>
        )}

        <div className="flex gap-2">
          <Chip active={tab === "mine"} onClick={() => setTab("mine")}>Yetkili Kişiler</Chip>
          <Chip active={tab === "managed"} onClick={() => setTab("managed")}>Yönettiğim</Chip>
          <Chip active={tab === "log"} onClick={() => setTab("log")}>Geçmiş</Chip>
        </div>

        {tab === "mine" && (
          <>
            {delegates.length === 0 && <EmptyState icon={Users} title="Henüz yetkili kişi yok" text="Eşini, çocuğunu veya bir yakınını yetkilendirebilirsin." />}
            {delegates.map((d) => (
              <div key={d.id} className={cn("rounded-card bg-card p-5 shadow-card", d.status === "revoked" && "opacity-60")}>
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
                    {d.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{d.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.relation} · {d.phone}
                    </p>
                  </div>
                  <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", d.status === "active" ? "bg-success-soft text-success" : d.status === "invited" ? "bg-warning-soft text-warning" : "bg-muted text-muted-foreground")}>
                    {d.status === "active" ? "Aktif" : d.status === "invited" ? "Davet bekleniyor" : "İptal"}
                  </span>
                </div>
                {editing === d.id ? (
                  <ScopeEditor initial={d.scopes} onCancel={() => setEditing(null)} onSave={(sc) => { updateScopes(d.id, sc); setEditing(null); toast.success("Yetkiler güncellendi", { description: "GIGA değişikliği yetki geçmişine kaydetti." }); }} />
                ) : (
                  <ScopeChips scopes={d.scopes} />
                )}
                <p className="mt-3 text-xs text-muted-foreground">{d.expiresAt ? `Bitiş: ${fmtDate(d.expiresAt)}` : "Süresiz"} · {fmtDate(d.createdAt)} tarihinde verildi</p>
                {d.status === "invited" && (
                  <div className="mt-3 rounded-2xl bg-muted p-3 text-xs text-muted-foreground">
                    Davet {d.phone} numarasına SMS ile gönderildi (demo). Kabul edene kadar hiçbir işlem yapamaz.
                    <button type="button" onClick={() => { acceptInvite(d.id); toast.success(`${d.name} daveti kabul etti`); }} className="mt-2 block font-semibold text-magenta">
                      Demo: davet kabul edildi
                    </button>
                  </div>
                )}
                {d.status !== "revoked" && editing !== d.id && (
                  <Button variant="outline" className="mt-4 w-full" onClick={() => setEditing(d.id)}>
                    Yetkileri Düzenle
                  </Button>
                )}
                {d.status !== "revoked" ? (
                  <Button variant="outline" className="mt-4 w-full border-destructive/30 text-destructive" onClick={() => setConfirm(d)}>
                    <ShieldOff /> Yetkiyi İptal Et
                  </Button>
                ) : (
                  <Button variant="outline" className="mt-4 w-full" onClick={() => restore(d.id)}>
                    Yetkiyi Yeniden Ver
                  </Button>
                )}
              </div>
            ))}
            <Button asChild size="xl" className="w-full rounded-full">
              <Link to="/aile/yeni">
                <UserPlus /> Yeni Kişi Yetkilendir
              </Link>
            </Button>
          </>
        )}

        {tab === "managed" && (
          <>
            <ProfileSwitcher />
            {managed.map((m) => (
              <div key={m.id} className="rounded-card bg-card p-5 shadow-card">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-deep text-lg font-semibold text-primary-foreground">{m.initials}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{m.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.relation} · Abone no {m.subscriberNo} · {m.location}
                    </p>
                  </div>
                </div>
                <ScopeChips scopes={m.scopes} />
                <Button className="mt-4 w-full" onClick={() => { switchTo(m.id); toast(`${m.honorific} adına işlem yapıyorsun`); }}>
                  <ShieldCheck /> {m.short} hesabına geç
                </Button>
              </div>
            ))}
          </>
        )}

        {tab === "log" && (
          <div className="rounded-card bg-card px-5 shadow-card">
            <p className="flex items-center gap-2 pt-4 font-semibold text-primary">
              <History className="size-4" /> Yetki Geçmişi
            </p>
            <ul className="divide-y divide-border">
              {log.map((l) => (
                <li key={l.id} className="py-3 text-sm">
                  <p className="text-foreground">{l.text}</p>
                  <p className="text-[11px] text-muted-foreground">{fmtDateTime(l.time)}{l.by ? ` · Başlatan: ${l.by}` : ""}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirm}
        title="Yetkiyi iptal et?"
        text={`${confirm?.name} artık hesabında işlem yapamayacak. İstersen hemen geri alabilirsin.`}
        confirmLabel="İptal Et"
        destructive
        onConfirm={doRevoke}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
