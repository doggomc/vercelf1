import { initShell } from '../ui/shell';
import '../viewer-counter';
import { fetchWeekends, flagFor, replayHref, seriesNames, weekendTitle, type Weekend, type Event, type Session } from '../lib/replays-feed';
initShell();
const grid = document.querySelector<HTMLElement>('#grid')!;
const featured = document.querySelector<HTMLElement>('#featured')!;
const summary = document.querySelector<HTMLElement>('#summary span:last-child')!;
const filters = document.querySelector<HTMLElement>('#filters')!;
const glider = document.querySelector<HTMLElement>('#tabsGlider')!;
const empty = document.querySelector<HTMLElement>('#empty')!;
const refresh = document.querySelector<HTMLButtonElement>('#refresh')!;
let weekends: Weekend[] = [];
let filter = 'all';
let loadFailed = false;
const types: Array<[string,string]> = [['all','All'],...Object.entries(seriesNames)];
function node<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text = ''): HTMLElementTagNameMap[K] { const el = document.createElement(tag); el.className = className; el.textContent = text; return el; }
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let switchTimer = 0;
function glide() {
  const active = filters.querySelector<HTMLButtonElement>('.is-active');
  if (!active) return;
  glider.style.width = `${active.offsetWidth}px`;
  glider.style.transform = `translate3d(${active.offsetLeft}px, 0, 0)`;
  glider.style.opacity = '1';
  filters.classList.add('has-glider');
}
function selectFilter(next: string, focus = false) {
  if (next === filter) return;
  const previous = types.findIndex(([key]) => key === filter);
  const selected = types.findIndex(([key]) => key === next);
  if (selected < 0) return;
  filter = next;
  const buttons = [...filters.querySelectorAll<HTMLButtonElement>('button[data-series]')];
  for (const button of buttons) {
    const active = button.dataset.series === next;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', String(active));
    button.tabIndex = active ? 0 : -1;
    if (active) {
      if (focus) button.focus({ preventScroll: true });
      const scroller = filters.parentElement!;
      const left = button.offsetLeft, right = left + button.offsetWidth;
      const current = scroller.scrollLeft, visible = scroller.clientWidth;
      if (left < current || right > current + visible) {
        scroller.scrollTo({ left: left < current ? left - 4 : right - visible + 4, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
      }
    }
  }
  glide();
  drawFeatured();
  window.clearTimeout(switchTimer);
  if (reducedMotion.matches) { grid.classList.remove('is-switching'); draw(); return; }
  grid.style.setProperty('--rp-direction', selected > previous ? '1' : '-1');
  grid.classList.add('is-switching');
  switchTimer = window.setTimeout(() => {
    draw();
    requestAnimationFrame(() => grid.classList.remove('is-switching'));
  }, 120);
}
function drawFilters() {
  types.forEach(([key,label]) => {
    const b=node('button','os-filter'+(key===filter?' is-active':''),label);
    b.type='button'; b.dataset.series=key; b.setAttribute('role','tab');
    b.setAttribute('aria-selected',String(key===filter)); b.tabIndex=key===filter?0:-1;
    b.addEventListener('click',()=>selectFilter(key)); filters.append(b);
  });
  requestAnimationFrame(glide);
}
filters.addEventListener('keydown', event => {
  if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
  event.preventDefault();
  const current = types.findIndex(([key]) => key === filter);
  const index = event.key === 'Home' ? 0 : event.key === 'End' ? types.length-1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + types.length) % types.length;
  selectFilter(types[index][0], true);
});
function link(e: Event, s: Session, cls: string, label: string) { const a=node('a',cls,label); a.href=replayHref(e,s); return a; }
function circuitImage(round: number, featured = false): HTMLImageElement {
  const img = document.createElement('img');
  img.src = `/assets/replay-circuits/${round}-960.webp`;
  img.srcset = [640, 960, 1440].map(size => `/assets/replay-circuits/${round}-${size}.webp ${size}w`).join(', ');
  img.sizes = featured ? '(max-width: 640px) 100vw, 70vw' : '(max-width: 640px) 100vw, (max-width: 1000px) 50vw, 33vw';
  img.alt = '';
  img.decoding = 'async';
  if (!featured) { img.loading = 'lazy'; img.className = 'rp-circuit'; }
  return img;
}
function draw() {
  grid.replaceChildren();
  if (loadFailed) { empty.hidden = false; empty.querySelector('h2')!.textContent = 'Replays unavailable'; empty.querySelector('p')!.textContent = 'Please check your connection and try refreshing.'; return; }
  empty.hidden=true; empty.querySelector('h2')!.textContent='No replays found'; empty.querySelector('p')!.textContent='Try another series or refresh to check again.';
  const list=weekends.map(w=>({...w,events:w.events.filter(e=>filter==='all'||e.series===filter)})).filter(w=>w.events.length);
  for (const [index,w] of list.entries()) {
    const card=node('article','rp-card'); card.style.setProperty('--stagger',`${Math.min(index,8)*35}ms`);
    const top=node('div','rp-card-top'); const tag=node('span','rp-round',`ROUND ${String(w.round).padStart(2,'0')} · ${w.season}`); top.append(tag);
    const code=flagFor(w.country); if(code){const img=document.createElement('img');img.src=`/assets/flags/${code}-40.png`;img.alt='';img.className='rp-flag';top.append(img);} card.append(top);
    const heading=node('div','rp-card-heading'); const text=node('div','');text.append(node('h3','',weekendTitle(w)),node('p','',w.circuit));heading.append(text);
    if(w.season===2026 && w.round>=1 && w.round<=23){heading.append(circuitImage(w.round));} card.append(heading);
    const groups=node('div','rp-sessions'); for(const e of w.events){const row=node('div','rp-series');row.append(node('span','rp-series-name',seriesNames[e.series]));const pills=node('div','rp-pills');for(const s of e.sessions) pills.append(link(e,s,'rp-pill',s.name));row.append(pills);groups.append(row);}card.append(groups);grid.append(card);
  }
  empty.hidden=list.length>0;
}
function drawFeatured() {
  featured.replaceChildren(); let latest: {w:Weekend;e:Event;s:Session}|null=null;
  for(const w of weekends) for(const e of w.events) for(const s of e.sessions) if((filter === 'all' || e.series === filter) && (!latest || (Date.parse(s.replay.publishedAt || '') || 0) > (Date.parse(latest.s.replay.publishedAt || '') || 0))) latest={w,e,s};
  if(!latest)return; const {w,e,s}=latest;
  const hero=link(e,s,'rp-feature',''); const copy=node('div','rp-feature-copy');copy.append(node('span','rp-feature-label','●  JUST ADDED'),node('h2','',weekendTitle(w)),node('p','',`${seriesNames[e.series]} · ${s.name} · ${w.season}`),node('span','rp-watch','Watch replay  ↗'));hero.append(copy);
  if(w.season===2026 && w.round>=1 && w.round<=23){hero.append(circuitImage(w.round, true));}featured.append(hero);
}
async function load(){refresh.disabled=true;refresh.classList.add('is-spinning');try{weekends=await fetchWeekends();loadFailed=false;const count=weekends.reduce((n,w)=>n+w.events.reduce((a,e)=>a+e.sessions.length,0),0);summary.textContent=`${weekends.length} weekends · ${count} replays`;drawFeatured();draw();}catch{loadFailed=true;weekends=[];featured.replaceChildren();summary.textContent='Unable to load replays';grid.replaceChildren();empty.hidden=false;empty.querySelector('h2')!.textContent='Replays unavailable';empty.querySelector('p')!.textContent='Please check your connection and try refreshing.';}finally{refresh.disabled=false;refresh.classList.remove('is-spinning');}}
refresh.addEventListener('click',load);window.addEventListener('resize',glide);drawFilters();load();
