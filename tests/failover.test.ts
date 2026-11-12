import { describe, expect, it } from 'vitest';
import { failoverDestination } from '../src/features/failover';
import { parseSiteConfig } from '../src/types/site-config';
describe('manual failover', () => {
  it('redirects only the main production site when enabled, preserving the route', () => {
    expect(failoverDestination('freef1-live.vercel.app', true, '/replays', '?e=1', '#top')).toBe('https://freef1-backup.vercel.app/replays?e=1#top');
    expect(failoverDestination('freef1-live.vercel.app', false, '/')).toBeNull();
    expect(failoverDestination('freef1-backup.vercel.app', true, '/')).toBeNull();
    expect(failoverDestination('example.com', true, '/')).toBeNull();
    expect(failoverDestination('freef1-live.vercel.app', true, '//evil.example')).toBe('https://freef1-backup.vercel.app//evil.example');
  });
  it('only accepts a boolean setting', () => {
    expect(parseSiteConfig({failover:{active:true}})?.failover?.active).toBe(true);
    expect(parseSiteConfig({failover:{active:'true'}})?.failover).toBeUndefined();
  });
});
