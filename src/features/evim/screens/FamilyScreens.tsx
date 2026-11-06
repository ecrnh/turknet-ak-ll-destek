import { useNavigate } from "@tanstack/react-router";
import { Check, Crown, Mail, Phone, Send, ShieldCheck, Trash2, UserPlus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppLink, Banner, Card, Chip, EmptyState, PlainNote, SectionTitle, ToggleRow } from "@/components/tn/primitives";
import { ConfirmDialog } from "@/components/tn/Sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { USER } from "@/data/mock";
import { fmtDate } from "@/lib/format";
import { EvimHeader, RequirePerm } from "../components";
import { PERSONAS, useEvimStore } from "../store";
import { DEFAULT_PERMS, PERMS, type EvimMember, type Perms } from "../rules";

const STATUS: Record<EvimMember["status"], { label: string; cls: string }> = {
  active: { label: "Aktif üye", cls: "bg-success-soft text-success" },
  invited: { label: "Davet bekliyor", cls: "bg-warning-soft text-warning" },
  requested: { label: "Katılım talebi", cls: "bg-magenta-soft text-magenta" },
};

function PermSummary({ perms }: { perms: Perms }) {
  const on = PERMS.filter((p) => perms[p.key]);
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {on.length === 0 ? <span className="text-xs text-muted-foreground">Yetki yok</span> : on.map((p) => <span key={p.key} className="rounded-full bg-icon-box px-2.5 py-1 text-[11px] font-semibold text-primary">{p.label}</span>)}
    </div>
  );
}

export function PermEditor({ value, onChange, idPrefix }: { value: Perms; onChange: (p: Perms) => void; idPrefix: string }) {
  return (
    <div>
      <p className="text-sm font-semibold text-primary">Bu kişi hangi işlemleri yapabilsin?</p>
      {PERMS.map((p) => (
        <ToggleRow
          key={p.key}
          id={`${idPrefix}-${p.key}`}
          title={p.label}
          desc={p.key === "devicesView" && value.devicesManage ? "Cihaz yönetimi açıkken zorunlu" : p.desc}
          checked={value[p.key] || (p.key === "devicesView" && value.devicesManage)}
          disabled={p.key === "devicesView" && value.devicesManage}
          onChange={(v) => onChange({ ...value, [p.key]: v })}
        />
      ))}
      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><Crown className="size-3.5" /> Abonelik sahipliği ve yetki yönetimi her zaman sende kalır.</p>
    </div>
  );
}

