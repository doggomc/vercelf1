import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
describe('private cockpit player sizing', () => {
  it('keeps the full player visible and allows scrolling when controls need space', () => {
    const html = readFileSync(new URL('../private-cockpit.html', import.meta.url), 'utf8');
    expect(html).toMatch(/body\[data-page="private-cockpit"\]\.theater \.wplayer\s*\{\s*flex:\s*0 0 auto/);
    expect(html).toMatch(/body\[data-page="private-cockpit"\]\.theater \.wrap\.watch-grid\s*\{\s*overflow-y:\s*auto/);
    expect(html).toMatch(/body\[data-page="private-cockpit"\]\.theater \.watch-main\s*\{\s*height:\s*auto/);
  });
});
