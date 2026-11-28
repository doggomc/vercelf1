export function isRacingLapReplay(url: string): boolean {
  try { const u=new URL(url); return u.protocol==='https:' && u.hostname==='weellz.live' && !u.username && !u.password && !u.port && u.pathname==='/replay'; } catch { return false; }
}

