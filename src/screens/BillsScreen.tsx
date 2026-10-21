import { ArrowRight, Building2, CreditCard, Info, Lock, ReceiptText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import billImg from "@/assets/bill-empty.png";
import { BellButton } from "@/components/layout/headers";
import { Banner } from "@/components/tn/primitives";
import { AppLink } from "@/components/tn/primitives";
import { Button } from "@/components/ui/button";
import { useActingAccount, useCan } from "@/features/family/store";
import { useAppStore } from "@/features/core/appStore";
import { fmtTL } from "@/lib/format";

function Row({ title, to, icon: Icon }: { title: string; to: string; icon: typeof ReceiptText }) {
  return (
    <AppLink to={to} className="flex min-h-[72px] items-center justify-between rounded-card bg-card px-6 shadow-card">
      <span className="font-semibold text-foreground">{title}</span>
      <Icon className="size-7 text-primary" strokeWidth={1.5} />
    </AppLink>
  );
}

export function BillsScreen() {
  const acting = useActingAccount();
  const canPay = useCan("payment");
  const canView = useCan("bills");
  const addHistory = useAppStore((s) => s.addHistory);
  const [paid, setPaid] = useState(false);

  return (
    <div>
      <div className="sticky top-0 z-30 flex items-center bg-card px-5 pb-3 pt-4">
        <h1 className="flex-1 text-2xl font-semibold tracking-tight text-primary">Fatura ve Ödeme</h1>
        <BellButton />
      </div>
      <div className="space-y-4 px-4 pt-5">
        {acting && canView && !paid ? (
          <div className="rounded-card bg-card p-6 shadow-card">
            <p className="text-sm text-muted-foreground">{acting.name} · Ekim 2026</p>
            <p className="mt-1 text-3xl font-bold text-primary">{fmtTL(749.9)}</p>
            <p className="text-sm text-muted-foreground">Son ödeme: 28 Ekim 2026</p>
            {canPay ? (
              <Button size="lg" className="mt-5 w-full" onClick={() => { setPaid(true); addHistory("Fatura ödendi", `${acting.name} adına ₺749,90`); toast.success("Ödeme alındı"); }}>
                <CreditCard /> Faturayı Öde
              </Button>
            ) : (
              <Banner tone="warning" className="mt-5" title="Fatura ödeme yetkin yok">
                {acting.honorific} sana yalnızca görüntüleme yetkisi verdi. Ödeme için yetkiyi kendisi açabilir.
              </Banner>
            )}
          </div>
        ) : acting && !canView ? (
          <div className="rounded-card bg-card p-6 text-center shadow-card">
            <Lock className="mx-auto size-10 text-muted-foreground" />
            <p className="mt-3 font-semibold text-primary">Fatura görüntüleme yetkin yok</p>
          </div>
        ) : (
          <div className="rounded-card bg-card p-6 shadow-card">
            <h2 className="text-[1.4rem] font-semibold text-primary">Faturanız Bulunmamaktadır</h2>
            <div className="relative mx-auto mt-5 flex h-48 w-48 items-center justify-center">
              <div className="absolute inset-4 rounded-full bg-magenta-soft" />
              <img src={billImg} alt="Kredi kartı tutan kadın illüstrasyonu" width={816} height={816} loading="lazy" className="relative h-48 w-48 object-contain" />
            </div>
            <p className="mt-4 text-center text-[1.05rem] text-foreground">
              Ödenmemiş faturanız bulunmamaktadır.
              <br />
              Teşekkürler!
            </p>
            <div className="mt-5 flex gap-3 border-t border-border pt-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-magenta text-magenta-foreground">
                <Info className="size-4" />
              </span>
              <p className="text-sm text-muted-foreground">Abonelik ücretleri, her dönemin başlangıcında faturalanır ve hesabınızda görüntülenmesi fatura tarihinden itibaren 1 haftayı bulabilir.</p>
            </div>
          </div>
        )}

        <Row title="Geçmiş Faturalarımı Görüntüle" to="/faturalar/gecmis" icon={ReceiptText} />
        <Row title="Otomatik Ödeme Talimatı Ver" to="/islem/otomatik-odeme" icon={CreditCard} />
        <Row title="Fatura Tercihlerimi Düzenle" to="/islem/fatura-tercih" icon={ArrowRight} />
        <Row title="Fatura Gönderim Adresini Düzenle" to="/islem/fatura-adres" icon={Building2} />
      </div>
    </div>
  );
}
