import { ChevronRight, LogOut, Play } from "lucide-react";
import { toast } from "sonner";
import { TabHeader } from "@/components/layout/headers";
import { ListCard, ListRow, ReferralCard } from "@/components/tn/cards";
import { NewBadge } from "@/components/tn/primitives";
import { USER } from "@/data/mock";
import { useActingAccount, useFamilyStore } from "@/features/family/store";
import { useAppStore } from "@/features/core/appStore";
import { cn } from "@/lib/utils";

export function ProfileSwitcher() {
  const managed = useFamilyStore((s) => s.managed);
  const actingAs = useFamilyStore((s) => s.actingAs);
  const switchTo = useFamilyStore((s) => s.switchTo);
  return (
    <div className="flex gap-1 rounded-full bg-muted p-1" role="tablist" aria-label="Profil değiştir">
      <button role="tab" aria-selected={!actingAs} onClick={() => switchTo(null)} className={cn("min-h-10 flex-1 rounded-full text-sm font-semibold", !actingAs ? "bg-primary text-primary-foreground shadow" : "text-primary")}>
        {USER.firstName} (Ben)
      </button>
      {managed.map((m) => (
        <button
          key={m.id}
          role="tab"
          aria-selected={actingAs === m.id}
          onClick={() => {
            switchTo(m.id);
            toast(`${m.honorific} adına işlem yapıyorsun`, { description: "Yetkilerin: destek, görüntülü destek, fatura görüntüleme." });
          }}
          className={cn("min-h-10 flex-1 rounded-full text-sm font-semibold", actingAs === m.id ? "bg-orange-deep text-primary-foreground shadow" : "text-primary")}
        >
          {m.short} ({m.relation})
        </button>
      ))}
    </div>
  );
}

export function AccountScreen() {
  const acting = useActingAccount();
  const setPref = useAppStore((s) => s.setPref);
  const name = acting ? acting.name.toLocaleUpperCase("tr-TR") : USER.name;
  const initials = acting ? acting.initials : USER.initials;
  const no = acting ? acting.subscriberNo : USER.subscriberNo;

  return (
    <div>
      <TabHeader title="Hesabım" />
      <div className="space-y-4 px-4 pt-2">
        <ProfileSwitcher />
        <div className="flex items-center gap-4 rounded-card bg-card p-5 shadow-card">
          <span className={cn("flex h-16 w-16 items-center justify-center rounded-full text-2xl font-semibold text-primary-foreground", acting ? "bg-orange-deep" : "bg-primary")}>{initials}</span>
          <div className="flex-1">
            <p className="text-lg font-semibold text-primary">{name}</p>
            <p className="text-muted-foreground">{no}</p>
          </div>
          <ChevronRight className="size-5 text-primary" />
        </div>

        {!acting && <ReferralCard />}

        <ListCard>
          <ListRow title="Aile ve Yetkilendirme" to="/aile" badge={<NewBadge />} desc="Yakınların adına işlem yap, yetki ver" />
          <ListRow title="Tercihlerim" to="/tercihler" desc="Büyük yazı, basit mod, otomatik kontrol izinleri" />
          <ListRow title="Şifre Değiştir" to="/islem/sifre-degistir" />
          <ListRow title="Belgelerim" to="/islem/belgelerim" />
          <ListRow title="Benim İçin Takip Et" to="/takip" badge={<NewBadge />} desc="Tüm taleplerin, kararların ve iş emirlerin" />
          <ListRow title="İşlem Geçmişi" to="/islem-gecmisi" />
          <ListRow title="Tüm Destek Kayıtları" to="/destek-kayitlari" />
          <ListRow title="Deneyim Programı" to="/islem/deneyim-programi" />
          <ListRow title="Bizi Değerlendirin" to="/islem/bizi-degerlendirin" badge={<Play className="size-4 fill-success text-success" />} />
        </ListCard>

        <ListCard>
          <ListRow title="Etki Panosu" to="/dashboard" desc="Sunum: KPI ve A/B test planı" />
          <ListRow title="Geliştirici / Demo Modu" onClick={() => { setPref("demoPanel", true); toast("Demo paneli açıldı", { description: "Masaüstünde telefonun sağında, mobilde sağ üstteki düğmede." }); }} />
        </ListCard>

        <ListCard>
          <ListRow title="Çıkış Yap" onClick={() => toast("Demo modunda çıkış yapılamaz")} right={<LogOut className="size-6 text-primary" />} />
        </ListCard>
      </div>
    </div>
  );
}
