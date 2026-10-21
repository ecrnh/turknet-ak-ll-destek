import { Link } from "@tanstack/react-router";
import { BriefcaseBusiness, Gift, MessageCircle, Share2, Smartphone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/headers";
import { Csat } from "@/components/tn/Csat";
import { RingChart } from "@/components/tn/RingChart";
import { ConfirmDialog } from "@/components/tn/Sheet";
import { Chip, EmptyState, StatRow, ToggleRow } from "@/components/tn/primitives";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useAppStore } from "@/features/core/appStore";
import { useFamilyStore } from "@/features/family/store";
import { useGiftStore } from "../store";
import { GIFT_TIERS } from "../gift";
import { OutageStatusCard } from "../components/OutageStatusCard";
import { fmtDate, fmtDateTime, fmtGB } from "@/lib/format";
import { track, useFlow } from "@/lib/analytics";

function Tiers() {
  return (
    <div className="rounded-card bg-card p-5 shadow-card">
      <p className="font-semibold text-primary">Kesinti telafisi nasıl çalışır?</p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[...GIFT_TIERS].reverse().map((t) => (
          <div key={t.hours} className="rounded-2xl bg-magenta-soft p-3">
            <p className="text-2xl font-bold text-magenta">{t.gb} GB</p>
            <p className="text-xs text-muted-foreground">{t.hours}+ saat</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Turkcell, Vodafone, Türk Telekom veya başka bir operatör — hediye her hatta tanımlanır.</p>
    </div>
  );
}

export function GiftWalletScreen() {
  useFlow("gift_wallet");
  const g = useGiftStore();
  const status = useAppStore((s) => s.net.status);
  const addHistory = useAppStore((s) => s.addHistory);
  const managed = useFamilyStore((s) => s.managed);
  const delegates = useFamilyStore((s) => s.delegates);
  const family = [...managed.map((m) => m.name), ...delegates.filter((d) => d.status === "active").map((d) => d.name)];
  const [to, setTo] = useState(family[0] ?? "");
  const remaining = Math.max(0, Math.round((g.totalGB - g.usedGB) * 10) / 10);
  const [amount, setAmount] = useState(Math.min(3, remaining));
  const [confirm, setConfirm] = useState(false);
  const out = status === "outage" || status === "backup";

  if (!g.activated && g.giftGB === 0)
    return (
      <div>
        <PageHeader title="Hediye İnternet Cüzdanım" />
        <div className="space-y-4 px-4">
          <EmptyState icon={Gift} title="Şu an aktif hediyen yok" text="Hattında 6 saati aşan bir kesinti olursa, hangi operatörü kullanırsan kullan cep hattına GB hediye ediyoruz." />
          <Tiers />
        </div>
      </div>
    );

  if (!g.activated)
    return (
      <div>
        <PageHeader title="Hediye İnternet Cüzdanım" />
        <div className="space-y-4 px-4">
          {out && <OutageStatusCard compact />}
          <div className="rounded-card bg-plum p-6 text-center text-primary-foreground shadow-float">
            <Gift className="mx-auto size-10" />
            <p className="mt-3 text-sm text-primary-foreground/80">Sana tanımlanmayı bekleyen</p>
            <p className="text-5xl font-bold">{g.giftGB} GB</p>
            <p className="mt-1 text-sm text-primary-foreground/80">hediye internet var</p>
            <Button asChild variant="white" size="xl" className="mt-5 w-full rounded-full">
              <Link to="/hediye/aktiflestir">Hediyeyi Aktifleştir</Link>
            </Button>
          </div>
          <Tiers />
        </div>
      </div>
    );

  const doShare = () => {
    const given = g.share(to, amount);
    setConfirm(false);
    if (given > 0) {
      addHistory("GB paylaşıldı", `${to} · ${fmtGB(given)}`);
      track("flow_completed", "gift_share", { gb: given });
      toast.success(`${fmtGB(given)} ${to} hattına aktarıldı`);
    } else toast.error("Paylaşılacak GB kalmadı");
  };

  return (
    <div>
      <PageHeader title="Hediye İnternet Cüzdanım" />
      <div className="space-y-4 px-4">
        {out && <OutageStatusCard compact />}

        <div className="flex flex-col items-center rounded-card bg-card p-6 shadow-card">
          <RingChart value={remaining} max={Math.max(g.totalGB, 0.1)} size={180} label={`Kalan ${fmtGB(remaining)}`}>
            <p className="text-xs text-muted-foreground">Kalan</p>
            <p className="text-4xl font-bold text-primary">{remaining.toLocaleString("tr-TR")}</p>
            <p className="text-xs text-muted-foreground">/ {fmtGB(g.totalGB)}</p>
          </RingChart>
          <div className="mt-4 w-full">
            <StatRow label="Toplam" value={fmtGB(g.totalGB)} />
            <StatRow label="Kullanılan" value={fmtGB(g.usedGB)} />
            <StatRow label="Geçerlilik" value={g.validUntil ? `${fmtDate(g.validUntil)}'e kadar` : "—"} />
            <StatRow label="Hat" value={<span className="inline-flex items-center gap-1"><Smartphone className="size-3.5" /> {g.phone} · {g.operator}</span>} />
          </div>
        </div>

        <div className="rounded-card bg-referral p-5 shadow-card">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-magenta px-3 py-1 text-xs font-bold text-magenta-foreground">
            <MessageCircle className="size-3.5" /> Sosyal medya & mesajlaşma ücretsiz
          </span>
          <p className="mt-3 text-sm text-foreground">WhatsApp, Instagram, X ve Telegram kullanımın kotandan düşmez.</p>
          <div className="mt-3 rounded-2xl bg-card p-4">
            <p className="text-xs text-muted-foreground">Bu uygulamalarda kullandığın</p>
            <p className="text-2xl font-bold text-primary">
              {fmtGB(g.freeAppsGB)} <span className="text-sm font-semibold text-success">– kotadan düşülmedi</span>
            </p>
          </div>
        </div>

        <div className="rounded-card bg-card p-5 shadow-card">
          <p className="flex items-center gap-2 font-semibold text-primary"><Share2 className="size-5" /> GB'ni ailenle paylaş</p>
          {family.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Paylaşım için önce Aile Yetkilendirme'den bir yakınını ekle.</p>
          ) : (
            <>
              <div className="mt-3 flex flex-wrap gap-2">
                {family.map((f) => (
                  <Chip key={f} active={to === f} onClick={() => setTo(f)}>{f}</Chip>
                ))}
              </div>
              <div className="mt-5 flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">Aktarılacak</span>
                <span className="text-2xl font-bold text-magenta">{fmtGB(amount)}</span>
              </div>
              <Slider value={[amount]} min={0} max={Math.max(0.5, remaining)} step={0.5} onValueChange={([v = 0]) => setAmount(v)} className="mt-3" aria-label="Paylaşılacak GB" />
              <p className="mt-1 text-xs text-muted-foreground">{fmtGB(remaining)} kalanın {fmtGB(amount)} kadarı {to} hattına geçer.</p>
              <Button size="lg" className="mt-4 w-full" disabled={amount <= 0 || remaining <= 0} onClick={() => setConfirm(true)}>
                Paylaş
              </Button>
            </>
          )}
          {g.shares.length > 0 && (
            <div className="mt-4 border-t border-border pt-3">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Paylaşım geçmişi</p>
              {g.shares.map((s) => (
                <StatRow key={s.id} label={`${s.to} · ${fmtDateTime(s.time)}`} value={fmtGB(s.gb)} />
              ))}
            </div>
          )}
        </div>

        <div className="rounded-card bg-card px-5 py-2 shadow-card">
          <p className="flex items-center gap-2 pt-3 font-semibold text-primary"><BriefcaseBusiness className="size-5" /> Remote Çalışma Modu</p>
          <p className="text-xs text-muted-foreground">Evden çalışıyorsan hediye GB'yi önce iş uygulamalarına ayıralım.</p>
          <ToggleRow id="remote" title="Kota Önceliği: Zoom, Teams, Meet" desc={g.remotePriority ? "İş uygulamaları öncelikli" : "Kapalı"} checked={g.remotePriority} onChange={(v) => { g.setRemotePriority(v); toast(v ? "İş uygulamalarına öncelik verildi" : "Öncelik kapatıldı"); }} />
        </div>

        <Csat feature="gift_data" title="Kesinti telafisi seni rahatlattı mı?" />
      </div>

      <ConfirmDialog open={confirm} title="GB paylaşımını onayla" text={`${fmtGB(amount)} ${to} hattına aktarılacak. Bu işlem geri alınamaz.`} confirmLabel="Aktar" onConfirm={doShare} onCancel={() => setConfirm(false)} />
    </div>
  );
}
