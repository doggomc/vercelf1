import { initShell } from '../ui/shell';
import '../viewer-counter';
import { JOLPI, SITE_SEASON } from '../config';
import { schedule } from '../data/schedule';
import { headshot, portrait } from '../data/driver-portraits';
import { loadStandings } from './driver-core';
import { displayRoundName, grandPrixSlug, esc, formatWeekendRange, grandPrixHref, roundFlagCode, winnerDriverHref, winnerTeamColor, winnerTeamName } from './schedule-format';

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
  set('gpCrumb', name); set('gpRound', `Round ${event.round} · ${formatWeekendRange(event.sessions[0].ts, event.sessions[event.sessions.length - 1].ts)} 2026${event.sprint ? ' · SPRINT WEEKEND' : ''}`);
  const title = $('gpTitle'); if (title) title.innerHTML = `<img class="gp-flag" src="/assets/flags/vector/${roundFlagCode(event.round)}.svg" alt="" width="44" height="32" decoding="async"><span>${esc(name)} <span class="gp-year">2026</span> <span class="gp-title-muted">${Date.now() >= (event.sessions.find(session => session.slug === 'race')?.ts ?? Infinity) + 2.5 * 3600000 ? 'results' : 'schedule'}</span></span>`;
  const race = event.sessions.find(session => session.slug === 'race');
  const finished = Boolean(race && Date.now() >= race.ts + 2.5 * 3600000);
  const statusBadge = $('gpStatus'); if (statusBadge) statusBadge.innerHTML = finished ? '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 8 3 3 7-7"/></svg>Completed' : 'Upcoming';
  set('gpLocation', `${event.circuit}, ${event.locality}, ${event.country}. Session times, weather, results and circuit information.`);
  set('gpCircuit', `${event.circuit}: circuit guide`); set('gpCircuitLocation', `${event.locality}, ${event.country}`);
  set('gpFactLocation', event.locality); set('gpFactCountry', event.country);
  set('gpFactFormat', event.sprint ? 'Sprint weekend' : 'Grand Prix weekend');
  // Verified Albert Park circuit specifications; omit figures rather than guess for other circuits.
  if (event.round === 1) {
    const facts = document.querySelector('.gp-circuit-facts');
    if (facts) facts.innerHTML = '<div><dt>Circuit length</dt><dd>5.278 km</dd></div><div><dt>Race laps</dt><dd>58</dd></div><div><dt>Race distance</dt><dd>306.124 km</dd></div><div><dt>Corners</dt><dd>14</dd></div><div><dt>First Grand Prix</dt><dd>1996</dd></div><div><dt>Direction</dt><dd>Clockwise</dd></div>';
  }
  set('gpCircuitDescription', `${event.circuit} in ${event.locality}, ${event.country} hosts the ${name}. Times shown above use your device’s local time zone.`);
  set('gpWeatherTitle', `Weather in ${event.locality}`); set('gpWeatherLocation', event.locality);
  for (const [id, round] of [['gpPrevious',event.round-1],['gpNext',event.round+1]] as const) {
    const other = schedule.find(item => item.round === round); const link = $(id) as HTMLAnchorElement | null;
    if (other && link) { link.href = grandPrixHref(other); link.innerHTML = `<small>Round ${other.round}</small><b>${id === 'gpPrevious' ? '← ' : ''}${esc(displayRoundName(other))}${id === 'gpNext' ? ' →' : ''}</b>`; link.hidden = false; }
  }
  void loadStandings().then(({ rows }) => {
    const target = $('gpChampionship'); if (!target) return;
    target.innerHTML = `<div class="table-wrap"><table class="gp-champ-table"><thead><tr><th>Pos</th><th>Driver</th><th>Pts</th></tr></thead><tbody>${rows.slice(0,8).map(row => {
      const team = row.Constructors?.[0]?.name ?? '';
      return `<tr><td>${esc(row.position)}</td><td><a class="gp-champ-driver" href="${esc(winnerDriverHref(row.Driver.givenName,row.Driver.familyName))}"><span class="team-bar" style="--team:${esc(winnerTeamColor(team))}"></span><img src="${esc(headshot(row.Driver.driverId,64))}" alt="" width="32" height="32" loading="lazy" decoding="async"><span><b>${esc(row.Driver.familyName)}</b><small>${esc(winnerTeamName(team))}</small></span></a></td><td>${esc(row.points)}</td></tr>`;
    }).join('')}</tbody></table></div>`;
  }).catch(() => { set('gpChampionship', 'Standings are unavailable right now.'); });
  const image = $('gpCircuitImage') as HTMLImageElement | null;
  if (image) { image.src = `/assets/replay-circuits/${event.round}-640.webp`; image.alt = `Formula 1 racing at ${event.circuit}, ${event.locality}`; }
  const sessionList = $('gpSessions');
  if (sessionList) sessionList.innerHTML = event.sessions.map(session => {
    const date = new Intl.DateTimeFormat(undefined, {weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'}).format(session.ts);
    const status = Date.now() >= session.ts + 2.5 * 3600000 ? '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m3 8 3 3 7-7"/></svg> Done' : Date.now() < session.ts ? 'Upcoming' : 'Started';
    return `<li><span class="gp-session-copy"><span class="gp-session-name">${esc(session.name)}</span><time datetime="${esc(session.start)}">${esc(date)}</time></span><span class="gp-session-status">${status}</span></li>`;
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
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=3&timezone=auto`;
    void fetch(weatherUrl, { signal: AbortSignal.timeout(10000) }).then(response => {
      if (!response.ok) throw new Error('Weather unavailable');
      return response.json() as Promise<{current?: {time?: string; temperature_2m?: number; apparent_temperature?: number; relative_humidity_2m?: number; weather_code?: number; wind_speed_10m?: number}; daily?: {time?: string[]; temperature_2m_max?: number[]; temperature_2m_min?: number[]; precipitation_probability_max?: number[]}}>;
    }).then(data => {
      const c = data.current;
      if (!c || !Number.isFinite(c.temperature_2m) || !Number.isFinite(c.wind_speed_10m)) throw new Error('Weather unavailable');
      const code = c.weather_code ?? -1;
      const condition = code === 0 ? 'Clear' : code <= 3 && code >= 0 ? 'Partly cloudy' : code === 45 || code === 48 ? 'Fog' : code >= 51 && code <= 67 ? 'Rain or drizzle' : code >= 71 && code <= 77 ? 'Snow' : code >= 80 && code <= 82 ? 'Rain showers' : code >= 95 ? 'Thunderstorm' : 'Current conditions';
      const time = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(c.time ?? '') ? c.time!.replace('T',' ') : '';
      let unit: 'c' | 'f' = 'c';
      const temperature = (n: number) => `${Math.round(unit === 'f' ? n * 9 / 5 + 32 : n)}°`;
      const paintWeather = () => {
        const days = (data.daily?.time ?? []).slice(0,3).map((day,i) => {
          const high = data.daily?.temperature_2m_max?.[i], low = data.daily?.temperature_2m_min?.[i], rain = data.daily?.precipitation_probability_max?.[i];
          if (!Number.isFinite(high) || !Number.isFinite(low)) return '';
          const label = new Intl.DateTimeFormat(undefined, {weekday:'short',timeZone:'UTC'}).format(new Date(`${day}T12:00:00Z`));
          return `<div><span>${esc(label)}</span><b>${temperature(high!)} <em>/ ${temperature(low!)}</em></b>${Number.isFinite(rain) ? `<small>${Math.round(rain!)}% rain</small>` : ''}</div>`;
        }).join('');
        weatherNode.innerHTML = `<p class="gp-weather-temp">${temperature(c.temperature_2m!)}<small>${unit.toUpperCase()}</small></p><p>${esc(condition)}${Number.isFinite(c.apparent_temperature) ? ` · feels ${temperature(c.apparent_temperature!)}` : ''}</p><p>Wind ${Math.round(c.wind_speed_10m!)} km/h${Number.isFinite(c.relative_humidity_2m) ? ` · ${Math.round(c.relative_humidity_2m!)}% humidity` : ''}</p>${days ? `<div class="gp-weather-days">${days}</div>` : ''}${time ? `<p class="gp-weather-observed">Updated ${esc(time)} · circuit local time</p>` : ''}`;
      };
      paintWeather();
      document.querySelectorAll<HTMLButtonElement>('[data-weather-unit]').forEach(button => button.addEventListener('click', () => {
        unit = button.dataset.weatherUnit === 'f' ? 'f' : 'c';
        document.querySelectorAll<HTMLButtonElement>('[data-weather-unit]').forEach(item => item.setAttribute('aria-pressed', String(item.dataset.weatherUnit === unit)));
        paintWeather();
      }));
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
      if (kind === 'results') {
        const first = rows.find(row => row.position === '1');
        if (first?.Driver?.givenName && first.Driver.familyName) {
          const full = `${first.Driver.givenName} ${first.Driver.familyName}`; const winner = $('gpWinner') as HTMLAnchorElement | null;
          if (winner) { winner.href = winnerDriverHref(first.Driver.givenName,first.Driver.familyName); winner.style.setProperty('--team', winnerTeamColor(first.Constructor?.name)); winner.hidden = false; }
          const portraitNode = $('gpWinnerImage') as HTMLImageElement | null;
          if (portraitNode) { portraitNode.src = portrait(first.Driver.driverId ?? null, 320); portraitNode.alt = ''; }
          set('gpWinnerName', full); set('gpWinnerTeam', winnerTeamName(first.Constructor?.name ?? '')); set('gpWinnerTime', first.Time?.time ?? '');
        }
      }
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
