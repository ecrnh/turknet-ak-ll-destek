import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { runDueOps } from "@/features/workflow";
import { useWorkflowStore as W } from "@/features/workflow/store";
import { buildCtx, cursorOf, finish, next, visibleSteps } from "./player";
import { scenarioById } from "./scenarios";
import { useScenarioStore as S } from "./store";

/** Readable pace for auto-play. */
export const STEP_MS = 2600;
/** How long auto-play lets the customer decide on the phone before choosing for them. */
export const AUTO_DECIDE_MS = 3800;

/**
 * Always-mounted driver: runs the persisted job queue, advances auto-play and
 * navigates the phone to the screen a scenario step points at.
 */
export function ScenarioDriver() {
  const navigate = useNavigate();
  const nav = S((s) => s.nav);

  useEffect(() => {
    if (!nav) return;
    navigate({ to: nav as "/" });
    S.setState({ nav: null });
  }, [nav, navigate]);

  useEffect(() => {
    let lastAt = 0;
    let waitSince = 0;
    let lastMonitor = Date.now();
    const t = setInterval(() => {
      const now = Date.now();
      runDueOps(now);
      if (now - lastMonitor > 15_000) {
        lastMonitor = now;
        W.setState((s) => ({ connectivity: { ...s.connectivity, lastCheckAt: now } }));
      }
      const s = S.getState();
      if (!s.playing || !s.activeId || s.finishedAt) {
        waitSince = 0;
        return;
      }
      const sc = scenarioById(s.activeId);
      if (!sc) return;
      const cur = cursorOf(visibleSteps(sc, buildCtx()));
      if (!cur) {
        finish();
        return;
      }
      if (cur.state === "running") return;
      if (cur.state === "waiting" && cur.step.decisionKey) {
        if (!waitSince) waitSince = now;
        if (now - waitSince < AUTO_DECIDE_MS) return;
        waitSince = 0;
      } else if (now - lastAt < STEP_MS) return;
      next();
      lastAt = now;
    }, 400);
    return () => clearInterval(t);
  }, []);

  return null;
}
