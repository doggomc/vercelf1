import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
describe('driver profile design', () => {
  it('keeps all dynamic fields and adds decorative accessible icons', () => {
    const html = readFileSync('driver.html', 'utf8');
    for (const id of ['dpName','dpPhoto','statChamp','statPoints','statWins','statPodiums','statPoles','statBest','dpFacts','dpResultsBody','dpTeammate','dpForm','dpNext']) expect(html).toContain(`id="${id}"`);
    expect((html.match(/class="dp-icon"/g) || []).length).toBeGreaterThanOrEqual(12);
    expect((html.match(/class="dp-icon"[^>]*aria-hidden="true"/g) || []).length).toBeGreaterThanOrEqual(12);
  });
});
