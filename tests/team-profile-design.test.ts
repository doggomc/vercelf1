import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
describe('team profile dossier', () => {
  it('preserves data, matching results and constructors table structure', () => {
    const html = readFileSync('team.html', 'utf8');
    for (const id of ['tpName','tpCar','tpStats','tpDriversGrid','tpFacts','tpProse','tpResultsBody','tpStandingsMini']) expect(html).toContain(`id="${id}"`);
    const css = readFileSync('src/styles/layout.css', 'utf8');
    expect(css).toMatch(/body\[data-page="team"\] \.dp-table th\s*\{[^}]*text-transform:\s*none/s);
    expect(css).toMatch(/body\[data-page="team"\] \.dp-table \.t-num\s*\{\s*text-align:\s*right/);
    expect(css).toMatch(/body\[data-page="team"\] \.dp-gp\s*\{[^}]*justify-content:\s*flex-start/s);
  });
  it('adds accessible icons to the team stats, facts and headings', () => {
    const html = readFileSync('team.html', 'utf8');
    expect((html.match(/class="dp-label-icon"/g) ?? []).length).toBe(14);
    expect(html).toContain('class="dp-fact-label"');
    expect(html).toContain('class="section-title dp-heading-icon"');
    const css = readFileSync('src/styles/layout.css', 'utf8');
    expect(css).toContain('body[data-page="team"] .dp-stat-label .dp-label-icon { color: var(--team); }');
  });
});
