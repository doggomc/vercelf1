/* Completed F1 Drivers' Championships through the end of 2025. Unknown future
   entrants remain unavailable rather than being incorrectly reported as zero. */
const WORLD_TITLES_2025: Record<string, number> = {
  hamilton: 7, max_verstappen: 4, alonso: 2, norris: 1,
  antonelli: 0, russell: 0, leclerc: 0, piastri: 0, hadjar: 0, lawson: 0,
  gasly: 0, arvid_lindblad: 0, colapinto: 0, bearman: 0, bortoleto: 0,
  hulkenberg: 0, ocon: 0, sainz: 0, albon: 0, tsunoda: 0, ryo_hirakawa: 0,
  stroll: 0, bottas: 0, perez: 0, rafael_camara: 0,
};
export function driverWorldTitles(driverId: string): number | null {
  return Object.hasOwn(WORLD_TITLES_2025, driverId) ? WORLD_TITLES_2025[driverId] : null;
}
