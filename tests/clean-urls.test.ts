import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolvePageCategory } from '../src/features/page-gate';

describe('clean public URLs', () => {
  const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  const redirects = readFileSync(new URL('../site-assets/_redirects', import.meta.url), 'utf8');
  it('uses Vercel clean URLs without redirects or rewrites back to html files', () => {
    expect(config.cleanUrls).toBe(true);
    expect(config.redirects.every((r: any) => !r.destination.endsWith('.html'))).toBe(true);
    expect(config.rewrites.every((r: any) => !r.destination.endsWith('.html'))).toBe(true);
    expect(config.rewrites).toContainEqual({ source: '/info', destination: '/' });
    expect(config.rewrites).toContainEqual({ source: '/discord', destination: '/' });
  });
  it.each(['cockpit', 'schedule', 'standings', 'drivers', 'teams', 'other', 'replays', 'other-streams', 'private-cockpit', 'replay-cockpit', 'live-timing', 'help', 'maintenance'])('keeps %s clean and supports its old URL in development', (name) => {
    expect(redirects).toContain(`/${name}.html /${name} 301`);
    expect(redirects).toContain(`/${name} /${name}.html 200`);
  });
  it('maps clean and legacy special cockpit routes to the right outage category', () => {
    for (const suffix of ['', '.html']) {
      expect(resolvePageCategory('private-cockpit', `/replay-cockpit${suffix}`)).toBe('replays');
      expect(resolvePageCategory('private-cockpit', `/private-cockpit${suffix}`)).toBe('other-streams');
    }
  });
});