function MemberCard({ m }: { m: EvimMember }) {
  const navigate = useNavigate();
  const approve = useEvimStore((s) => s.approveRequest);
  const reject = useEvimStore((s) => s.rejectRequest);
  const accept = useEvimStore((s) => s.acceptInvite);
  const remove = useEvimStore((s) => s.removeMember);
  const [confirm, setConfirm] = useState(false);
  const [perms, setPerms] = useState<Perms>(m.perms);
  const st = STATUS[m.status];

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{m.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}</span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-primary">{m.name}</p>
          <p className="truncate text-xs text-muted-foreground">{m.relation} · {m.contact}</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${st.cls}`}>{st.label}</span>
      </div>
      {m.status === "requested" ? (
        <div className="mt-3 rounded-2xl bg-muted p-3">
          <p className="mb-1 text-xs text-muted-foreground">QR kodu okutarak aboneliğine katılmak istiyor · {fmtDate(m.since)}</p>
          <PermEditor value={perms} onChange={setPerms} idPrefix={`req-${m.id}`} />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => { reject(m.id); toast(`${m.name} talebi reddedildi`); }}><X /> Reddet</Button>
            <Button variant="success" onClick={() => { approve(m.id, perms); toast.success(`${m.name} aileye katıldı`); }}><Check /> Kabul et</Button>
          </div>
        </div>
      ) : (
        <>
          <PermSummary perms={m.perms} />
          <div className="mt-3 flex flex-wrap gap-2">
            {m.status === "active" && <Button size="sm" variant="outline" onClick={() => navigate({ to: "/evim/aile/$id", params: { id: m.id } })}><ShieldCheck /> Yetkileri düzenle</Button>}
            {m.status === "invited" && <Button size="sm" variant="outline" onClick={() => { toast.success("Davet yeniden gönderildi"); }}><Send /> Tekrar gönder</Button>}
            {m.status === "invited" && <Button size="sm" variant="ghost" onClick={() => { accept(m.id); toast.success(`Demo: ${m.name} daveti kabul etti`); }}>Demo: kabul ettir</Button>}
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setConfirm(true)}><Trash2 /> {m.status === "invited" ? "Daveti iptal et" : "Çıkar"}</Button>
          </div>
        </>
      )}
      <ConfirmDialog open={confirm} destructive title={m.status === "invited" ? "Davet iptal edilsin mi?" : `${m.name} aileden çıkarılsın mı?`} text="Bu kişinin TürkNet Evim erişimi hemen kapanır." confirmLabel={m.status === "invited" ? "İptal et" : "Çıkar"} onCancel={() => setConfirm(false)} onConfirm={() => { remove(m.id); setConfirm(false); toast.success("İşlem tamamlandı"); }} />
    </Card>
  );
}

export function FamilyScreen() {
  const members = useEvimStore((s) => s.members);
  const requests = members.filter((m) => m.status === "requested");
  const invited = members.filter((m) => m.status === "invited");
  const active = members.filter((m) => m.status === "active");
  return (
    <div className="pb-8">
      <EvimHeader title="Aile Yönetimi" />
      <RequirePerm owner>
        <div className="space-y-3 px-4">
          <Card className="flex items-center gap-3 p-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-magenta text-magenta-foreground"><Crown className="size-5" /></span>
            <div className="flex-1">
              <p className="font-semibold text-primary">{USER.firstName} Koyuncu · sen</p>
              <p className="text-xs text-muted-foreground">Abonelik sahibi · tüm yetkiler</p>
            </div>
          </Card>
          <Button size="lg" variant="magenta" className="w-full rounded-full" asChild><AppLink to="/evim/aile/davet"><UserPlus /> Aile üyesi ekle</AppLink></Button>
          {requests.length > 0 && (
            <>
              <SectionTitle>Bekleyen katılım talepleri</SectionTitle>
              {requests.map((m) => <MemberCard key={m.id} m={m} />)}
            </>
          )}
          <SectionTitle>Aile üyeleri</SectionTitle>
          {active.length === 0 ? <EmptyState icon={UserPlus} title="Henüz aile üyesi yok" text="Aile üyelerini davet ederek internet işlemlerinde yetki verebilirsin." /> : active.map((m) => <MemberCard key={m.id} m={m} />)}
          {invited.length > 0 && (
            <>
              <SectionTitle>Gönderilen davetler</SectionTitle>
              {invited.map((m) => <MemberCard key={m.id} m={m} />)}
            </>
          )}
          <PlainNote>Aile üyeleri kendi yetkilerini değiştiremez; yetkileri yalnızca sen düzenleyebilirsin.</PlainNote>
        </div>
      </RequirePerm>
    </div>
  );
}

export function InviteScreen() {
  const navigate = useNavigate();
  const invite = useEvimStore((s) => s.invite);
  const [via, setVia] = useState<"phone" | "email">("phone");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [relation, setRelation] = useState("Çocuk");
  const [perms, setPerms] = useState<Perms>({ ...DEFAULT_PERMS });
  const can = PERSONAS.find((p) => p.id === "can")!;
  const valid = name.trim().length > 1 && (via === "phone" ? contact.replace(/\D/g, "").length >= 10 : /.+@.+\..+/.test(contact));

  const send = () => {
    invite({ name: name.trim(), contact: contact.trim(), relation, perms });
    toast.success(`Davet ${via === "phone" ? "SMS" : "e-posta"} ile gönderildi`);
    navigate({ to: "/evim/aile" });
  };

  return (
    <div className="pb-8">
      <EvimHeader title="Aile üyesi davet et" />
      <RequirePerm owner>
        <div className="space-y-3 px-4">
          <Card>
            <div className="grid grid-cols-2 gap-2">
              <Chip active={via === "phone"} onClick={() => { setVia("phone"); setContact(""); }}><Phone className="mr-1 inline size-4" /> Telefon</Chip>
              <Chip active={via === "email"} onClick={() => { setVia("email"); setContact(""); }}><Mail className="mr-1 inline size-4" /> E-posta</Chip>
            </div>
            <label className="mt-4 block text-sm font-semibold" htmlFor="inv-name">Ad soyad</label>
            <Input id="inv-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5 h-12" />
            <label className="mt-3 block text-sm font-semibold" htmlFor="inv-contact">{via === "phone" ? "Cep telefonu" : "E-posta adresi"}</label>
            <Input id="inv-contact" value={contact} onChange={(e) => setContact(e.target.value)} inputMode={via === "phone" ? "tel" : "email"} placeholder={via === "phone" ? "05xx xxx xx xx" : "ornek@mail.com"} className="mt-1.5 h-12" />
            <p className="mt-3 text-sm font-semibold">Yakınlık</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {["Eş", "Çocuk", "Ebeveyn", "Kardeş", "Diğer"].map((r) => <Chip key={r} active={relation === r} onClick={() => setRelation(r)}>{r}</Chip>)}
            </div>
            <button type="button" className="mt-3 text-xs font-semibold text-magenta underline" onClick={() => { setVia("phone"); setName(can.name); setContact(can.phone); setRelation("Kardeş"); }}>
              Demo: {can.name} bilgilerini doldur
            </button>
          </Card>
          <Card><PermEditor value={perms} onChange={setPerms} idPrefix="inv" /></Card>
          <Button size="xl" variant="magenta" className="w-full rounded-full" disabled={!valid} onClick={send}><Send /> Davet gönder</Button>
        </div>
      </RequirePerm>
    </div>
  );
}

export function MemberPermsScreen({ id }: { id: string }) {
  const navigate = useNavigate();
  const member = useEvimStore((s) => s.members.find((m) => m.id === id));
  const setPermsStore = useEvimStore((s) => s.setPerms);
  const [perms, setPerms] = useState<Perms | null>(member?.perms ?? null);
  return (
    <div className="pb-8">
      <EvimHeader title="Yetkileri düzenle" />
      <RequirePerm owner>
        {!member || !perms ? (
          <EmptyState icon={UserPlus} title="Üye bulunamadı" action={<Button asChild><AppLink to="/evim/aile">Aile Yönetimi</AppLink></Button>} />
        ) : (
          <div className="space-y-3 px-4">
            <Banner tone="info" title={member.name}>{member.relation} · {STATUS[member.status].label}</Banner>
            <Card><PermEditor value={perms} onChange={setPerms} idPrefix="edit" /></Card>
            <Button size="xl" className="w-full rounded-full" onClick={() => { setPermsStore(member.id, perms); toast.success("Yetkiler güncellendi"); navigate({ to: "/evim/aile" }); }}>Kaydet</Button>
          </div>
        )}
      </RequirePerm>
    </div>
  );
}
