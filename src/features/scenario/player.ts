/**
 * ScenarioEngine: start / next / auto-play / reset. Steps call real service
 * functions; the cursor is always the first step whose derived state is open.
 */
import { useAppStore } from "@/features/core/appStore";
import { decide, flushOps, log } from "@/features/workflow";
import { defaultConfig, useWorkflowStore as W } from "@/features/workflow/store";
import { scenarioById, type Ctx, type DemoScenario, type ScenarioStep, type StepState } from "./scenarios";
import { initialScenario, useScenarioStore as S, type ScenarioState } from "./store";
import type { WorkflowState } from "@/features/workflow/store";

export function buildCtx(w: WorkflowState = W.getState(), s: ScenarioState = S.getState()): Ctx {
  const main = w.workflows.find((x) => x.id === s.ids["main"]);
  const temp = main ? w.workflows.find((x) => x.type === "temp_internet" && x.relatedIds.includes(main.id)) : undefined;
  return { w, s, main, temp, outcomeId: s.outcomeId };
}

export interface StepView {
  step: ScenarioStep;
  state: StepState;
}

export function visibleSteps(sc: DemoScenario, c: Ctx): StepView[] {
  return sc.steps.filter((st) => !st.only || st.only.includes(c.outcomeId)).map((step) => ({ step, state: step.status(c) }));
}

const OPEN: StepState[] = ["pending", "running", "waiting"];
export const cursorOf = (list: StepView[]) => list.find((v) => OPEN.includes(v.state)) ?? null;

export const activeScenario = () => scenarioById(S.getState().activeId);

/** Wipes platform demo data (workflows, records, logs) but keeps the rest of the app. */
export function resetPlatform() {
  W.getState().reset();
  useAppStore.getState().setNet({ status: "online", speed: 96, ping: 8, outageStartedAt: null, etaAt: null });
}

export function startScenario(id: string, outcomeId: string) {
  const sc = scenarioById(id);
  const outcome = sc?.outcomes.find((o) => o.id === outcomeId) ?? sc?.outcomes[0];
  if (!sc || !outcome) return;
  resetPlatform();
  W.setState({ config: { ...defaultConfig(), ...outcome.config }, autoFollowUp: false });
  S.setState({ ...initialScenario(), selectedId: id, outcomeId: outcome.id, activeId: id, startedAt: Date.now() });
  log(null, "presenter", "info", `Senaryo ${sc.id} başlatıldı: ${sc.title} · ${outcome.label}`);
  next();
}

/** Executes the current step. Returns the label of the step that was acted on. */
export function next(): string | null {
  const sc = activeScenario();
  if (!sc || S.getState().finishedAt) return null;
  const c = buildCtx();
  const cur = cursorOf(visibleSteps(sc, c));
  if (!cur) {
    finish();
    return null;
  }
  if (cur.state === "running") {
    flushOps();
  } else if (cur.state === "waiting" && cur.step.decisionKey) {
    const wf = cur.step.decisionWf?.(c) ?? c.main;
    const d = wf?.decision;
    if (wf && d) {
      const outcome = sc.outcomes.find((o) => o.id === c.outcomeId);
      const opt = outcome?.choices[d.key] ?? d.options.find((o) => o.primary)?.id ?? d.options[0]!.id;
      decide(wf.id, opt, "presenter");
    }
  } else {
    cur.step.run?.(c);
  }
  const path = cur.step.screen?.(buildCtx());
  if (path) S.setState({ nav: path });
  if (!cursorOf(visibleSteps(sc, buildCtx()))) finish();
  return cur.step.label;
}

export function finish() {
  const sc = activeScenario();
  if (!sc || S.getState().finishedAt) return;
  S.setState({ finishedAt: Date.now(), playing: false });
  log(null, "presenter", "info", `Senaryo ${sc.id} tamamlandı`);
}

export function setPlaying(playing: boolean) {
  S.setState({ playing });
}

export function resetScenario() {
  const { selectedId, outcomeId } = S.getState();
  resetPlatform();
  S.setState({ ...initialScenario(), selectedId, outcomeId, nav: "/" });
}
