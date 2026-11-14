import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const other = readFileSync(new URL('../other.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles/layout.css', import.meta.url), 'utf8');
describe('home exploration cards', () => {
  it('includes all navigation cards including Replays and Other Streams', () => {
    for (const path of ['cockpit','schedule','standings','live-timing','drivers','teams','replays','other-streams']) expect(home).toContain(`class="team-card" href="/${path}"`);
  });
  it('applies slower motion to home and Other cards and accommodates reduced motion', () => {
    expect(home).toContain('explore-cards'); expect(other).toContain('explore-cards'); expect(css).toContain('.explore-cards .team-card'); expect(css).toContain('transform .55s');
    expect(css).toMatch(/prefers-reduced-motion: reduce[^}]+\.explore-cards/s);
  });
});
