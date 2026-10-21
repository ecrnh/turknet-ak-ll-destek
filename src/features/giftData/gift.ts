/** Outage compensation tiers: 6h → 5 GB, 24h → 10 GB, 72h+ → 20 GB. */
export const GIFT_TIERS = [
  { hours: 72, gb: 20 },
  { hours: 24, gb: 10 },
  { hours: 6, gb: 5 },
] as const;

export function giftForOutage(hours: number): number {
  for (const t of GIFT_TIERS) if (hours >= t.hours) return t.gb;
  return 0;
}

/** Clamp a family share so the sender never gives away more than they have left. */
export function clampShare(requested: number, remaining: number): number {
  if (!Number.isFinite(requested) || requested <= 0) return 0;
  return Math.min(Math.round(requested * 10) / 10, Math.max(0, remaining));
}
