/** Cosmetic only: never changes, proxies or delays the provider player. */
export function isRacingLapDirect(source: {autoProvider?: string; weelo?: string; stripped?: boolean} | undefined, url: string): boolean {
  if (!source || source.stripped || !(source.autoProvider === 'weelo' || source.weelo)) return false;
  try { const u = new URL(url); return u.protocol === 'https:' && u.hostname === 'weellz.live' && !u.username && !u.password && !u.port && ['/beta', '/at'].includes(u.pathname); }
  catch { return false; }
}

export function isRacingLapReplay(url: string): boolean {
  try { const u=new URL(url); return u.protocol==='https:' && u.hostname==='weellz.live' && !u.username && !u.password && !u.port && u.pathname==='/replay'; } catch { return false; }
}

const artwork = `<svg class="racinglap-intro-logo" role="img" aria-label="RacingLap" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 232 72.8" ><g transform="translate(16 -0.2)"><path d="M25.53 32.11V40H20.9V33.17L18.86 30.89H11.45V40H6.83V16.2H21.75L25.39 19.87V27.08L23.08 29.43ZM11.45 27.08H19.65L20.84 25.89V21.27L19.65 20.08H11.45ZM36.94 16.2H41.16L49.86 40H45.17L43.23 34.73H34.87L32.93 40H28.24ZM42.21 30.92 39.05 21.88H38.98L35.92 30.92ZM51.89 36.09V20.11L55.8 16.2H67.43L71.27 20.04V23.68H66.65V21.74L65.05 20.14H58.25L56.52 21.88V34.32L58.25 36.06H65.05L66.65 34.46V32.52H71.27V36.16L67.43 40H55.8ZM75.17 16.2H79.8V40H75.17ZM84.89 16.2H89.03L99.64 32.35H99.71V16.2H104.16V40H100.02L89.41 23.88H89.34V40H84.89ZM108.75 36.09V20.11L112.66 16.2H124.49L128.33 20.04V23.68H123.7V21.74L122.11 20.14H115.1L113.37 21.88V34.32L115.1 36.06H122.17L123.84 34.39V30.68H118.74V26.74H128.33V36.09L124.42 40H112.66ZM132.57 16.2H137.19V36.09H149.09V40H132.57ZM158.81 16.2H163.02L171.73 40H167.04L165.1 34.73H156.73L154.8 40H150.1ZM164.08 30.92 160.92 21.88H160.85L157.79 30.92ZM174.61 16.2H189.53L193.17 19.87V28.2L189.5 31.91H179.23V40H174.61ZM187.43 28.03 188.62 26.84V21.27L187.43 20.08H179.23V28.03Z" fill="#FFFFFF"/><rect x="0" y="50" width="64" height="7" rx="2" fill="#B24BF3"/><rect x="68" y="50" width="64" height="7" rx="2" fill="#22D36B"/><rect x="136" y="50" width="64" height="7" rx="2" fill="#FFD600"/></g></svg><p class="racinglap-intro-powered">Powered by <strong>RacingLap</strong></p>`;
export function clearRacingLapIntro(stage: Element | null | undefined): void {
  stage?.querySelector('.racinglap-intro')?.remove();
}
export function playRacingLapIntro(stage: Element | null | undefined): void {
  if (!stage) return;
  clearRacingLapIntro(stage);
  const overlay=document.createElement('div');
  overlay.className='racinglap-intro'; overlay.setAttribute('aria-hidden','true');
  const brand=document.createElement('div'); brand.className='racinglap-intro-brand'; brand.innerHTML=artwork;
  overlay.append(brand); stage.append(overlay);
  overlay.addEventListener('animationend', event=>{ if (event.target === overlay && event.animationName === 'racinglap-intro-out') overlay.remove(); });
  window.setTimeout(()=>overlay.remove(),4500);
}
