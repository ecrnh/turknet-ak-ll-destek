import { useEffect, useRef } from "react";
import { useAppStore } from "@/features/core/appStore";

export type EventName = "feature_opened" | "flow_completed" | "flow_abandoned" | "flow_started" | "cta_clicked";

export function track(name: EventName, feature: string, props?: Record<string, string | number | boolean>) {
  console.info(`[analytics] ${name}`, { feature, ...props });
  useAppStore.getState().logEvent({ name, feature, props });
}

/**
 * Tracks feature_opened on mount and flow_abandoned on unmount unless complete() was called.
 */
export function useFlow(feature: string) {
  const done = useRef(false);
  useEffect(() => {
    done.current = false;
    track("feature_opened", feature);
    return () => {
      if (!done.current) track("flow_abandoned", feature);
    };
  }, [feature]);
  return {
    complete: (props?: Record<string, string | number | boolean>) => {
      if (done.current) return;
      done.current = true;
      track("flow_completed", feature, props);
    },
  };
}
