/* Cumulative points from Jolpica's classified race and sprint results. No backend proxy. */
import { JOLPI, SITE_SEASON } from '../config';
import { fetchStandings } from '../services/standings-data';
const TEAM_HEX: Record<string, string> = { 'McLaren':'#FF8000', 'Ferrari':'#DC0000', 'Red Bull':'#1E41FF', 'Mercedes':'#00D2BE', 'Williams':'#005AFF', 'Aston Martin':'#006F62', 'Alpine F1 Team':'#FF0080', 'Alpine':'#FF0080', 'Haas F1 Team':'#B6BABD', 'Haas':'#B6BABD', 'Audi':'#E62213', 'Sauber':'#00E701', 'RB F1 Team':'#6692FF', 'Racing Bulls':'#6692FF', 'Cadillac F1 Team':'#B4A07A', 'Cadillac':'#B4A07A' };
const teamName = (name: string) => ({'Red Bull':'Red Bull Racing','RB F1 Team':'Racing Bulls','Alpine F1 Team':'Alpine','Haas F1 Team':'Haas','Cadillac F1 Team':'Cadillac'} as Record<string,string>)[name] || name;


type Standing = { points: string; Driver?: { driverId: string; givenName: string; familyName: string; code?: string }; Constructors?: { name: string }[]; Constructor?: { constructorId: string; name: string } };
type Result = { points: string; Driver: { driverId: string }; Constructor: { constructorId: string } };
type Race = { round: string; Results?: Result[]; SprintResults?: Result[] };
export type Series = { id: string; label: string; name: string; color: string; dashed: boolean; values: number[] };
export type Progression = { rounds: number[]; drivers: Series[]; constructors: Series[] };

export function calculateProgression(drivers: Standing[], constructors: Standing[], races: Race[], sprints: Race[], throughRound: number): Progression {
  const rounds = [...new Set(races.map(r => Number(r.round)).filter(r => Number.isInteger(r) && r > 0 && r <= throughRound))].sort((a,b) => a-b);
  if (!rounds.length || rounds[rounds.length - 1] !== throughRound || rounds.some((r, i) => r !== i + 1)) throw Error('Race results are incomplete');
  const build = (rows: Standing[], driver: boolean): Series[] => rows.slice(0, 6).map(row => {
    const person = row.Driver;
    const id = driver ? person?.driverId : row.Constructor?.constructorId;
    if (!id) throw Error('Standings are incomplete');
    const name = driver ? `${person!.givenName} ${person!.familyName}` : teamName(row.Constructor!.name);
    const label = driver ? (person!.code || person!.familyName.slice(0,3).toUpperCase()) : name.split(' ')[0];
    const team = driver ? row.Constructors?.[0]?.name || '' : row.Constructor!.name;
    let sum = 0;
    const values = rounds.map(round => {
      for (const race of [...races, ...sprints]) {
        if (Number(race.round) !== round) continue;
        for (const result of race.Results || race.SprintResults || []) {
          if ((driver ? result.Driver?.driverId : result.Constructor?.constructorId) !== id) continue;
          const points = Number(result.points);
          if (!Number.isFinite(points)) throw Error('Invalid points');
          sum += points;
        }
      }
      return sum;
    });
    // Never silently display a reconstruction that disagrees with the official standings.
    if (Math.abs(sum - Number(row.points)) > 0.001 || !Number.isFinite(Number(row.points))) throw Error('Results and standings are not yet in sync');
    return { id, name, label, color: TEAM_HEX[team] || '#9298a6', dashed: false, values };
  });
  const driverSeries = build(drivers, true);
  const colors = new Map<string, number>();
  driverSeries.forEach(s => { const n = colors.get(s.color) || 0; s.dashed = n % 2 === 1; colors.set(s.color, n+1); });
  return { rounds, drivers: driverSeries, constructors: build(constructors, false) };
}

async function getJson(url: string): Promise<any> {
  const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw Error(`Standings data HTTP ${response.status}`);
  return response.json();
}
async function results(kind: 'results' | 'sprint'): Promise<Race[]> {
  const pages: Race[] = [];
  let offset = 0, total = 0;
  do {
    const data = await getJson(`${JOLPI}/${SITE_SEASON}/${kind}.json?limit=100&offset=${offset}`);
    const mr = data?.MRData;
    const chunk = mr?.RaceTable?.Races;
    total = Number(mr?.total);
    if (!Array.isArray(chunk) || !Number.isFinite(total) || total < 0) throw Error('Invalid results');
    const count = chunk.reduce((n: number, race: Race) => n + (race.Results || race.SprintResults || []).length, 0);
    if (!count && offset < total) throw Error('Incomplete results');
    pages.push(...chunk); offset += count;
  } while (offset < total);
  return pages;
}

const CACHE_KEY = `freef1_progression_${SITE_SEASON}`;
const CACHE_MS = 15 * 60_000;
export async function loadProgression(): Promise<Progression> {
  const [driverData, constructorData] = await Promise.all((['driverstandings','constructorstandings'] as const).map(fetchStandings));
  const dl = driverData?.MRData?.StandingsTable?.StandingsLists?.[0];
  const cl = constructorData?.MRData?.StandingsTable?.StandingsLists?.[0];
  const drivers: Standing[] = dl?.DriverStandings, constructors: Standing[] = cl?.ConstructorStandings;
  const round = Number(dl?.round);
  if (!Array.isArray(drivers) || !drivers.length || !Array.isArray(constructors) || !constructors.length || !Number.isInteger(round) || round <= 0 || round !== Number(cl?.round)) throw Error('Standings are not yet available');
  const signature = JSON.stringify([round, drivers.slice(0,6).map(r => [r.Driver?.driverId,r.points,r.Constructors?.[0]?.name]), constructors.slice(0,6).map(r => [r.Constructor?.constructorId,r.points])]);
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (cached?.signature === signature && cached.savedAt <= Date.now() && Date.now() - cached.savedAt < CACHE_MS && cached.data?.rounds?.length) return cached.data;
  } catch { /* fetch fresh data */ }
  const [races, sprints] = await Promise.all([results('results'), results('sprint')]);
  const data = calculateProgression(drivers, constructors, races, sprints, round);
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ signature, savedAt: Date.now(), data })); } catch { /* storage may be unavailable */ }
  return data;
}
