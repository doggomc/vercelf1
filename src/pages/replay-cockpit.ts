import '../interaction-guard';
import { initShell } from '../ui/shell';
import { initPageGate } from '../features/page-gate';
import '../viewer-counter';
import { setCounterContext } from '../features/counter-context';
import { mountCockpitViewerCount } from '../features/cockpit-viewers';
import { fetchWeekends, safeSource, seriesNames, weekendTitle, type Weekend, type Event, type Session } from '../lib/replays-feed';
initShell({ nav:false, transitions:false });
mountCockpitViewerCount();
const gateReady = initPageGate();
const $ = (id:string) => document.getElementById(id)!;
// Match the Other Streams player exactly. Only use the unused space to its
// right; on tighter screens the controls remain in the document below it.
const rail = document.querySelector<HTMLElement>('.replay-rail')!;
const player = $('player');
function fitReplayRail() {
  const available = window.innerWidth - player.getBoundingClientRect().right - 28;
  const beside = window.innerWidth > 1100 && available >= 145;
  rail.classList.toggle('is-beside', beside);
  if (beside) rail.style.setProperty('--rail-width', `${Math.min(320, available)}px`);
  else rail.style.removeProperty('--rail-width');
}
window.addEventListener('resize', fitReplayRail);
if ('ResizeObserver' in window) new ResizeObserver(fitReplayRail).observe(player);
fitReplayRail();
let weekends: Weekend[]=[]; let event: Event | undefined; let session: Session | undefined; let sourceIndex=0;
let helpTimer=0;
let sourceJellyModule: Promise<typeof import('../features/source-jelly')> | undefined;
const params=new URLSearchParams(location.search);
function display(animateGroup?: 'session' | 'feed', restoreFocus = false) {
  if (document.getElementById('partialOutageStage')) return;
  if(!event||!session)return;
  const sources=session.replay.sources.filter(s=>safeSource(s.url)); if(sourceIndex>=sources.length)sourceIndex=0;
  const source=sources[sourceIndex]; const url=source&&safeSource(source.url);
  const weekend=weekends.find(w=>w.events.some(e=>e.id===event!.id));
  setCounterContext({ kind:'replay', key:`${event.season}:${event.round}:${event.series}:${session.key}`.replace(/[^a-zA-Z0-9._:-]/g,'_').slice(0,100), label:`${event.season} ${event.title} · ${session.name}`.replace(/[\x00-\x1f<>]/g,'').slice(0,160) });
  $('watchSessionTitle').textContent=`${weekend ? weekendTitle(weekend) : event.title} · ${session.name}`;
  $('watchSessionCountdown').textContent=seriesNames[event.series]; $('watchSessionMeta').textContent=`${event.season} · ${event.circuit}`;
  $('loader').hidden=true; $('noStream').classList.remove('visible');
  window.clearTimeout(helpTimer); $('replayHelp').hidden=true;
  $('stageBox').querySelector('iframe')?.remove();
  if(url){const frame=document.createElement('iframe'); const playerUrl=new URL(url); playerUrl.searchParams.set('autoplay','1'); frame.src=playerUrl.href; frame.loading='eager';frame.title=`${event.country} Grand Prix ${session.name}`;frame.allow='autoplay; fullscreen; picture-in-picture; encrypted-media';frame.allowFullscreen=true;frame.referrerPolicy='origin';frame.className='is-ready';$('stageBox').append(frame); helpTimer=window.setTimeout(()=>{if(frame.isConnected&&!document.getElementById('partialOutageStage')) $('replayHelp').hidden=false;},12000);}
  const controls=$('replayControls');controls.replaceChildren();
  const makeGroup=(title:string)=>{const div=document.createElement('div');const h=document.createElement('h2');h.textContent=title;const buttons=document.createElement('div');buttons.className='replay-buttons';div.append(h,buttons);controls.append(div);return buttons;};
  const w=weekends.find(w=>w.events.some(e=>e.id===event!.id));
  for(const e of w?.events||[]){const buttons=makeGroup(`${seriesNames[e.series]} sessions`);for(const s of e.sessions){const b=document.createElement('button');b.type='button';b.textContent=s.name;b.setAttribute('aria-pressed',String(e.id===event!.id&&s.key===session!.key));b.onclick=(click)=>{event=e;session=s;sourceIndex=0;history.replaceState(null,'',`?${new URLSearchParams({e:e.id,s:s.key})}`);display('session',click.detail===0);};buttons.append(b);}}
  const feeds=makeGroup('Broadcast feed');sources.forEach((s,i)=>{const b=document.createElement('button');b.type='button';b.textContent=/f1\s*tv/i.test(s.label)?'F1 TV':/international feed/i.test(s.label)?'International Feed':s.label?.trim() || `Feed ${i+1}`;b.setAttribute('aria-pressed',String(i===sourceIndex));b.onclick=(click)=>{sourceIndex=i;display('feed',click.detail===0);};feeds.append(b);});
  if (animateGroup) {
    const selected = animateGroup === 'feed' ? feeds.querySelector<HTMLButtonElement>('button[aria-pressed="true"]') : controls.querySelector<HTMLButtonElement>('.replay-buttons button[aria-pressed="true"]');
    if (selected) {
      if (restoreFocus) selected.focus({ preventScroll: true });
      void (sourceJellyModule ??= import('../features/source-jelly')).then(module => module.animateSourceJelly(selected)).catch(() => {});
    }
  }
}
$('reloadFeedBtn').addEventListener('click',()=>display());
$('nsRetryBtn').addEventListener('click',()=>location.reload());
const feedController=new AbortController();
const feedTimeout=window.setTimeout(()=>feedController.abort(),12000);
fetchWeekends(feedController.signal).then(async data=>{weekends=data;event=data.flatMap(w=>w.events).find(e=>e.id===params.get('e'));session=event?.sessions.find(s=>s.key===params.get('s'));if(!event||!session)throw Error('Not found');await gateReady;display();}).catch(()=>{$('loader').hidden=true;$('noStream').classList.add('visible');$('noStreamTitle').textContent='Replay unavailable';$('noStreamText').textContent='This session could not be loaded. Return to replays or try again.';}).finally(()=>window.clearTimeout(feedTimeout));
