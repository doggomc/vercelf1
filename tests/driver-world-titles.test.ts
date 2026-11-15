import { describe, expect, it } from 'vitest';
import { driverWorldTitles } from '../src/data/driver-world-titles';
import { readFileSync } from 'node:fs';
describe('driver world titles', () => {
  it('shows completed titles through 2025 without guessing for unknown drivers', () => {
    expect(driverWorldTitles('hamilton')).toBe(7);
    expect(driverWorldTitles('max_verstappen')).toBe(4);
    expect(driverWorldTitles('alonso')).toBe(2);
    expect(driverWorldTitles('norris')).toBe(1);
    expect(driverWorldTitles('antonelli')).toBe(0);
    expect(driverWorldTitles('unknown')).toBeNull();
  });
  it('places world titles last, without the duplicated team fact', () => {
    const html = readFileSync('driver.html', 'utf8');
    expect(html).not.toContain('id="factTeam"');
    expect(html.indexOf('id="factTitles"')).toBeGreaterThan(html.indexOf('id="factDebut"'));
  });
});
