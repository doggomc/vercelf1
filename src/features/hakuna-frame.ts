/** The provider page has a player fixed at 500 CSS pixels high. */
export function isHakunaCleanPlayer(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    return url.protocol === 'https:' && url.hostname === 'hakunamatata5.org' && url.pathname === '/sky-main-event/clean.html';
  } catch { return false; }
}

export function fitHakunaFrame(width: number, height: number): { width: number; scale: number } | null {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  const scale = height / 500;
  return { width: width / scale, scale };
}
