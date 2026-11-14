import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles/layout.css', import.meta.url), 'utf8');
describe('home exploration cards', () => {
  it('links to the main sections, including replays and other streams', () => {
    for (const path of ['cockpit','schedule','standings','live-timing','drivers','teams','replays','other-streams']) expect(home).toContain(`class="team-card" href="/${path}"`);
  });
  it('scopes the design to home and accommodates reduced motion', () => {
    expect(home).toContain('home-explore'); expect(css).toContain('.home-explore .team-card');
    expect(css).toMatch(/prefers-reduced-motion: reduce[^}]+\.home-explore/s);
  });
});
