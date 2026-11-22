import { OPENF1_API } from '../config';
import { compactTeamLogos } from './compact-team-logos';
import { F1SignalRClient, snapshotFromF1State, snapshotFromOpenF1, type TimingSnapshot, type OpenF1Session, type OpenF1Bundle } from '../pages/live-timing-feed';

export function teamLogo(team: unknown): string {
  const n=String(team || '').toLowerCase().replace(/[^a-z0-9]/g,'');
  const slug = n.includes('racingbull') || n === 'rbf1team' ? 'racingbulls'
    : n.includes('redbull') ? 'redbullracing'
    : n.includes('astonmartin') ? 'astonmartin'
    : n.includes('haas') ? 'haasf1team'
    : n.includes('audi') || n.includes('sauber') ? 'audi'
    : n.includes('alpine') ? 'alpine'
    : n.includes('cadillac') ? 'cadillac'
    : n.includes('mclaren') ? 'mclaren'
    : n.includes('mercedes') ? 'mercedes'
    : n.includes('ferrari') ? 'ferrari'
    : n.includes('williams') ? 'williams' : '';
  return compactTeamLogos[slug] || '';
}

export function renderCompactTiming(snapshot: TimingSnapshot, tbody: HTMLElement): void {
  const fragment=document.createDocumentFragment();
  for (const row of snapshot.rows) {
    const tr=document.createElement('tr');
    const pos=document.createElement('td'); pos.textContent=row.pos || '—';
    const driver=document.createElement('td');
    const box=document.createElement('div'); box.className='compact-timing-driver';
    box.style.setProperty('--team-color', /^#[0-9a-f]{6}$/i.test(row.teamColor) ? row.teamColor : '#888888');
    const logo=teamLogo(row.teamName); if (logo) { const img=document.createElement('img'); img.src=logo; img.alt=''; box.append(img); }
    const name=document.createElement('span'); name.textContent=row.lastName || row.tla || row.num; name.title=row.fullName || name.textContent; box.append(name); driver.append(box);
    const tyre=document.createElement('td'); tyre.className='compact-timing-tyre-cell';
    if (row.tyre?.code && /^[SMHIW]$/.test(row.tyre.code)) { const t=document.createElement('span');t.className='compact-timing-tyre';t.dataset.tyre=row.tyre.code;t.textContent=row.tyre.code;t.title=`${({S:'Soft',M:'Medium',H:'Hard',I:'Intermediate',W:'Wet'} as Record<string,string>)[row.tyre.code]}${row.tyre.age ? ` · ${row.tyre.age} laps` : ''}`;tyre.append(t); } else tyre.textContent='—';
    const gap=document.createElement('td');gap.className='compact-timing-gap';gap.textContent=row.cells[snapshot.isRace ? 0 : 1]?.text || (row.pos==='1' ? 'Leader' : '—');
    tr.append(pos,driver,tyre,gap);fragment.append(tr);
  }
  tbody.replaceChildren(fragment);
}

export function createCompactTiming() {
  const rows=document.getElementById('compactTimingRows');
  const status=document.getElementById('compactTimingStatus');
  let client: F1SignalRClient | null=null, active=false, generation=0, timer: number | undefined, fallbackTimer: number | undefined;
  let abort: AbortController | null=null, signalHasRows=false;
  function paint(snap:TimingSnapshot, label?:string) {
    if (!active || !rows || !status || !snap.rows.length) return;
    renderCompactTiming(snap,rows);
    status.textContent=label || snap.statusText;
  }
  async function fallback(run:number) {
    if (!active || run!==generation || document.hidden || signalHasRows) return;
    abort?.abort(); const controller=new AbortController();abort=controller;
    const get=async (path:string, params:Record<string,string|number>)=>{
      const url=`${OPENF1_API}/${path}?${new URLSearchParams(Object.entries(params).map(([k,v])=>[k,String(v)]))}`;
      const response=await fetch(url,{signal:controller.signal}); if (!response.ok) throw Error('Timing unavailable');
      const result=await response.json();return Array.isArray(result) ? result : [];
    };
    try {
      const sessions=await get('sessions',{session_key:'latest'}); const session=sessions[0] as OpenF1Session | undefined;
      if (!session || !active || run!==generation || signalHasRows) return;
      const q={session_key:session.session_key};
      const [drivers,results,laps,stints,positions,intervals]=await Promise.all(['drivers','session_result','laps','stints','position','intervals'].map(path=>get(path,q).catch(()=>[])));
      if (!active || run!==generation || signalHasRows) return;
      const bundle:OpenF1Bundle={session,drivers,results,laps,stints,positions,intervals,weather:[],raceControl:[],radio:[]};
      const snap=snapshotFromOpenF1(bundle);
      if (snap.rows.length) paint(snap,results.length ? snap.statusText : `Latest timing · ${session.session_name}`);
      else if (status) status.textContent='Timing data unavailable right now.';
      if (snap.isLive) timer=window.setTimeout(()=>fallback(run),30000);
    } catch {
      if (active && run===generation && !signalHasRows && status) status.textContent='Timing unavailable. Try again later.';
    }
  }
  function onVisibility() {
    if (active && !document.hidden && !signalHasRows) { clearTimeout(fallbackTimer); fallbackTimer=window.setTimeout(()=>fallback(generation),1000); }
  }
  function open() {
    if (active) return; active=true; signalHasRows=false; const run=++generation;
    document.addEventListener('visibilitychange',onVisibility);
    if (status) status.textContent='Connecting to timing…';
    if (rows) rows.replaceChildren();
    client=new F1SignalRClient();
    client.addEventListener('update',()=>{
      if (!active || run!==generation || !client) return;
      const snap=snapshotFromF1State(client.state);
      if (snap?.rows.length) { signalHasRows=true;abort?.abort();clearTimeout(timer);paint(snap); }
    });
    client.addEventListener('status',(event:Event)=>{
      const state=(event as CustomEvent<string>).detail;
      if (active && run===generation && (state==='closed'||state==='error')) {
        if (signalHasRows && status) status.textContent='Connection interrupted · last available timing';
        signalHasRows=false; clearTimeout(fallbackTimer); fallbackTimer=window.setTimeout(()=>fallback(run),4000);
      }
    });
    client.start(); fallbackTimer=window.setTimeout(()=>fallback(run),4000);
  }
  function close() {
    active=false;++generation;document.removeEventListener('visibilitychange',onVisibility);clearTimeout(timer);clearTimeout(fallbackTimer);abort?.abort();abort=null;client?.close();client=null;
  }
  return {open,close};
}
