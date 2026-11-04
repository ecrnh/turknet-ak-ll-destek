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

/** How many pushes the presenter's locked phone keeps on its lock screen. */
export const LOCK_SCREEN_MAX = 6;

/**
 * Lock screen of the presenter's second (locked) phone: every delivered push lands
 * here, newest first. A merged update (same id) replaces its older card.
 */
export function addToLockScreen(list: AppNotification[], item: AppNotification, max = LOCK_SCREEN_MAX): AppNotification[] {
  return [item, ...list.filter((n) => n.id !== item.id)].slice(0, max);
}

/** Whether a notification of this kind may appear as a phone push. */
export function pushAllowed(kind: AppNotification["kind"], prefs: { push: boolean; campaignPush?: boolean }): boolean {
  if (!prefs.push) return false;
  if (kind === "campaign") return prefs.campaignPush !== false;
  return true;
}
