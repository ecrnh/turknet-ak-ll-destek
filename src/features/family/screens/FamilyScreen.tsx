import { Link } from "@tanstack/react-router";
import { BellRing, Eye, History, PencilLine, ShieldCheck, ShieldOff, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/headers";
import { Chip, EmptyState, ToggleRow } from "@/components/tn/primitives";
import { ConfirmDialog } from "@/components/tn/Sheet";
import { Button } from "@/components/ui/button";
import { SCOPES, type ScopeKey } from "@/data/mock";
import { useAppStore } from "@/features/core/appStore";
import { useFamilyStore, type ApprovalRequest, type Delegate } from "../store";
import { ProfileSwitcher } from "@/screens/AccountScreen";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { useFlow } from "@/lib/analytics";
import { cn } from "@/lib/utils";

function ScopeChips({ scopes }: { scopes: Record<string, boolean> }) {
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {SCOPES.filter((s) => scopes[s.key]).map((s) => (
        <span key={s.key} className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", s.sensitive ? "bg-warning-soft text-warning" : "bg-icon-box text-primary")}>
          {s.label}
        </span>
      ))}
    </div>
  );
}

const STATUS: Record<Delegate["status"], [string, string]> = {
  invited: ["Onay bekleniyor", "bg-warning-soft text-warning"],
  active: ["Aktif", "bg-success-soft text-success"],
  revoked: ["İptal", "bg-muted text-muted-foreground"],
};

