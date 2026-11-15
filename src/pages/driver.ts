import { initShell } from '../ui/shell';
/* Every page except the cockpit carries the open-page counter in its header. */
import '../viewer-counter';
import { CIRCUIT_COUNTRY, bornFacts, displayName, shortRaceName, splitName, teamLabel } from '../data/driver-facts';
import { driverWorldTitles } from '../data/driver-world-titles';
import { NATIONALITY_FLAG } from '../data/driver-flags';
import { flagHtml } from '../data/flags';
import { portrait } from '../data/driver-portraits';
import { TEAM_ALIAS, TEAM_CAR, TEAM_HEX, teams } from '../data/teams';
import { SITE_SEASON } from '../config';
import { driverSlug, esc, loadStandings, ordinal, teamSlug, type StandingRow } from './driver-core';
import { loadSeason, seasonStats, teammateBattle, teammateOf, type SeasonRow } from './driver-season';

initShell();

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T | null;
const setText = (id: string, value: string) => { const node = $(id); if (node) node.textContent = value; };
const show = (id: string, value: string) => { const node = $(id); if (node) node.innerHTML = value; };

/* The URL is the only input: /drivers/andrea-kimi-antonelli/ → andrea-kimi-antonelli */
function slugFromLocation(): string {
  const parts = location.pathname.split('/').filter(Boolean);
  return parts[0] === 'drivers' && parts[1] ? decodeURIComponent(parts[1]) : '';
}

function finishLabel(row: SeasonRow): string {
  if (row.positionText && /^[A-Z]$/.test(row.positionText)) return row.positionText;
  // Jolpica reports lapped/retired states in `status`; the position is honest only when classified.
  if (row.status && !/^(Finished|\+\d+ Laps?)$/.test(row.status) && row.positionText === 'R') return 'DNF';
  return row.positionText || row.position || '—';
}

function resultsRows(rows: SeasonRow[], sprints: Map<string, SeasonRow>): string {
  return rows.map((row) => {
    const code = CIRCUIT_COUNTRY[row.circuitId] ?? '';
    const sprint = sprints.get(row.round);
    const finish = finishLabel(row);
    const won = row.position === '1';
    return `<tr>
      <td class="dp-rnd num">${esc(row.round)}</td>
      <td>
        <span class="dp-gp">
          ${code ? flagHtml(code) : ''}
          <span>${esc(shortRaceName(row.raceName, code))}</span>
        </span>
      </td>
      <td class="t-num dp-dim">${esc(row.grid === '0' ? 'PL' : row.grid)}</td>
      <td class="t-num dp-finish${won ? ' is-win' : ''}">${won ? '<svg class="dp-win-trophy" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4ZM7 6H4v2a4 4 0 0 0 4 4m9-6h3v2a4 4 0 0 1-4 4"/></svg>' : ''}${esc(finish)}</td>
      <td class="t-num dp-dim dp-sprint-col">${sprint ? esc(finishLabel(sprint)) : '–'}</td>
      <td class="t-num dp-points">${esc(row.points)}</td>
    </tr>`;
  }).join('');
}

/* ── The profile ─────────────────────────────────────────────────────────── */

