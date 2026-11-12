const MAIN_HOST = 'freef1-live.vercel.app';
const BACKUP_HOST = 'freef1-backup.vercel.app';
const BACKUP_ORIGIN = `https://${BACKUP_HOST}`;

/** Only the production main hostname redirects, and only on a fresh live snapshot. */
export function failoverDestination(hostname: string, active: boolean, pathname: string, search = '', hash = ''): string | null {
  if (hostname.toLowerCase() !== MAIN_HOST || !active) return null;
  const query = new URLSearchParams(search);
  query.set('__ff_handoff', '1');
  return `${BACKUP_ORIGIN}${pathname.startsWith('/') ? pathname : '/'}?${query.toString()}${hash}`;
}

let backupStatus: boolean | null = null;
// A redirected visitor can arrive before the backup backend receives the same
// push. Keep the neutral screen until activation is confirmed rather than flashing stale standby.
const isHandoff = typeof location !== 'undefined' && location.hostname.toLowerCase() === BACKUP_HOST && new URLSearchParams(location.search).get('__ff_handoff') === '1';
let handoffPending = isHandoff;
if (isHandoff && typeof history !== 'undefined') {
  const query = new URLSearchParams(location.search);
  query.delete('__ff_handoff');
  const remaining = query.toString();
  history.replaceState(history.state, '', `${location.pathname}${remaining ? `?${remaining}` : ''}${location.hash}`);
}

function renderBackupGate(status: boolean | null): void {
  if (typeof document === 'undefined' || typeof location === 'undefined' || location.hostname.toLowerCase() !== BACKUP_HOST) return;
  let stage = document.getElementById('backupOfflineStage');
  if (status === true) { handoffPending = false; stage?.remove(); return; }
  if (status === false && handoffPending) status = null;
  if (!document.body) return;
  if (!stage) {
    void import('../styles/outage.css');
    stage = document.createElement('section');
    stage.id = 'backupOfflineStage';
    stage.className = 'outage-stage';
    stage.setAttribute('role', 'region');
    stage.setAttribute('aria-labelledby', 'backupOfflineTitle');
    stage.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#0e0f11;overflow:auto;min-height:100svh;';
    document.body.appendChild(stage);
  }
  stage.innerHTML = status === null
    ? `<div class="outage-card"><h1 class="outage-title" id="backupOfflineTitle">Checking site status…</h1><p class="outage-copy">Connecting to Race Control.</p></div>`
    : `<div class="outage-card"><div class="outage-pill"><span class="outage-dot" aria-hidden="true"></span><span>Backup site · Standby</span></div><h1 class="outage-title" id="backupOfflineTitle">Backup site offline</h1><p class="outage-lead">The main site appears to be online.</p><p class="outage-copy">This backup site is available when Race Control activates it.</p><div class="outage-actions"><a class="outage-btn outage-btn-primary" href="https://freef1-live.vercel.app/">Go to main site</a><a class="outage-btn" href="https://discord.gg/KYXHCAzhN4" target="_blank" rel="noopener noreferrer">Discord</a></div></div>`;
}

export function initializeBackupGate(): void {
  renderBackupGate(backupStatus);
}

// Until fresh status arrives, show a neutral check rather than a false standby notice.
if (typeof document !== 'undefined') {
  if (document.body) initializeBackupGate();
  else document.addEventListener('DOMContentLoaded', initializeBackupGate, { once: true });
}

export function applyFailover(active: boolean): boolean {
  if (typeof location === 'undefined') return false;
  if (location.hostname.toLowerCase() === BACKUP_HOST) {
    backupStatus = active;
    renderBackupGate(active);
  }
  const target = failoverDestination(location.hostname, active, location.pathname, location.search, location.hash);
  if (!target) return false;
  location.replace(target);
  return true;
}
