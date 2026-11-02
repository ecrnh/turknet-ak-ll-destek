import { Link } from "@tanstack/react-router";
import { ArrowDown, Award, CalendarCheck, CheckCircle2, Gauge, Home, Info, Loader2, MapPinned, Power, Radar, Router, ShieldAlert, Signal, Smartphone, Wifi, WifiOff, Wrench } from "lucide-react";
import modemImg from "@/assets/modem.png";
import { BILLING_CHECKS, CURRENT_ADDRESS, SUBSCRIPTION, TEMP_MOBILE_OFFER } from "@/data/mock";
import { fmtRelative, fmtTL } from "@/lib/format";
import { cn } from "@/lib/utils";
import { choiceOf } from "../engine";
import { canToggleBox, compareBilling, connectionHealth, HEALTH_COPY } from "../rules";
import { rateUsta } from "../services/aiUsta";
import { resumeBillingReview } from "../services/billing";
import { toggleBox } from "../services/connectivity";
import { useWorkflowStore } from "../store";
import type { Workflow } from "../types";
import { StatusPill } from "./ui";

const Box = ({ title, children, className }: { title?: string | undefined; children: React.ReactNode; className?: string | undefined }) => (
  <div className={cn("rounded-card bg-card p-5 shadow-card", className)}>
    {title && <p className="mb-3 text-sm font-semibold text-primary">{title}</p>}
    {children}
  </div>
);

export function RelocationPanel({ wf }: { wf: Workflow }) {
  const temp = useWorkflowStore((s) => s.workflows.find((w) => w.type === "temp_internet" && w.relatedIds.includes(wf.id)));
  const appt = useWorkflowStore((s) => s.appointments.find((a) => a.workflowId === wf.id));
  const elig = wf.data["eligibility"];
  return (
    <Box>
      <div className="flex gap-3">
        <Home className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        <div>
          <p className="text-[11px] font-semibold uppercase text-muted-foreground">Mevcut adres</p>
          <p className="text-sm font-semibold text-foreground">
            {CURRENT_ADDRESS.line}, {CURRENT_ADDRESS.district}
          </p>
        </div>
      </div>
      <ArrowDown className="my-1 ml-0.5 size-4 text-muted-foreground" />
      <div className="flex gap-3">
        <MapPinned className="mt-0.5 size-5 shrink-0 text-magenta" />
        <div>
          <p className="text-[11px] font-semibold uppercase text-muted-foreground">Yeni adres · {String(wf.data["moveDate"] ?? "")}</p>
          <p className="text-sm font-semibold text-foreground">{String(wf.data["address"] ?? "")}</p>
          <p className={cn("mt-1 text-xs font-semibold", elig === "no_port" ? "text-orange-deep" : elig ? "text-success" : "text-muted-foreground")}>
            {elig === "no_port" ? "Şu an boş internet portu yok · takip ediyoruz" : elig === "eligible_external" ? "Uygun · port altyapı sağlayıcısından istenecek" : elig === "eligible" ? "Adresiniz uygun" : "Adresinizdeki internet altyapısını kontrol ediyoruz"}
          </p>
        </div>
      </div>
      <TeamMatch wf={wf} />
      {appt && (
        <p className="mt-4 flex items-center gap-2 rounded-2xl bg-success-soft px-3 py-2 text-sm font-semibold">
          <CalendarCheck className="size-4 text-success" /> Randevunuz onaylandı: {appt.label}
        </p>
      )}
      {temp && (
        <Link to="/surec/$id" params={{ id: temp.id }} className="mt-3 flex items-center gap-2 rounded-2xl bg-icon-box px-3 py-2 text-sm">
          <Smartphone className="size-4 text-primary" />
          <span className="flex-1 font-semibold text-primary">{temp.title}</span>
          <StatusPill status={temp.status} />
        </Link>
      )}
      <div className="mt-4 rounded-2xl bg-muted p-3 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground">Eski adresinizdeki hizmet ne olacak?</p>
        Eski hattınız, yeni adreste bağlantınız doğrulanmadan kapatılmaz. Kapatma ücretsizdir, taahhüdünüz aynen devam eder.
      </div>
    </Box>
  );
}

