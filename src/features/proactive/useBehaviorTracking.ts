import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { createRageDetector, detectQuickBack, featureForPath, type Visit } from "./rules";
import { useProactive } from "./store";
import { useAppStore } from "@/features/core/appStore";

const OFF = (p: string) => p.startsWith("/ajanlar") || p.startsWith("/dashboard") || p.startsWith("/canli-destek");

/** Real click + navigation tracking inside the phone. Mount once (AppShell). */
export function useBehaviorTracking(root: React.RefObject<HTMLElement | null>) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const history = useRef<Visit[]>([]);
  const pathRef = useRef(path);
  pathRef.current = path;

  useEffect(() => {
    const h = history.current;
    if (h[h.length - 1]?.path === path) return;
    h.push({ path, at: Date.now() });
    if (h.length > 3) h.shift();
    const qb = detectQuickBack(h);
    if (!qb || OFF(qb.left) || OFF(qb.back) || useAppStore.getState().helpOpen) return;
    const f = featureForPath(qb.left);
    useProactive.getState().emit({ type: "quick_back", path: qb.left, left: qb.left, feature: f.feature, intent: f.intent, at: Date.now() });
  }, [path]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const detect = createRageDetector();
    const onClick = (e: MouseEvent) => {
      const t = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-feature], button, a, [role=button]");
      const p = pathRef.current;
      if (!t || OFF(p) || t.closest("[data-proactive-ignore]")) return;
      const label = t.dataset["feature"] ?? t.getAttribute("aria-label") ?? t.textContent?.trim().slice(0, 40) ?? t.tagName;
      if (!detect({ key: `${p}|${label}`, at: Date.now() })) return;
      const f = featureForPath(p);
      const feature = t.dataset["feature"] ?? f.feature;
      useProactive.getState().emit({ type: "rage_click", path: p, feature, intent: f.intent, at: Date.now() });
    };
    el.addEventListener("click", onClick, true);
    return () => el.removeEventListener("click", onClick, true);
  }, [root]);
}
