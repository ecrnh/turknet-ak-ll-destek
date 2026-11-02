import { Link, useNavigate } from "@tanstack/react-router";
import { CalendarCheck, Eye, Lock, ReceiptText, ShieldAlert, Wrench } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/headers";
import { EmptyState } from "@/components/tn/primitives";
import { Button } from "@/components/ui/button";
import { SCOPES, USER, type ScopeKey } from "@/data/mock";
import { useAppStore } from "@/features/core/appStore";
import { startAiUsta, startSpeedCheck, useWorkflowStore } from "@/features/workflow";
import { isActive } from "@/features/workflow/rules";
import { StatusPill } from "@/features/workflow/components/ui";
import { fmtTL } from "@/lib/format";
import { cn } from "@/lib/utils";
import { delegateCan, useFamilyStore } from "../store";

const ICON: Record<ScopeKey, typeof Eye> = { view: Eye, tech: Wrench, appointments: CalendarCheck, bills: ReceiptText, finance: ShieldAlert };

/** Demo: what an authorized family member sees and may do. Owner-only actions stay locked. */
export function FamilyMemberScreen({ id }: { id: string }) {
  const navigate = useNavigate();
  const d = useFamilyStore((s) => s.delegates.find((x) => x.id === id));
  const recordAction = useFamilyStore((s) => s.recordAction);
  const requestSensitive = useFamilyStore((s) => s.requestSensitive);
  const requests = useFamilyStore((s) => s.requests);
  const appNotify = useAppStore((s) => s.notify);
  const workflows = useWorkflowStore((s) => s.workflows);
  const appointments = useWorkflowStore((s) => s.appointments);
  const bill = useWorkflowStore((s) => s.bills[0]);

  if (!d)
    return (
      <div>
        <PageHeader title="Aile üyesi" />
        <EmptyState icon={Lock} title="Kişi bulunamadı" action={<Link to="/aile" className="font-semibold text-magenta">Aile ve Yetkilendirme</Link>} />
      </div>
    );

  const can = (k: ScopeKey) => delegateCan(d, k);
  const first = d.name.split(" ")[0];
  const by = `${d.name} (yetkili aile üyesi)`;
  const active = workflows.filter(isActive);

  const ask = (action: string) => {
    const r = requestSensitive(d.id, action);
    if (!r) return toast.error("Bu işlem için yetkiniz yok");
    appNotify({ kind: "family", title: "Onayınız gerekiyor", body: `${d.name} “${action}” işlemini yapmak istiyor.`, to: "/aile" });
    toast.success("Abonelik sahibinin onayı istendi", { description: `${USER.firstName} onaylayınca işlem yapılacak.` });
  };

  const Locked = ({ text }: { text: string }) => (
    <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
      <Lock className="size-3.5" /> {text}
    </p>
  );

  return (
    <div>
      <PageHeader title={`${first} olarak görüntüleniyor`} />
      <div className="space-y-3 px-4 pb-4">
        <div className="rounded-card bg-orange-soft p-4 text-sm">
          <p className="font-semibold text-foreground">Demo: {d.name} ({d.relation}) uygulamada bunları görür</p>
          <p className="mt-0.5 text-muted-foreground">Abonelik sahibi {USER.firstName}. {d.status !== "active" && "Yetki şu an aktif değil; hiçbir işlem yapılamaz."}</p>
        </div>

        {SCOPES.map((s) => {
          const Icon = ICON[s.key];
          const ok = can(s.key);
          return (
            <div key={s.key} className={cn("rounded-card bg-card p-4 shadow-card", !ok && "opacity-70")}>
              <p className="flex items-center gap-2 font-semibold text-primary">
                <Icon className="size-5 text-magenta" /> {s.label}
              </p>
              {!ok && <Locked text="Bu yetki size verilmedi" />}
              {ok && s.key === "view" && (
                <ul className="mt-2 space-y-1.5">
                  {active.length ? (
                    active.slice(0, 4).map((w) => (
                      <li key={w.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate text-foreground">{w.title}</span>
                        <StatusPill status={w.status} />
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-muted-foreground">Devam eden işlem yok.</li>
                  )}
                </ul>
              )}
              {ok && s.key === "tech" && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const wfId = startAiUsta({ initiatedBy: by });
                      recordAction(d.id, "AI Usta ile arıza çözümünü başlattı");
                      navigate({ to: "/ai-usta/$id", params: { id: wfId } });
                    }}
                  >
                    Arıza çözümü
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const wfId = startSpeedCheck({ initiatedBy: by });
                      recordAction(d.id, "İnternet hızı kontrolünü başlattı");
                      navigate({ to: "/surec/$id", params: { id: wfId } });
                    }}
                  >
                    Hız kontrolü
                  </Button>
                </div>
              )}
              {ok && s.key === "appointments" && (
                <p className="mt-2 text-sm text-foreground">{appointments.length ? appointments.map((a) => a.label).join(" · ") : "Planlı randevu yok."}</p>
              )}
              {ok && s.key === "bills" && bill && (
                <p className="mt-2 text-sm text-foreground">
                  {bill.period}: <b>{fmtTL(bill.amount)}</b> · son ödeme {bill.due}
                </p>
              )}
              {ok && s.key === "finance" && (
                <>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {["Faturayı öde", "Paket değiştir"].map((a) => {
                      const pending = requests.some((r) => r.delegateId === d.id && r.action === a && r.status === "pending");
                      return (
                        <Button key={a} variant="outline" disabled={pending} onClick={() => ask(a)}>
                          {pending ? "Onay bekleniyor" : a}
                        </Button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">Her işlem için abonelik sahibinin onayı gerekir. Kart bilgileri gösterilmez.</p>
                </>
              )}
            </div>
          );
        })}

        <div className="rounded-card bg-card p-4 shadow-card opacity-70">
          <p className="font-semibold text-primary">Hesap sahipliğini değiştir</p>
          <Locked text="Hesap sahipliği yalnızca abonelik sahibi tarafından değiştirilebilir" />
        </div>
        <Button variant="outline" className="w-full" onClick={() => navigate({ to: "/aile" })}>
          Abonelik sahibi görünümüne dön
        </Button>
      </div>
    </div>
  );
}
