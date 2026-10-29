import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { CheckCircle2, ChevronRight, HeartPulse, Loader2, QrCode, ScanEye, Video } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/headers";
import { Csat } from "@/components/tn/Csat";
import { Banner } from "@/components/tn/primitives";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/features/core/appStore";
import { useFlow } from "@/lib/analytics";

const STEPS = ["Hat bağlantısı test ediliyor", "Modem ile iletişim kuruluyor", "Hat profili yenileniyor", "DNS önbelleği temizleniyor", "Doğrulama ölçümü"];

export function DigitalRepairScreen() {
  const [i, setI] = useState(-1);
  const net = useAppStore((s) => s.net);
  const setNet = useAppStore((s) => s.setNet);
  const addRecord = useAppStore((s) => s.addRecord);
  const flow = useFlow("digital_repair");
  const outage = net.status === "outage";
  const done = i >= STEPS.length;

  useEffect(() => {
    if (i < 0 || done) return;
    const t = setTimeout(() => setI((v) => v + 1), 900);
    return () => clearTimeout(t);
  }, [i, done]);

  useEffect(() => {
    if (!done) return;
    if (!outage) {
      if (net.status === "slow") setNet({ status: "online", speed: 94 });
      addRecord({ channel: "Dijital Onarım", title: "Dijital Onarım tamamlandı", summary: "Hat profili yenilendi, bağlantı sağlıklı.", status: "Tamamlandı", details: STEPS, fieldVisitAvoided: true });
    } else {
      addRecord({ channel: "Dijital Onarım", title: "Dijital Onarım: bölgesel kesinti", summary: "Sorun modemde değil, bölgesel arıza tespit edildi.", status: "Bilgilendirildi", details: STEPS });
    }
    flow.complete({ outage });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  return (
    <div>
      <PageHeader title="Dijital Onarım" />
      <div className="space-y-4 px-4">
        <div className="rounded-card bg-card p-6 shadow-card">
          <div className="flex flex-col items-center text-center">
            <motion.div animate={i >= 0 && !done ? { scale: [1, 1.1, 1] } : {}} transition={{ repeat: Infinity, duration: 1.2 }} className="flex h-20 w-20 items-center justify-center rounded-full bg-magenta-soft text-magenta">
              {done ? <CheckCircle2 className="size-10 text-success" /> : <HeartPulse className="size-10" />}
            </motion.div>
            <p className="mt-4 text-xl font-semibold text-primary">{done ? (outage ? "Bölgesel kesinti tespit edildi" : "Onarım tamamlandı") : i < 0 ? "Hattını kontrol edelim" : "Onarılıyor…"}</p>
          </div>
          <ul className="mt-5 space-y-2.5">
            {STEPS.map((s, idx) => (
              <li key={s} className="flex items-center gap-3 text-sm">
                {idx < i ? <CheckCircle2 className="size-5 text-success" /> : idx === i ? <Loader2 className="size-5 animate-spin text-magenta" /> : <span className="h-5 w-5 rounded-full border-2 border-border" />}
                <span className={idx <= i ? "text-foreground" : "text-muted-foreground"}>{s}</span>
              </li>
            ))}
          </ul>
          {i < 0 && (
            <Button size="xl" className="mt-6 w-full" onClick={() => setI(0)}>
              Dijital Onarımı Çalıştır
            </Button>
          )}
        </div>
        <Link to="/ai-usta" className="flex items-center gap-3 rounded-card bg-card p-4 shadow-card">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-icon-box text-primary">
            <ScanEye className="size-5" strokeWidth={1.75} />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-semibold text-primary">AI Usta ile adım adım çöz</span>
            <span className="text-xs text-muted-foreground">Modem ışıklarını göster, güvenli adımlarla birlikte kontrol edelim</span>
          </span>
          <ChevronRight className="size-5 text-muted-foreground" />
        </Link>
        {done && outage && (
          <Banner tone="warning" title="Sorun senden kaynaklı değil">
            Ekiplerimiz bölgesel arıza üzerinde çalışıyor. <Link to="/hediye" className="font-semibold text-magenta">Hediye internetini gör</Link>
          </Banner>
        )}
        {done && !outage && (
          <>
            <Banner tone="success" title="Hattın sağlıklı">Sorun devam ederse:</Banner>
            <div className="grid grid-cols-2 gap-3">
              <Link to="/qr/tara" className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-card font-semibold text-primary shadow-card"><QrCode className="size-5" /> QR ile talep</Link>
              <Link to="/goruntulu-destek" className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-card font-semibold text-primary shadow-card"><Video className="size-5" /> Görüntülü</Link>
            </div>
            <Csat feature="digital_repair" />
          </>
        )}
      </div>
    </div>
  );
}
