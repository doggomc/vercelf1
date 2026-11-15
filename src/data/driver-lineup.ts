/* Confirmed São Paulo 2026 entry, not a prediction for later weekends.
   A season standings list includes substitutes and former drivers, so it is not
   a reliable current-lineup source. Keep historical entries in that list. */
export const HAAS_SAO_PAULO_2026 = ['bearman', 'rafael_camara'] as const;
export type HaasSeasonRole = 'brazil-entry' | 'former' | 'mexico-stand-in' | null;
export function haasSeasonRole(driverId: string): HaasSeasonRole {
  if ((HAAS_SAO_PAULO_2026 as readonly string[]).includes(driverId)) return 'brazil-entry';
  if (driverId === 'ocon') return 'former';
  if (driverId === 'ryo_hirakawa' || driverId === 'hirakawa') return 'mexico-stand-in';
  return null;
}
export function haasBrazilLineup<T extends { Driver: { driverId: string } }>(rows: T[]): T[] {
  return HAAS_SAO_PAULO_2026.flatMap(id => {
    const row = rows.find(item => item.Driver.driverId === id);
    return row ? [row] : [];
  });
}
