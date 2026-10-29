import { Link } from "@tanstack/react-router";
import { ArrowDown, Award, CalendarCheck, Home, MapPinned, Router, Smartphone, Wifi, WifiOff } from "lucide-react";
import modemImg from "@/assets/modem.png";
import { BILLING_CHECKS, CURRENT_ADDRESS, HYBRID_OFFER, TEMP_MOBILE_OFFER } from "@/data/mock";
import { fmtRelative, fmtTL } from "@/lib/format";
import { cn } from "@/lib/utils";
import { compareBilling } from "../rules";
import { useWorkflowStore } from "../store";
import type { Workflow } from "../types";
import { StatusPill } from "./ui";

const Box = ({ title, children, className }: { title?: string | undefined; children: React.ReactNode; className?: string }) => (
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
            {elig === "no_port" ? "Altyapı: boş port yok" : elig === "eligible_external" ? "Altyapı: uygun, port dış sağlayıcıda" : elig === "eligible" ? "Altyapı: uygun" : "Altyapı sorgulanıyor…"}
          </p>
        </div>
      </div>
      {appt && (
        <p className="mt-4 flex items-center gap-2 rounded-2xl bg-success-soft px-3 py-2 text-sm font-semibold">
          <CalendarCheck className="size-4 text-success" /> Kurulum: {appt.label}
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
        <p className="font-semibold text-foreground">Eski adresindeki hizmet ne olacak?</p>
        Eski hattın ({CURRENT_ADDRESS.port}) yeni adreste bağlantın doğrulanmadan kapatılmaz. Kapatma ücretsizdir, taahhüdün aynen devam eder.
      </div>
    </Box>
  );
}

export function TempPanel({ wf }: { wf: Workflow }) {
  const req = useWorkflowStore((s) => s.temp.find((t) => t.workflowId === wf.id));
  const offer = wf.data["kind"] === "hybrid" ? HYBRID_OFFER : TEMP_MOBILE_OFFER;
  const order = ["accepted", "ordered", "shipped", "active", "ended"];
  const idx = req ? order.indexOf(req.status) : -1;
  return (
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
  );
}

export function BillingPanel({ wf }: { wf: Workflow }) {
  const bills = useWorkflowStore((s) => s.bills);
  const payments = useWorkflowStore((s) => s.payments);
  const bill = bills[0]!;
  const findings = compareBilling(bill, payments);
  const flagged = String(wf.data["findings"] ?? "").split(",");
  return (
    <Box title="Karşılaştırma">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-muted p-3">
          <p className="text-[11px] text-muted-foreground">Fatura · {bill.period}</p>
          <p className="text-lg font-bold text-primary">{fmtTL(bill.amount)}</p>
          <p className="text-[11px] text-muted-foreground">Son ödeme {bill.due}</p>
        </div>
        <div className={cn("rounded-2xl p-3", bill.shownDebt > 0 ? "bg-orange-soft" : "bg-success-soft")}>
          <p className="text-[11px] text-muted-foreground">Ekranda görünen borç</p>
          <p className={cn("text-lg font-bold", bill.shownDebt > 0 ? "text-orange-deep" : "text-success")}>{fmtTL(bill.shownDebt)}</p>
          <p className="text-[11px] text-muted-foreground">{bill.shownDebt > 0 ? "Güncellenmemiş olabilir" : "Güncel"}</p>
        </div>
      </div>
      <p className="mb-1.5 mt-4 text-xs font-semibold text-foreground">Ödeme kayıtları</p>
      <ul className="space-y-1.5">
        {payments.map((p) => (
          <li key={p.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-xs">
            <span>
              <span className="font-semibold text-foreground">{p.id}</span> · {p.channel}
              <span className="block text-muted-foreground">
                {p.at} · ref {p.ref}
              </span>
            </span>
            <span className="text-right">
              <span className="block font-bold text-foreground">{fmtTL(p.amount)}</span>
              <span className={cn("text-[10px] font-bold", p.status === "success" ? "text-success" : "text-warning")}>{p.status === "success" ? "Başarılı" : p.status === "refund_review" ? "İade incelemesi" : "Beklemede"}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mb-1.5 mt-4 text-xs font-semibold text-foreground">Kontrol edilen kalemler</p>
      <ul className="space-y-1 text-xs">
        {BILLING_CHECKS.map((c) => {
          const hit = flagged.includes(c.code);
          const live = findings.some((f) => f.code === c.code);
          return (
            <li key={c.code} className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">{c.label}</span>
              <span className={cn("shrink-0 font-semibold", hit ? (live ? "text-orange-deep" : "text-success") : "text-success")}>{hit ? (live ? "Olası tutarsızlık" : "Düzeltildi") : "Uyumlu"}</span>
            </li>
          );
        })}
      </ul>
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
  return (
    <Box>
      <div className="flex items-center gap-4">
        <img src={modemImg} alt="Modem görseli" width={120} height={120} className="h-24 w-24 object-contain" loading="lazy" />
        <div className="flex-1">
          <p className="text-[11px] font-bold uppercase tracking-widest text-magenta">AI Usta · görsel kontrol</p>
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
            <p className="mt-1 text-sm text-muted-foreground">Modem ışıklarını görmek için fotoğraf bekleniyor.</p>
          )}
        </div>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">Görsel analiz bu prototipte simülasyondur; sonuç kesin teşhis değil, bir sonraki güvenli adımı seçmek içindir.</p>
      {wf.data["reward"] === true && (
        <div className="mt-3 flex items-center gap-3 rounded-2xl bg-magenta-soft p-3">
          <Award className="size-6 text-magenta" />
          <div className="text-xs">
            <p className="font-semibold text-foreground">Doğrulanmış self-servis çözüm rozeti</p>
            <p className="text-muted-foreground">Örnek gösterimdir; gerçek bir ödül, kampanya veya ödeme vaadi değildir.</p>
          </div>
        </div>
      )}
    </Box>
  );
}

const FIXED_LABEL = { up: "Aktif", down: "Kesik", degraded: "Zayıf sinyal", not_installed: "Kurulum bekleniyor" } as const;
const MOBILE_LABEL = { off: "Kapalı", standby: "Beklemede", active: "Aktif" } as const;

export function ConnectivityPanel({ compact }: { compact?: boolean }) {
  const c = useWorkflowStore((s) => s.connectivity);
  const fixedOk = c.fixed === "up";
  return (
    <Box title={compact ? "Bağlantı durumu" : undefined}>
      <div className="grid grid-cols-2 gap-2">
        <div className={cn("rounded-2xl p-3", fixedOk ? "bg-success-soft" : c.fixed === "degraded" ? "bg-warning-soft" : "bg-destructive-soft")}>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {fixedOk ? <Router className="size-4 text-success" /> : <WifiOff className="size-4 text-destructive" />} Sabit fiber
          </div>
          <p className={cn("mt-1 font-bold", fixedOk ? "text-success" : c.fixed === "degraded" ? "text-warning" : "text-destructive")}>{FIXED_LABEL[c.fixed]}</p>
        </div>
        <div className={cn("rounded-2xl p-3", c.mobile === "active" ? "bg-orange-soft" : "bg-muted")}>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Smartphone className={cn("size-4", c.mobile === "active" ? "text-orange-deep" : "text-muted-foreground")} /> Mobil yedek
          </div>
          <p className={cn("mt-1 font-bold", c.mobile === "active" ? "text-orange-deep" : "text-foreground")}>{MOBILE_LABEL[c.mobile]}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between rounded-2xl border border-border px-3 py-2 text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Wifi className="size-4" /> Şu an kullanılan
        </span>
        <span className="font-semibold text-foreground">{c.mode === "fixed" ? "Sabit fiber" : c.mode === "hybrid_backup" ? "Hibrit · mobil yedek" : "Geçici mobil modem"}</span>
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
