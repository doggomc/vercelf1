import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
describe('site-wide dark palette', () => {
  it('uses dark distinct page, card and hover surfaces', () => {
    const css = readFileSync('src/styles/layout.css', 'utf8');
    expect(css).toContain('--page: #090a0c;');
    expect(css).toContain('--card: #121317;');
    expect(css).toContain('--card-2: #1b1c20;');
    expect(css).toContain('.driver-card:hover');
    expect(css).toContain('body[data-page="driver"] .dp-panel');
  });
  it('darkens cockpit and shared navigation without changing text tokens', () => {
    const css = readFileSync('src/styles/app.css', 'utf8');
    expect(css).toContain('--ink: #08090a;');
    expect(css).toContain('--text: #F5F6F7;');
    expect(css).toContain('--page: #090a0c;');
  });
});
