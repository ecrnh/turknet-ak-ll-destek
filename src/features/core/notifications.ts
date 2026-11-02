import type { AppNotification } from "./appStore";

/**
 * Smart notifications: a new update about the same process replaces the previous
 * unread one instead of stacking up, and remembers how many updates it combines.
 * Notifications without a target (`to`) are never merged.
 */
export function mergeNotification(list: AppNotification[], item: AppNotification): AppNotification[] {
  if (!item.to) return [item, ...list];
  const prev = list.find((n) => !n.read && n.to === item.to && n.kind === item.kind);
  if (!prev) return [item, ...list];
  const merged: AppNotification = { ...item, id: prev.id, count: (prev.count ?? 1) + 1 };
  return [merged, ...list.filter((n) => n.id !== prev.id)];
}

/** Whether a notification of this kind may appear as a phone push. */
export function pushAllowed(kind: AppNotification["kind"], prefs: { push: boolean; campaignPush?: boolean }): boolean {
  if (!prefs.push) return false;
  if (kind === "campaign") return prefs.campaignPush !== false;
  return true;
}
