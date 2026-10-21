import { Link } from "@tanstack/react-router";
import { Download, Info, Package, ScanLine, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import modemImg from "@/assets/modem.png";
import { PageHeader } from "@/components/layout/headers";
import { TurknetLogo } from "@/components/layout/headers";
import { Banner } from "@/components/tn/primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { USER } from "@/data/mock";
import { useAppStore } from "@/features/core/appStore";
import { useQrStore } from "../store";
import { makeQr, qrPayload } from "../qr";
import { useFlow } from "@/lib/analytics";

export function QrLabelScreen() {
  useFlow("qr_label");
  const serial = useQrStore((s) => s.serial);
  const ordered = useQrStore((s) => s.labelOrdered);
  const orderLabel = useQrStore((s) => s.orderLabel);
  const addHistory = useAppStore((s) => s.addHistory);
  const [src, setSrc] = useState<string | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    makeQr(qrPayload(serial)).then(setSrc).catch(() => setErr(true));
  }, [serial]);

  const download = () => {
    if (!src) return;
    const a = document.createElement("a");
    a.href = src;
    a.download = `turknet-qr-${serial}.png`;
    a.click();
    toast.success("Etiket indirildi", { description: "Yazdırıp modeminin üstüne yapıştırabilirsin." });
  };

  return (
    <div>
      <PageHeader title="QR Etiketim" />
      <div className="space-y-4 px-4">
        <div className="rounded-card bg-card p-5 shadow-card">
          <div className="mx-auto w-64 rounded-[28px] border-2 border-dashed border-magenta/40 bg-card p-4">
            <div className="flex items-center justify-between">
              <TurknetLogo className="text-3xl" />
              <span className="text-right text-[10px] font-bold leading-tight text-magenta">
                DESTEK İÇİN
                <br />
                OKUT
              </span>
            </div>
            <div className="mt-2 aspect-square w-full overflow-hidden rounded-2xl">
              {err ? (
                <div className="flex h-full items-center justify-center bg-muted text-sm text-muted-foreground">QR oluşturulamadı</div>
              ) : src ? (
                <img src={src} alt={`Kişisel destek QR kodu, ${serial}`} className="h-full w-full" />
              ) : (
                <Skeleton className="h-full w-full" />
              )}
            </div>
            <p className="mt-2 text-center font-mono text-xs text-muted-foreground">
              {serial} · Abone {USER.subscriberNo}
            </p>
          </div>
          <p className="mt-4 text-center text-sm text-muted-foreground">Bu QR sana özel. Modeminin üstüne yapıştır; arıza olduğunda okutman yeterli.</p>
        </div>

        <div className="rounded-card bg-card p-5 shadow-card">
          <p className="font-semibold text-primary">Nereye yapıştırmalıyım?</p>
          <div className="relative mx-auto mt-2 w-56">
            <img src={modemImg} alt="Modem üzerinde QR etiketinin yeri" width={816} height={816} loading="lazy" className="w-full" />
            <div className="absolute left-[44%] top-[52%] flex h-10 w-10 -translate-x-1/2 -rotate-6 items-center justify-center rounded-md border-2 border-magenta bg-card shadow-float">
              <ScanLine className="size-6 text-primary" />
            </div>
            <span className="absolute left-[60%] top-[42%] rounded-full bg-magenta px-2 py-0.5 text-[10px] font-bold text-magenta-foreground">Üst yüzey</span>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Modem: {USER.modemModel} · Seri No {serial}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" size="lg" onClick={download} disabled={!src}>
            <Download /> İndir / Yazdır
          </Button>
          <Button
            variant="outline"
            size="lg"
            disabled={ordered}
            onClick={() => {
              orderLabel();
              addHistory("QR etiket kargo talebi", "Adresine 2-3 iş gününde ulaşacak");
              toast.success("Etiketin kargoya verilecek", { description: "2-3 iş günü içinde adresinde." });
            }}
          >
            <Package /> {ordered ? "İstendi" : "Kargoyla İste"}
          </Button>
        </div>

        <Button asChild size="xl" className="w-full rounded-full">
          <Link to="/qr/tara">
            <ScanLine /> QR Tara ve Analiz Et
          </Link>
        </Button>

        <Banner tone="info" title="Uygulama dışından da çalışır">
          <span className="inline-flex items-start gap-1">
            <Smartphone className="mt-0.5 size-3.5 shrink-0" /> Telefonunun kendi kamerasıyla okutursan Turknet uygulaması otomatik açılır ve analiz başlar (deep link).
          </span>
        </Banner>
        <p className="flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground">
          <Info className="size-3" /> İçerik: {qrPayload(serial)}
        </p>
      </div>
    </div>
  );
}
