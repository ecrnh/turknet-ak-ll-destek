import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { CalendarCheck, CheckCircle2, Clock, Star, Truck, Users, VideoOff } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/headers";
import { Csat } from "@/components/tn/Csat";
import { Chip, EmptyState, StatRow } from "@/components/tn/primitives";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore } from "@/features/core/appStore";
import { useVideoStore } from "../store";
import { fmtDuration } from "@/lib/format";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const SLOTS = ["09:00–12:00", "12:00–15:00", "15:00–18:00", "18:00–21:00"];
const DAYS = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

export function VideoResultScreen() {
  const call = useVideoStore((s) => s.lastCall);
  const resolveLast = useVideoStore((s) => s.resolveLast);
  const addAppointment = useVideoStore((s) => s.addAppointment);
  const updateRecord = useAppStore((s) => s.updateRecord);
  const incSaved = useAppStore((s) => s.incSavedVisits);
  const saved = useAppStore((s) => s.savedFieldVisits);
  const addRating = useAppStore((s) => s.addRating);
  const notify = useAppStore((s) => s.notify);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [rated, setRated] = useState(false);
  const [day, setDay] = useState<number | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [booked, setBooked] = useState<string | null>(null);

  const days = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i + 1);
      return { label: `${DAYS[d.getDay()]} ${d.getDate()}`, iso: d.toLocaleDateString("tr-TR") };
    });
  }, []);

  if (!call)
    return (
      <div>
        <PageHeader title="Görüşme Özeti" />
        <EmptyState icon={VideoOff} title="Görüşme bulunamadı" text="Henüz bir görüntülü görüşme yapmadın." action={<Button asChild><Link to="/goruntulu-destek">Görüşme Başlat</Link></Button>} />
      </div>
    );

  const answer = (v: boolean) => {
    resolveLast(v);
    if (v) {
      incSaved();
      updateRecord(call.recordId, { status: "Çözüldü", fieldVisitAvoided: true });
      track("flow_completed", "video_support", { resolved: true });
    } else {
      updateRecord(call.recordId, { status: "Saha ekibi gerekli" });
      track("flow_completed", "video_support", { resolved: false });
    }
  };

  return (
    <div>
      <PageHeader title="Görüşme Özeti" />
      <div className="space-y-4 px-4">
        <div className="rounded-card bg-card p-5 shadow-card">
          <p className="text-xs font-bold uppercase tracking-wide text-magenta">Otomatik özet</p>
          <p className="mt-1 text-lg font-semibold text-primary">{call.topic}</p>
          <div className="mt-3">
            <StatRow label="Süre" value={<span className="inline-flex items-center gap-1"><Clock className="size-3.5" />{fmtDuration(call.durationSec)}</span>} />
            <StatRow label="Katılımcılar" value={<span className="inline-flex items-center gap-1"><Users className="size-3.5" />{call.participants.length}</span>} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{call.participants.join(" · ")}</p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {call.steps.map((s) => (
              <li key={s} className="flex items-center gap-2"><CheckCircle2 className="size-4 text-success" /> {s}</li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-muted-foreground">Özet İşlem Geçmişi ve Tüm Destek Kayıtları'na eklendi.</p>
        </div>

        {call.resolved === null && (
          <div className="rounded-card bg-card p-5 text-center shadow-card">
            <p className="text-xl font-semibold text-primary">Sorun çözüldü mü?</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button size="xl" variant="success" className="rounded-full" onClick={() => answer(true)}>Evet</Button>
              <Button size="xl" variant="outline" className="rounded-full" onClick={() => answer(false)}>Hayır</Button>
            </div>
          </div>
        )}

        {call.resolved === true && (
          <>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-card bg-plum p-6 text-primary-foreground shadow-float">
              <Truck className="size-9" />
              <p className="mt-3 text-xl font-semibold">Saha ekibi gönderilmeden çözüldü</p>
              <p className="mt-1 text-sm text-primary-foreground/80">Randevu beklemeden, evden çıkmadan.</p>
              <div className="mt-4 rounded-2xl bg-primary-foreground/10 p-4">
                <p className="text-xs text-primary-foreground/70">Tasarruf edilen saha ziyareti</p>
                <p className="text-4xl font-bold">{saved}</p>
              </div>
            </motion.div>
            {!rated ? (
              <div className="rounded-card bg-card p-5 shadow-card">
                <p className="font-semibold text-primary">Uzmanımızı değerlendir</p>
                <div className="mt-3 flex justify-center gap-2" role="radiogroup" aria-label="Yıldız puanı">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} role="radio" aria-checked={stars === n} aria-label={`${n} yıldız`} onClick={() => setStars(n)} className="flex h-12 w-12 items-center justify-center">
                      <Star className={cn("size-9", n <= stars ? "fill-orange text-orange" : "text-border")} />
                    </button>
                  ))}
                </div>
                <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Yorumun (opsiyonel)" className="mt-3 rounded-2xl" aria-label="Yorum" />
                <Button className="mt-3 w-full" disabled={!stars} onClick={() => { addRating({ feature: "video_support_stars", csat: stars, nps: null, comment }); setRated(true); toast.success("Teşekkürler!"); }}>
                  Gönder
                </Button>
              </div>
            ) : (
              <Csat feature="video_support" title="Görüntülü destek deneyimini nasıl buldun?" />
            )}
          </>
        )}

        {call.resolved === false && (
          <div className="rounded-card bg-card p-5 shadow-card">
            {booked ? (
              <div className="text-center">
                <CalendarCheck className="mx-auto size-12 text-success" />
                <p className="mt-2 text-lg font-semibold text-primary">Teknik ekip randevun oluşturuldu</p>
                <p className="text-sm text-muted-foreground">{booked}</p>
                <p className="mt-2 text-xs text-muted-foreground">Görüşme notların ekibe iletildi; tekrar anlatmana gerek yok.</p>
              </div>
            ) : (
              <>
                <p className="text-lg font-semibold text-primary">Teknik ekip randevusu oluştur</p>
                <p className="text-sm text-muted-foreground">Uzman notlarına göre saha ekibi gerekli olarak kaydedildi.</p>
                <p className="mb-2 mt-4 text-sm font-semibold">Gün</p>
                <div className="flex flex-wrap gap-2">
                  {days.map((d, i) => (
                    <Chip key={d.iso} active={day === i} onClick={() => setDay(i)}>{d.label}</Chip>
                  ))}
                </div>
                <p className="mb-2 mt-4 text-sm font-semibold">Saat aralığı</p>
                <div className="grid grid-cols-2 gap-2">
                  {SLOTS.map((s) => (
                    <Chip key={s} active={slot === s} onClick={() => setSlot(s)}>{s}</Chip>
                  ))}
                </div>
                <Button
                  size="lg"
                  className="mt-5 w-full"
                  disabled={day === null || !slot}
                  onClick={() => {
                    const d = days[day!];
                    addAppointment(d.iso, slot!);
                    updateRecord(call.recordId, { status: `Saha randevusu: ${d.label} ${slot}` });
                    notify({ kind: "support", title: "Teknik ekip randevun onaylandı", body: `${d.label} · ${slot}`, to: "/destek-kayitlari" }, false);
                    setBooked(`${d.label} · ${slot}`);
                  }}
                >
                  Randevuyu Onayla
                </Button>
              </>
            )}
          </div>
        )}
        {call.resolved === false && booked && <Csat feature="video_support" />}
      </div>
    </div>
  );
}
