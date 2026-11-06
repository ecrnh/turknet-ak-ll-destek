import { Clock, Crown, Mail, QrCode, Receipt, Router, Send, ShieldCheck, Users, Wrench, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Banner, Card, EmptyState, NewBadge, PlainNote, SectionTitle } from "@/components/tn/primitives";
import { Button } from "@/components/ui/button";
import { AppLink } from "@/components/tn/primitives";
import { USER } from "@/data/mock";
import { fmtDateTime } from "@/lib/format";
import { EvimHeader, RoleBadge, ServiceRow, useEvim } from "../components";
import { useEvimStore } from "../store";
import { PERMS } from "../rules";

function TicketCard() {
  const ticket = useEvimStore((s) => s.ticket);
  if (!ticket) return null;
  return (
    <Banner tone={ticket.status === "open" ? "warning" : "success"} title={ticket.status === "open" ? `Açık destek kaydı · ${ticket.id}` : `Destek kaydı kapatıldı · ${ticket.id}`}>
      {ticket.status === "open" ? `${ticket.note} · ${fmtDateTime(ticket.createdAt)}` : "Sorun çözüldüğü için kaydın kapatıldı."}
    </Banner>
  );
}

function Hero({ subtitle }: { subtitle: string }) {
  const { role, user } = useEvim();
  return (
    <Card className="bg-primary text-primary-foreground">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs opacity-80">TürkNet Evim · {USER.location}</p>
          <p className="mt-1 text-xl font-semibold">Merhaba {user.name.split(" ")[0]}</p>
          <p className="mt-1 text-sm opacity-80">{subtitle}</p>
        </div>
        <RoleBadge role={role} className={role === "owner" ? "bg-card text-primary" : ""} />
      </div>
      <p className="mt-3 text-xs opacity-80">{USER.packageName} · Abone no {USER.subscriberNo}</p>
    </Card>
  );
}

function OwnerHome() {
  const pending = useEvimStore((s) => s.members).filter((m) => m.status !== "active").length;
  return (
    <div className="space-y-3 px-4">
      <Hero subtitle="Abonelik sahibisin; tüm hizmetler ve aile yetkileri sende." />
      <TicketCard />
      <SectionTitle>Self Servis Onarım</SectionTitle>
      <ServiceRow icon={Wrench} title="Bağlantı Problemleri" desc="Adım adım sorun giderme" to="/evim/baglanti" />
      <ServiceRow icon={Receipt} title="Fatura İşlemleri" desc="Faturanı görüntüle, öde, itiraz et" to="/evim/fatura" />
      <SectionTitle>Ağım ve Ailem</SectionTitle>
      <ServiceRow icon={Router} title="Modemim ve Cihazlarım" desc="Modem, bağlı cihazlar, cihaz ekleme" to="/evim/cihazlar" />
      <ServiceRow icon={Users} title="Aile Yönetimi" desc="Üyeler, yetkiler, davetler" to="/evim/aile" badge={pending ? <NewBadge>{`${pending} bekleyen`}</NewBadge> : <NewBadge />} />
    </div>
  );
}

function MemberHome() {
  const { perms } = useEvim();
  const any = perms.troubleshoot || perms.devicesView || perms.billsView;
  return (
    <div className="space-y-3 px-4">
      <Hero subtitle="Abonelik sahibinin verdiği yetkilerle işlem yapabilirsin." />
      <PlainNote icon={ShieldCheck}>
        <b>{USER.firstName}</b> (abonelik sahibi) seni bu aboneliğe yetkilendirdi. İzin verilenler: {PERMS.filter((p) => perms[p.key]).map((p) => p.label.toLocaleLowerCase("tr")).join(", ") || "yok"}.
      </PlainNote>
      <TicketCard />
      {perms.troubleshoot && (
        <>
          <SectionTitle>Self Servis Onarım</SectionTitle>
          <ServiceRow icon={Wrench} title="Bağlantı Problemleri" desc="Adım adım sorun giderme" to="/evim/baglanti" />
        </>
      )}
      {(perms.devicesView || perms.billsView) && <SectionTitle>Hizmetlerin</SectionTitle>}
      {perms.devicesView && <ServiceRow icon={Router} title="Cihazlarım" desc={perms.devicesManage ? "Görüntüle ve yönet" : "Yalnızca görüntüleme"} to="/evim/cihazlar" />}
      {perms.billsView && <ServiceRow icon={Receipt} title="Fatura Bilgileri" desc="Yalnızca görüntüleme" to="/evim/fatura" />}
      {!any && <EmptyState icon={ShieldCheck} title="Henüz yetkin yok" text="Abonelik sahibi sana bir işlem yetkisi verdiğinde burada görünecek." />}
      <p className="flex items-center gap-1.5 px-1 pt-2 text-xs text-muted-foreground"><Crown className="size-3.5" /> Abonelik ve aile yönetimi yalnızca abonelik sahibine açıktır.</p>
    </div>
  );
}

