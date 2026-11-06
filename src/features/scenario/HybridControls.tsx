import { CloudOff, PlugZap, Smartphone } from "lucide-react";
import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { useNow } from "@/hooks/use-now";
import { cn } from "@/lib/utils";
import { HYBRID_OFFER_AFTER_H } from "@/features/workflow/rules";
import { HYBRID_COPY } from "@/features/workflow/copy";
import { openOutage, outageHours, restoreMain, setOutageElapsed, startOutage } from "@/features/workflow/services/hybrid";
import { useWorkflowStore as W } from "@/features/workflow/store";
import type { DemoConfig, HybridStatus } from "@/features/workflow/types";
import { useScenarioStore as S } from "./store";
import { useQrHealthStore } from "@/features/qrSupport/qrHealth";

const STATUS: Record<HybridStatus, string> = {
  unavailable: "Teklif yok (kesinti yok)",
  offered: "Teklif açık",
  checking: "Uygunluk kontrol ediliyor",
  ready: "Uygun · müşteri onayı bekleniyor",
  no_device: "Uyumlu cihaz yok",
  no_coverage: "Kapsama yetersiz",
  activating: "Etkinleştiriliyor",
  failed: "Aktivasyon başarısız",
  active: "Yedek bağlantı aktif",
  ended: "Kapatıldı (ana bağlantıya dönüldü)",
};

const setConfig = (p: Partial<DemoConfig>) => W.setState((s) => ({ config: { ...s.config, ...p } }));

