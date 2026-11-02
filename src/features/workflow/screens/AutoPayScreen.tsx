import { Link } from "@tanstack/react-router";
import { BellRing, CheckCircle2, CreditCard, Landmark, ShieldCheck, TriangleAlert, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/headers";
import { PlainNote, ToggleRow } from "@/components/tn/primitives";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SAVED_CARD } from "@/data/mock";
import { useFlow } from "@/lib/analytics";
import { fmtDateTime, fmtTL } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  announceCollection,
  approveCollection,
  cancelAutoPay,
  changeAutoPayMethod,
  isValidIban,
  maskIban,
  runCollection,
  setAskIfUnusual,
  setAutoPayResult,
  setupAutoPay,
  skipCollection,
  useWorkflowStore,
} from "@/features/workflow";
import type { AutoPayMethod } from "../types";
import { DemoNote } from "../components/ui";

function MethodPicker({ onPick, cta }: { onPick: (m: AutoPayMethod) => void; cta: string }) {
  const [kind, setKind] = useState<"card" | "bank">("card");
  const [iban, setIban] = useState("");
  const [error, setError] = useState<string | null>(null);
  const submit = () => {
    if (kind === "card") return onPick({ kind: "card", label: SAVED_CARD });
    if (!isValidIban(iban)) return setError("Geçerli bir IBAN gir: TR ile başlayan 26 karakter.");
    setError(null);
    onPick({ kind: "bank", label: `Banka talimatı · ${maskIban(iban)}` });
  };
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {(
          [
            ["card", CreditCard, "Kayıtlı kartım", SAVED_CARD],
            ["bank", Landmark, "Banka hesabım", "IBAN ile talimat"],
          ] as const
        ).map(([k, Icon, t, d]) => (
          <button key={k} type="button" onClick={() => setKind(k)} aria-pressed={kind === k} className={cn("rounded-2xl border p-3 text-left", kind === k ? "border-primary bg-icon-box" : "border-border")}>
            <Icon className="size-5 text-primary" />
            <span className="mt-1 block text-sm font-semibold text-primary">{t}</span>
            <span className="block text-[11px] text-muted-foreground">{d}</span>
          </button>
        ))}
      </div>
      {kind === "bank" && (
        <div className="space-y-1.5">
          <Label htmlFor="ap-iban">IBAN</Label>
          <Input id="ap-iban" value={iban} onChange={(e) => setIban(e.target.value)} placeholder="TR00 0000 0000 0000 0000 0000 00" aria-invalid={!!error} />
          {error && <p className="text-xs font-semibold text-destructive">{error}</p>}
          <p className="text-[11px] text-muted-foreground">IBAN'ın yalnızca son 4 hanesini saklarız (demo). Gerçek banka talimatı oluşturulmaz.</p>
        </div>
      )}
      <Button className="w-full" onClick={submit}>
        {cta}
      </Button>
    </div>
  );
}