async function paint(): Promise<void> {
  const slug = slugFromLocation();
  if (!slug) { location.replace('/drivers'); return; }

  let standings: { rows: StandingRow[]; round: string };
  try {
    standings = await loadStandings();
  } catch {
    setText('dpResultsNote', 'Season data is unavailable right now. Refresh to try again.');
    const body = $('dpResultsBody'); if (body) body.removeAttribute('aria-busy');
    setText('dpCrumb', 'Driver unavailable');
    return;
  }

  const standingsRow = standings.rows.find((row) => driverSlug(row.Driver) === slug);
  if (!standingsRow) {
    /* Not on this season's grid: say so plainly rather than render an empty shell. */
    setText('dpCrumb', 'Driver not found');
    setText('dpAboutName', 'this driver');
    const name = $('dpName');
    if (name) name.innerHTML = '<span class="dp-first">Driver</span><span class="dp-last">not found</span>';
    setText('dpResultsNote', `No ${SITE_SEASON} entry matches “${slug}”.`);
    const body = $('dpResultsBody');
    if (body) {
      body.removeAttribute('aria-busy');
      body.innerHTML = `<tr><td colspan="6" class="dp-empty">Pick a driver from the <a href="/drivers">2026 grid</a>.</td></tr>`;
    }
    /* The page itself is a real 404 in spirit even though Netlify serves the file,
       so nothing should index it and the title must say what happened. */
    document.title = 'Driver not found — FreeF1';
    const robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'noindex';
    document.head.append(robots);
    const photo = $('dpPhoto') as HTMLImageElement | null;
    if (photo) photo.hidden = true;
    const retry = $('dpResultsTitle');
    if (retry) retry.textContent = `No ${SITE_SEASON} driver`;
    return;
  }

  const driver = standingsRow.Driver;
  const teamApiName = standingsRow.Constructors?.[0]?.name ?? '';
  const team = teamLabel(teamApiName);
  const color = TEAM_HEX[teamApiName] ?? TEAM_HEX[team] ?? '#7e8188';
  const fullName = displayName(driver.givenName, driver.familyName);
  const { first, last } = splitName(driver.givenName, driver.familyName);
  const flag = NATIONALITY_FLAG[driver.nationality ?? ''] ?? '';

  document.title = `${fullName} — ${SITE_SEASON} stats and results | FreeF1`;
  const description = document.querySelector('meta[name="description"]');
  if (description) description.setAttribute('content', `${fullName}, ${team}. ${ordinal(Number(standingsRow.position))} in the ${SITE_SEASON} championship with ${standingsRow.points} points. Full season results and stats.`);
  const canonical = document.createElement('link');
  canonical.rel = 'canonical';
  canonical.href = `${location.origin}/drivers/${slug}/`;
  document.head.append(canonical);

  const hero = $('dpHero');
  if (hero) hero.style.setProperty('--team', color);
  const teamCard = $('dpTeamCard') as HTMLAnchorElement | null;
  if (teamCard) {
    teamCard.href = `/teams/${teamSlug(team)}/`;
    teamCard.style.setProperty('--team', color);
    teamCard.setAttribute('aria-label', `View ${team} team profile`);
  }
  setText('dpTeamCardName', team);
  const teamKey = (TEAM_ALIAS as Record<string, string>)[teamApiName.toLowerCase()] ?? teamSlug(team).replace(/-/g, '');
  const teamData = teams.find((entry) => entry.id === teamKey);
  const teamCar = $('dpTeamCar') as HTMLImageElement | null;
  if (teamCar && teamData?.logo) { teamCar.src = TEAM_CAR(teamData.logo, 500); teamCar.hidden = false; teamCar.onerror = () => { teamCar.hidden = true; }; }
  show('dpStandings', standings.rows.slice(0, 10).map((row) => {
    const active = row.Driver.driverId === driver.driverId;
    const rowTeam = row.Constructors?.[0]?.name ?? '';
    const rowColor = TEAM_HEX[rowTeam] ?? TEAM_HEX[teamLabel(rowTeam)] ?? '#7e8188';
    return `<tr class="dp-standing-row${active ? ' is-current' : ''}">
      <td class="dp-standing-pos">${esc(row.position)}</td><td><a class="dp-standing-driver" href="/drivers/${esc(driverSlug(row.Driver))}/"${active ? ' aria-current="page"' : ''}>
      <span class="dp-standing-bar" style="background:${esc(rowColor)}"></span><img class="dp-standing-photo" src="${esc(portrait(row.Driver.driverId, 320))}" alt="" width="32" height="32" loading="lazy" decoding="async">
      <span class="dp-standing-name"><b>${esc(row.Driver.familyName)}</b><small>${esc(teamLabel(rowTeam))}</small></span></a></td><td class="dp-standing-points">${esc(row.points)}</td>
    </tr>`;
  }).join(''));


  setText('dpCrumb', fullName);
  show('dpTags', [
    flag ? `${flagHtml(flag)}<span>${esc(driver.nationality ?? '')}</span>` : '',
    `<span class="dp-dot" aria-hidden="true">·</span>`,
    `<a class="dp-team-link" href="/teams/${esc(teamSlug(team))}/"><span class="driver-swatch" aria-hidden="true" style="background:${esc(color)}"></span>${esc(team)}</a>`,
  ].filter(Boolean).join(''));

  const nameNode = $('dpName');
  if (nameNode) nameNode.innerHTML = `<span class="dp-first">${esc(first)}</span><span class="dp-last">${esc(last)}</span>`;
  setText('dpNumber', driver.permanentNumber ?? driver.code ?? '');

  const photo = $('dpPhoto') as HTMLImageElement | null;
  if (photo) {
    photo.src = portrait(driver.driverId, 600);
    photo.alt = `${fullName}, ${team} Formula 1 driver`;
  }
  setText('dpAboutName', fullName);

  setText('statChamp', ordinal(Number(standingsRow.position)));
  setText('statPoints', standingsRow.points);
  setText('statPointsNote', `after ${standings.round} of 23 rounds`);

  const titles = driverWorldTitles(driver.driverId);
  setText('factTitles', titles === null ? '—' : String(titles));
  const titlesNode = $('factTitles');
  if (titlesNode) titlesNode.title = 'Completed championships through 2025';
  setText('factCountry', driver.nationality ?? '—');
  const born = bornFacts(driver.dateOfBirth);
  setText('factBorn', born ? `${born.label}${born.age !== null ? ` (${born.age})` : ''}` : '—');
  setText('factDebut', '—');

  const season = await loadSeason(driver.driverId).catch(() => null);
  if (!season) {
    setText('dpResultsNote', 'Results are unavailable right now. Refresh to try again.');
    const body = $('dpResultsBody'); if (body) body.removeAttribute('aria-busy');
    return;
  }

  const stats = seasonStats(season);
  if (stats.starts > 0) {
    setText('statWins', String(stats.wins));
    setText('statWinsNote', stats.sprintWins > 0 ? `+${stats.sprintWins} sprint${stats.sprintWins === 1 ? '' : 's'}` : '');
    setText('statPodiums', String(stats.podiums));
    setText('statPoles', String(stats.poles));
    setText('statPolesNote', 'from grid position');
    setText('statBest', stats.bestFinishText);
    setText('statBestNote', `${stats.starts} ${stats.starts === 1 ? 'start' : 'starts'}`);
  }

  const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;
  const sprintByRound = new Map<string, SeasonRow>(season.sprints.map((row) => [row.round, row]));
  show('dpResultsBody', resultsRows(season.rows, sprintByRound));
  $('dpResultsBody')?.removeAttribute('aria-busy');
  const hasSprint = season.sprints.length > 0;
  document.querySelectorAll<HTMLElement>('.dp-sprint-col').forEach((cell) => { cell.hidden = !hasSprint; });
  setText('dpResultsNote', season.rows.length
    ? [plural(season.rows.length, 'round', 'rounds'),
       plural(stats.pointsFinishes, 'points finish', 'points finishes'),
       ...(hasSprint ? [plural(season.sprints.length, 'sprint', 'sprints')] : [])].join(' · ')
    : 'No rounds completed yet this season.');

  /* Arrives separately so a slow or throttled call never blocks the page. */
  void debutYear(driver.driverId).then((year) => { if (year) setText('factDebut', year); });

  /* About: a compact read of the numbers above. Every sentence is derived from
     the tables on this page, so it can never drift from what is printed. */
  /* A stand-in with one start must not read "1 starts". */
  const scored = season.rows.filter((row) => Number(row.points) > 0).length;
  const points = Number(standingsRow.points);
  const prose = [
    `${fullName} drives for ${team} in the ${SITE_SEASON} Formula 1 season, ${ordinal(Number(standingsRow.position))} in the championship on ${points} ${points === 1 ? 'point' : 'points'}.`,
    stats.starts > 0
      ? `In ${plural(stats.starts, 'start', 'starts')} ${last} has ${plural(stats.wins, 'win', 'wins')}, ${plural(stats.podiums, 'podium', 'podiums')} and ${plural(stats.poles, 'pole', 'poles')}, with a best finish of ${stats.bestFinishText}.`
      : `Results for this season have not been published yet.`,
    stats.starts > 0
      ? `${scored} of ${plural(stats.starts, 'round', 'rounds')} ${scored === 1 ? 'has' : 'have'} scored points${hasSprint ? `, and ${plural(season.sprints.length, 'sprint round has', 'sprint rounds have')} added to the total` : ''}.`
      : '',
  ].filter(Boolean);
  show('dpProse', prose.map((line) => `<p>${esc(line)}</p>`).join(''));

  /* Teammate battle: read from the other driver's own results. */
  const mate = teammateOf(standings.rows, driver);
  if (mate) {
    const mateName = displayName(mate.Driver.givenName, mate.Driver.familyName);
    setText('dpBattleTitle', `Teammate battle: ${last} vs ${mate.Driver.familyName}`);
    const mateSeason = await loadSeason(mate.Driver.driverId).catch(() => null);
    const battle = mateSeason ? teammateBattle(season, mateSeason) : { shared: 0, ahead: 0, behind: 0 };
    show('dpTeammate', `
      <div class="dp-battle">
        <div class="dp-battle-side">
          <span class="dp-battle-name">${esc(fullName)}</span>
          <b class="num">${esc(standingsRow.points)}</b>
          <small>points · P${esc(standingsRow.position)}</small>
        </div>
        <span class="dp-vs">vs</span>
        <a class="dp-battle-side" href="/drivers/${esc(driverSlug(mate.Driver))}/">
          <span class="dp-battle-name">${esc(mateName)}</span>
          <b class="num">${esc(mate.points)}</b>
          <small>points · P${esc(mate.position)}</small>
        </a>
      </div>
      ${battle.shared ? `<p class="dp-battle-note">${esc(last)} ahead in ${battle.ahead} of ${battle.shared} shared finishes${battle.behind ? `, behind in ${battle.behind}` : ''}.</p>` : ''}
    `);
  } else {
    show('dpTeammate', '<p class="dp-muted">No teammate on the grid.</p>');
  }

}

/**
 * The F1 debut year. The career feed is chronological, so one race is the first
 * race — a ~1 KB request instead of paging a 400-race career to count it.
 */
async function debutYear(driverId: string): Promise<string | null> {
  try {
    const response = await fetch(`https://api.jolpi.ca/ergast/f1/drivers/${driverId}/results.json?limit=1`, { headers: { accept: 'application/json' } });
    if (!response.ok) return null;
    const data = await response.json() as { MRData?: { RaceTable?: { Races?: Array<{ season?: string }> } } };
    return data?.MRData?.RaceTable?.Races?.[0]?.season ?? null;
  } catch { return null; }
}

void paint();
