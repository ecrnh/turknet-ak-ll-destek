import { CheckCircle2, EyeOff, Headset, Pause, Play, PlugZap, RotateCcw, SkipForward, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DemoPanel } from "@/features/demo/DemoPanel";
import { TEAMS } from "@/data/mock";
import { checkExternal, decide, escalate, flushOps, recheckRelocation, stepStatus } from "@/features/workflow";
import { MOCK_LABEL, MockBillingAPI, MockInfraAPI, MockLogisticsAPI, MockNetworkAPI, MockProviderAPI, MockVisionAPI } from "@/features/workflow/mockServices";
import { STATUS_LABEL, isActive } from "@/features/workflow/rules";
import { useWorkflowStore } from "@/features/workflow/store";
import { ActorChip, AuditList, StepIcon } from "@/features/workflow/components/ui";
import type { WorkflowType } from "@/features/workflow/types";
import { cn } from "@/lib/utils";
import { buildCtx, cursorOf, next, resetScenario, setPlaying, startScenario, visibleSteps } from "./player";
import { SCENARIOS, scenarioById } from "./scenarios";
import { useScenarioStore } from "./store";

type Tab = "scenario" | "log" | "notif" | "classic";

const TEAM_FOR: Record<WorkflowType, string> = {
  relocation: TEAMS.relocation,
  temp_internet: TEAMS.logistics,
  outage_recovery: TEAMS.tech,
  billing_check: TEAMS.finance,
  ai_usta: TEAMS.tech,
  proactive_fault: TEAMS.tech,
};

const clock = (t: number) => new Date(t).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

