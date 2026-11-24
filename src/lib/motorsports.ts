import { buildPrivateCockpitHref, buildWeeloUrls, type OtherStreamItem } from './other-streams';
export type MotorFeed = { name:string; language:string; opens:number|null; href:string; url:string };
export type MotorEvent = {id:string; series:string; seriesKey:string; weekend:string; session:string; start:number; end:number|null; state:'live'|'upcoming'|'finished'; feeds:MotorFeed[]};
const str=(v:unknown,max:number)=>typeof v==='string'?v.trim().slice(0,max):'';
const cleanId=(v:unknown)=>typeof v==='string' && /^[A-Za-z0-9_-]{1,100}$/.test(v)?v:'';
const isF1=(series:any)=>String(series?.key || '').toLowerCase()==='f1' || /^(?:f1|formula\s*1)$/i.test(str(series?.name,80));
function root(payload:any, field:string): any[] {
  if (!payload || payload.api!=='racinglap' || payload.version!==1 || !Array.isArray(payload[field]) || payload[field].length>2000) throw new Error(`Invalid RacingLap ${field} catalogue`);
  return payload[field];
}
/** API event ids join schedule rows to channels. Never fetch the provider page or relay video. */
export function parseMotorsports(schedule:unknown, streams:unknown): MotorEvent[] {
  const events=root(schedule,'events'), streamEvents=streams ? root(streams,'events') : [];
  const byId=new Map<string,any>();
  for (const e of streamEvents) if (e && cleanId(e.id) && typeof e.series?.key==='string' && e.series.key && !isF1(e.series) && ['live','upcoming'].includes(e.state) && Array.isArray(e.channels)) byId.set(e.id,e);
  const result:MotorEvent[]=[]; const seen=new Set<string>();
  for (const e of events) {
    const id=cleanId(e?.id), key=str(e?.series?.key,50), series=str(e?.series?.name,80), weekend=str(e?.weekend,120), session=str(e?.session,120);
    const start=Date.parse(e?.start), parsedEnd=Date.parse(e?.end); const end=Number.isFinite(parsedEnd)?parsedEnd:null;
    if (!id || seen.has(id) || !key || !series || isF1(e.series) || !session || !Number.isFinite(start) || !['live','upcoming','finished'].includes(e.state)) continue;
    seen.add(id);
    const stream=byId.get(id); const feeds:MotorFeed[]=[];
    if (stream && stream.series.key.toLowerCase()===key.toLowerCase() && e.state!=='finished') {
      const urls=new Set<string>();
      for (const ch of stream.channels.slice(0,50)) {
        if (!ch || typeof ch.embed!=='string') continue;
        let parsed:URL; try { parsed=new URL(ch.embed); } catch { continue; }
        const streamId=parsed.searchParams.get('stream') || '', direct=buildWeeloUrls(streamId);
        if (!direct || ch.embed!==direct.embedUrl || parsed.hash || parsed.searchParams.getAll('stream').length!==1 || [...parsed.searchParams.keys()].some(k=>k!=='stream') || urls.has(ch.embed)) continue;
        urls.add(ch.embed);
        const name=str(ch.name,80)||'Main feed', lang=str(ch.language,8).toUpperCase();
        const opensAt=Date.parse(ch.opens); const opens=Number.isFinite(opensAt)?opensAt:null;
        const item:OtherStreamItem={key:`weelo:${id}:${streamId}`,provider:'weelo',id:streamId,title:`${session} · ${name}`,category:series,subtitle:[series,weekend,lang].filter(Boolean).join(' · '),tag:lang||'RacingLap',viewers:0,alwaysLive:false,startAt:start,status:e.state==='live'?'live':'scheduled',embedUrl:ch.embed,fallbackUrl:ch.embed,color:'#E10600'};
        feeds.push({name,language:lang,opens,href:buildPrivateCockpitHref(item),url:ch.embed});
      }
    }
    result.push({id,series,seriesKey:key,weekend,session,start,end,state:e.state,feeds});
  }
  return result.sort((a,b)=>a.start-b.start);
}
export function countdownText(event:MotorEvent, now:number):string {
  if (event.state==='live') return 'LIVE NOW';
  if (event.state==='finished') return 'FINISHED';
  const seconds=Math.floor((event.start-now)/1000);
  if (seconds<=0) return 'AWAITING LIVE STATUS';
  const days=Math.floor(seconds/86400), hours=Math.floor(seconds/3600)%24, minutes=Math.floor(seconds/60)%60, sec=seconds%60;
  const pad=(x:number)=>String(x).padStart(2,'0');
  return `IN ${days ? `${days}D ` : ''}${pad(hours)}:${pad(minutes)}:${pad(sec)}`;
}
