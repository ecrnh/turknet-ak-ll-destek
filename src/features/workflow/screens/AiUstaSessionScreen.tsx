import { Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Camera, CheckCircle2, Headset, Home, Loader2, Phone, ScanEye, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/layout/headers";
import { EmptyState } from "@/components/tn/primitives";
import { Button } from "@/components/ui/button";
import { LED_STATE_LABEL, MODEM_LED_DEMO, MODEM_LEDS, type IvrCategory } from "@/data/mock";
import { useCamera } from "@/features/videoSupport/useCamera";
import { cn } from "@/lib/utils";
import { decide } from "../engine";
import { decodeLeds, ISSUE_LABEL, rateUsta, setUstaLeds, type Leds } from "../services/aiUsta";
import { useWorkflowStore } from "../store";
import { ModemFront, nextLed } from "../components/Modem";
import { DemoNote } from "../components/ui";
import type { Workflow } from "../types";

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={cn("rounded-card bg-card p-5 shadow-card", className)}>{children}</div>;
const st = (wf: Workflow, k: string) => wf.steps.find((s) => s.key === k);

/** Everything the live agent will see, so the customer never repeats the story. */
export function SupportSummary({ wf }: { wf: Workflow }) {
  const c = useWorkflowStore((s) => s.connectivity);
  const leds = decodeLeds(wf.data["leds"]);
  const issue = ISSUE_LABEL[(wf.data["issue"] as IvrCategory) ?? "down"] ?? "İnternetim çalışmıyor";
  const done = ["step1", "step2"].map((k) => st(wf, k)).filter((s) => s && (s.status === "done" || s.status === "failed"));
  const rows: [string, string][] = [
    ["Sorununuz", issue],
    ...(wf.data["channel"] === "ivr" ? ([["Sesli asistan sonucu", st(wf, "ivr_check")?.note ?? "—"]] as [string, string][]) : []),
    ["Modem ışıkları", leds ? MODEM_LEDS.map((m) => `${m.name} ${LED_STATE_LABEL[leds[m.key]].toLocaleLowerCase("tr-TR")}`).join(" · ") : "Görüntü alınmadı"],
    ["Yapılan adımlar", done.length ? done.map((s) => `${s!.label.replace(/^Adım \d: /, "")} ${s!.status === "done" ? "✓" : "✕"}`).join(" · ") : "—"],
    ["Bağlantı kontrolü", st(wf, "recheck")?.note ?? st(wf, "context")?.note ?? "—"],
    ["Mevcut durum", c.fixed === "up" ? "Bağlantı aktif" : c.fixed === "degraded" ? "Bağlantı zayıf" : "Bağlantı yok"],
  ];
  return (
    <Card>
      <p className="flex items-center gap-2 font-semibold text-primary">
        <Headset className="size-5 text-magenta" /> Temsilciye sizi tekrar tekrar anlatmak zorunda kalmayacaksınız.
      </p>
      <dl className="mt-3 space-y-2 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="rounded-xl bg-muted px-3 py-2">
            <dt className="text-[11px] font-semibold uppercase text-muted-foreground">{k}</dt>
            <dd className="text-foreground">{v}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function CameraStage({ wf }: { wf: Workflow }) {
  const cam = useCamera(false);
  const [open, setOpen] = useState(false);
  const [leds, setLeds] = useState<Leds>(() => decodeLeds(wf.data["leds"]) ?? { ...MODEM_LED_DEMO });
  const toggle = (k: keyof Leds) => setLeds((p) => ({ ...p, [k]: nextLed(p[k]) }));

  if (!open)
    return (
      <Card className="text-center">
        <ScanEye className="mx-auto size-10 text-magenta" />
        <p className="mt-2 text-lg font-semibold text-primary">Modeminizi gösterin, birlikte kontrol edelim.</p>
        <p className="mt-1 text-sm text-muted-foreground">Kamerayı modeminizin ön yüzüne tutmanız yeterli.</p>
        <Button size="xl" className="mt-4 w-full" onClick={() => { setOpen(true); void cam.start(); }}>
          <Camera /> Kamerayı aç
        </Button>
        <button type="button" onClick={() => decide(wf.id, "demo_photo", "customer")} className="mt-2 min-h-11 w-full text-sm font-semibold text-primary">
          Örnek görüntüyle devam et
        </button>
      </Card>
    );

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-card bg-call p-4">
        {cam.status === "live" ? (
          <video ref={cam.videoRef} autoPlay playsInline muted className="absolute inset-0 h-full w-full object-cover opacity-40" />
        ) : null}
        <p className="relative mb-3 text-center text-xs font-semibold text-call-foreground/80">
          {cam.status === "live" ? "Kamera açık · modeminizi çerçeveye alın" : cam.status === "pending" ? "Kamera açılıyor…" : "Kamera kullanılamıyor · simüle görüntü"}
        </p>
        <div className="relative rounded-[32px] border-2 border-dashed border-call-foreground/40 p-2">
          <ModemFront leds={leds} onToggle={toggle} />
        </div>
        <p className="relative mt-3 text-center text-[11px] text-call-foreground/70">Işıkların modeminizdekiyle aynı olması için her birine dokunarak değiştirin</p>
      </div>
      <Button
        size="xl"
        className="w-full"
        onClick={() => {
          setUstaLeds(wf.id, leds);
          decide(wf.id, "uploaded", "customer");
        }}
      >
        Görüntüyü Gönder
      </Button>
    </div>
  );
}

function Progress({ label, sub, seconds }: { label: string; sub?: string; seconds: number }) {
  return (
    <Card>
      <p className="flex items-center gap-2 font-semibold text-primary">
        <Loader2 className="size-5 animate-spin text-magenta" /> {label}
      </p>
      {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
        <motion.div className="h-full rounded-full bg-magenta" initial={{ width: "4%" }} animate={{ width: "100%" }} transition={{ duration: seconds, ease: "linear" }} />
      </div>
    </Card>
  );
}

/** AI Usta session: camera, light check, one safe step at a time, re-check, then resolve or live support. */
export function AiUstaSessionScreen({ id }: { id: string }) {
  const navigate = useNavigate();
  const wf = useWorkflowStore((s) => s.workflows.find((w) => w.id === id));
  if (!wf || wf.type !== "ai_usta")
    return (
      <div>
        <PageHeader title="AI Usta" />
        <EmptyState icon={TriangleAlert} title="Oturum bulunamadı" text="Demo sıfırlanmış olabilir." action={<Link to="/ai-usta" className="font-semibold text-magenta">AI Usta'yı başlat</Link>} />
      </div>
    );

  const d = wf.decision;
  const fromCall = wf.data["channel"] === "ivr";
  const reading = typeof wf.data["reading"] === "string" ? wf.data["reading"] : null;
  const leds = decodeLeds(wf.data["leds"]);
  const stepN = d?.key === "usta_step1" ? 1 : d?.key === "usta_step2" ? 2 : 0;
  const doneCount = wf.steps.filter((s) => s.status === "done").length;

  let body: React.ReactNode;
  if (wf.handoff) {
    body = (
      <>
        <SupportSummary wf={wf} />
        <Button size="xl" className="w-full" onClick={() => navigate({ to: "/canli-destek/$id", params: { id } })}>
          <Headset /> Canlı desteğe geç
        </Button>
        <p className="text-center text-xs text-muted-foreground">Kayıt numaranız {wf.handoff.id} · İşlemlerim'de görünür</p>
      </>
    );
  } else if (wf.status === "completed") {
    body = (
      <Card className="text-center">
        <CheckCircle2 className="mx-auto size-14 text-success" />
        <p className="mt-2 text-xl font-semibold text-primary">Harika! Bağlantınız yeniden aktif.</p>
        <p className="mt-1 text-sm text-muted-foreground">İnternetinizi tekrar kullanabilirsiniz. Destek kaydı açmanıza gerek kalmadı.</p>
        {!wf.data["rating"] ? (
          <div className="mt-4 grid grid-cols-3 gap-2">
            {([3, 2, 1] as const).map((n) => (
              <button key={n} type="button" onClick={() => rateUsta(wf.id, n)} className="min-h-11 rounded-xl bg-muted text-sm font-semibold text-primary">
                {n === 3 ? "Çok iyi" : n === 2 ? "İdare eder" : "Kötü"}
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm font-semibold text-success">Geri bildiriminiz için teşekkürler</p>
        )}
        <Button size="xl" className="mt-4 w-full" onClick={() => navigate({ to: "/" })}>
          <Home /> Ana sayfaya dön
        </Button>
      </Card>
    );
  } else if (wf.status === "failed") {
    body = (
      <Card className="text-center">
        <p className="font-semibold text-primary">Bu oturum kapandı</p>
        <Button className="mt-4 w-full" onClick={() => navigate({ to: "/ai-usta" })}>
          Yeniden Başlat
        </Button>
      </Card>
    );
  } else if (d?.key === "usta_photo") {
    body = <CameraStage key={d.askedAt} wf={wf} />;
  } else if (stepN) {
    const opts = d!.options;
    body = (
      <>
        {stepN === 1 && reading && (
          <div className="flex gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-plum text-primary-foreground">
              <ScanEye className="size-4" />
            </span>
            <p className="rounded-2xl rounded-tl-sm bg-card px-4 py-3 text-sm text-foreground shadow-card">{reading}</p>
          </div>
        )}
        <Card>
          <p className="text-[11px] font-bold uppercase tracking-widest text-magenta">Adım {stepN} / 2</p>
          <p className="mt-1 text-lg font-semibold leading-snug text-primary">{d!.prompt}</p>
          <p className="mt-1 text-sm text-muted-foreground">{d!.detail}</p>
          <Button size="xl" className="mt-4 w-full" onClick={() => decide(wf.id, opts[0]!.id, "customer")}>
            {opts[0]!.label}
          </Button>
          <button type="button" onClick={() => decide(wf.id, opts[1]!.id, "customer")} className="mt-2 min-h-11 w-full text-sm font-semibold text-primary">
            {opts[1]!.label}
          </button>
        </Card>
      </>
    );
  } else if (d?.key === "usta_confirm") {
    body = (
      <Card>
        <p className="flex items-center gap-2 text-lg font-semibold text-primary">
          <CheckCircle2 className="size-6 text-success" /> {d.prompt}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{d.detail}</p>
        <Button size="xl" className="mt-4 w-full" onClick={() => decide(wf.id, "yes", "customer")}>
          {d.options[0]!.label}
        </Button>
        <button type="button" onClick={() => decide(wf.id, "no", "customer")} className="mt-2 min-h-11 w-full text-sm font-semibold text-primary">
          {d.options[1]!.label}
        </button>
      </Card>
    );
  } else if (d?.key === "usta_live" || wf.status === "waiting_for_customer") {
    body = (
      <>
        <Card>
          <p className="flex items-center gap-2 text-lg font-semibold leading-snug text-primary">
            <TriangleAlert className="size-6 shrink-0 text-warning" /> {d?.prompt ?? "Bu adımlara rağmen bağlantınız düzelmedi. Sorunu daha detaylı inceleyelim."}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{d?.detail ?? "Hazır olduğunuzda canlı desteğe bağlanabilirsiniz."}</p>
          <Button size="xl" className="mt-4 w-full" onClick={() => (d ? decide(wf.id, "live", "customer") : navigate({ to: "/surec/$id", params: { id } }))}>
            <Headset /> Canlı desteğe bağlan
          </Button>
          {d && (
            <button type="button" onClick={() => decide(wf.id, "later", "customer")} className="mt-2 min-h-11 w-full text-sm font-semibold text-primary">
              Daha Sonra
            </button>
          )}
        </Card>
      </>
    );
  } else if (st(wf, "recheck")?.status === "in_progress") {
    body = <Progress label="Bağlantının yeniden kurulmasını bekliyoruz" sub="Modeminizin ışıkları yerine oturuyor. Ardından bağlantınızı tekrar kontrol edeceğim." seconds={3.5} />;
  } else if (st(wf, "analysis")?.status === "in_progress") {
    body = (
      <>
        {leds && <ModemFront leds={leds} scanning />}
        <Progress label="Görüntüyü inceliyorum" sub="Işıkların durumuna bakıyorum (simülasyon)." seconds={1.8} />
      </>
    );
  } else {
    body = <Progress label="Bağlantınızı ve açık kayıtları kontrol ediyoruz" sub="Sizin şu an bir şey yapmanız gerekmiyor." seconds={1.5} />;
  }

  return (
    <div>
      <PageHeader title="AI Usta" />
      <div className="space-y-4 px-4 pb-4">
        <div className="rounded-card bg-plum p-5 text-primary-foreground shadow-float">
          <p className="text-xl font-semibold">AI Usta yanınızda.</p>
          <p className="mt-0.5 text-sm text-primary-foreground/85">Modeminizi gösterin, birlikte kontrol edelim.</p>
          {fromCall && (
            <p className="mt-3 flex items-start gap-2 rounded-2xl bg-primary-foreground/10 p-3 text-xs">
              <Phone className="mt-0.5 size-4 shrink-0" />
              <span>
                Çağrınızdan devraldık: <b>{ISSUE_LABEL[(wf.data["issue"] as IvrCategory) ?? "down"]}</b> · {st(wf, "ivr_check")?.note ?? "ilk kontroller yapıldı"}. Sorununuzu tekrar anlatmanıza gerek yok.
              </span>
            </p>
          )}
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-primary-foreground/15" aria-label={`${doneCount} / ${wf.steps.length} adım`}>
            <div className="h-full rounded-full bg-neon-lime transition-all" style={{ width: `${(doneCount / wf.steps.length) * 100}%` }} />
          </div>
        </div>
        {body}
        <Link to="/surec/$id" params={{ id }} className="block text-center text-sm font-semibold text-primary">
          İşlem adımlarını gör
        </Link>
        <DemoNote>Görsel kontrol bu prototipte simülasyondur; gerçek bir görüntü modeli kullanılmaz ve sonuç kesin teşhis değildir.</DemoNote>
      </div>
    </div>
  );
}
