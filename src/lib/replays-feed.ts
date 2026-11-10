export type Series = 'f1' | 'f2' | 'f3' | 'supercup' | 'general';
export type Session = { key: string; name: string; startsAt: string; replay: { id: string; publishedAt: string; sources: { label: string; url: string }[] } };
export type Event = { id: string; title: string; series: Series; season: number; round: number; circuit: string; country: string; sessions: Session[] };
export type Weekend = { season: number; round: number; circuit: string; country: string; events: Event[] };
export const seriesNames: Record<Series, string> = { f1: 'F1', f2: 'F2', f3: 'F3', supercup: 'Supercup', general: 'F1 Academy' };
const flags: Record<string, string> = { Brazil:'br', Mexico:'mx', 'United States':'us', Singapore:'sg', Malaysia:'my', Azerbaijan:'az', Spain:'es', Italy:'it', Australia:'au', China:'cn', Japan:'jp', Bahrain:'bh', 'Saudi Arabia':'sa', Monaco:'mc', Canada:'ca', Austria:'at', 'United Kingdom':'gb', Belgium:'be', Hungary:'hu', Netherlands:'nl', Qatar:'qa', 'United Arab Emirates':'ae' };
export function weekendTitle(w: Weekend): string {
  const preferred = w.events.find(e => e.series === 'f1') || w.events[0];
  return preferred?.title?.replace(/^(?:Formula [123]|F1 Academy|Porsche Supercup)\s+/i, '') || `${w.country} Grand Prix`;
}
export const flagFor = (country: string): string => flags[country] || '';
export function groupWeekends(events: Event[]): Weekend[] {
  const groups = new Map<string, Weekend>();
  for (const e of events) {
    if (!e || !seriesNames[e.series] || !Number.isFinite(e.season) || !Number.isFinite(e.round) || !Array.isArray(e.sessions)) continue;
    const sessions = e.sessions.filter(s => s && typeof s.key === 'string' && typeof s.name === 'string' && s.replay && Array.isArray(s.replay.sources) && s.replay.sources.some(source => safeSource(source.url)));
    if (!sessions.length) continue;
    const key = `${e.season}:${e.round}:${String(e.circuit).toLowerCase()}`;
    if (!groups.has(key)) groups.set(key, { season:e.season, round:e.round, circuit:e.circuit, country:e.country, events:[] });
    groups.get(key)!.events.push({ ...e, sessions });
  }
  return [...groups.values()].sort((a,b) => b.season-a.season || b.round-a.round);
}
export function safeSource(url: string): string | null {
  try { const u = new URL(url); return u.protocol === 'https:' && u.hostname === 'weellz.live' && u.pathname === '/replay' && /^[\w-]+$/.test(u.searchParams.get('id') || '') ? u.href : null; } catch { return null; }
}
export async function fetchWeekends(signal?: AbortSignal): Promise<Weekend[]> {
  const response = await fetch('https://weelo.live/feed/replays.json', { cache:'no-store', signal });
  if (!response.ok) throw new Error('Replay feed unavailable');
  const data = await response.json();
  if (!Array.isArray(data.events)) throw new Error('Invalid replay feed');
  return groupWeekends(data.events);
}
export function replayHref(event: Event, session: Session): string {
  return `/replay-cockpit?${new URLSearchParams({ e:event.id, s:session.key })}`;
}
