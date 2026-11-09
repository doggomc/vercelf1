import { initShell } from '../ui/shell';
/* Every page except the cockpit carries the open-page counter in its header. */
import '../viewer-counter';
import { driverCard } from '../lib/driver-card';
import { loadStandings } from './driver-core';


initShell();

const grid = document.getElementById('driverGrid');
const status = document.getElementById('driversStatus');


loadStandings().then(({ rows, round }) => {
  if (grid) {
    grid.innerHTML = rows.map(driverCard).join('');
    grid.removeAttribute('aria-busy');
  }
  if (status) {
    status.textContent = `${rows.length} drivers · after round ${round} of 23 · ordered by championship position`;
  }
}).catch(() => {
  if (grid) grid.removeAttribute('aria-busy');
  if (status) status.textContent = 'Cached grid · standings unavailable.';
});
