import { describe, expect, it, vi } from 'vitest';
import { applyFailover, failoverDestination, initializeBackupGate } from '../src/features/failover';
import { parseSiteConfig } from '../src/types/site-config';
describe('manual failover', () => {
  it('redirects only the main production site when enabled, preserving the route', () => {
    expect(failoverDestination('freef1-live.vercel.app', true, '/replays', '?e=1', '#top')).toBe('https://freef1-backup.vercel.app/replays?e=1&__ff_handoff=1#top');
    expect(failoverDestination('freef1-live.vercel.app', false, '/')).toBeNull();
    expect(failoverDestination('freef1-backup.vercel.app', true, '/')).toBeNull();
    expect(failoverDestination('example.com', true, '/')).toBeNull();
    expect(failoverDestination('freef1-live.vercel.app', true, '//evil.example')).toBe('https://freef1-backup.vercel.app//evil.example?__ff_handoff=1');
  });
  it('shows the standby message on backup and removes it when activated', () => {
    let stage: any = null;
    vi.stubGlobal('location', {hostname:'freef1-backup.vercel.app', pathname:'/', search:'', hash:'', replace:vi.fn()});
    vi.stubGlobal('document', {
      getElementById: () => stage,
      createElement: () => ({ style:{}, setAttribute:vi.fn(), innerHTML:'', remove: () => {stage = null;} }),
      body: { appendChild: (element: any) => { stage = element; } },
    });
    initializeBackupGate();
    expect(stage.innerHTML).toContain('Checking site status');
    expect(stage.innerHTML).not.toContain('Backup site offline');
    applyFailover(false);
    expect(stage.innerHTML).toContain('Backup site offline');
    expect(stage.innerHTML).toContain('The main site appears to be online.');
    expect(stage.innerHTML).toContain('Go to main site');
    expect(stage.innerHTML).toContain('Discord');
    applyFailover(true);
    expect(stage).toBeNull();
    vi.unstubAllGlobals();
  });
  it('keeps a redirected visitor on a neutral screen while the backup catches up', async () => {
    vi.resetModules(); vi.useFakeTimers();
    let stage: any = null;
    vi.stubGlobal('location', {hostname:'freef1-backup.vercel.app', pathname:'/replays', search:'?__ff_handoff=1', hash:'', replace:vi.fn()});
    vi.stubGlobal('history', {state:null, replaceState:vi.fn()});
    vi.stubGlobal('document', {
      getElementById: () => stage,
      createElement: () => ({style:{}, setAttribute:vi.fn(), innerHTML:'', remove:() => {stage = null;}}),
      body: {appendChild:(el: any) => {stage = el;}},
    });
    const module = await import('../src/features/failover');
    module.applyFailover(false);
    expect(stage.innerHTML).toContain('Checking site status');
    expect(stage.innerHTML).not.toContain('Backup site offline');
    vi.advanceTimersByTime(10000);
    expect(stage.innerHTML).not.toContain('Backup site offline');
    module.applyFailover(true);
    expect(stage).toBeNull();
    vi.advanceTimersByTime(10000);
    expect(stage).toBeNull();
    vi.useRealTimers(); vi.unstubAllGlobals();
  });
  it('only accepts a boolean setting', () => {
    expect(parseSiteConfig({failover:{active:true}})?.failover?.active).toBe(true);
    expect(parseSiteConfig({failover:{active:'true'}})?.failover).toBeUndefined();
  });
});