function Seg<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold text-muted-foreground">{label}</p>
      <div className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1 text-[11px] font-semibold">
        {options.map(([v, l]) => (
          <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)} className={cn("min-h-8 rounded-full px-2", value === v ? "bg-card text-primary shadow-sm" : "text-muted-foreground")}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Presenter controls for the free Hibrit İnternet experience. Every button calls the real service. */
export function HybridControls() {
  const outage = W((s) => s.outage);
  const hybrid = W((s) => s.hybrid);
  const config = W((s) => s.config);
  const fixed = W((s) => s.connectivity.fixed);
  const qrHealth = useQrHealthStore((s) => s.health);
  const now = Math.max(useNow(5_000), outage?.lastUpdateAt ?? 0);
  const ongoing = !!outage && !outage.restoredAt;
  const hours = ongoing ? Math.round(outageHours(outage, now)) : 0;
  const [draft, setDraft] = useState<number | null>(null);
  const shown = draft ?? hours;
  const go = (path: string) => S.setState({ nav: path });

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-muted-foreground">Ücretsiz Hibrit İnternet akışını elle yönetin. Değişiklikler telefondaki ekranları ve bildirimleri anında günceller.</p>

      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-muted p-3 text-xs">
        <div>
          <p className="text-muted-foreground">Ana bağlantı</p>
          <p className={cn("font-bold", fixed === "up" ? "text-success" : "text-destructive")}>{fixed === "up" ? "Aktif" : "Kesik"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Kesinti süresi</p>
          <p className="font-bold text-foreground">{ongoing ? `${hours} saat` : "—"}</p>
        </div>
        <div className="col-span-2">
          <p className="text-muted-foreground">Hibrit İnternet</p>
          <p className="font-bold text-foreground">{STATUS[hybrid.status]}{hybrid.device ? ` · cihaz: ${HYBRID_COPY.device[hybrid.device.status].toLocaleLowerCase("tr-TR")}` : ""}</p>
        </div>
      </div>

      {!ongoing ? (
        <button type="button" onClick={() => { startOutage(0.3); go("/"); }} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive-soft text-sm font-semibold text-destructive">
          <CloudOff className="size-4" /> Kesintiyi başlat
        </button>
      ) : (
        <button type="button" onClick={() => restoreMain()} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-success/30 bg-success-soft text-sm font-semibold text-success">
          <PlugZap className="size-4" /> Ana bağlantıyı düzelt
        </button>
      )}

      <div className="space-y-2 rounded-2xl border border-border p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-primary">Kesintinin üzerinden geçen süre</p>
          <p className={cn("text-xs font-bold", shown >= HYBRID_OFFER_AFTER_H ? "text-magenta" : "text-muted-foreground")}>{shown} saat</p>
        </div>
        <Slider
          value={[shown]}
          min={0}
          max={72}
          step={1}
          onValueChange={([v = 0]) => setDraft(v)}
          onValueCommit={([v = 0]) => {
            setDraft(null);
            setOutageElapsed(v);
          }}
          aria-label="Kesinti süresi (saat)"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>0</span>
          <span className="font-semibold text-magenta">anında ücretsiz teklif</span>
          <span>72</span>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {[2, 23, 25, 48].map((h) => (
            <button key={h} type="button" onClick={() => setOutageElapsed(h)} className="min-h-8 rounded-lg border border-border bg-card text-[11px] font-semibold text-primary hover:bg-accent">
              {h} sa
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2.5 rounded-2xl border border-border p-3">
        <Seg label="Yedek cihaz + SIM" value={config.hybridDevice ? "yes" : "no"} options={[["yes", "Var"], ["no", "Yok"]]} onChange={(v) => setConfig({ hybridDevice: v === "yes" })} />
        <Seg label="Mobil kapsama" value={config.hybridCoverage ? "yes" : "no"} options={[["yes", "Uygun"], ["no", "Uygun değil"]]} onChange={(v) => setConfig({ hybridCoverage: v === "yes" })} />
        <Seg label="Sonraki aktivasyon" value={config.hybridActivation} options={[["success", "Başarılı"], ["fail", "Başarısız"]]} onChange={(v) => setConfig({ hybridActivation: v })} />
        <p className="pt-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Diğer demo dünyası ayarları</p>
        <Seg label="Taşınmada geçici internet" value={config.ownsBox ? "yes" : "no"} options={[["yes", "Evde Box var"], ["no", "Cihaz gönderilir"]]} onChange={(v) => setConfig({ ownsBox: v === "yes" })} />
        <Seg label="Randevu ekip eşleştirme" value={config.teamMatch} options={[["first", "İlk ekip kabul"], ["second", "İkinci ekip"]]} onChange={(v) => setConfig({ teamMatch: v })} />
        <Seg label="SMS alan telefonda uygulama" value={config.appInstalled ? "yes" : "no"} options={[["yes", "Yüklü"], ["no", "Yüklü değil"]]} onChange={(v) => setConfig({ appInstalled: v === "yes" })} />
        <Seg label="Dijital onarım sonucu" value={config.ustaDiag} options={[["clear", "Sorun yok"], ["issue", "Sorun bulur"], ["regional", "Bölgesel arıza"], ["incomplete", "Tamamlanamaz"]]} onChange={(v) => setConfig({ ustaDiag: v })} />
        <Seg label="Bölgesel arıza tahmini süre" value={String(config.regionalEtaH)} options={[["6", "6 sa"], ["36", "36 sa"]]} onChange={(v) => setConfig({ regionalEtaH: Number(v) })} />
        <Seg label="QR internet sağlığı kontrolü" value={qrHealth} options={[["good", "Sağlıklı"], ["bad", "Sorun çıkar"]]} onChange={(v) => useQrHealthStore.setState({ health: v })} />
        <Seg label="GIGA Teknik adımları" value={config.aiFix} options={[["fixed", "Çözülür"], ["not_fixed", "Çözülmez"]]} onChange={(v) => setConfig({ aiFix: v })} />
        <p className="text-[10px] text-muted-foreground">Cihaz ve kapsama ayarı, müşterinin bir sonraki uygunluk kontrolünde kullanılır (telefonda “Tekrar Kontrol Et”).</p>
      </div>

      <button type="button" onClick={() => go("/hibrit")} className="flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card text-xs font-semibold text-primary hover:bg-accent">
        <Smartphone className="size-4" /> Telefonda Hibrit İnternet ekranını aç
      </button>
      {openOutage() && <p className="text-[10px] text-muted-foreground">Kesinti kaydı: {outage?.wfId}</p>}
    </div>
  );
}
