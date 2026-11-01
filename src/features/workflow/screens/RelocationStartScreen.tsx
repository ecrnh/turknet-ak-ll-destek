import { Link, useNavigate } from "@tanstack/react-router";
import { Home, Info, MapPinned, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/headers";
import { Banner, ToggleRow } from "@/components/tn/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CURRENT_ADDRESS, DEMO_MOVE_DATE, DEMO_NEW_ADDRESS, SUBSCRIPTION } from "@/data/mock";
import { useScenarioStore } from "@/features/scenario/store";
import { startRelocation, useWorkflowStore } from "@/features/workflow";
import { isActive } from "../rules";
import { DemoNote } from "../components/ui";

export function RelocationStartScreen() {
  const navigate = useNavigate();
  const draft = useScenarioStore((s) => s.draft);
  const existing = useWorkflowStore((s) => s.workflows.find((w) => w.type === "relocation" && isActive(w)));
  const [line, setLine] = useState("");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("İstanbul");
  const [date, setDate] = useState("");
  const [wantsTemp, setWantsTemp] = useState(true);

  const fill = (d = { address: DEMO_NEW_ADDRESS, moveDate: DEMO_MOVE_DATE, wantsTemp: true }) => {
    setLine(d.address.line);
    setDistrict(d.address.district);
    setCity(d.address.city);
    setDate(d.moveDate);
    setWantsTemp(d.wantsTemp);
  };
  useEffect(() => {
    if (draft) fill(draft);
  }, [draft]);

  const valid = line.trim().length > 5 && district.trim() && date;

  return (
    <div>
      <PageHeader title="İnternetinizi Taşıyın" />
      <div className="space-y-4 px-4">
        <div className="rounded-card bg-plum p-5 text-primary-foreground shadow-float">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary-foreground/70">Otonom Taşınma</p>
          <p className="mt-1 text-lg font-semibold leading-snug">Yeni adresinizi söyleyin; altyapı kontrolü, randevu ve eski hattınızın kapatılmasını sizin için yönetelim.</p>
        </div>

        {existing && (
          <Banner tone="info" title="Devam eden bir taşınma işleminiz var" action={<Link to="/surec/$id" params={{ id: existing.id }} className="font-semibold text-magenta">Detayları Gör →</Link>}>
            Aynı talep için yeni kayıt açmıyoruz; mevcut işleminizi takip ediyoruz.
          </Banner>
        )}

        <div className="rounded-card bg-card p-5 shadow-card">
          <div className="flex gap-3">
            <Home className="mt-0.5 size-5 text-muted-foreground" />
            <div className="text-sm">
              <p className="text-[11px] font-semibold uppercase text-muted-foreground">Mevcut aboneliğiniz</p>
              <p className="font-semibold text-foreground">
                {CURRENT_ADDRESS.line}, {CURRENT_ADDRESS.district}
              </p>
              <p className="text-xs text-muted-foreground">
                {SUBSCRIPTION.packageName} · taahhüt {SUBSCRIPTION.commitmentEnd}
              </p>
            </div>
          </div>
        </div>

        <form
          className="space-y-4 rounded-card bg-card p-5 shadow-card"
          onSubmit={(e) => {
            e.preventDefault();
            if (!valid) return;
            const id = startRelocation({ address: { id: "ADR-NEW", line: line.trim(), district: district.trim(), city: city.trim() }, moveDate: date, wantsTemp });
            navigate({ to: "/surec/$id", params: { id } });
          }}
        >
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 font-semibold text-primary">
              <MapPinned className="size-5" /> Yeni adres
            </p>
            <button type="button" onClick={() => fill()} className="flex items-center gap-1 text-xs font-semibold text-magenta">
              <Sparkles className="size-3.5" /> Örnek adres
            </button>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ra-line">Mahalle, cadde, no, daire</Label>
            <Input id="ra-line" value={line} onChange={(e) => setLine(e.target.value)} placeholder="Caferağa Mah. Moda Cd. No:48 D:3" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ra-district">İlçe</Label>
              <Input id="ra-district" value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="Kadıköy" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ra-city">İl</Label>
              <Input id="ra-city" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ra-date">Taşınma tarihi</Label>
            <Input id="ra-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <ToggleRow id="ra-temp" title="İnternetsiz kalmamak için seçenek göster" desc="Gerekirse geçici internet önerilir; onayınız olmadan aktifleşmez." checked={wantsTemp} onChange={setWantsTemp} />
          <div className="flex gap-2 rounded-2xl bg-muted p-3 text-xs text-muted-foreground">
            <Info className="size-4 shrink-0 text-magenta" />
            Eski adresinizdeki hizmet, yeni adreste bağlantınız doğrulanmadan kapatılmaz.
          </div>
          <Button type="submit" size="xl" className="w-full" disabled={!valid || !!existing}>
            Süreci Başlat
          </Button>
        </form>
        <DemoNote className="pb-2" />
      </div>
    </div>
  );
}
