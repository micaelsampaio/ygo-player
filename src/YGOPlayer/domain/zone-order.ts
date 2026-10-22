/**
 * The zone a card auto-places in: the lowest-numbered one ("M-1" before "M-2", "M2-1" for
 * player 2), and a Main Monster Zone before an Extra Monster Zone.
 */
export function leftmostZone<T extends { zone: string }>(zones: T[]): T {
  const rank = (zone: string) => {
    const index = Number(zone.match(/(\d+)$/)?.[1] ?? 0);
    return (zone.startsWith("EMZ") ? 100 : 0) + index;
  };
  return [...zones].sort((a, b) => rank(a.zone) - rank(b.zone))[0];
}