function UnauthorizedHome() {
  const { persona, user, members } = useEvim();
  const requestJoin = useEvimStore((s) => s.requestJoin);
  const acceptInvite = useEvimStore((s) => s.acceptInvite);
  const declineInvite = useEvimStore((s) => s.declineInvite);
  const outcome = useEvimStore((s) => s.requestOutcome)[persona];
  const mine = members.find((m) => m.id === persona);

  if (mine?.status === "invited") {
    return (
      <div className="space-y-3 px-4">
        <Card className="text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-magenta-soft text-magenta"><Mail className="size-8" /></span>
          <p className="mt-3 text-lg font-semibold text-primary">Aile üyeliği davetin var</p>
          <p className="mt-1 text-sm text-muted-foreground"><b>{USER.firstName}</b> seni {USER.location} adresindeki internet aboneliğine davet etti.</p>
          <div className="mt-4 space-y-1.5 text-left">
            <p className="text-xs font-bold uppercase tracking-wide text-magenta">Sana verilecek yetkiler</p>
            {PERMS.filter((p) => mine.perms[p.key]).map((p) => (
              <p key={p.key} className="flex items-center gap-2 text-sm"><ShieldCheck className="size-4 text-success" /> {p.label}</p>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => { declineInvite(persona); toast("Davet reddedildi"); }}>Reddet</Button>
            <Button variant="magenta" onClick={() => { acceptInvite(persona); toast.success("Davet kabul edildi · TürkNet Evim'e hoş geldin"); }}>Kabul Et</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (mine?.status === "requested") {
    return (
      <div className="space-y-3 px-4">
        <EmptyState icon={Clock} title="Talebin abonelik sahibine iletildi" text={`${USER.firstName} talebini onayladığında TürkNet Evim'e erişimin açılacak. Bu ekranda bekleyebilirsin.`} />
        <Banner tone="info" title="Onay bekleniyor">Talep: {user.name} · {user.phone}</Banner>
      </div>
    );
  }

  return (
    <div className="space-y-3 px-4">
      {outcome === "rejected" && <Banner tone="error" title="Katılım talebin reddedildi">Abonelik sahibi talebini onaylamadı. Gerekirse kendisiyle iletişime geçip yeniden talep gönderebilirsin.</Banner>}
      <EmptyState
        icon={XCircle}
        title="Bu internet aboneliğine henüz bağlı değilsin"
        text={`QR kodunu okuttuğun modem ${USER.firstName}'nın aboneliğine ait. Erişim için abonelik sahibine katılım talebi gönderebilirsin.`}
        action={
          <Button size="lg" variant="magenta" className="rounded-full" onClick={() => { requestJoin(persona); toast.success("Katılım talebi gönderildi"); }}>
            <Send /> Katılım Talebi Gönder
          </Button>
        }
      />
    </div>
  );
}

export function EvimHomeScreen() {
  const { role } = useEvim();
  const loggedIn = useEvimStore((s) => s.loggedIn);
  return (
    <div className="pb-8">
      <EvimHeader title="TürkNet Evim" />
      {!loggedIn && (
        <div className="px-4 pb-3">
          <Banner tone="info" title="Demo: QR akışını dene" action={<Button size="sm" asChild><AppLink to="/evim/qr"><QrCode /> QR ile devam et</AppLink></Button>}>
            Rol kontrolü ve kullanıcı değişimi QR ekranından yapılır.
          </Banner>
        </div>
      )}
      {role === "owner" ? <OwnerHome /> : role === "member" ? <MemberHome /> : <UnauthorizedHome />}
      {loggedIn && (
        <div className="px-4 pt-6">
          <Button variant="ghost" className="w-full" asChild><AppLink to="/evim/qr"><QrCode /> Farklı kullanıcıyla QR okut</AppLink></Button>
        </div>
      )}
    </div>
  );
}

