import { CheckCircle2, CloudOff, Router, Signal, Smartphone, Wifi } from "lucide-react";
import { PageHeader } from "@/components/layout/headers";
import { AppLink, Card, SectionTitle } from "@/components/tn/primitives";
import { HYBRID_BACKUP_QUOTA_MB, USER } from "@/data/mock";
import { fmtUsage } from "../components/hybrid";
import { DemoNote } from "../components/ui";
import { HYBRID_COPY as C, NETBOX_INFO as N } from "../copy";

/**
 * NetBox bilgilendirmesi (route /netbox-nasil-calisir): ana sayfadaki "Nasıl
 * Çalışır?" bağlantısının açtığı sayfa. Paketin içinde ne olduğunu, bağlantının
 * adım adım nasıl çalıştığını, neler gerektirdiğini ve nereden açıldığını anlatır;
 * işlem yapmaz, yalnızca bilgilendirir.
 */
export function NetBoxInfoScreen() {
  return (
    <div>
      <PageHeader title="NetBox nasıl çalışır?" />
      <div className="space-y-3 px-4 pb-4">
        <Card>
          <span className="inline-flex rounded-full bg-success-soft px-2.5 py-1 text-[11px] font-bold text-success">{C.freeBadge}</span>
          <p className="mt-3 text-[1.35rem] font-bold leading-snug text-primary">
            İnternet kesintisinde, <span className="font-extrabold tracking-tighter text-primary">NetBox</span> ile bağlantıya devam! 🚀
          </p>
          <p className="mt-2 text-sm leading-relaxed text-foreground/80">{N.intro}</p>
        </Card>

        <section>
          <SectionTitle className="mt-2">Paketinizde ne var?</SectionTitle>
          <Card>
            <p className="text-sm text-muted-foreground">
              {USER.packageName} paketinize <span className="font-semibold text-foreground">NetBox</span> dahildir. Ek ücret ödemezsiniz.
            </p>
            <ul className="mt-4 space-y-3.5">
              {N.included.map((i) => (
                <li key={i.title} className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" strokeWidth={1.9} aria-hidden />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{i.title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{i.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between rounded-2xl bg-muted px-3.5 py-3">
              <span className="text-sm text-muted-foreground">Aylık yedek internet hakkı</span>
              <span className="text-sm font-semibold text-foreground">{fmtUsage(HYBRID_BACKUP_QUOTA_MB)}</span>
            </div>
          </Card>
        </section>

        <section>
          <SectionTitle>Adım adım nasıl çalışır?</SectionTitle>
          <Card>
            <ol className="space-y-4">
              {N.steps.map((s, idx) => (
                <li key={s.title} className="flex gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{idx + 1}</span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{s.title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </section>

        <section>
          <SectionTitle>Kesintide ne olur?</SectionTitle>
          <Card>
            <div className="space-y-2">
              <div className="flex items-center gap-3 rounded-2xl bg-destructive-soft px-3.5 py-3">
                <CloudOff className="size-5 shrink-0 text-destructive" strokeWidth={1.9} aria-hidden />
                <div>
                  <p className="text-sm font-semibold text-foreground">Ana internet (fiber)</p>
                  <p className="text-xs text-muted-foreground">Kesinti · geçici olarak kullanılamıyor</p>
                </div>
              </div>
              <p className="flex justify-center text-muted-foreground" aria-hidden>
                <span className="text-lg leading-none">↓</span>
              </p>
              <div className="flex items-center gap-3 rounded-2xl bg-success-soft px-3.5 py-3">
                <Signal className="size-5 shrink-0 text-success" strokeWidth={1.9} aria-hidden />
                <div>
                  <p className="text-sm font-semibold text-foreground">NetBox (mobil ağ)</p>
                  <p className="text-xs text-muted-foreground">Yedek bağlantı · internet kesintisiz devam eder</p>
                </div>
              </div>
              <p className="flex justify-center text-muted-foreground" aria-hidden>
                <span className="text-lg leading-none">↓</span>
              </p>
              <div className="flex items-center gap-3 rounded-2xl bg-muted px-3.5 py-3">
                <Wifi className="size-5 shrink-0 text-primary" strokeWidth={1.9} aria-hidden />
                <div>
                  <p className="text-sm font-semibold text-foreground">Ana hat gelince otomatik geri geçiş</p>
                  <p className="text-xs text-muted-foreground">NetBox kapanır, fiber bağlantınıza dönersiniz</p>
                </div>
              </div>
            </div>
            <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
              <Router className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span>Wi-Fi adınız ve şifreniz değişmez; cihazlarınızı yeniden bağlamanız gerekmez.</span>
            </p>
          </Card>
        </section>

        <section>
          <SectionTitle>Neler gerekir?</SectionTitle>
          <Card>
            <ul className="space-y-3.5">
              {N.needs.map((n) => (
                <li key={n.title} className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" strokeWidth={1.9} aria-hidden />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{n.title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{n.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-4 flex items-start gap-2 rounded-2xl bg-muted px-3.5 py-3 text-sm leading-relaxed text-foreground/80">
              <Smartphone className="mt-0.5 size-4 shrink-0 text-magenta" aria-hidden />
              <span>{N.noDevice}</span>
            </p>
          </Card>
        </section>

        <section>
          <SectionTitle>Nereden açabilirsiniz?</SectionTitle>
          <Card>
            <ul className="space-y-2.5">
              {N.openFrom.map((o) => (
                <li key={o} className="flex items-center gap-2.5 text-sm text-foreground">
                  <span className="size-1.5 shrink-0 rounded-full bg-magenta" aria-hidden />
                  {o}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Otomatik yedek geçiş açıksa kesintide sizin açmanız gerekmez; istediğiniz zaman kapatabilirsiniz.
            </p>
          </Card>
        </section>

        <AppLink to="/hibrit" className="flex min-h-12 items-center justify-center rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground">
          {N.cta}
        </AppLink>

        <DemoNote>NetBox, yedek cihaz, SIM, kapsama ve kullanım bilgileri demo verisidir; gerçek modem, SIM veya mobil operatör bağlantısı yoktur.</DemoNote>
      </div>
    </div>
  );
}
