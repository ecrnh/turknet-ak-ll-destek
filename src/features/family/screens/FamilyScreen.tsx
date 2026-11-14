import { Link } from "@tanstack/react-router";
import { ChevronDown, History, ShieldCheck, Trash2, ShieldOff, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/headers";
import { Chip, EmptyState, PlainNote, ToggleRow } from "@/components/tn/primitives";
import { ConfirmDialog } from "@/components/tn/Sheet";
import { Button } from "@/components/ui/button";
import { SCOPE_GROUPS, SCOPES, type ScopeKey } from "@/data/mock";
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
  const [open, setOpen] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Delegate | null>(null);
  const remove = useFamilyStore((s) => s.remove);
  const acceptInvite = useFamilyStore((s) => s.acceptInvite);
  const updateScopes = useFamilyStore((s) => s.updateScopes);
  const [openedAt] = useState(() => Date.now());
  const lastEvent = log[0] && log[0].time >= openedAt ? log[0] : undefined;

  const doRevoke = () => {
    if (!confirm) return;
    const d = confirm;
    revoke(d.id);
    setConfirm(null);
    toast.success(`${d.name} için yetki iptal edildi`, { action: { label: "Geri al", onClick: () => restore(d.id) } });
  };

  return (
    <div>
      <PageHeader title="TürkNet Evim" />
      <div className="space-y-4 px-4">
        <div className="rounded-card bg-referral p-3.5 shadow-card">
          <div className="flex items-center gap-2">
            <Users className="size-5 shrink-0 text-magenta" />
            <p className="text-sm font-semibold text-primary">Hesabını ailenle paylaş, kontrol sende kalsın</p>
          </div>
          <p className="mt-1.5 text-xs leading-snug text-muted-foreground">Aile üyelerini ekle, hesabında hangi işlemleri yapabileceklerini tek tek sen seç. Daveti kabul edene kadar kimse işlem yapamaz; fatura ödeme ve iptal her zaman senin onayına bağlı.</p>
        </div>

        {lastEvent && (lastEvent.kind === "edit" || lastEvent.kind === "revoke") && (
          <PlainNote>
            {lastEvent.kind === "revoke"
              ? `${lastEvent.text}. Bu kişi artık hesabında işlem yapamaz.`
              : "Yetkiler güncellendi. Hassas işlemler yine senin ek onayınla yapılır."}
          </PlainNote>
        )}

        <p className="font-semibold text-primary">Aile Üyeleri</p>

        {tab === "mine" && (
          <>
            {delegates.length === 0 && <EmptyState icon={Users} title="Henüz yetkili kişi yok" text="Eşini, çocuğunu veya bir yakınını yetkilendirebilirsin." />}
            {delegates.map((d) => (
              <div key={d.id} className={cn("rounded-card bg-card p-4 shadow-card", d.status === "revoked" && "opacity-60")}>
                <button type="button" aria-expanded={open === d.id} onClick={() => { setOpen(open === d.id ? null : d.id); setEditing(null); }} className="flex w-full items-center gap-3 text-left">
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
                  <ChevronDown className={cn("size-5 text-muted-foreground transition-transform", open === d.id && "rotate-180")} />
                </button>
                {open === d.id && (<>
                <div className="mt-4 space-y-1 rounded-2xl bg-muted p-3 text-sm">
                  <p><span className="text-muted-foreground">Yakınlık:</span> {d.relation}</p>
                  <p><span className="text-muted-foreground">Telefon:</span> {d.phone}</p>
                  <p><span className="text-muted-foreground">Durum:</span> {d.status === "active" ? "Aktif" : d.status === "invited" ? "Davet bekleniyor" : "Yetki iptal"}</p>
                </div>
                <p className="mt-3 text-sm font-semibold text-primary">Yetkileri</p>
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
                <Button variant="ghost" className="mt-2 w-full text-destructive" onClick={() => setRemoving(d)}>
                  <Trash2 /> Kişiyi Çıkar
                </Button>
                </>)}
              </div>
            ))}
            <Button asChild size="xl" className="w-full rounded-full">
              <Link to="/aile/yeni">
                <UserPlus /> Yeni Kişi Ekle
              </Link>
            </Button>
          </>
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
      <ConfirmDialog
        open={!!removing}
        title="Kişiyi çıkar?"
        text={`${removing?.name} TürkNet Evim'den çıkarılacak ve tüm yetkileri silinecek.`}
        confirmLabel="Çıkar"
        destructive
        onConfirm={() => { if (removing) { remove(removing.id); toast.success(`${removing.name} çıkarıldı`); setOpen(null); } setRemoving(null); }}
        onCancel={() => setRemoving(null)}
      />
    </div>
  );
}