/** Simulated field-team matching: search → request → team answer → confirmation. */
function TeamMatch({ wf }: { wf: Workflow }) {
  const match = wf.data["match"];
  if (!match) return null;
  const declined = wf.decisions.some((d) => d.key === "relocation_alt") || match === "declined";
  const rows: { label: string; state: "done" | "now" | "todo" | "warn" }[] = [
    { label: "Adresinizdeki uygun ekipler kontrol ediliyor", state: match === "searching" ? "now" : "done" },
    { label: `Randevu talebi gönderildi${wf.data["team"] ? ` · ${String(wf.data["team"])}` : ""}`, state: match === "searching" ? "todo" : match === "requested" ? "now" : "done" },
    ...(declined ? [{ label: "Bu saat için ekip uygunluğu değişti; sizin için başka bir ekip aradık", state: "warn" as const }] : []),
    { label: "Ekip randevuyu kabul etti", state: match === "accepted" ? "done" : "todo" },
    { label: "Randevunuz onaylandı", state: match === "accepted" ? "done" : "todo" },
  ];
  return (
    <div className="mt-4 rounded-2xl border border-border p-3" aria-live="polite">
      <p className="mb-2 text-xs font-semibold text-foreground">Ekip eşleştirme (simülasyon)</p>
      <ul className="space-y-1.5 text-xs">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center gap-2">
            {r.state === "done" ? <CheckCircle2 className="size-4 text-success" /> : r.state === "now" ? <Loader2 className="size-4 animate-spin text-magenta" /> : r.state === "warn" ? <Info className="size-4 text-warning" /> : <span className="m-1 h-2 w-2 rounded-full bg-border" />}
            <span className={r.state === "todo" ? "text-muted-foreground" : "text-foreground"}>{r.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** TürkNet Box: SIM/device state, usage and on/off from the app. */
export function BoxCard({ className }: { className?: string }) {
  const box = useWorkflowStore((s) => s.box);
  if (!box) return null;
  const on = box.power === "on";
  const canToggle = canToggleBox(box);
  const SIM = { shipping: "Yolda", ready: "Teslim edildi · aktivasyon bekliyor", active: "Aktif", returning: "İade sürecinde" } as const;
  return (
    <Box className={className}>
      <div className="flex items-center gap-3">
        <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl", on ? "bg-orange-soft text-orange-deep" : "bg-icon-box text-primary")}>
          <Router className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-primary">TürkNet Box</p>
          <p className="text-xs text-muted-foreground">{on ? "Mobil internet bağlı" : canToggle ? "Kapalı" : SIM[box.sim]}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={on ? "Box'ı Kapat" : "Box'ı Aç"}
          disabled={!canToggle}
          onClick={() => toggleBox()}
          className={cn("relative h-8 w-14 shrink-0 rounded-full transition-colors disabled:opacity-40", on ? "bg-magenta" : "bg-border")}
        >
          <span className={cn("absolute top-1 flex h-6 w-6 items-center justify-center rounded-full bg-card shadow transition-all", on ? "left-7" : "left-1")}>
            <Power className="size-3.5 text-primary" />
          </span>
        </button>
      </div>
      <div className="mt-4">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Kullanım</span>
          <span className="font-semibold text-foreground">
            {box.usedGb} / {box.quotaGb} GB
          </span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-magenta" style={{ width: `${Math.max(2, (box.usedGb / box.quotaGb) * 100)}%` }} />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-muted px-3 py-2">
          <p className="text-muted-foreground">SIM kart</p>
          <p className="font-semibold text-foreground">{SIM[box.sim]}</p>
        </div>
        <div className="rounded-xl bg-muted px-3 py-2">
          <p className="flex items-center gap-1 text-muted-foreground">
            <Signal className="size-3" /> Sinyal
          </p>
          <p className="font-semibold text-foreground">{box.signal}</p>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">Varsayımsal ürün konsepti. Cihaz, SIM ve operatör bağlantısı demo olarak simüle edilir.</p>
    </Box>
  );
}

export function TempPanel({ wf }: { wf: Workflow }) {
  const req = useWorkflowStore((s) => s.temp.find((t) => t.workflowId === wf.id));
  const offer = TEMP_MOBILE_OFFER;
  const order = ["accepted", "ordered", "shipped", "active", "ended"];
  const idx = req ? order.indexOf(req.status) : -1;
  return (
    <>
      <Box title={offer.title}>
        <div className="flex gap-1">
          {["Onay", "Hazırlık", "Teslim", "Aktif", "Bitti"].map((l, i) => (
            <div key={l} className="flex-1">
              <div className={cn("h-1.5 rounded-full", i <= idx ? "bg-magenta" : "bg-border")} />
              <p className={cn("mt-1 text-center text-[10px]", i <= idx ? "font-semibold text-primary" : "text-muted-foreground")}>{l}</p>
            </div>
          ))}
        </div>
        <dl className="mt-4 space-y-1.5 text-xs">
          {[
            ["Cihaz", offer.device],
            ["Ücret", offer.price],
            ["Kota", offer.quota],
            ["Kapsama", offer.coverage],
            ["Teslimat", offer.delivery],
          ].map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <dt className="w-16 shrink-0 text-muted-foreground">{k}</dt>
              <dd className="font-medium text-foreground">{v}</dd>
            </div>
          ))}
        </dl>
      </Box>
      <BoxCard />
    </>
  );
}

export function BillingPanel({ wf }: { wf: Workflow }) {
  const bills = useWorkflowStore((s) => s.bills);
  const payments = useWorkflowStore((s) => s.payments);
  const bill = bills[0]!;
  const findings = compareBilling(bill, payments);
  const flagged = String(wf.data["findings"] ?? "").split(",");
  const later = choiceOf(wf.id, "billing_start") === "later" && wf.steps.find((s) => s.key === "consent")?.status === "waiting";
  return (
    <Box title="Ödeme ve borç karşılaştırması">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-muted p-3">
          <p className="text-[11px] text-muted-foreground">Fatura · {bill.period}</p>
          <p className="text-lg font-bold text-primary">{fmtTL(bill.amount)}</p>
          <p className="text-[11px] text-muted-foreground">Son ödeme {bill.due}</p>
        </div>
        <div className={cn("rounded-2xl p-3", bill.shownDebt > 0 ? "bg-orange-soft" : "bg-success-soft")}>
          <p className="text-[11px] text-muted-foreground">Görünen borç</p>
          <p className={cn("text-lg font-bold", bill.shownDebt > 0 ? "text-orange-deep" : "text-success")}>{fmtTL(bill.shownDebt)}</p>
          <p className="text-[11px] text-muted-foreground">{bill.shownDebt > 0 ? "Güncellenmemiş olabilir" : "Güncel"}</p>
        </div>
      </div>
      <p className="mb-1.5 mt-4 text-xs font-semibold text-foreground">Ödemeleriniz</p>
      <ul className="space-y-1.5">
        {payments.map((p) => (
          <li key={p.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-xs">
            <span>
              <span className="font-semibold text-foreground">{p.channel}</span>
              <span className="block text-muted-foreground">{p.at}</span>
            </span>
            <span className="text-right">
              <span className="block font-bold text-foreground">{fmtTL(p.amount)}</span>
              <span className={cn("text-[10px] font-bold", p.status === "success" ? "text-success" : "text-warning")}>{p.status === "success" ? "Başarılı" : p.status === "refund_review" ? "İade incelemesinde" : "Beklemede"}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mb-1.5 mt-4 text-xs font-semibold text-foreground">Kontrol ettiğimiz kalemler</p>
      <ul className="space-y-1 text-xs">
        {BILLING_CHECKS.map((c) => {
          const hit = flagged.includes(c.code);
          const live = findings.some((f) => f.code === c.code);
          return (
            <li key={c.code} className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">{c.label}</span>
              <span className={cn("shrink-0 font-semibold", hit ? (live ? "text-orange-deep" : "text-success") : "text-success")}>{hit ? (live ? "Farklılık olabilir" : "Düzeltildi") : "Uyumlu"}</span>
            </li>
          );
        })}
      </ul>
      {later && (
        <button type="button" onClick={() => resumeBillingReview(wf.id)} className="mt-4 flex min-h-12 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-float">
          İncelemeyi Başlat
        </button>
      )}
    </Box>
  );
}

export function AiUstaPanel({ wf }: { wf: Workflow }) {
  const leds = String(wf.data["leds"] ?? "")
    .split("|")
    .filter(Boolean)
    .map((x) => {
      const [name, ok, state] = x.split(":");
      return { name, ok: ok === "1", state };
    });
  const rating = wf.data["rating"];
  return (
    <Box>
      <div className="flex items-center gap-4">
        <img src={modemImg} alt="Modem görseli" width={120} height={120} className="h-24 w-24 object-contain" loading="lazy" />
        <div className="flex-1">
          <p className="text-[11px] font-bold uppercase tracking-widest text-magenta">AI Usta · ışık kontrolü</p>
          {leds.length ? (
            <ul className="mt-1.5 space-y-1 text-xs">
              {leds.map((l) => (
                <li key={l.name} className="flex items-center gap-2">
                  <span className={cn("h-2.5 w-2.5 rounded-full", l.ok ? "bg-success" : "bg-destructive")} />
                  <span className="w-16 font-semibold text-foreground">{l.name}</span>
                  <span className="text-muted-foreground">{l.state}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">Modem ışıklarını görmek için fotoğraf bekliyoruz.</p>
          )}
        </div>
      </div>
      {leds.some((l) => !l.ok) && <p className="mt-3 rounded-2xl bg-orange-soft p-3 text-sm text-foreground">İnternet göstergenizde anormal bir durum görünüyor. Şimdi modem bağlantınızı birlikte kontrol edelim.</p>}
      <p className="mt-3 text-[11px] text-muted-foreground">Görsel analiz bu prototipte simülasyondur; sonuç kesin teşhis değildir, yalnızca sıradaki güvenli adımı seçmek içindir.</p>
      {wf.status === "completed" && wf.data["reward"] === true && (
        <div className="mt-3 rounded-2xl bg-magenta-soft p-3">
          {rating ? (
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <CheckCircle2 className="size-4 text-success" /> Geri bildiriminiz için teşekkürler
            </p>
          ) : (
            <>
              <p className="text-sm font-semibold text-foreground">AI Usta ile çözüm deneyiminiz nasıldı?</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {([3, 2, 1] as const).map((n) => (
                  <button key={n} type="button" onClick={() => rateUsta(wf.id, n)} className="min-h-11 rounded-xl bg-card text-sm font-semibold text-primary">
                    {n === 3 ? "Çok iyi" : n === 2 ? "İdare eder" : "Kötü"}
                  </button>
                ))}
              </div>
            </>
          )}
          <p className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
            <Award className="size-4 text-magenta" /> Doğrulanmış çözüm rozeti örnek gösterimdir; gerçek ödül veya kampanya vaadi değildir.
          </p>
        </div>
      )}
    </Box>
  );
}

/** Speed Optimisation Agent: package vs measured, possible causes, before/after. */
export function SpeedPanel({ wf }: { wf: Workflow }) {
  const pkg = Number(wf.data["pkg"] ?? SUBSCRIPTION.speed);
  const before = wf.data["speedBefore"] != null ? Number(wf.data["speedBefore"]) : null;
  const after = wf.data["speedAfter"] != null ? Number(wf.data["speedAfter"]) : null;
  const causes = String(wf.data["causes"] ?? "").split("|").filter(Boolean);
  const Bar = ({ label, v, tone }: { label: string; v: number | null; tone: string }) => (
    <div>
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-bold text-foreground">{v == null ? "—" : `${v} Mbps`}</span>
      </div>
      <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-all", tone)} style={{ width: `${v == null ? 0 : Math.min(100, (v / pkg) * 100)}%` }} />
      </div>
    </div>
  );
  return (
    <Box>
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
        <Gauge className="size-5" /> Hızınız: önce ve sonra
      </p>
      <div className="space-y-3">
        <Bar label="Paketiniz" v={pkg} tone="bg-primary/30" />
        <Bar label="Önce (ölçülen)" v={before} tone="bg-orange" />
        <Bar label="Sonra (yeniden ölçüm)" v={after} tone={after != null && after >= pkg * 0.8 ? "bg-success" : "bg-warning"} />
      </div>
      {causes.length > 0 && (
        <>
          <p className="mb-1.5 mt-4 text-xs font-semibold text-foreground">Olası nedenler</p>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {causes.map((c) => (
              <li key={c}>• {c}</li>
            ))}
          </ul>
        </>
      )}
      <p className="mt-3 flex items-start gap-1.5 text-[11px] text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" /> Hızınız hattınızın fiziksel kapasitesinin üzerine çıkarılamaz. Uzaktan düzelmezse teknik ekip yönlendirilir.
      </p>
    </Box>
  );
}

const HEALTH_ICON = { normal: Wifi, degraded: Gauge, checking: Radar, regional: ShieldAlert, field: Wrench, failover: Smartphone, down: WifiOff } as const;
const HEALTH_TONE = { ok: "bg-success-soft text-success", warn: "bg-warning-soft text-warning", info: "bg-icon-box text-primary", bad: "bg-destructive-soft text-destructive" } as const;

/** First-level health summary for Bağlantım (no jargon). */
export function HealthCard({ className }: { className?: string }) {
  const c = useWorkflowStore((s) => s.connectivity);
  const workflows = useWorkflowStore((s) => s.workflows);
  const code = connectionHealth(c, workflows);
  const copy = HEALTH_COPY[code];
  const Icon = HEALTH_ICON[code];
  return (
    <Box className={className}>
      <div className="flex items-start gap-3">
        <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", HEALTH_TONE[copy.tone])}>
          <Icon className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Bağlantı sağlığı</p>
          <p className="font-semibold leading-snug text-primary">{copy.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{copy.text}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-xl bg-muted px-2 py-2">
          <p className="text-muted-foreground">Kullanılan</p>
          <p className="font-semibold text-foreground">{c.mode === "fixed" ? "Fiber" : c.mode === "hybrid_backup" ? "Yedek" : "Box"}</p>
        </div>
        <div className="rounded-xl bg-muted px-2 py-2">
          <p className="text-muted-foreground">Hız</p>
          <p className="font-semibold text-foreground">{c.fixed === "down" ? (c.mobile === "active" ? "~38" : "0") : (c.metric.speed ?? 96)} Mbps</p>
        </div>
        <div className="rounded-xl bg-muted px-2 py-2">
          <p className="text-muted-foreground">Paket</p>
          <p className="font-semibold text-foreground">{SUBSCRIPTION.speed} Mbps</p>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">Son kontrol {fmtRelative(c.lastCheckAt)} · izleme verisi demo</p>
    </Box>
  );
}

const FIXED_LABEL = { up: "Aktif", down: "Kesik", degraded: "Zayıf sinyal", not_installed: "Kurulum bekleniyor" } as const;
const MOBILE_LABEL = { off: "Kapalı", standby: "Beklemede", active: "Aktif" } as const;

/** Hybrid/fixed/mobile view + second-level technical metrics. */
export function ConnectivityPanel({ compact }: { compact?: boolean }) {
  const c = useWorkflowStore((s) => s.connectivity);
  const fixedOk = c.fixed === "up";
  return (
    <Box title={compact ? "Bağlantı durumu" : undefined}>
      <div className="grid grid-cols-2 gap-2">
        <div className={cn("rounded-2xl p-3", fixedOk ? "bg-success-soft" : c.fixed === "degraded" ? "bg-warning-soft" : "bg-destructive-soft")}>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {fixedOk ? <Router className="size-4 text-success" /> : <WifiOff className="size-4 text-destructive" />} Ana bağlantı
          </div>
          <p className={cn("mt-1 font-bold", fixedOk ? "text-success" : c.fixed === "degraded" ? "text-warning" : "text-destructive")}>{FIXED_LABEL[c.fixed]}</p>
        </div>
        <div className={cn("rounded-2xl p-3", c.mobile === "active" ? "bg-orange-soft" : "bg-muted")}>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Smartphone className={cn("size-4", c.mobile === "active" ? "text-orange-deep" : "text-muted-foreground")} /> Yedek bağlantı
          </div>
          <p className={cn("mt-1 font-bold", c.mobile === "active" ? "text-orange-deep" : "text-foreground")}>{MOBILE_LABEL[c.mobile]}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between rounded-2xl border border-border px-3 py-2 text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Wifi className="size-4" /> Şu an kullanılan
        </span>
        <span className="font-semibold text-foreground">{c.mode === "fixed" ? "Ana bağlantı (fiber)" : c.mode === "hybrid_backup" ? "Hibrit İnternet · yedek bağlantı" : "TürkNet Box"}</span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-muted px-3 py-2">
          <p className="text-muted-foreground">Optik güç</p>
          <p className={cn("font-bold", c.metric.optic < -26 ? "text-destructive" : "text-foreground")}>{c.metric.optic} dBm</p>
        </div>
        <div className="rounded-xl bg-muted px-3 py-2">
          <p className="text-muted-foreground">Kopma / saat</p>
          <p className={cn("font-bold", c.metric.drops > 5 ? "text-destructive" : "text-foreground")}>{c.metric.drops}</p>
        </div>
      </div>
      {!compact && c.history.length > 0 && (
        <ol className="mt-4 space-y-1.5 border-l-2 border-border pl-3 text-xs">
          {[...c.history].reverse().slice(0, 6).map((h) => (
            <li key={`${h.at}-${h.label}`}>
              <span className="font-semibold text-foreground">{h.label}</span> <span className="text-muted-foreground">· {fmtRelative(h.at)}</span>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-3 text-[11px] text-muted-foreground">Son kontrol {fmtRelative(c.lastCheckAt)} · izleme verisi demo</p>
    </Box>
  );
}
