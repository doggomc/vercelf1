import { schedule } from '../data/schedule';
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
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' || u.username || u.password || u.port || u.hash) return null;
    if (u.hostname === 'ok.ru' && /^\/videoembed\/\d{1,30}$/.test(u.pathname)) {
      const clean = new URL(`https://ok.ru${u.pathname}`);
      clean.searchParams.set('nochat', '1');
      return clean.href;
    }
    if (u.hostname === 'weellz.live' && u.pathname === '/replay' && /^[\w-]+$/.test(u.searchParams.get('id') || '')) return u.href;
    return null;
  } catch { return null; }
}

type FullRacesItem = {slug: string; season: number; session: string; sessionKey: string; event: string; date: string | null; players: {provider:string;url:string}[]};
const SESSIONS: Record<string, [string,string]> = {
  '1st-practice':['fp1','Practice 1'], '2nd-practice':['fp2','Practice 2'], '3rd-practice':['fp3','Practice 3'],
  'practice-1':['fp1','Practice 1'], 'practice-2':['fp2','Practice 2'], 'practice-3':['fp3','Practice 3'],
  'sprint-qualifying':['sprint-qualifying','Sprint Qualifying'], 'sprint-shootout':['sprint-qualifying','Sprint Qualifying'],
  sprint:['sprint','Sprint'], qualifying:['qualifying','Qualifying'], race:['race','Race'],
};
const EVENTS_2025: Array<[string,string,string,string]> = [
  ['australia','Australian','Albert Park','Australia'],['china','Chinese','Shanghai','China'],['japan','Japanese','Suzuka','Japan'],['bahrain','Bahrain','Sakhir','Bahrain'],['saudi','Saudi Arabian','Jeddah','Saudi Arabia'],['miami','Miami','Miami','United States'],['emilia','Emilia Romagna','Imola','Italy'],['monaco','Monaco','Monaco','Monaco'],['spain','Spanish','Barcelona','Spain'],['canad','Canadian','Montreal','Canada'],['austria','Austrian','Spielberg','Austria'],['brit','British','Silverstone','United Kingdom'],['belgi','Belgian','Spa','Belgium'],['hungar','Hungarian','Budapest','Hungary'],['dutch','Dutch','Zandvoort','Netherlands'],['ital','Italian','Monza','Italy'],['azerbaijan','Azerbaijan','Baku','Azerbaijan'],['singapore','Singapore','Singapore','Singapore'],['united states','United States','Austin','United States'],['mexico','Mexico City','Mexico City','Mexico'],['sao paulo','São Paulo','Interlagos','Brazil'],['las vegas','Las Vegas','Las Vegas','United States'],['qatar','Qatar','Lusail','Qatar'],['abu dhabi','Abu Dhabi','Yas Marina','United Arab Emirates'],
];
/** Convert the committed FullRaces index to the existing replay cockpit model. */
export function fullRacesEvents(items: FullRacesItem[]): Event[] {
  const events = new Map<string, Event>();
  for (const item of items) {
    if (!item || !SESSIONS[item.sessionKey] || !Array.isArray(item.players) || !/^[a-z0-9-]{5,180}$/.test(item.slug)) continue;
    const players = item.players.flatMap(p => { const url = safeSource(p?.url); return url && new URL(url).hostname === 'ok.ru' ? [{label:String(p.provider || 'OK.ru').slice(0,80),url}] : []; });
    if (!players.length || !item.date) continue;
    let round = 0, title = item.event, circuit = '', country = '';
    if (item.season === 2026) {
      const time = Date.parse(item.date + 'T12:00:00Z');
      const choices = schedule.map(e => ({e, delta:Math.abs(time - (e.sessions.find(s => s.slug === 'race')?.ts || 0))})).sort((a,b) => a.delta-b.delta);
      if (!Number.isFinite(time) || !choices[0] || choices[0].delta > 5*86400000) continue;
      const e = choices[0].e; round = e.round; circuit = e.locality; country = e.country === 'USA' ? 'United States' : e.country === 'UK' ? 'United Kingdom' : e.country === 'UAE' ? 'United Arab Emirates' : e.country;
    } else if (item.season === 2025) {
      const name = item.event.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
      const index = EVENTS_2025.findIndex(([match]) => name.includes(match));
      if (index < 0) continue;
      round = index + 1; circuit = EVENTS_2025[index][2]; country = EVENTS_2025[index][3];
    } else continue;
    if (!title) continue;
    const id = `fullraces-${item.season}-${round}`, [key, name] = SESSIONS[item.sessionKey];
    if (!events.has(id)) events.set(id,{id,title,series:'f1',season:item.season,round,circuit,country,sessions:[]});
    const event = events.get(id)!;
    const previous = event.sessions.find(s => s.key === key);
    if (previous) { for (const p of players) if (!previous.replay.sources.some(x => x.url === p.url)) previous.replay.sources.push(p); }
    else event.sessions.push({key,name,startsAt:item.date,replay:{id:item.slug,publishedAt:item.date,sources:players}});
  }
  const rank = ['fp1','fp2','fp3','sprint-qualifying','sprint','qualifying','race'];
  for (const event of events.values()) event.sessions.sort((a,b) => rank.indexOf(a.key)-rank.indexOf(b.key));
  return [...events.values()];
}
export async function fetchWeekends(signal?: AbortSignal): Promise<Weekend[]> {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  const { default: data } = await import('../data/replays.json');
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  const weekends = groupWeekends(fullRacesEvents(data.items as FullRacesItem[]));
  if (!weekends.length) throw new Error('FullRaces index unavailable');
  return weekends;
}
export function replayHref(event: Event, session: Session): string {
  return `/replay-cockpit?${new URLSearchParams({ e:event.id, s:session.key })}`;
}
