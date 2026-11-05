import { useNavigate } from "@tanstack/react-router";
import { Download, Info, Package, Printer, ScanLine } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/headers";
import { TurknetLogo } from "@/components/layout/headers";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { USER } from "@/data/mock";
import { useAppStore } from "@/features/core/appStore";
import { useQrStore } from "../store";
import { makeQr, qrPayload } from "../qr";
import { startQrGigaSupport } from "../startQrSupport";
import { useFlow } from "@/lib/analytics";

export function QrLabelScreen() {
  useFlow("qr_label");
  const navigate = useNavigate();
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

  const print = () => {
    if (!src) return;
    const win = window.open("", "_blank", "width=480,height=640");
    if (!win) {
      toast.error("Yazdırma penceresi açılamadı", { description: "Tarayıcı açılır pencerelere izin vermiyor." });
      return;
    }
    win.document.write(`<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>TürkNet destek QR etiketi</title><style>body{font-family:Arial,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;color:#4a0a5e}.label{width:320px;padding:24px;border:2px dashed #d82eaa;border-radius:24px;text-align:center}.label img{width:100%;display:block;margin:18px auto}.brand{font-size:24px;font-weight:700}.hint{font-size:12px;font-weight:700;color:#d82eaa}.serial{font-family:monospace;font-size:12px;color:#666}</style></head><body><main class="label"><div class="brand">TürkNet</div><div class="hint">DESTEK İÇİN OKUT</div><img src="${src}" alt="Kişisel destek QR kodu"><p class="serial">${serial} · Abone ${USER.subscriberNo}</p></main><script>window.onload=()=>{window.print();window.close()}</script></body></html>`);
    win.document.close();
  };

  const tryQr = () => {
    startQrGigaSupport();
    navigate({ to: "/ajanlar" });
  };

  return (
    <div>
      <PageHeader title="QR Etiketim" />
      <div className="space-y-4 px-4">
        <section className="rounded-card border border-magenta/15 bg-magenta-soft p-5 shadow-card">
          <h2 className="text-xl font-semibold leading-snug text-primary">Modeminden GIGA'ya, tek bir QR ile.</h2>
          <p className="mt-2 text-sm leading-relaxed text-foreground">İnternetinde bir sorun mu var? Modeminin üzerindeki QR kodu okut. GIGA modemini ve bağlantını otomatik kontrol etsin, sorununun çözümü için seni doğrudan yönlendirsin.</p>
        </section>
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
          <p className="mt-4 text-center text-sm text-muted-foreground">Bu QR modemine ve aboneliğine özel. Okutulduğunda bilgiler otomatik tanınır; modem modelini, cihaz kodunu veya abonelik numaranı tekrar girmen gerekmez.</p>
        </div>

        <div className="rounded-card border border-primary/10 bg-card p-4 shadow-card">
          <p className="flex items-center gap-2 font-semibold text-primary"><Info className="size-4 text-magenta" /> Modeminde QR etiketi yok mu?</p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">Etiketini bu sayfadan oluşturabilir, indirebilir ve yazdırabilirsin. Modeminin üzerine ya da kolayca görebileceğin başka bir yere yapıştırman yeterli; etiketin fiziksel olarak modem üzerinde olması şart değil.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" size="lg" onClick={download} disabled={!src}>
            <Download /> QR Etiketini İndir
          </Button>
          <Button variant="outline" size="lg" onClick={print} disabled={!src}>
            <Printer /> Yazdır
          </Button>
        </div>

        <Button variant="outline" size="lg" className="w-full" disabled={ordered} onClick={() => {
          orderLabel();
          addHistory("QR etiket kargo talebi", "Adresine 2-3 iş gününde ulaşacak");
          toast.success("Etiketin kargoya verilecek", { description: "2-3 iş günü içinde adresinde." });
        }}>
          <Package /> {ordered ? "QR etiketi istendi" : "QR Etiketini Kargoyla İste"}
        </Button>

        <Button size="xl" className="w-full rounded-full" onClick={tryQr}>
          <ScanLine /> QR ile Destek Akışını Dene
        </Button>
      </div>
    </div>
  );
}

