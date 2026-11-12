const MAIN_HOST = 'freef1-live.vercel.app';
const BACKUP_HOST = 'freef1-backup.vercel.app';
const BACKUP_ORIGIN = `https://${BACKUP_HOST}`;

/** Only the production main hostname redirects, and only on a fresh live snapshot. */
export function failoverDestination(hostname: string, active: boolean, pathname: string, search = '', hash = ''): string | null {
  if (hostname.toLowerCase() !== MAIN_HOST || !active) return null;
  return `${BACKUP_ORIGIN}${pathname.startsWith('/') ? pathname : '/'}${search}${hash}`;
}

function showBackupOffline(show: boolean): void {
  if (typeof document === 'undefined' || typeof location === 'undefined' || location.hostname.toLowerCase() !== BACKUP_HOST) return;
  let stage = document.getElementById('backupOfflineStage');
  if (!show) { stage?.remove(); return; }
  if (stage || !document.body) return;
  void import('../styles/outage.css');
  stage = document.createElement('section');
  stage.id = 'backupOfflineStage';
  stage.className = 'outage-stage';
  stage.setAttribute('role', 'region');
  stage.setAttribute('aria-labelledby', 'backupOfflineTitle');
  stage.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#0e0f11;overflow:auto;min-height:100svh;';
  stage.innerHTML = `<div class="outage-card"><div class="outage-pill"><span class="outage-dot" aria-hidden="true"></span><span>Backup site · Standby</span></div><h1 class="outage-title" id="backupOfflineTitle">Backup site offline</h1><p class="outage-lead">The main site appears to be online.</p><p class="outage-copy">This backup site is available when Race Control activates it.</p><div class="outage-actions"><a class="outage-btn outage-btn-primary" href="https://freef1-live.vercel.app/">Go to main site</a><a class="outage-btn" href="https://discord.gg/KYXHCAzhN4" target="_blank" rel="noopener noreferrer">Discord</a></div></div>`;
  document.body.appendChild(stage);
}

// The backup starts in standby until it receives a fresh enabled snapshot.
if (typeof document !== 'undefined') {
  if (document.body) showBackupOffline(true);
  else document.addEventListener('DOMContentLoaded', () => showBackupOffline(true), { once: true });
}

export function applyFailover(active: boolean): boolean {
  if (typeof location === 'undefined') return false;
  showBackupOffline(!active);
  const target = failoverDestination(location.hostname, active, location.pathname, location.search, location.hash);
  if (!target) return false;
  location.replace(target);
  return true;
}
