import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/layout/headers";
import { ToggleRow } from "@/components/tn/primitives";
import { useAppStore } from "@/features/core/appStore";
import { useAgentsStore } from "@/features/aiAgents/store";

export function PreferencesScreen() {
  const prefs = useAppStore((s) => s.prefs);
  const setPref = useAppStore((s) => s.setPref);
  const enabled = useAgentsStore((s) => s.enabled);
  const toggle = useAgentsStore((s) => s.toggle);

  return (
    <div>
      <PageHeader title="Tercihlerim" />
      <div className="space-y-4 px-4">
        <section className="rounded-card bg-card px-5 py-2 shadow-card" aria-labelledby="a11y">
          <p id="a11y" className="pt-3 text-xs font-bold uppercase tracking-wide text-magenta">Erişilebilirlik</p>
          <ToggleRow id="bigtext" title="Büyük Yazı" desc="Tüm metinleri büyütür" checked={prefs.bigText} onChange={(v) => setPref("bigText", v)} />
          <ToggleRow id="simple" title="Basit Mod" desc="Ana sayfada yalnızca 4 büyük düğme gösterir" checked={prefs.simpleMode} onChange={(v) => setPref("simpleMode", v)} />
        </section>

        <section className="rounded-card bg-card px-5 py-2 shadow-card">
          <p className="pt-3 text-xs font-bold uppercase tracking-wide text-magenta">Otomatik Kontrol İzinleri</p>
          <ToggleRow id="speed-agent" title="Hız Koruyucu" desc="Hız belirgin düştüğünde güvenli uzaktan düzeltme yapılsın (geri alınabilir)" checked={enabled.speed} onChange={(v) => toggle("speed", v)} />
          <Link to="/ajanlar/kontroller" className="flex min-h-12 items-center justify-between py-3 text-sm font-semibold text-primary">
            Otomatik kontrolleri yönet <ChevronRight className="size-4" />
          </Link>
        </section>

        <section className="rounded-card bg-card px-5 py-2 shadow-card">
          <p className="pt-3 text-xs font-bold uppercase tracking-wide text-magenta">Bildirimler</p>
          <ToggleRow id="push" title="Anlık bildirimler" desc="Kesinti, işlem ve onay gerektiren bildirimler" checked={prefs.push} onChange={(v) => setPref("push", v)} />
          <ToggleRow id="campaign-push" title="Kampanya bildirimleri" desc="Kapalıyken kampanyalar yalnızca bildirim listesinde görünür" checked={prefs.campaignPush} onChange={(v) => setPref("campaignPush", v)} disabled={!prefs.push} />
          <p className="pb-3 text-xs text-muted-foreground">Her teknik kontrol için bildirim göndermeyiz; yalnızca önemli bir gelişme olduğunda veya onayın gerektiğinde haber veririz. Aynı işlemle ilgili güncellemeler tek bildirimde birleşir.</p>
        </section>
      </div>
    </div>
  );
}