/** Akıllı Otomatik Ödeme: authorised mandate, pre-collection notice, approval for unusual bills, failure alert. */
export function AutoPayScreen() {
  useFlow("auto_pay");
  const ap = useWorkflowStore((s) => s.autoPay);
  const result = useWorkflowStore((s) => s.config.autoPayResult);
  const [ask, setAsk] = useState(true);
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const [method, setMethod] = useState<AutoPayMethod | null>(null);
  const [editing, setEditing] = useState(false);
  const c = ap.cycle;

  const create = () => {
    if (!method) return;
    if (!consent) return setConsentError(true);
    if (setupAutoPay(method, ask, consent)) toast.success("Otomatik ödeme talimatın oluşturuldu");
  };

  return (
    <div>
      <PageHeader title="Akıllı Otomatik Ödeme" />
      <div className="space-y-4 px-4">
        <PlainNote>Ödeme tarihini takip etmek zorunda kalma. Otomatik ödeme talimatını birlikte ayarlayabiliriz; her tahsilattan önce sana haber veririz.</PlainNote>

        {ap.status === "off" ? (
          <div className="space-y-4 rounded-card bg-card p-5 shadow-card">
            <p className="font-semibold text-primary">Ödeme yöntemini seç</p>
            {!method ? (
              <MethodPicker onPick={setMethod} cta="Bu yöntemle devam et" />
            ) : (
              <>
                <p className="flex items-center gap-2 rounded-2xl bg-icon-box px-3 py-2.5 text-sm font-semibold text-primary">
                  {method.kind === "card" ? <CreditCard className="size-4" /> : <Landmark className="size-4" />} {method.label}
                  <button type="button" onClick={() => setMethod(null)} className="ml-auto text-xs text-magenta">Değiştir</button>
                </p>
                <ToggleRow id="ap-ask" title="Tutar her zamankinden yüksekse önce bana sor" desc="Faturan normalden belirgin şekilde yüksekse onayın olmadan tahsil edilmez." checked={ask} onChange={setAsk} />
                <label htmlFor="ap-consent" className="flex items-start gap-3">
                  <Checkbox id="ap-consent" checked={consent} onCheckedChange={(v) => { setConsent(v === true); setConsentError(false); }} className="mt-0.5 size-5" />
                  <span className="text-sm">Faturalarımın seçtiğim yöntemden otomatik tahsil edilmesi için talimat veriyorum. Talimatı istediğim an iptal edebilirim.</span>
                </label>
                {consentError && <p className="text-xs font-semibold text-destructive">Talimat için onay vermen gerekiyor.</p>}
                <Button size="xl" className="w-full" onClick={create}>Talimatı oluştur</Button>
              </>
            )}
            <p className="text-[11px] text-muted-foreground">TürkNet, yetkili bir talimat olmadan hesabından çekim yapmaz. Tahsilatın başarılı olması bankana bağlıdır.</p>
          </div>
        ) : (
          <>
            <div className="rounded-card bg-card p-5 shadow-card">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 font-semibold text-primary"><ShieldCheck className="size-5 text-success" /> Talimatın aktif</p>
                <span className="rounded-full bg-success-soft px-2.5 py-1 text-[11px] font-bold text-success">Aktif</span>
              </div>
              <p className="mt-2 text-sm text-foreground">{ap.method?.label}</p>
              {ap.setupAt && <p className="text-xs text-muted-foreground">{fmtDateTime(ap.setupAt)} tarihinde oluşturuldu</p>}
              <div className="mt-3 border-t border-border pt-1">
                <ToggleRow id="ap-ask2" title="Yüksek tutarda önce bana sor" desc="Normalden belirgin yüksek faturalar onayını bekler." checked={ap.askIfUnusual} onChange={setAskIfUnusual} />
              </div>
              {editing ? (
                <div className="mt-3">
                  <MethodPicker cta="Yöntemi güncelle" onPick={(m) => { if (changeAutoPayMethod(m)) toast.success("Ödeme yöntemin güncellendi"); setEditing(false); }} />
                </div>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => setEditing(true)}>Yöntemi değiştir</Button>
                  <Button variant="outline" className="border-destructive/30 text-destructive" onClick={() => { if (cancelAutoPay()) toast("Talimat iptal edildi"); }}>Talimatı iptal et</Button>
                </div>
              )}
            </div>

            {c && (
              <div className={cn("rounded-card p-5 shadow-card", c.status === "failed" ? "bg-destructive-soft" : c.status === "held_for_approval" ? "bg-warning-soft" : c.status === "paid" ? "bg-success-soft" : "bg-card")}>
                <p className="flex items-center gap-2 font-semibold text-foreground">
                  {c.status === "failed" ? <XCircle className="size-5 text-destructive" /> : c.status === "held_for_approval" ? <TriangleAlert className="size-5 text-warning" /> : c.status === "paid" ? <CheckCircle2 className="size-5 text-success" /> : <BellRing className="size-5 text-primary" />}
                  {c.status === "notified" && "Yaklaşan tahsilat"}
                  {c.status === "held_for_approval" && "Faturan her zamankinden yüksek"}
                  {c.status === "paid" && "Ödemen alındı"}
                  {c.status === "failed" && "Otomatik ödeme gerçekleşmedi"}
                  {c.status === "skipped" && "Bu ay otomatik tahsil edilmeyecek"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tutar <b className="text-foreground">{fmtTL(c.amount)}</b> · son ödeme {c.due}
                  {c.amount !== c.usual && ` · genelde ${fmtTL(c.usual)}`}
                </p>
                {c.status === "held_for_approval" && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button onClick={approveCollection}>Onaylıyorum</Button>
                    <Button variant="outline" onClick={skipCollection}>Bu ay kendim öderim</Button>
                  </div>
                )}
                {(c.status === "failed" || c.status === "skipped") && (
                  <Button asChild className="mt-3 w-full">
                    <Link to="/faturalar">Başka yöntemle öde</Link>
                  </Button>
                )}
              </div>
            )}
          </>
        )}

        {ap.log.length > 0 && (
          <div className="rounded-card bg-card p-5 shadow-card">
            <p className="text-sm font-semibold text-primary">Talimat geçmişi</p>
            <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
              {ap.log.map((l) => (
                <li key={`${l.at}-${l.text}`}>{fmtDateTime(l.at)} · {l.text}</li>
              ))}
            </ul>
          </div>
        )}

        {ap.status === "active" && (
          <div className="space-y-2 rounded-card border border-dashed border-border p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Demo kontrolleri</p>
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" onClick={() => announceCollection(false)}>Tahsilat hatırlatması</Button>
              <Button size="sm" variant="outline" onClick={() => announceCollection(true)}>Yüksek tutarlı fatura</Button>
              <Button size="sm" variant="outline" onClick={() => setAutoPayResult(result === "success" ? "fail" : "success")}>Sonuç: {result === "success" ? "başarılı" : "başarısız"}</Button>
              <Button size="sm" variant="outline" disabled={c?.status !== "notified"} onClick={runCollection}>Tahsilat gününü çalıştır</Button>
            </div>
          </div>
        )}
        <DemoNote className="pb-2">Ödeme talimatı ve tahsilatlar simülasyondur; gerçek kart veya banka işlemi yapılmaz.</DemoNote>
      </div>
    </div>
  );
}
