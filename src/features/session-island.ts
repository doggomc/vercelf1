import { findLiveSession, findNextSession, sessionShortName } from '../services/weekend';

/** A small schedule indicator; it does not claim a stream is available. */
export function initSessionIsland(): void {
  const right = document.querySelector<HTMLElement>('nav.nav .nav-right');
  if (!right || document.getElementById('sessionIsland')) return;
  const style = document.createElement('link'); style.rel = 'stylesheet'; style.href = '/session-island.css'; document.head.append(style);
  const holder = document.createElement('div');
  holder.className = 'session-island-slot';
  const link = document.createElement('a');
  link.id = 'sessionIsland';
  link.className = 'session-island';
  link.href = '/schedule.html';
  link.innerHTML = '<span class="session-island-line"><span class="session-island-badge">F1</span><span class="session-island-name"></span><span class="session-island-time"></span></span><span class="session-island-detail"><span class="session-island-event"></span><span class="session-island-date"></span><span class="session-island-cta">View schedule <span aria-hidden="true">↗</span></span></span>';
  holder.append(link);
  // On touch, the first tap opens the island; a second tap follows the link.
  link.addEventListener('click', (e) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || !matchMedia('(hover: none)').matches || e.detail === 0) return;
    if (!link.classList.contains('is-expanded')) { e.preventDefault(); link.classList.add('is-expanded'); }
  });
  document.addEventListener('pointerdown', (e) => { if (!holder.contains(e.target as Node)) link.classList.remove('is-expanded'); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') link.classList.remove('is-expanded'); });
  right.insertBefore(holder, right.querySelector('.nav-toggle'));
  const name = link.querySelector<HTMLElement>('.session-island-name')!;
  const time = link.querySelector<HTMLElement>('.session-island-time')!;
  const event = link.querySelector<HTMLElement>('.session-island-event')!;
  const date = link.querySelector<HTMLElement>('.session-island-date')!;
  const formatter = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const update = () => {
    const now = Date.now();
    const live = findLiveSession(now);
    const info = live || findNextSession(now);
    if (!info) {
      name.textContent = 'Season'; time.textContent = 'Complete'; event.textContent = 'Season complete'; date.textContent = 'See the calendar';
      link.setAttribute('aria-label', 'F1 season complete. View schedule');
      link.classList.remove('is-scheduled');
      return;
    }
    const remaining = Math.max(0, info.session.ts - now);
    const minutes = Math.ceil(remaining / 60000);
    const label = live ? 'Scheduled now' : minutes >= 2880 ? `in ${Math.ceil(minutes / 1440)}d` : minutes >= 120 ? `in ${Math.ceil(minutes / 60)}h` : `in ${minutes}m`;
    name.textContent = sessionShortName(info.session.name);
    time.textContent = label;
    event.textContent = info.event.name;
    date.textContent = formatter.format(info.session.ts);
    link.classList.toggle('is-scheduled', Boolean(live));
    link.setAttribute('aria-label', `${info.event.name}, ${info.session.name}, ${live ? 'scheduled now' : formatter.format(info.session.ts)}. View schedule`);
  };
  update();
  window.setInterval(() => { if (!document.hidden) update(); }, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) update(); });
}

initSessionIsland();
