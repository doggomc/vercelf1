import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
describe('private cockpit player sizing', () => {
  it('keeps the full player visible and allows scrolling when controls need space', () => {
    const html = readFileSync(new URL('../private-cockpit.html', import.meta.url), 'utf8');
    expect(html).toMatch(/body\[data-page="private-cockpit"\]\.theater \.wplayer\s*\{\s*flex:\s*0 0 auto/);
    expect(html).toMatch(/body\[data-page="private-cockpit"\]\.theater \.wrap\.watch-grid\s*\{\s*overflow-y:\s*auto/);
    expect(html).toMatch(/body\[data-page="private-cockpit"\]\.theater \.watch-main\s*\{\s*height:\s*auto/);
  });
  it('protects the main cockpit theater player too', () => {
    const css = readFileSync(new URL('../src/styles/app.css', import.meta.url), 'utf8');
    expect(css).toMatch(/body\[data-page="cockpit"\]\.theater #watch \.wplayer\s*\{\s*flex:\s*0 0 auto/);
    expect(css).toMatch(/body\[data-page="cockpit"\]\.theater #watch \.wrap\.watch-grid\s*\{\s*overflow-y:\s*auto/);
  });
});
