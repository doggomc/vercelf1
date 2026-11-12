/** Only the production main hostname redirects, and only on a fresh live snapshot. */
export function failoverDestination(hostname: string, active: boolean, pathname: string, search = '', hash = ''): string | null {
  if (hostname.toLowerCase() !== 'freef1-live.vercel.app' || !active) return null;
  return `https://freef1-backup.vercel.app${pathname.startsWith('/') ? pathname : '/'}${search}${hash}`;
}
export function applyFailover(active: boolean): boolean {
  if (typeof location === 'undefined') return false;
  const target = failoverDestination(location.hostname, active, location.pathname, location.search, location.hash);
  if (!target) return false;
  location.replace(target);
  return true;
}