/** Presenter-only scenario control panel. Not part of the customer UI. */
export function ScenarioPanel({ onHide }: { onHide?: () => void }) {
  const [tab, setTab] = useState<Tab>("scenario");
  const w = useWorkflowStore();
  const s = useScenarioStore();
  const [openWhy, setOpenWhy] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const sc = scenarioById(s.selectedId) ?? SCENARIOS[0]!;
  const isActiveSc = s.activeId === sc.id;
  const c = buildCtx(w, s);
  const outcomeId = isActiveSc ? s.outcomeId : sc.outcomes.some((o) => o.id === s.outcomeId) ? s.outcomeId : sc.outcomes[0]!.id;
  const outcome = sc.outcomes.find((o) => o.id === outcomeId)!;
  const views = isActiveSc ? visibleSteps(sc, c) : sc.steps.filter((st) => !st.only || st.only.includes(outcomeId)).map((step) => ({ step, state: "pending" as const }));
  const cur = isActiveSc ? cursorOf(views) : null;
  const doneCount = views.filter((v) => v.state === "done" || v.state === "skipped" || v.state === "failed").length;
  const finished = isActiveSc && (!!s.finishedAt || !cur);
  const main = c.main;
  const decisionWf = cur?.step.decisionKey && cur.state === "waiting" ? (cur.step.decisionWf?.(c) ?? main) : undefined;

  useEffect(() => {
    if (tab === "log") logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [tab, w.audit.length]);

  const externalArrived = () => {
    if (!main) return;
    if (main.type === "relocation") {
      if (stepStatus(main.id, "eligibility") === "waiting") {
        useWorkflowStore.setState((st) => ({ config: { ...st.config, addressCheck: "eligible" } }));
        recheckRelocation(main.id);
      } else {
        useWorkflowStore.setState((st) => ({ config: { ...st.config, externalResponse: "ready" } }));
        checkExternal(main.id);
      }
    } else flushOps(main.id);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-magenta">Sunum aracı · müşteri arayüzü değil</p>
          <h2 className="text-lg font-semibold text-primary">Senaryo Demo Paneli</h2>
        </div>
        {onHide && (
          <button onClick={onHide} aria-label="Paneli gizle" className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
            <EyeOff className="size-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-1 rounded-full bg-muted p-1 text-[11px] font-semibold">
        {(
          [
            ["scenario", "Senaryo"],
            ["log", `Günlük ${w.audit.length}`],
            ["notif", `Bildirim ${w.messages.length}`],
            ["classic", "Diğer"],
          ] as [Tab, string][]
        ).map(([id, l]) => (
          <button key={id} onClick={() => setTab(id)} className={cn("min-h-9 rounded-full px-1", tab === id ? "bg-card text-primary shadow-sm" : "text-muted-foreground")}>
            {l}
          </button>
        ))}
      </div>

      {tab === "scenario" && (
        <>
          <div className="grid grid-cols-3 gap-1.5">
            {SCENARIOS.map((x) => (
              <button
                key={x.id}
                onClick={() => useScenarioStore.setState({ selectedId: x.id, outcomeId: s.activeId === x.id ? s.outcomeId : x.outcomes[0]!.id })}
                className={cn("relative rounded-xl border px-2 py-2 text-left", x.id === sc.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-primary hover:bg-accent")}
              >
                <span className="text-[11px] font-black">{x.id}</span>
                <span className="block text-[11px] font-semibold leading-tight">{x.title}</span>
                {s.activeId === x.id && !s.finishedAt && <span className="absolute right-1.5 top-1.5 h-2 w-2 animate-pulse rounded-full bg-magenta" />}
              </button>
            ))}
          </div>

          <div className="rounded-2xl bg-muted p-3">
            <p className="text-xs text-foreground">{sc.summary}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {sc.features.map((f) => (
                <span key={f} className="rounded-full bg-card px-2 py-0.5 text-[10px] font-semibold text-primary">
                  {f}
                </span>
              ))}
            </div>
            <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Sonuç yolu</p>
            <div className="mt-1 space-y-1">
              {sc.outcomes.map((o) => (
                <button
                  key={o.id}
                  disabled={isActiveSc && !finished}
                  onClick={() => useScenarioStore.setState({ outcomeId: o.id })}
                  className={cn("w-full rounded-xl border px-2.5 py-1.5 text-left text-xs disabled:cursor-not-allowed", o.id === outcomeId ? "border-magenta bg-card" : "border-transparent bg-card/50 opacity-80")}
                >
                  <span className="font-semibold text-primary">{o.label}</span>
                  <span className="block text-[11px] text-muted-foreground">{o.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            <CtlBtn icon={Play} label={isActiveSc ? "Yeniden" : "Başlat"} primary={!isActiveSc} onClick={() => startScenario(sc.id, outcomeId)} />
            <CtlBtn icon={SkipForward} label="Sonraki" primary={isActiveSc && !finished} disabled={!isActiveSc || finished} onClick={() => next()} />
            <CtlBtn icon={s.playing ? Pause : Zap} label={s.playing ? "Duraklat" : "Oto oynat"} disabled={!isActiveSc || finished} onClick={() => setPlaying(!s.playing)} />
            <CtlBtn icon={RotateCcw} label="Sıfırla" onClick={() => resetScenario()} />
          </div>

          {isActiveSc && (
            <div>
              <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                <span>
                  {s.playing ? "Otomatik oynatılıyor" : "Manuel mod"} · {doneCount}/{views.length} adım
                </span>
                {main && <span className="font-mono">{main.id}</span>}
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-magenta transition-all" style={{ width: `${(doneCount / Math.max(1, views.length)) * 100}%` }} />
              </div>
              {main && (
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  İşlem durumu: <span className="font-semibold text-foreground">{STATUS_LABEL[main.status]}</span>
                  {main.blocker && main.status !== "completed" ? ` · ${main.blocker}` : ""}
                </p>
              )}
            </div>
          )}

          {decisionWf?.decision && (
            <div className="rounded-2xl border-2 border-magenta/40 bg-magenta-soft p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-magenta">Müşteri kararı bekleniyor</p>
              <p className="mt-0.5 text-sm font-semibold text-foreground">{decisionWf.decision.prompt}</p>
              <p className="text-[11px] text-muted-foreground">Telefondan seçilebilir ya da müşteri adına buradan:</p>
              <div className="mt-2 space-y-1">
                {decisionWf.decision.options.map((o) => (
                  <button key={o.id} onClick={() => decide(decisionWf.id, o.id, "presenter")} className={cn("w-full rounded-xl px-2.5 py-1.5 text-left text-xs font-semibold", outcome.choices[decisionWf.decision!.key] === o.id ? "bg-primary text-primary-foreground" : "bg-card text-primary")}>
                    {o.label}
                    {outcome.choices[decisionWf.decision!.key] === o.id && <span className="ml-1 opacity-75">· senaryo varsayılanı</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          <ol className="space-y-1">
            {views.map((v, i) => {
              const isCur = cur?.step.id === v.step.id;
              const show = isCur || openWhy === v.step.id;
              return (
                <li key={v.step.id} className={cn("rounded-xl border px-2 py-1.5", isCur ? "border-magenta/50 bg-magenta-soft" : "border-transparent")}>
                  <button onClick={() => setOpenWhy(openWhy === v.step.id ? null : v.step.id)} className="flex w-full items-start gap-2 text-left">
                    <StepIcon status={v.state} className="mt-0.5 size-4" />
                    <span className={cn("flex-1 text-xs font-semibold leading-snug", v.state === "pending" ? "text-muted-foreground" : v.state === "skipped" ? "text-muted-foreground line-through" : "text-foreground")}>
                      {i + 1}. {v.step.label}
                    </span>
                    <ActorChip actor={v.step.actor} />
                  </button>
                  {show && (
                    <p className="ml-6 mt-1 text-[11px] text-muted-foreground">
                      <span className="font-semibold text-foreground">Neden: </span>
                      {v.step.why}
                      {isCur && <span className="mt-0.5 block font-semibold text-magenta">{v.state === "running" ? "Dış sistem yanıtı bekleniyor… (Sonraki = hızlandır)" : v.state === "waiting" && v.step.decisionKey ? "Müşteri kararı bekleniyor" : v.state === "waiting" ? "Bekliyor · Sonraki ile devam" : "Sıradaki adım"}</span>}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>

          {isActiveSc && main && isActive(main) && !finished && (
            <div className="grid grid-cols-2 gap-1.5">
              <button onClick={externalArrived} className="flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-2 text-[11px] font-semibold text-primary hover:bg-accent">
                <PlugZap className="size-3.5" /> Dış sistem yanıtı geldi
              </button>
              <button onClick={() => escalate(main.id, TEAM_FOR[main.type], "Sunum: insan desteğine manuel aktarım", "presenter")} className="flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-2 text-[11px] font-semibold text-primary hover:bg-accent">
                <Headset className="size-3.5" /> İnsan desteğine aktar
              </button>
            </div>
          )}

          {finished && main && (
            <div className="rounded-2xl border border-success/30 bg-success-soft p-3">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-success">
                <CheckCircle2 className="size-4" /> Senaryo tamamlandı
              </p>
              <p className="mt-1 text-xs font-semibold text-foreground">{main.outcome?.summary ?? (main.handoff ? `${main.handoff.team} ekibine bağlamıyla aktarıldı` : STATUS_LABEL[main.status])}</p>
              <ul className="mt-1.5 space-y-0.5 text-[11px] text-muted-foreground">
                {(main.outcome?.results ?? main.handoff?.context.slice(0, 5) ?? []).map((r, i) => (
                  <li key={`${i}-${r}`}>• {r}</li>
                ))}
                <li>
                  • {w.workflows.length} süreç · {w.workOrders.length} iş emri · {w.messages.length} bildirim · {w.audit.length} günlük kaydı
                </li>
              </ul>
            </div>
          )}

          <div className="rounded-2xl border border-dashed border-border p-3 text-[11px] text-muted-foreground">
            <p className="font-semibold text-foreground">Entegrasyon durumu</p>
            <p>Gerçek entegrasyon: yok. Tüm dış sistemler mock servis:</p>
            <ul className="mt-1 space-y-0.5">
              {[MockInfraAPI.name, MockProviderAPI.name, MockBillingAPI.name, MockNetworkAPI.name, MockVisionAPI.name, MockLogisticsAPI.name].map((n) => (
                <li key={n}>
                  <span className="mr-1 rounded bg-warning-soft px-1 font-bold text-warning">MOCK</span>
                  {n}
                </li>
              ))}
            </ul>
            <p className="mt-1">{MOCK_LABEL}</p>
          </div>
        </>
      )}

      {tab === "log" && (
        <div ref={logRef} className="max-h-[640px] overflow-y-auto pr-1">
          <p className="mb-2 text-[11px] text-muted-foreground">Zaman sırasıyla tüm olaylar ve her otomatik kararın nedeni.</p>
          <AuditList events={w.audit} showWf dense />
        </div>
      )}

      {tab === "notif" && (
        <div className="max-h-[640px] space-y-2 overflow-y-auto pr-1">
          <p className="text-[11px] text-muted-foreground">Müşteriye gönderilen bildirimler (uygulama içi + push, demo).</p>
          {w.messages.length === 0 && <p className="py-3 text-center text-xs text-muted-foreground">Henüz bildirim yok.</p>}
          {w.messages.map((m) => (
            <div key={m.id} className="rounded-xl border border-border p-2.5">
              <p className="flex justify-between text-[10px] text-muted-foreground">
                <span className="font-mono">{m.workflowId}</span>
                <span>{clock(m.at)}</span>
              </p>
              <p className="text-xs font-semibold text-foreground">{m.title}</p>
              <p className="text-[11px] text-muted-foreground">{m.body}</p>
            </div>
          ))}
        </div>
      )}

      {tab === "classic" && <DemoPanel />}
    </div>
  );
}

function CtlBtn({ icon: Icon, label, onClick, disabled, primary }: { icon: typeof Play; label: string; onClick: () => void; disabled?: boolean; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn("flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold disabled:opacity-40", primary ? "bg-primary text-primary-foreground" : "border border-border bg-card text-primary hover:bg-accent")}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}
