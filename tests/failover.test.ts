import { describe, expect, it, vi } from 'vitest';
import { applyFailover, failoverDestination } from '../src/features/failover';
import { parseSiteConfig } from '../src/types/site-config';
describe('manual failover', () => {
  it('redirects only the main production site when enabled, preserving the route', () => {
    expect(failoverDestination('freef1-live.vercel.app', true, '/replays', '?e=1', '#top')).toBe('https://freef1-backup.vercel.app/replays?e=1#top');
    expect(failoverDestination('freef1-live.vercel.app', false, '/')).toBeNull();
    expect(failoverDestination('freef1-backup.vercel.app', true, '/')).toBeNull();
    expect(failoverDestination('example.com', true, '/')).toBeNull();
    expect(failoverDestination('freef1-live.vercel.app', true, '//evil.example')).toBe('https://freef1-backup.vercel.app//evil.example');
  });
  it('shows the standby message on backup and removes it when activated', () => {
    let stage: any = null;
    vi.stubGlobal('location', {hostname:'freef1-backup.vercel.app', pathname:'/', search:'', hash:'', replace:vi.fn()});
    vi.stubGlobal('document', {
      getElementById: () => stage,
      createElement: () => ({ style:{}, setAttribute:vi.fn(), innerHTML:'', remove: () => {stage = null;} }),
      body: { appendChild: (element: any) => { stage = element; } },
    });
    applyFailover(false);
    expect(stage.innerHTML).toContain('Backup site offline');
    expect(stage.innerHTML).toContain('The main site appears to be online.');
    expect(stage.innerHTML).toContain('Go to main site');
    expect(stage.innerHTML).toContain('Discord');
    applyFailover(true);
    expect(stage).toBeNull();
    vi.unstubAllGlobals();
  });
  it('only accepts a boolean setting', () => {
    expect(parseSiteConfig({failover:{active:true}})?.failover?.active).toBe(true);
    expect(parseSiteConfig({failover:{active:'true'}})?.failover).toBeUndefined();
  });
});
