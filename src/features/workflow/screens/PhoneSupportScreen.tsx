import { Link } from "@tanstack/react-router";
import { MessageSquareText, Phone, ScanEye, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/headers";
import { TurknetLogo } from "@/components/layout/headers";
import { Button } from "@/components/ui/button";
import { startUstaCall, useWorkflowStore } from "@/features/workflow";
import { isActive } from "../rules";
import { DemoNote, StatusPill } from "../components/ui";

/** Entry to the simulated phone call: voice triage → SMS → app. No real call is placed. */
export function PhoneSupportScreen() {
  const active = useWorkflowStore((s) => s.workflows.find((w) => w.type === "ai_usta" && isActive(w)));
  return (
    <div>
      <PageHeader title="Telefonla Destek" />
      <div className="space-y-4 px-4 pb-4">
        <div className="rounded-card bg-card p-6 text-center shadow-card">
          <TurknetLogo className="text-5xl" />
          <p className="mt-2 text-lg font-semibold text-primary">TürkNet Müşteri Hizmetleri</p>
          <p className="text-sm text-muted-foreground">0850 288 00 00 · sesli asistan</p>
          {active ? (
            <Link to="/surec/$id" params={{ id: active.id }} className="mt-5 flex items-center justify-between rounded-2xl bg-muted px-4 py-3 text-left">
              <span className="text-sm font-semibold text-primary">Devam eden destek işleminiz var</span>
              <StatusPill status={active.status} />
            </Link>
          ) : (
            <Button size="xl" className="mt-5 w-full" onClick={() => startUstaCall()}>
              <Phone /> TürkNet'i ara
            </Button>
          )}
        </div>
        <div className="rounded-card bg-card p-5 shadow-card">
          <p className="font-semibold text-primary">Arayınca ne olacak?</p>
          <ul className="mt-3 space-y-3 text-sm">
            {[
              [ShieldCheck, "Numaranızdan sizi tanırız; şifre veya kimlik numarası sormayız."],
              [Phone, "Sesli asistan bağlantınızı kontrol eder ve sorununuzu sorar."],
              [MessageSquareText, "İsterseniz size özel bir destek bağlantısını SMS ile göndeririz."],
              [ScanEye, "Bağlantı, AI Usta'yı açar; sorununuzu tekrar anlatmanız gerekmez."],
            ].map(([I, t]) => {
              const Icon = I as typeof Phone;
              return (
                <li key={t as string} className="flex gap-3">
                  <Icon className="mt-0.5 size-5 shrink-0 text-magenta" />
                  <span className="text-foreground">{t as string}</span>
                </li>
              );
            })}
          </ul>
        </div>
        <DemoNote>Arama, sesli asistan ve SMS bu prototipte simülasyondur; gerçek bir arama yapılmaz, SMS gönderilmez.</DemoNote>
      </div>
    </div>
  );
}
