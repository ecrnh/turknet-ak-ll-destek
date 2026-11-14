import { useNavigate } from "@tanstack/react-router";
import { Gamepad2, Laptop, Pause, Play, Plus, Plug, Router, Smartphone, Tablet, Trash2, Tv, Wifi, WifiOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppLink, Banner, Card, Chip, EmptyState, SectionTitle, StatRow, ToggleRow } from "@/components/tn/primitives";
import { BottomSheet, ConfirmDialog } from "@/components/tn/Sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { USER } from "@/data/mock";
import { cn } from "@/lib/utils";
import { EvimHeader, RequirePerm, useEvim } from "../components";
import { useEvimStore, type DeviceKind, type HomeDevice } from "../store";

const KIND_ICON: Record<DeviceKind, typeof Smartphone> = { phone: Smartphone, laptop: Laptop, tv: Tv, tablet: Tablet, console: Gamepad2, other: Plug };
const KIND_LABEL: Record<DeviceKind, string> = { phone: "Telefon", laptop: "Bilgisayar", tv: "TV", tablet: "Tablet", console: "Oyun konsolu", other: "Diğer" };

export function deviceState(d: HomeDevice) {
  if (d.blocked) return { label: "İnternet kapalı", tone: "text-destructive" };
  if (d.paused) return { label: "Duraklatıldı", tone: "text-warning" };
  return d.online ? { label: "Bağlı", tone: "text-success" } : { label: "Çevrimdışı", tone: "text-muted-foreground" };
}

export function DevicesScreen() {
  const devices = useEvimStore((s) => s.devices);
  const addDevice = useEvimStore((s) => s.addDevice);
  const { perms } = useEvim();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<DeviceKind>("phone");
  const online = devices.filter((d) => d.online && !d.blocked && !d.paused).length;

  const save = () => {
    if (!name.trim()) return;
    addDevice(name.trim(), kind);
    toast.success(`${name.trim()} ağına eklendi`);
    setName("");
    setAdding(false);
  };

  return (
    <div className="pb-8">
      <EvimHeader title="Modemim ve Cihazlarım" />
      <RequirePerm perm="devicesView">
        <div className="space-y-3 px-4">
          <Card>
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-icon-box text-primary"><Router className="size-6" /></span>
              <div className="flex-1">
                <p className="font-semibold text-primary">{USER.modemModel}</p>
                <p className="text-xs text-muted-foreground">{USER.modemSerial}</p>
              </div>
              <span className="flex items-center gap-1 text-xs font-semibold text-success"><Wifi className="size-4" /> Çalışıyor</span>
            </div>
            <StatRow label="Ağ adı" value="TurkNet_Koyuncu" className="mt-3" />
            <StatRow label="Bağlı cihaz" value={`${online} / ${devices.length}`} />
          </Card>
          <SectionTitle action={perms.devicesManage ? <Button size="sm" variant="magenta" onClick={() => setAdding(true)}><Plus /> Cihaz ekle</Button> : undefined}>Bağlı cihazlar</SectionTitle>
          {!perms.devicesManage && <Banner tone="info" title="Yalnızca görüntüleme">Cihazları yönetme yetkin yok.</Banner>}
          {devices.length === 0 && <EmptyState icon={WifiOff} title="Bağlı cihaz yok" />}
          {devices.map((d) => {
            const Icon = KIND_ICON[d.kind];
            const st = deviceState(d);
            const row = (
              <>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-icon-box text-primary"><Icon className="size-5" /></span>
                <span className="flex-1">
                  <span className="block font-semibold text-primary">{d.name}</span>
                  <span className={cn("block text-xs font-medium", st.tone)}>{st.label} · {d.band}</span>
                </span>
              </>
            );
            return perms.devicesManage ? (
              <AppLink key={d.id} to={`/evim/cihazlar/${d.id}`} className="flex items-center gap-3 rounded-card bg-card p-3.5 shadow-card">{row}</AppLink>
            ) : (
              <div key={d.id} className="flex items-center gap-3 rounded-card bg-card p-3.5 shadow-card">{row}</div>
            );
          })}
        </div>
      </RequirePerm>
      <BottomSheet open={adding} onClose={() => setAdding(false)} title="Yeni cihaz ekle">
        <label className="block text-sm font-semibold" htmlFor="dev-name">Cihaz adı</label>
        <Input id="dev-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Örn. Mutfak tableti" className="mt-1.5 h-12" />
        <p className="mt-3 text-sm font-semibold">Cihaz türü</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(Object.keys(KIND_LABEL) as DeviceKind[]).map((k) => <Chip key={k} active={kind === k} onClick={() => setKind(k)}>{KIND_LABEL[k]}</Chip>)}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Cihazı Wi-Fi ağına bağladığında otomatik tanınır; burada adını ve türünü belirliyorsun.</p>
        <Button size="lg" className="mt-4 w-full" onClick={save} disabled={!name.trim()}>Ekle</Button>
      </BottomSheet>
    </div>
  );
}

