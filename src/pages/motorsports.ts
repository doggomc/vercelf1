import {initShell} from '../ui/shell';
import '../viewer-counter';
import {parseMotorsports,countdownText,type MotorEvent} from '../lib/motorsports';

initShell();
const $=(id:string)=>document.getElementById(id)!;
const scheduleEl=$('msSchedule'), filters=$('msFilters'), summary=$('msSummary'), message=$('msMessage');
const refresh=$('msRefresh') as HTMLButtonElement;
const fmtDay=new Intl.DateTimeFormat(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'});
const fmtTime=new Intl.DateTimeFormat(undefined,{hour:'2-digit',minute:'2-digit'});
const tz=Intl.DateTimeFormat().resolvedOptions().timeZone;
$('msTimezone').textContent=tz ? `LOCAL TIME · ${tz.replace(/_/g,' ')}` : 'TIMES IN YOUR LOCAL TIMEZONE';
let events:MotorEvent[]=[], filter='all', loading=false, streamsAvailable=true, previouslyLoaded=false;
const element=(tag:string, className:string, text?:string)=>{const el=document.createElement(tag);el.className=className;if(text!==undefined)el.textContent=text;return el;};
function showMessage(text:string) { message.textContent=text;message.hidden=!text; }
function renderFilters() {
  const keys=new Map<string,string>(); for(const e of events) if(!keys.has(e.seriesKey)) keys.set(e.seriesKey,e.series);
  if(filter!=='all'&&!keys.has(filter))filter='all';
  filters.replaceChildren();
  for(const [key,label] of [['all','All series'],...keys] as Array<[string,string]>) {
    const button=element('button','ms-filter',label) as HTMLButtonElement;button.type='button';button.setAttribute('aria-pressed',String(filter===key));
    button.addEventListener('click',()=>{filter=key;renderFilters();renderEvents();});filters.append(button);
  }
}
function renderEvents() {
  scheduleEl.replaceChildren();const shown=events.filter(e=>filter==='all'||e.seriesKey===filter);
  if(!shown.length){showMessage(events.length?'No sessions in this series.':'No motorsport sessions listed right now.');return;}
  showMessage(streamsAvailable?'':'Schedule loaded, but cockpit feeds could not be fetched. Press Refresh to try again.');
  let day='';
  for(const event of shown) {
    const dayLabel=fmtDay.format(event.start);
    if(dayLabel!==day){day=dayLabel;scheduleEl.append(element('h3','ms-day',dayLabel));}
    const card=element('article','ms-event');
    const main=element('div','ms-event-main');main.append(element('div','ms-series',event.series),element('h3','ms-session',event.session));
    if(event.weekend) main.append(element('p','ms-weekend',event.weekend));
    const right=element('div','ms-event-time');const date=element('time','ms-local',fmtTime.format(event.start)) as HTMLTimeElement;date.dateTime=new Date(event.start).toISOString();
    const countdown=element('span',`ms-state${event.state==='live'?' is-live':event.state==='finished'?' is-finished':''}`,countdownText(event,Date.now()));countdown.dataset.id=event.id;
    right.append(date,countdown);card.append(main,right);
    if(event.feeds.length) {
      const detail=element('details','ms-feed-area'), heading=element('summary','',`Cockpit · ${event.feeds.length} ${event.feeds.length===1?'feed':'feeds'}`), feeds=element('div','ms-feeds');
      for (const feed of event.feeds) {
        const link=element('a','ms-feed') as HTMLAnchorElement;link.href=feed.href;
        link.append(document.createTextNode(feed.name));
        if(feed.language)link.append(element('small','',feed.language));
        if(feed.opens && feed.opens>Date.now())link.append(element('small','',`opens ${fmtTime.format(feed.opens)}`));
        feeds.append(link);
      }
      detail.append(heading,feeds);card.append(detail);
    } else card.append(element('div','ms-no-feeds',event.state==='finished'?'Session finished':streamsAvailable?'Cockpit not available yet':'Cockpit feeds unavailable'));
    scheduleEl.append(card);
  }
}
function tick() {
  if(document.hidden)return;
  const byId=new Map(events.map(e=>[e.id,e]));
  scheduleEl.querySelectorAll<HTMLElement>('.ms-state[data-id]').forEach(node=>{const event=byId.get(node.dataset.id||'');if(event){const text=countdownText(event,Date.now());if(node.textContent!==text)node.textContent=text;}});
}
async function get(url:string):Promise<unknown> {
  const res=await fetch(url,{signal:AbortSignal.timeout(10000),headers:{Accept:'application/json'}});
  if(!res.ok)throw new Error('RacingLap unavailable');return res.json();
}
async function load() {
  if(loading)return;loading=true;refresh.disabled=true;summary.textContent='Refreshing…';
  const [schedule,streams]=await Promise.allSettled([get('https://racinglap.net/api/v1/schedule.json'),get('https://racinglap.net/api/v1/streams.json')]);
  try {
    if(schedule.status!=='fulfilled')throw Error('Schedule unavailable');
    let result:MotorEvent[];
    try {result=parseMotorsports(schedule.value,streams.status==='fulfilled'?streams.value:null);streamsAvailable=streams.status==='fulfilled';}
    catch {result=parseMotorsports(schedule.value,null);streamsAvailable=false;}
    events=result;previouslyLoaded=true;
    summary.textContent=`${events.length} ${events.length===1?'session':'sessions'} · RacingLap`;
    renderFilters();renderEvents();
  } catch {
    if(previouslyLoaded){summary.textContent='Refresh failed · showing last loaded schedule';showMessage('Could not refresh RacingLap. The schedule below may be out of date.');}
    else {summary.textContent='Schedule unavailable';showMessage('Could not load RacingLap’s schedule. Please try Refresh.');}
  } finally {loading=false;refresh.disabled=false;}
}
refresh.addEventListener('click',()=>void load());
document.addEventListener('visibilitychange',tick);
window.setInterval(tick,1000); // Local clock only: no background API polling.
void load();