function EditScopes({ d, onDone }: { d: Delegate; onDone: () => void }) {
  const updateScopes = useFamilyStore((s) => s.updateScopes);
  const [scopes, setScopes] = useState<Record<ScopeKey, boolean>>(d.scopes);
  return (
    <div className="mt-4 rounded-2xl bg-muted p-3">
      <p className="text-sm font-semibold text-primary">Bu kişinin hesabınızda hangi işlemleri yapabilmesini istiyorsunuz?</p>
      <div className="divide-y divide-border">
        {SCOPES.map((s) => (
          <ToggleRow key={s.key} id={`edit-${d.id}-${s.key}`} title={s.label} desc={s.desc} checked={scopes[s.key]} onChange={(v) => setScopes((p) => ({ ...p, [s.key]: v }))} />
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onDone}>
          Vazgeç
        </Button>
        <Button
          className="flex-1"
          onClick={() => {
            updateScopes(d.id, scopes);
            toast.success("Yetkiler güncellendi");
            onDone();
          }}
        >
          Kaydet
        </Button>
      </div>
    </div>
  );
}

export function FamilyScreen() {
  useFlow("family_auth_list");
  const delegates = useFamilyStore((s) => s.delegates);
  const managed = useFamilyStore((s) => s.managed);
  const log = useFamilyStore((s) => s.log);
  const requests = useFamilyStore((s) => s.requests);
  const revoke = useFamilyStore((s) => s.revoke);
  const restore = useFamilyStore((s) => s.restore);
  const acceptInvite = useFamilyStore((s) => s.acceptInvite);
  const resolveRequest = useFamilyStore((s) => s.resolveRequest);
  const switchTo = useFamilyStore((s) => s.switchTo);
  const appNotify = useAppStore((s) => s.notify);
  const [tab, setTab] = useState<"mine" | "requests" | "managed" | "log">("mine");
  const [confirm, setConfirm] = useState<Delegate | null>(null);
  const [approve, setApprove] = useState<ApprovalRequest | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const pending = requests.filter((r) => r.status === "pending");

  const doRevoke = () => {
    if (!confirm) return;
    const d = confirm;
    revoke(d.id);
    setConfirm(null);
    toast.success(`${d.name} için yetki iptal edildi`, { action: { label: "Geri al", onClick: () => restore(d.id) } });
  };

  return (
    <div>
      <PageHeader title="Aile ve Yetkilendirme" />
      <div className="space-y-4 px-4 pb-4">
        <div className="rounded-card bg-card p-5 shadow-card">
          <Users className="size-7 text-magenta" />
          <p className="mt-2 font-semibold text-primary">Yakınlarınız seçtiğiniz işlemleri sizin için takip etsin</p>
          <p className="mt-1 text-sm text-muted-foreground">Abonelik sahibi sizsiniz. Ödeme, iptal, iade ve paket değişikliği her zaman sizin onayınızla yapılır; hesap sahipliği devredilemez.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Chip active={tab === "mine"} onClick={() => setTab("mine")}>
            Yetkili Kişiler
          </Chip>
          <Chip active={tab === "requests"} onClick={() => setTab("requests")}>
            Onaylar{pending.length ? ` · ${pending.length}` : ""}
          </Chip>
          <Chip active={tab === "managed"} onClick={() => setTab("managed")}>
            Yönettiğim
          </Chip>
          <Chip active={tab === "log"} onClick={() => setTab("log")}>
            Geçmiş
          </Chip>
        </div>

        {tab === "mine" && (
          <>
            {pending.length > 0 && (
              <button type="button" onClick={() => setTab("requests")} className="flex w-full items-center gap-2 rounded-2xl bg-warning-soft p-3 text-left text-sm font-semibold text-foreground">
                <BellRing className="size-4 text-warning" /> {pending.length} işlem onayınızı bekliyor
              </button>
            )}
            {delegates.length === 0 && <EmptyState icon={Users} title="Henüz yetkili kişi yok" text="Eşinizi, çocuğunuzu veya bir yakınınızı yetkilendirebilirsiniz." />}
            {delegates.map((d) => (
              <div key={d.id} className={cn("rounded-card bg-card p-5 shadow-card", d.status === "revoked" && "opacity-60")}>
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
                    {d.name
                      .split(" ")
                      .map((p) => p[0])
                      .join("")
                      .slice(0, 2)}
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{d.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.relation} · {d.phone} · Yetkilendirilmiş aile üyesi
                    </p>
                  </div>
                  <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", STATUS[d.status][1])}>{STATUS[d.status][0]}</span>
                </div>
                <ScopeChips scopes={d.scopes} />
                <p className="mt-3 text-xs text-muted-foreground">
                  {d.expiresAt ? `Bitiş: ${fmtDate(d.expiresAt)}` : "Süresiz"} · {fmtDate(d.createdAt)} tarihinde verildi
                </p>
                {editing === d.id ? (
                  <EditScopes d={d} onDone={() => setEditing(null)} />
                ) : d.status === "invited" ? (
                  <div className="mt-4 space-y-2">
                    <p className="rounded-2xl bg-muted p-3 text-xs text-muted-foreground">{d.name} kişisine SMS ile davet gönderildi. Daveti kabul ettiğinde yetkiler aktif olur.</p>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        acceptInvite(d.id);
                        appNotify({ kind: "family", title: "Yetkilendirme tamamlandı", body: `${d.name} daveti kabul etti. Artık seçtiğiniz işlemleri bu kişi de yönetebilir.`, to: "/aile" });
                      }}
                    >
                      Demo: Davetin kabul edilmesini simüle et
                    </Button>
                    <button type="button" onClick={() => setConfirm(d)} className="min-h-10 w-full text-sm font-semibold text-destructive">
                      Daveti İptal Et
                    </button>
                  </div>
                ) : d.status === "active" ? (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={() => setEditing(d.id)}>
                      <PencilLine /> Düzenle
                    </Button>
                    <Button variant="outline" asChild>
                      <Link to="/aile/uye/$id" params={{ id: d.id }}>
                        <Eye /> Onun gözünden
                      </Link>
                    </Button>
                    <Button variant="outline" className="col-span-2 border-destructive/30 text-destructive" onClick={() => setConfirm(d)}>
                      <ShieldOff /> Yetkiyi İptal Et
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" className="mt-4 w-full" onClick={() => restore(d.id)}>
                    Yetkiyi Yeniden Ver
                  </Button>
                )}
              </div>
            ))}
            <Button asChild size="xl" className="w-full rounded-full">
              <Link to="/aile/yeni">
                <UserPlus /> Aile Üyesi Davet Et
              </Link>
            </Button>
          </>
        )}

        {tab === "requests" && (
          <>
            {requests.length === 0 && <EmptyState icon={ShieldCheck} title="Onay bekleyen işlem yok" text="Aile üyeleriniz ödeme, iptal veya paket değişikliği isterse burada onayınıza sunulur." />}
            {requests.map((r) => (
              <div key={r.id} className="rounded-card bg-card p-5 shadow-card">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{fmtDateTime(r.at)}</p>
                <p className="mt-1 font-semibold text-primary">
                  {r.name} “{r.action}” işlemini yapmak istiyor
                </p>
                {r.status === "pending" ? (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={() => resolveRequest(r.id, false)}>
                      Reddet
                    </Button>
                    <Button onClick={() => setApprove(r)}>Onayla</Button>
                  </div>
                ) : (
                  <p className={cn("mt-2 text-sm font-semibold", r.status === "approved" ? "text-success" : "text-muted-foreground")}>{r.status === "approved" ? "Onayladınız" : "Reddedildi"}</p>
                )}
              </div>
            ))}
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
                <Button
                  className="mt-4 w-full"
                  onClick={() => {
                    switchTo(m.id);
                    toast(`${m.honorific} adına işlem yapıyorsunuz`);
                  }}
                >
                  <ShieldCheck /> {m.short} hesabına geç
                </Button>
              </div>
            ))}
          </>
        )}

        {tab === "log" && (
          <div className="rounded-card bg-card px-5 shadow-card">
            <p className="flex items-center gap-2 pt-4 font-semibold text-primary">
              <History className="size-4" /> Etkinlik Geçmişi
            </p>
            <ul className="divide-y divide-border">
              {log.map((l) => (
                <li key={l.id} className="py-3 text-sm">
                  <p className="text-foreground">{l.text}</p>
                  <p className="text-[11px] text-muted-foreground">{fmtDateTime(l.time)}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.status === "invited" ? "Daveti iptal et?" : "Yetkiyi iptal et?"}
        text={`${confirm?.name} artık hesabınızda işlem yapamayacak. İsterseniz hemen geri alabilirsiniz.`}
        confirmLabel="İptal Et"
        destructive
        onConfirm={doRevoke}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={!!approve}
        title="Bu işlemi onaylıyor musunuz?"
        text={`${approve?.name} adına “${approve?.action}” işlemi sizin onayınızla yapılacak. Kart veya ödeme bilgileriniz kendisiyle paylaşılmaz. (Demo: gerçek bir işlem yapılmaz.)`}
        confirmLabel="Onayla"
        onConfirm={() => {
          if (approve) resolveRequest(approve.id, true);
          setApprove(null);
          toast.success("İşlemi onayladınız");
        }}
        onCancel={() => setApprove(null)}
      />
    </div>
  );
}
