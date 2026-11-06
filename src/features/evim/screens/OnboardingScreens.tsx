import { useNavigate } from "@tanstack/react-router";
import { Download, Loader2, LogIn, Smartphone, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, TurknetLogo } from "@/components/layout/headers";
import { Card, Chip } from "@/components/tn/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PERSONAS, useEvimStore } from "../store";

/** Shown when the QR is scanned without the app: install, then continue the same QR flow. */
export function InstallScreen() {
  const navigate = useNavigate();
  const setDemo = useEvimStore((s) => s.setDemo);
  const [progress, setProgress] = useState<number | null>(null);

  const install = () => {
    setProgress(0);
    let p = 0;
    const t = window.setInterval(() => {
      p += 20;
      setProgress(p);
      if (p >= 100) {
        window.clearInterval(t);
        setDemo({ appInstalled: true });
        toast.success("TürkNet uygulaması yüklendi");
        window.setTimeout(() => navigate({ to: "/evim/giris" }), 400);
      }
    }, 300);
  };

  return (
    <div className="pb-8">
      <PageHeader title="Uygulamayı indir" />
      <div className="space-y-4 px-4">
        <Card className="text-center">
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-icon-box"><TurknetLogo className="text-5xl" /></span>
          <p className="mt-3 text-lg font-semibold text-primary">TürkNet</p>
          <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground"><Star className="size-3.5 fill-warning text-warning" /> 4,7 · Ücretsiz</p>
          <p className="mt-3 text-sm text-muted-foreground">QR kodu okuttun. TürkNet Evim'e girmek için önce uygulamayı yükle; yükleme bitince kaldığın yerden devam edeceksin.</p>
          {progress === null ? (
            <Button size="xl" variant="magenta" className="mt-5 w-full rounded-full" onClick={install}><Download /> Uygulamayı Yükle</Button>
          ) : (
            <div className="mt-5">
              <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-magenta transition-all" style={{ width: `${progress}%` }} /></div>
              <p className="mt-2 text-xs text-muted-foreground">Yükleniyor… %{progress}</p>
            </div>
          )}
        </Card>
        <p className="flex items-start gap-2 px-1 text-xs text-muted-foreground"><Smartphone className="mt-0.5 size-4 shrink-0" /> Yükleme sonrası QR bağlantısı hatırlanır, kodu tekrar okutman gerekmez.</p>
      </div>
    </div>
  );
}

export function LoginScreen() {
  const navigate = useNavigate();
  const persona = useEvimStore((s) => s.persona);
  const setDemo = useEvimStore((s) => s.setDemo);
  const [who, setWho] = useState(persona);
  const [busy, setBusy] = useState(false);
  const phone = PERSONAS.find((p) => p.id === who)?.phone ?? "";

  const login = () => {
    setBusy(true);
    window.setTimeout(() => {
      setDemo({ loggedIn: true, persona: who });
      toast.success("Giriş yapıldı · rolün kontrol ediliyor");
      navigate({ to: "/evim" });
    }, 700);
  };

  return (
    <div className="pb-8">
      <PageHeader title="Giriş yap" />
      <div className="space-y-4 px-4">
        <Card>
          <p className="text-sm text-muted-foreground">QR akışına devam etmek için TürkNet hesabınla giriş yap.</p>
          <label className="mt-4 block text-sm font-semibold text-foreground" htmlFor="evim-phone">Cep telefonu</label>
          <Input id="evim-phone" value={phone} readOnly className="mt-1.5 h-12" />
          <label className="mt-3 block text-sm font-semibold text-foreground" htmlFor="evim-pass">Şifre</label>
          <Input id="evim-pass" type="password" defaultValue="demo1234" className="mt-1.5 h-12" />
          <Button size="xl" className="mt-5 w-full rounded-full" onClick={login} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <LogIn />} Giriş Yap
          </Button>
        </Card>
        <Card>
          <p className="pb-2 text-[11px] font-bold uppercase tracking-wide text-magenta">Demo · hangi kullanıcı giriş yapıyor?</p>
          <div className="flex flex-wrap gap-2">
            {PERSONAS.map((p) => (
              <Chip key={p.id} active={who === p.id} onClick={() => setWho(p.id)}>{p.name}</Chip>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
