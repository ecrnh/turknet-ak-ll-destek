import { QrCode } from "lucide-react";
import { useQrHealthStore } from "@/features/qrSupport/qrHealth";
import { Seg } from "./HybridControls";
import { useScenarioStore as S } from "./store";

/** Presenter controls for the QR self-service flow. Every switch drives the real QR screen state. */
export function QrControls() {
  const qrHealth = useQrHealthStore((s) => s.health);
  const qrModem = useQrHealthStore((s) => s.modem);
  const qrRepair = useQrHealthStore((s) => s.repair);
  const go = (path: string) => S.setState({ nav: path });

  return (
    <div className="space-y-2.5 rounded-2xl border border-border p-3">
      <Seg label="QR internet sağlığı kontrolü" value={qrHealth} options={[["good", "Sağlıklı"], ["bad", "Sorun çıkar"]]} onChange={(v) => useQrHealthStore.setState({ health: v })} />
      <Seg label="QR modem durumu" value={qrModem} options={[["ok", "Sorunsuz"], ["cable", "Kablo sorunu"]]} onChange={(v) => useQrHealthStore.setState({ modem: v })} />
      <Seg label="QR modem AI onarım sonucu" value={qrRepair} options={[["solved", "Çözülür"], ["unsolved", "Çözülmez"]]} onChange={(v) => useQrHealthStore.setState({ repair: v })} />
      <p className="text-[10px] text-muted-foreground">“Kablo sorunu” seçildiğinde QR akışında “Modemim çalışmıyor” doğrudan kablo onarımına gider; “Sorunsuz”da önce modem ışığı sorulur.</p>
      <button type="button" onClick={() => go("/qr/destek")} className="flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card text-xs font-semibold text-primary hover:bg-accent">
        <QrCode className="size-4" /> Telefonda QR Destek ekranını aç
      </button>
    </div>
  );
}
