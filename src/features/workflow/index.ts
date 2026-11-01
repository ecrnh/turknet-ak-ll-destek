/**
 * Public entry for the workflow platform. Importing this module registers every
 * service's decision handlers and queued operations with the engine.
 */
export * from "./engine";
export * from "./services/connectivity";
export * from "./services/migration";
export * from "./services/billing";
export * from "./services/aiUsta";
export * from "./services/proactive";
export * from "./services/hybrid";
export { useWorkflowStore } from "./store";

import { getWf } from "./engine";
import { recheckRelocation } from "./services/migration";

/** Customer-facing "Yeniden kontrol et" for any workflow waiting on an external system. */
export function recheck(id: string) {
  const wf = getWf(id);
  if (wf?.type === "relocation") recheckRelocation(id);
}
