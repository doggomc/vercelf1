import { initShell } from '../ui/shell';
import '../viewer-counter';
import { JOLPI, SITE_SEASON } from '../config';
import { schedule } from '../data/schedule';
import { flagHtml } from '../data/flags';
import { headshot } from '../data/driver-portraits';
import { displayRoundName, grandPrixSlug, esc, formatWeekendRange, roundFlagCode, winnerDriverHref, winnerTeamName } from './schedule-format';

initShell();
type Entry = { position?: string; positionText?: string; grid?: string; points?: string; status?: string; Q1?: string; Q2?: string; Q3?: string; Time?: {time?: string}; Driver?: {driverId?: string; givenName?: string; familyName?: string}; Constructor?: {name?: string} };
type ResponseData = { MRData?: { RaceTable?: { Races?: Array<{Results?: Entry[]; QualifyingResults?: Entry[]; SprintResults?: Entry[]}> } } };
const $ = (id: string) => document.getElementById(id);
const set = (id: string, value: string) => { const node = $(id); if (node) node.textContent = value; };
const slug = location.pathname.split('/').filter(Boolean)[2] ?? '';
const event = schedule.find(item => grandPrixSlug(item) === slug);
if (!event) {
  document.title = 'Grand Prix not found — FreeF1';
  set('gpTitle', 'Grand Prix not found'); set('gpLocation', 'Choose a race from the schedule.');
  document.querySelector('.gp-layout')?.setAttribute('hidden', '');
  const robots = document.createElement('meta'); robots.name = 'robots'; robots.content = 'noindex'; document.head.append(robots);
} else {
  const name = displayRoundName(event);
  document.title = `${name} 2026 — Schedule and results | FreeF1`;
  set('gpCrumb', name); set('gpRound', `ROUND ${event.round} · ${formatWeekendRange(event.sessions[0].ts, event.sessions[event.sessions.length - 1].ts)} 2026${event.sprint ? ' · SPRINT WEEKEND' : ''}`);
  const title = $('gpTitle'); if (title) title.innerHTML = `${flagHtml(roundFlagCode(event.round), 'flag gp-flag')}<span>${esc(name)} <span class="gp-year">2026</span></span>`;
  set('gpLocation', `${event.circuit} · ${event.locality}, ${event.country}`);
  set('gpCircuit', event.circuit); set('gpCircuitLocation', `${event.locality}, ${event.country}`);
  const image = $('gpCircuitImage') as HTMLImageElement | null;
  if (image) { image.src = `/assets/replay-circuits/${event.round}-640.webp`; image.alt = `Formula 1 racing at ${event.circuit}, ${event.locality}`; }
  const sessionList = $('gpSessions');
  if (sessionList) sessionList.innerHTML = event.sessions.map((session, i) => {
    const date = new Intl.DateTimeFormat(undefined, {weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'}).format(session.ts);
    return `<li><span class="gp-session-number">${i+1}</span><span class="gp-session-name">${esc(session.name)}</span><time datetime="${esc(session.start)}">${esc(date)}</time></li>`;
  }).join('');
  const sprint = event.sessions.find(item => item.slug === 'sprint');
  if (sprint) $('gpSprintSection')?.removeAttribute('hidden');
  // One on-demand weather request per page load, never a background poll. The
  // coordinates are the circuit vicinity and not a race-weekend forecast.
  const coordinates: Array<[number, number]> = [
    [-37.8497,144.968],[31.3389,121.2197],[34.8431,136.541],[25.9581,-80.2389],
    [45.5,-73.5228],[43.7347,7.4206],[41.57,2.2611],[47.2197,14.7647],
    [52.0786,-1.0169],[50.4372,5.9714],[47.5789,19.2486],[52.3888,4.5409],
    [45.6156,9.2811],[40.4638,-3.6163],[40.3725,49.8533],[2.7608,101.738],
    [1.2914,103.864],[30.1328,-97.6411],[19.4042,-99.0907],[-23.7036,-46.6997],
    [36.1147,-115.1728],[25.49,51.454],[24.4672,54.6031]
  ];
  const coords = coordinates[event.round - 1];
  const weatherNode = $('gpWeather');
  if (coords && weatherNode) {
    const [latitude, longitude] = coords;
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto`;
    void fetch(weatherUrl, { signal: AbortSignal.timeout(10000) }).then(response => {
      if (!response.ok) throw new Error('Weather unavailable');
      return response.json() as Promise<{current?: {time?: string; temperature_2m?: number; weather_code?: number; wind_speed_10m?: number}}>;
    }).then(data => {
      const c = data.current;
      if (!c || !Number.isFinite(c.temperature_2m) || !Number.isFinite(c.wind_speed_10m)) throw new Error('Weather unavailable');
      const code = c.weather_code ?? -1;
      const condition = code === 0 ? 'Clear' : code <= 3 && code >= 0 ? 'Partly cloudy' : code === 45 || code === 48 ? 'Fog' : code >= 51 && code <= 67 ? 'Rain or drizzle' : code >= 71 && code <= 77 ? 'Snow' : code >= 80 && code <= 82 ? 'Rain showers' : code >= 95 ? 'Thunderstorm' : 'Current conditions';
      const time = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(c.time ?? '') ? c.time!.replace('T',' ') : '';
      weatherNode.innerHTML = `<p class="gp-weather-temp">${Math.round(c.temperature_2m!)}°C</p><p>${esc(condition)} · Wind ${Math.round(c.wind_speed_10m!)} km/h</p>${time ? `<p>Observed ${esc(time)} · circuit local time</p>` : ''}`;
    }).catch(() => { weatherNode.textContent = 'Weather is unavailable right now.'; });
  } else if (weatherNode) weatherNode.textContent = 'Weather is unavailable for this circuit.';
  const renderResults = async (id: string, kind: 'results' | 'qualifying' | 'sprint', start: number | undefined) => {
    const node = $(id); if (!node) return;
    if (!start || Date.now() < start) { node.textContent = 'Results will appear when this session has taken place.'; return; }
    try {
      const response = await fetch(`${JOLPI}/${SITE_SEASON}/${event.round}/${kind}.json?limit=100`, {headers:{accept:'application/json'}, signal:AbortSignal.timeout(12000)});
      if (!response.ok) throw new Error('unavailable');
      const data = await response.json() as ResponseData;
      const race = data.MRData?.RaceTable?.Races?.[0];
      const rows = kind === 'qualifying' ? race?.QualifyingResults : kind === 'sprint' ? race?.SprintResults : race?.Results;
      if (!Array.isArray(rows) || !rows.length) { node.textContent = 'Results are not available yet.'; return; }
      const quali = kind === 'qualifying';
      const headers = quali ? ['Pos','Driver','Q1','Q2','Q3'] : ['Pos','Driver','Grid','Time / status','Pts'];
      const html = rows.map(row => {
        const driver = row.Driver; const full = `${driver?.givenName ?? ''} ${driver?.familyName ?? ''}`.trim();
        const driverHtml = full ? `<a class="gp-result-driver" href="${esc(winnerDriverHref(driver?.givenName ?? '', driver?.familyName ?? ''))}"><img src="${esc(headshot(driver?.driverId ?? null, 64))}" alt="" width="32" height="32" loading="lazy" decoding="async"><span><b>${esc(full)}</b><small>${esc(winnerTeamName(row.Constructor?.name ?? ''))}</small></span></a>` : '—';
        const position = row.positionText && !/^\d+$/.test(row.positionText) ? row.positionText : row.position ?? '—';
        const values = quali ? [row.Q1 || '—', row.Q2 || '—', row.Q3 || '—'] : [row.grid === '0' ? 'PL' : row.grid || '—', row.Time?.time || row.status || '—', row.points ?? '—'];
        return `<tr><td>${esc(position)}</td><td>${driverHtml}</td>${values.map(value => `<td class="gp-result-number">${esc(value)}</td>`).join('')}</tr>`;
      }).join('');
      node.innerHTML = `<p class="gp-scroll-hint">Scroll sideways to see the full table →</p><div class="table-wrap" tabindex="0" aria-label="${esc(quali ? 'Qualifying' : 'Results')} table, scroll sideways"><table class="tbl gp-table"><thead><tr>${headers.map((header,i)=>`<th scope="col"${i >= 2 ? ' class="gp-result-number"' : ''}>${esc(header)}</th>`).join('')}</tr></thead><tbody>${html}</tbody></table></div>`;
    } catch { node.textContent = 'Results are unavailable right now. Please try again later.'; }
  };
  void renderResults('gpRaceResults', 'results', event.sessions.find(s => s.slug === 'race')?.ts);
  void renderResults('gpQualiResults', 'qualifying', event.sessions.find(s => s.slug === 'qualifying')?.ts);
  if (sprint) void renderResults('gpSprintResults', 'sprint', sprint.ts);
}
