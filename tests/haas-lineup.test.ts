import { describe, expect, it } from 'vitest';
import { haasBrazilLineup, haasSeasonRole } from '../src/data/driver-lineup';
import { teammateOf } from '../src/pages/driver-season';
import type { StandingRow } from '../src/pages/driver-core';
const row = (id: string, team = 'haas'): StandingRow => ({ position:'1', points:'0', wins:'0', Driver:{driverId:id, givenName:id, familyName:id}, Constructors:[{constructorId:team, name:team}] });
describe('Haas replacement drivers', () => {
  const rows = [row('bearman'), row('ocon'), row('ryo_hirakawa'), row('rafael_camara')];
  it('selects the confirmed São Paulo lineup, not the two highest scorers', () => {
    expect(haasBrazilLineup(rows).map(r=>r.Driver.driverId)).toEqual(['bearman','rafael_camara']);
    expect(haasBrazilLineup(rows.filter(r=>r.Driver.driverId !== 'rafael_camara')).map(r=>r.Driver.driverId)).toEqual(['bearman']);
  });
  it('uses São Paulo teammates and labels earlier entries separately', () => {
    expect(teammateOf(rows, rows[0].Driver)?.Driver.driverId).toBe('rafael_camara');
    expect(teammateOf(rows, rows[3].Driver)?.Driver.driverId).toBe('bearman');
    expect(teammateOf(rows, rows[1].Driver)?.Driver.driverId).toBe('bearman');
    expect(haasSeasonRole('ocon')).toBe('former');
    expect(haasSeasonRole('ryo_hirakawa')).toBe('mexico-stand-in');
    expect(haasSeasonRole('unknown')).toBeNull();
  });
  it('does not falsely substitute an old teammate when Câmara is missing', () => {
    expect(teammateOf(rows.slice(0,3), rows[0].Driver)).toBeNull();
  });
});