export function DeviceDetailScreen({ id }: { id: string }) {
  const navigate = useNavigate();
  const device = useEvimStore((s) => s.devices.find((d) => d.id === id));
  const update = useEvimStore((s) => s.updateDevice);
  const remove = useEvimStore((s) => s.removeDevice);
  const [name, setName] = useState(device?.name ?? "");
  const [confirm, setConfirm] = useState(false);

  if (!device)
    return (
      <div><EvimHeader title="Cihaz" /><EmptyState icon={WifiOff} title="Cihaz bulunamadı" action={<Button asChild><AppLink to="/evim/cihazlar">Cihazlara dön</AppLink></Button>} /></div>
    );
  const Icon = KIND_ICON[device.kind];
  const st = deviceState(device);

  return (
    <div className="pb-8">
      <EvimHeader title="Cihaz yönetimi" />
      <RequirePerm perm="devicesManage">
        <div className="space-y-3 px-4">
          <Card className="text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-icon-box text-primary"><Icon className="size-8" /></span>
            <p className="mt-2 text-lg font-semibold text-primary">{device.name}</p>
            <p className={cn("text-sm font-semibold", st.tone)}>{st.label}</p>
          </Card>
          <Card>
            <label className="block text-sm font-semibold" htmlFor="dev-rename">Cihaz adı</label>
            <div className="mt-1.5 flex gap-2">
              <Input id="dev-rename" value={name} onChange={(e) => setName(e.target.value)} className="h-11" />
              <Button onClick={() => { update(device.id, { name: name.trim() || device.name }); toast.success("Cihaz adı güncellendi"); }}>Kaydet</Button>
            </div>
            <StatRow label="Tür" value={KIND_LABEL[device.kind]} className="mt-3" />
            <StatRow label="Bağlantı" value={device.band} />
          </Card>
          <Card>
            {device.supportsPause ? (
              <>
                <ToggleRow id="dev-pause" title="Bağlantıyı duraklat" desc="Cihaz ağda kalır, internet geçici olarak durur" checked={device.paused} disabled={device.blocked} onChange={(v) => { update(device.id, { paused: v }); toast(v ? `${device.name} duraklatıldı` : `${device.name} devam ediyor`); }} />
                <ToggleRow id="dev-block" title="İnternet erişimini kapat" desc="Cihaz açılana kadar internete çıkamaz" checked={device.blocked} onChange={(v) => { update(device.id, { blocked: v, paused: false }); toast(v ? `${device.name} için internet kapatıldı` : `${device.name} için internet açıldı`); }} />
              </>
            ) : (
              <Banner tone="info" title="Bu cihaz duraklatmayı desteklemiyor">Akıllı ev cihazlarında yalnızca ağdan çıkarma yapılabilir.</Banner>
            )}
          </Card>
          <div className="grid grid-cols-2 gap-2">
            {device.supportsPause && (
              <Button variant="outline" onClick={() => update(device.id, { paused: !device.paused })} disabled={device.blocked}>
                {device.paused ? <><Play /> Devam ettir</> : <><Pause /> Duraklat</>}
              </Button>
            )}
            <Button variant="outline" className={cn("text-destructive", !device.supportsPause && "col-span-2")} onClick={() => setConfirm(true)}><Trash2 /> Ağdan çıkar</Button>
          </div>
        </div>
      </RequirePerm>
      <ConfirmDialog open={confirm} destructive title={`${device.name} ağdan çıkarılsın mı?`} text="Cihaz tekrar bağlanmak için Wi-Fi şifresine ihtiyaç duyar." confirmLabel="Çıkar" onCancel={() => setConfirm(false)} onConfirm={() => { remove(device.id); toast.success("Cihaz ağdan çıkarıldı"); navigate({ to: "/evim/cihazlar" }); }} />
    </div>
  );
}

