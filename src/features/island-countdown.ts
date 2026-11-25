/** Compact approximate countdown; the expanded island retains the exact timer. */
export function islandRelativeTime(totalSeconds: number): string {
  const remaining = Math.max(0, totalSeconds);
  if (remaining > 12 * 3600) {
    const days = Math.ceil(remaining / 86400);
    return `in ${days} ${days === 1 ? 'day' : 'days'}`;
  }
  if (remaining >= 3600) return `in ${Math.ceil(remaining / 3600)} hr`;
  return `in ${Math.ceil(remaining / 60)} min`;
}
