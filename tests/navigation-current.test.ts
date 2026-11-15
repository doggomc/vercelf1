import { describe, expect, it } from 'vitest';
import { navigationPath } from '../src/ui/shell';

describe('navigation section for detail pages', () => {
  it('highlights Schedule for Grand Prix pages', () => {
    expect(navigationPath('/grand-prix/2026/australian-grand-prix/')).toBe('/schedule');
    expect(navigationPath('/schedule')).toBe('/schedule');
  });
  it('highlights Other for replays and other streams', () => {
    for (const path of ['/replays', '/replays/', '/other-streams', '/other-streams/']) expect(navigationPath(path)).toBe('/other');
  });
  it('preserves ordinary sections and nested driver and team pages', () => {
    for (const path of ['/', '/drivers/kimi-antonelli/', '/teams/mercedes/', '/standings']) expect(navigationPath(path)).toBe(path.replace(/\/+$/, '') || '/');
  });
});
