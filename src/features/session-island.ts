import { findLiveSession, findNextSession, sessionShortName } from '../services/weekend';

/** Schedule status, not a claim that a stream is live or available. */
export function initSessionIsland(): void {
  const right = document.querySelector<HTMLElement>('nav.nav .nav-right');
  if (!right || document.getElementById('sessionIsland')) return;
  const style = document.createElement('link'); style.rel = 'stylesheet'; style.href = '/session-island.css'; document.head.append(style);
  const holder = document.createElement('div'); holder.className = 'session-island-slot';
  const link = document.createElement('a'); link.id = 'sessionIsland'; link.className = 'session-island'; link.href = '/schedule.html';
  link.innerHTML = `<span class="si-compact" aria-hidden="true"><span class="si-badge">F1</span><span class="si-name"></span><span class="si-relative"></span></span>
    <span class="si-expanded" aria-hidden="true"><span class="si-timer-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="7"/><path d="M12 13V9m-2-7h4m-2 0v3m5 2 1.5-1.5"/></svg></span><span class="si-copy"><span class="si-title"></span><span class="si-date"></span></span><span class="si-count"><span class="si-clock"></span><span class="si-bar"><span></span></span></span></span>`;
  holder.append(link); right.insertBefore(holder, right.querySelector('.nav-toggle'));
  const el = (selector: string) => link.querySelector<HTMLElement>(selector)!;
  const dateFormat = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  const pad = (n: number) => String(n).padStart(2, '0');
  const update = () => {
    const now = Date.now(); const live = findLiveSession(now); const info = live || findNextSession(now);
    if (!info) {
      el('.si-name').textContent = 'Season'; el('.si-relative').textContent = 'Complete';
      el('.si-title').textContent = 'Season complete'; el('.si-date').textContent = 'See the calendar'; el('.si-clock').textContent = '—';
      el('.si-bar > span').style.width = '100%'; link.setAttribute('aria-label', 'F1 season complete. View schedule'); return;
    }
    const total = Math.max(0, Math.ceil((info.session.ts - now) / 1000));
    const days = Math.floor(total / 86400), hours = Math.floor(total / 3600) % 24, minutes = Math.floor(total / 60) % 60, seconds = total % 60;
    const relative = live ? 'Scheduled' : days ? `in ${days} ${days === 1 ? 'day' : 'days'}` : total >= 3600 ? `in ${Math.ceil(total / 3600)} hr` : `in ${Math.ceil(total / 60)} min`;
    const time = live ? 'Scheduled' : `${days ? `${days}d ` : ''}${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    const gp = info.event.name.replace(' Grand Prix', ' GP');
    el('.si-name').textContent = sessionShortName(info.session.name); el('.si-relative').textContent = relative;
    el('.si-title').textContent = `${info.session.name} · ${gp}`; el('.si-date').textContent = dateFormat.format(info.session.ts); el('.si-clock').textContent = time;
    el('.si-bar > span').style.width = `${live ? 100 : Math.max(2, Math.min(100, (1 - total / 86400) * 100))}%`;
    link.setAttribute('aria-label', `${info.event.name}, ${info.session.name}, ${live ? 'scheduled now' : dateFormat.format(info.session.ts)}. View schedule`);
  };
  const close = () => link.classList.remove('is-expanded');
  link.addEventListener('click', (e) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || !matchMedia('(hover: none)').matches || e.detail === 0) return;
    if (!link.classList.contains('is-expanded')) { e.preventDefault(); link.classList.add('is-expanded'); }
  });
  document.addEventListener('pointerdown', (e) => { if (!holder.contains(e.target as Node)) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  update(); window.setInterval(() => { if (!document.hidden) update(); }, 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) update(); });
}
initSessionIsland();
