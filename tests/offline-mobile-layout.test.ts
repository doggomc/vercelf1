import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const css = readFileSync(new URL('../src/styles/app.css',import.meta.url),'utf8');
describe('mobile offline messages', () => {
  it.each(['cockpit.html','private-cockpit.html','replay-cockpit.html'])('makes the status panel keyboard-scrollable in %s', name => {
    const html = readFileSync(new URL(`../${name}`,import.meta.url),'utf8');
    expect(html).toContain('id="noStream" role="region" aria-label="Stream status" tabindex="0"');
  });
  it('allows scrolling rather than clipping overflow while retaining the 16:9 player', () => {
    expect(css).toContain('.wplayer-stage { position: relative; aspect-ratio: 16 / 9;');
    expect(css).toMatch(/@media \(max-width: 600px\)\s*\{\s*\.wplayer-stage \.nostream\s*\{[^}]*overflow-y: auto/s);
    expect(css).toMatch(/\.wplayer-stage \.nostream\s*\{[^}]*overscroll-behavior-y: auto;[^}]*touch-action: pan-y/s);
    expect(css).toContain('.wplayer-stage .nostream > * { flex-shrink: 0; max-width: 100%; }');
    expect(css).toContain('overflow-wrap: anywhere');
  });
});
