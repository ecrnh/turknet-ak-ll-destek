import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { CheckCircle2, HeartPulse, Loader2 } from "lucide-react";
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
  const openHelp = useAppStore((s) => s.openHelp);
  const stillIssue = () =>
    openHelp(`Dijital Onarım raporu: ${STEPS.join(", ")} adımları tamamlandı, hat sağlıklı görünüyor (${net.speed} Mbps). Ancak sorunum hâlâ devam ediyor. Yaşadığım sorunu birlikte inceleyebilir miyiz?`);
  const outage = net.status === "down" || net.status === "mobile";
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
      addRecord({ channel: "Dijital Onarım", title: "Dijital Onarım: kesinti", summary: "Sorun modemde değil, hatta kesinti tespit edildi.", status: "Bilgilendirildi", details: STEPS });
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
        {done && outage && (
          <Banner tone="warning" title="Sorun senden kaynaklı değil">
            Teknik ekibimiz arıza üzerinde çalışıyor. <Link to="/hibrit" className="font-semibold text-magenta">Kesinti durumunu gör</Link>
          </Banner>
        )}
        {done && !outage && (
          <>
            <Csat feature="digital_repair" />
            <Button size="xl" variant="outline" className="w-full" onClick={stillIssue}>Sorunum hâlâ devam ediyor</Button>
          </>
        )}
      </div>
    </div>
  );
}
