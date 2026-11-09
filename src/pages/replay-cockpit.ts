import { initShell } from '../ui/shell';
import '../viewer-counter';
import { fetchWeekends, safeSource, seriesNames, weekendTitle, type Weekend, type Event, type Session } from '../lib/replays-feed';
initShell({ nav:false, transitions:false });
const $ = (id:string) => document.getElementById(id)!;
let weekends: Weekend[]=[]; let event: Event | undefined; let session: Session | undefined; let sourceIndex=0;
const params=new URLSearchParams(location.search);
function display() {
  if(!event||!session)return;
  const sources=session.replay.sources.filter(s=>safeSource(s.url)); if(sourceIndex>=sources.length)sourceIndex=0;
  const source=sources[sourceIndex]; const url=source&&safeSource(source.url);
  const weekend=weekends.find(w=>w.events.some(e=>e.id===event!.id));
  $('watchSessionTitle').textContent=`${weekend ? weekendTitle(weekend) : event.title} · ${session.name}`;
  $('watchSessionCountdown').textContent=seriesNames[event.series]; $('watchSessionMeta').textContent=`${event.season} · ${event.circuit}`;
  $('loader').hidden=true; $('noStream').style.display='none';
  $('stageBox').querySelector('iframe')?.remove();
  if(url){const frame=document.createElement('iframe');frame.src=url;frame.title=`${event.country} Grand Prix ${session.name}`;frame.allow='autoplay; fullscreen; picture-in-picture; encrypted-media';frame.allowFullscreen=true;frame.referrerPolicy='origin';frame.className='is-ready';$('stageBox').append(frame);}
  const controls=$('replayControls');controls.replaceChildren();
  const makeGroup=(title:string)=>{const div=document.createElement('div');const h=document.createElement('h2');h.textContent=title;const buttons=document.createElement('div');buttons.className='replay-buttons';div.append(h,buttons);controls.append(div);return buttons;};
  const feeds=makeGroup('Broadcast feed');sources.forEach((s,i)=>{const b=document.createElement('button');b.type='button';b.textContent=/f1\s*tv/i.test(s.label)?'F1 TV':i===0?'International Feed':`Feed ${i+1}`;b.setAttribute('aria-pressed',String(i===sourceIndex));b.onclick=()=>{sourceIndex=i;display();};feeds.append(b);});
  const w=weekends.find(w=>w.events.some(e=>e.id===event!.id));
  for(const e of w?.events||[]){const buttons=makeGroup(`${seriesNames[e.series]} sessions`);for(const s of e.sessions){const b=document.createElement('button');b.type='button';b.textContent=s.name;b.setAttribute('aria-pressed',String(e.id===event!.id&&s.key===session!.key));b.onclick=()=>{event=e;session=s;sourceIndex=0;history.replaceState(null,'',`?${new URLSearchParams({e:e.id,s:s.key})}`);display();};buttons.append(b);}}
}
$('reloadFeedBtn').addEventListener('click',display);
$('nsRetryBtn').addEventListener('click',()=>location.reload());
fetchWeekends().then(data=>{weekends=data;event=data.flatMap(w=>w.events).find(e=>e.id===params.get('e'));session=event?.sessions.find(s=>s.key===params.get('s'));if(!event||!session)throw Error('Not found');display();}).catch(()=>{$('loader').hidden=true;$('noStream').style.display='';$('noStreamTitle').textContent='Replay unavailable';$('noStreamText').textContent='This session could not be loaded. Return to replays or try again.';});
