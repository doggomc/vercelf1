// The complete history UI is deferred until the graphs are near the viewport.
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T | null;
const set = (id: string, text: string) => { const node = $(id); if (node) node.textContent = text; };
const retry = $('progressionRetry') as HTMLButtonElement | null;
let progressionPending = false;
let progressionLastLoaded = 0;
async function updateProgression(): Promise<void> {
  if (progressionPending) return;
  progressionPending = true;
  if (retry) retry.hidden = true;
  try {
    const [{ loadProgression }, { renderProgression }] = await Promise.all([import('../features/standings-progression'), import('../features/progression-chart')]);
    renderProgression(await loadProgression());
    progressionLastLoaded = Date.now();
  } catch {
    for (const type of ['drivers', 'constructors']) {
      const el = $(`${type}Progression`);
      if (el) el.textContent = 'Points progression is unavailable or awaiting matching official results. Please try again later.';
      set(`${type}ProgressionRound`, '');
    }
    if (retry) retry.hidden = false;
  } finally { progressionPending = false; }
}
retry?.addEventListener('click', () => void updateProgression());
window.addEventListener('focus', () => { if (Date.now() - progressionLastLoaded > 15 * 60_000) void updateProgression(); });
// Avoid background polling when the page or charts are out of view.
window.setInterval(() => {
  const chart = $('standingsProgression');
  const rect = chart?.getBoundingClientRect();
  if (!document.hidden && rect && rect.bottom > 0 && rect.top < window.innerHeight && Date.now() - progressionLastLoaded >= 15 * 60_000) void updateProgression();
}, 15 * 60_000);
void updateProgression();
export {};
