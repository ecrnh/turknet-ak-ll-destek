import { Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, CloudOff, Info, Loader2, Router, ShieldCheck, Signal, TriangleAlert } from "lucide-react";
import { useEffect } from "react";
import { PageHeader } from "@/components/layout/headers";
import { Button } from "@/components/ui/button";
import { useNow } from "@/hooks/use-now";
import { useFlow } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { HYBRID_COPY as C } from "../copy";
import { HYBRID_OFFER_AFTER_H, hybridOfferOpen } from "../rules";
import { activateHybrid, checkHybrid, declineHybrid, outageHours, requestHybridDevice } from "../services/hybrid";
import { useWorkflowStore } from "../store";
import { ChecksList, ConnectionDiagram, DeviceTracker, FreeBadge, LinkStatus, OutageMeta } from "../components/hybrid";
import { HybridBoxCard } from "../components/hybridBox";
import { DemoNote, TechDetails } from "../components/ui";

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={cn("rounded-card bg-card p-5 shadow-card", className)}>{children}</div>;

/** Hibrit İnternet: explanation, eligibility check, consent, live status and switch-back. */
export function HybridScreen() {
  const flow = useFlow("hybrid_internet");
  const navigate = useNavigate();
  const o = useWorkflowStore((s) => s.outage);
  const h = useWorkflowStore((s) => s.hybrid);
  const verify = useWorkflowStore((s) => s.workflows.find((w) => w.id === s.outage?.wfId)?.steps.find((st) => st.key === "verify")?.status);
  const now = Math.max(useNow(5_000), o?.lastUpdateAt ?? 0);

  const ongoing = !!o && !o.restoredAt;
  const hours = ongoing ? outageHours(o, now) : 0;
  const after24 = ongoing && hybridOfferOpen(hours);

  // Entering the activation screen runs the device / SIM / coverage check once.
  useEffect(() => {
    if (after24 && h.status === "offered") checkHybrid();
  }, [after24, h.status]);

  useEffect(() => {
    if (h.status === "active") flow.complete({ attempts: h.attempts });
  }, [h.status, h.attempts, flow]);

  const notNow = () => {
    declineHybrid();
    navigate({ to: "/" });
  };

  return (
    <div>
      <PageHeader title={C.name} />
      <div className="space-y-4 px-4 pb-4">
        <div className="rounded-card bg-plum p-5 text-primary-foreground shadow-float">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-foreground/15">
              <Router className="size-6" />
            </span>
            <div className="flex-1">
              <p className="text-lg font-semibold leading-snug">İnternetin kesilse bile bağlantın devam etsin.</p>
              <FreeBadge onDark className="mt-1" />
            </div>
          </div>
          <p className="mt-3 text-sm text-primary-foreground/85">TürkNet Hibrit İnternet ile sabit bağlantın kesildiğinde mobil yedek bağlantını kullanabilirsin.</p>
        </div>

        <Card>
          <ConnectionDiagram />
          <PlainNote className="mt-4 shadow-none bg-muted">
            {!ongoing
              ? o?.restoredAt
                ? "Ev internetin yeniden aktif. Artık ana bağlantını kullanıyorsun."
                : "Şu anda ana internet bağlantını kullanıyorsun. Kesinti olursa durumu sana bildireceğiz."
              : h.status === "active" && !h.pausedAt
                ? "Yedek bağlantın aktif. İnterneti kullanmaya devam edebilirsin. Ana bağlantın düzelince geçiş otomatik yapılır."
                : after24
                  ? "Ev internetinde kesinti 24 saati aştı. Yedek bağlantını devreye alalım mı?"
                  : "Ev internetinde kesinti algıladık. Teknik ekip çalışıyor; kesinti 24 saati aşarsa yedek bağlantını açabileceğiz."}
          </PlainNote>
        </Card>

        <HybridBoxCard />

        {/* No outage */}
        {!o && (
          <Card>
            <p className="flex items-center gap-2 font-semibold text-primary">
              <CheckCircle2 className="size-5 text-success" /> Bağlantınız normal
            </p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {C.how.map((t) => (
                <li key={t} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-magenta" /> {t}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs font-semibold text-success">{C.included}</p>
          </Card>
        )}

        {/* First 24 hours: tracking only */}
        {ongoing && !after24 && (
          <Card>
            <p className="flex items-center gap-2 font-semibold text-primary">
              <CloudOff className="size-5 text-destructive" /> {C.detected.title}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{C.detected.text}</p>
            <OutageMeta o={o} now={now} className="mt-4" />
            <div className="mt-4">
              <div className="h-1.5 overflow-hidden rounded-full bg-border">
                <div className="h-full rounded-full bg-magenta" style={{ width: `${Math.min(100, (hours / HYBRID_OFFER_AFTER_H) * 100)}%` }} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Şu an sizden bir işlem beklenmiyor. Kesinti {HYBRID_OFFER_AFTER_H} saati aşarsa size haber vereceğiz ve ücretsiz yedek bağlantınızı buradan etkinleştirebileceksiniz.</p>
            </div>
          </Card>
        )}

        {/* After 24 hours */}
        {after24 && (
          <>
            {h.status !== "active" && (
              <Card>
                <p className="font-semibold text-primary">Uygunluk kontrolü</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Yedek bağlantı için cihazınızı, SIM'inizi ve mobil kapsamayı kontrol ediyoruz.</p>
                <div className="mt-3">
                  <ChecksList checks={h.checks} checking={h.status === "checking" || h.status === "offered"} />
                </div>
              </Card>
            )}

            {h.status === "ready" && (
              <Card>
                <p className="flex items-center gap-2 font-semibold text-primary">
                  <ShieldCheck className="size-5 text-success" /> Her şey hazır
                </p>
                <p className="mt-1 text-sm text-muted-foreground">Onay verirseniz yedek bağlantınızı hemen açarız. Ana bağlantınız düzelince otomatik olarak geri döneriz.</p>
                <Button size="xl" className="mt-4 w-full rounded-full" onClick={() => activateHybrid()}>
                  {C.consent}
                </Button>
                <p className="mt-2 text-center text-xs font-semibold text-success">{C.included}</p>
                <button type="button" onClick={notNow} className="mt-2 flex min-h-11 w-full items-center justify-center text-sm font-semibold text-primary">
                  {C.notNow}
                </button>
              </Card>
            )}

            {h.status === "activating" && (
              <Card className="flex items-center gap-3">
                <Loader2 className="size-6 animate-spin text-magenta" />
                <p className="font-semibold text-primary">Yedek bağlantınız etkinleştiriliyor…</p>
              </Card>
            )}

            {h.status === "failed" && (
              <Card>
                <p className="flex items-center gap-2 font-semibold text-primary">
                  <TriangleAlert className="size-5 text-warning" /> {C.failed.title}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{C.failed.text}</p>
                <Button size="xl" className="mt-4 w-full rounded-full" onClick={() => activateHybrid()}>
                  {C.failed.cta}
                </Button>
                <button type="button" onClick={() => navigate({ to: "/yardim" })} className="mt-2 flex min-h-11 w-full items-center justify-center text-sm font-semibold text-primary">
                  Destek Al
                </button>
              </Card>
            )}

            {h.status === "no_device" && (
              <Card>
                <p className="font-semibold text-primary">{C.noDevice.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{C.noDevice.text}</p>
                {h.device ? (
                  <div className="mt-4 rounded-2xl bg-muted p-3">
                    <DeviceTracker d={h.device} />
                    <p className="mt-2 text-xs text-muted-foreground">Cihaz teslim edilince uygunluğunuzu otomatik olarak yeniden kontrol edeceğiz.</p>
                  </div>
                ) : (
                  <>
                    <Button size="xl" className="mt-4 w-full rounded-full" onClick={() => requestHybridDevice()}>
                      {C.noDevice.cta}
                    </Button>
                    <button type="button" onClick={notNow} className="mt-2 flex min-h-11 w-full items-center justify-center text-sm font-semibold text-primary">
                      {C.notNow}
                    </button>
                  </>
                )}
              </Card>
            )}

            {h.status === "no_coverage" && (
              <Card>
                <p className="flex items-center gap-2 font-semibold text-primary">
                  <Signal className="size-5 text-muted-foreground" /> {C.noCoverage.title}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{C.noCoverage.text}</p>
                <p className="mt-2 text-sm text-muted-foreground">{C.noCoverage.after}</p>
                <button type="button" onClick={() => checkHybrid()} className="mt-4 flex min-h-12 w-full items-center justify-center rounded-full border border-primary/20 text-sm font-semibold text-primary">
                  Tekrar Kontrol Et
                </button>
              </Card>
            )}

            {h.status === "active" && (
              <Card>
                <p className="flex items-center gap-2 font-semibold text-primary">
                  <CheckCircle2 className="size-5 text-success" /> {C.active.title}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{C.active.text}</p>
                <div className="mt-4">
                  <LinkStatus now={now} />
                </div>
                <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
                  <Info className="mt-0.5 size-3.5 shrink-0" /> Ana bağlantınız düzelince otomatik olarak geri döneceğiz. Sizin bir şey yapmanız gerekmiyor.
                </p>
              </Card>
            )}

            <Card>
              <p className="mb-3 text-sm font-semibold text-primary">Arıza takibi</p>
              <OutageMeta o={o!} now={now} />
            </Card>
          </>
        )}

        {/* Restored */}
        {o?.restoredAt && (
          <Card>
            {verify !== "done" ? (
              <p className="flex items-center gap-2 font-semibold text-primary">
                <Loader2 className="size-5 animate-spin text-magenta" /> Ana bağlantınız doğrulanıyor
              </p>
            ) : (
              <>
                <p className="flex items-center gap-2 font-semibold text-primary">
                  <CheckCircle2 className="size-5 text-success" /> {h.status === "ended" ? C.restored.title : "İnternetiniz normale döndü"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{h.status === "ended" ? C.restored.text : C.restored.plain}</p>
              </>
            )}
            <div className="mt-4">
              <LinkStatus now={now} />
            </div>
            <OutageMeta o={o} now={now} className="mt-3" />
          </Card>
        )}

        <TechDetails>
          {o && (
            <Link to="/surec/$id" params={{ id: o.wfId }} className="block text-sm font-semibold text-primary">
              İşlem adımlarını gör →
            </Link>
          )}
          <DemoNote>Kesinti süresi, cihaz, SIM, kapsama ve kullanım bilgileri demo verisidir; gerçek modem, SIM veya mobil operatör bağlantısı yoktur.</DemoNote>
        </TechDetails>
      </div>
    </div>
  );
}
