/** Accept only published provider player variants, never arbitrary URLs from metadata. */
export function validSdUrl(provider: string, hdUrl: string, candidate: unknown): string {
  if (typeof candidate !== 'string') return '';
  try {
    const hd = new URL(hdUrl), sd = new URL(candidate);
    if (hd.protocol !== 'https:' || hd.username || hd.password || hd.port || sd.protocol !== 'https:' || sd.username || sd.password || sd.port || sd.search || sd.hash || hd.search || hd.hash || hd.hostname !== sd.hostname) return '';
    if (provider === 'ppv' && hd.hostname === 'taifood-blog.asia' && /^\/embed\/[A-Za-z0-9/_-]+$/.test(hd.pathname) && sd.pathname === `${hd.pathname}_540p`) return sd.href;
    if (provider === 'embdlol' && hd.hostname === 'embdlol.st' && /^\/embed\/[A-Za-z0-9_-]{1,100}$/.test(hd.pathname) && /^\/embed\/[A-Za-z0-9_-]{1,100}$/.test(sd.pathname) && hd.pathname !== sd.pathname) return sd.href;
  } catch { /* Ignore malformed addresses. */ }
  return '';
}
