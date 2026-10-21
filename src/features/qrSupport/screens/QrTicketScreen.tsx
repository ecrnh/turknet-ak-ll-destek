import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Check, CheckCircle2, ClipboardX, Clock, EarOff } from "lucide-react";
import { useEffect } from "react";
import { PageHeader } from "@/components/layout/headers";
import { Csat } from "@/components/tn/Csat";
import { EmptyState, StatRow } from "@/components/tn/primitives";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/features/core/appStore";
import { useQrStore } from "../store";
import { fmtDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUSES = ["Alındı", "İnceleniyor", "Çözüm Aşamasında", "Tamamlandı"];

export function QrTicketScreen({ id }: { id: string }) {
  const ticket = useQrStore((s) => s.tickets.find((t) => t.id === id));
  const advance = useQrStore((s) => s.advance);
  const updateRecord = useAppStore((s) => s.updateRecord);

  useEffect(() => {
    if (!ticket || ticket.statusIndex >= 2) return;
    const t = setTimeout(() => advance(ticket.id), 4000);
    return () => clearTimeout(t);
  }, [ticket, advance]);

  useEffect(() => {
    if (ticket) updateRecord(ticket.recordId, { status: STATUSES[ticket.statusIndex] ?? "Alındı" });
  }, [ticket, updateRecord]);

  if (!ticket)
    return (
      <div>
        <PageHeader title="Destek Talebi" />
        <EmptyState icon={ClipboardX} title="Talep bulunamadı" text="Bu talep numarası bu cihazda kayıtlı değil." action={<Button asChild><Link to="/qr">QR ile Destek</Link></Button>} />
      </div>
    );

  return (
    <div>
      <PageHeader title="Destek Talebin" />
      <div className="space-y-4 px-4">
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-card bg-plum p-6 text-primary-foreground shadow-float">
          <CheckCircle2 className="size-10" />
          <p className="mt-3 text-sm text-primary-foreground/70">Talep numaran</p>
          <p className="font-mono text-2xl font-bold">{ticket.id}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-semibold"><Clock className="size-3.5" /> Tahmini çözüm: {ticket.eta}</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-semibold"><EarOff className="size-3.5" /> {ticket.contactMe ? "Gerekirse aranacaksın" : "Temassız"}</span>
          </div>
        </motion.div>

        <div className="rounded-card bg-card p-5 shadow-card">
          <p className="font-semibold text-primary">Durum</p>
          <ol className="mt-4 space-y-0">
            {STATUSES.map((s, i) => {
              const reached = i <= ticket.statusIndex;
              return (
                <li key={s} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <motion.span animate={{ scale: i === ticket.statusIndex ? [1, 1.15, 1] : 1 }} transition={{ repeat: i === ticket.statusIndex ? Infinity : 0, duration: 1.6 }} className={cn("flex h-7 w-7 items-center justify-center rounded-full", reached ? "bg-magenta text-magenta-foreground" : "border-2 border-border")}>
                      {reached && <Check className="size-4" />}
                    </motion.span>
                    {i < STATUSES.length - 1 && <span className={cn("h-8 w-0.5", i < ticket.statusIndex ? "bg-magenta" : "bg-border")} />}
                  </div>
                  <p className={cn("pt-1 font-semibold", reached ? "text-foreground" : "text-muted-foreground")}>{s}</p>
                </li>
              );
            })}
          </ol>
          {ticket.statusIndex < 3 && (
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => advance(ticket.id)}>
              Durumu ilerlet (demo)
            </Button>
          )}
        </div>

        <div className="rounded-card bg-card p-5 shadow-card">
          <p className="font-semibold text-primary">Otomatik doldurulan bilgiler</p>
          <div className="mt-2">
            <StatRow label="Kategori" value={ticket.category} />
            <StatRow label="Oluşturma" value={fmtDateTime(ticket.createdAt)} />
            <StatRow label="Cihaz" value={ticket.device} />
            {ticket.tech.map(([k, v]) => (
              <StatRow key={k} label={k} value={v} />
            ))}
          </div>
          <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
            {ticket.issues.map((x) => (
              <li key={x}>• {x}</li>
            ))}
          </ul>
        </div>
        <Csat feature="qr_support" title="QR ile talep açmak nasıldı?" />
      </div>
    </div>
  );
}
