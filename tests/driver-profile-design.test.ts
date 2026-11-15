import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
describe('driver profile design', () => {
  it('keeps all dynamic fields and adds decorative accessible icons', () => {
    const html = readFileSync('driver.html', 'utf8');
    for (const id of ['dpName','dpPhoto','statChamp','statPoints','statWins','statPodiums','statPoles','statBest','dpFacts','dpResultsBody','dpTeammate']) expect(html).toContain(`id="${id}"`);
    expect((html.match(/class="dp-label-icon"[^>]*aria-hidden="true"/g) || []).length).toBeGreaterThanOrEqual(14);
    expect(readFileSync('src/styles/layout.css', 'utf8')).toMatch(/\.dp-heading-icon\s*\{[^}]*align-items:\s*center/s);
    expect(html).not.toContain('RACE BY RACE');
    expect(html).not.toContain('THE DRIVER');
    expect(html.indexOf('id="dpTeammateCard"')).toBeLessThan(html.indexOf('<aside class="dp-side"'));
    expect(html).toContain('id="dpTeamCard"');
    expect(html).toContain('id="dpStandings"');
    for (const header of ['Pos', 'Driver', 'Pts']) expect(html).toContain(`scope="col">${header}</th>`);
  });
});
