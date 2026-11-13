import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountCockpitViewerCount } from '../src/features/cockpit-viewers';

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });
describe('private cockpit viewer count', () => {
  it('keeps the counter source hidden when the socket starts', async () => {
    const source: any = { hidden: true, dataset: {}, getAttribute: () => 'true', setAttribute: vi.fn(), title: '' };
    const count: any = { textContent: '' };
    vi.stubGlobal('document', { querySelector: () => ({ content: 'wss://freef1-viewer-counter.calvinbotha1julie.workers.dev/ws' }), getElementById: (id: string) => id === 'viewerCounter' ? source : count });
    vi.stubGlobal('window', { location: { href:'https://freef1-live.vercel.app' }, addEventListener:vi.fn(), setTimeout, clearTimeout });
    class Socket { static CONNECTING = 0; static OPEN = 1; static CLOSING = 2; readyState=0; addEventListener() {} }
    vi.stubGlobal('WebSocket', Socket);
    await import('../src/viewer-counter');
    expect(source.hidden).toBe(true);
    expect(count.textContent).toBe('—');
  });
  it('shows formatted counts in the cockpit badge and hides unavailable counts', () => {
    const source: any = { textContent: '—' }, badge: any = { hidden: false }, count: any = { textContent: '' };
    let update: () => void = () => {};
    vi.stubGlobal('document', { getElementById: (id: string) => ({ viewerCount:source, theaterOnline:badge, theaterOnlineCount:count } as any)[id] });
    vi.stubGlobal('MutationObserver', class { constructor(fn: () => void) { update = fn; } observe() {} });
    mountCockpitViewerCount(); expect(badge.hidden).toBe(true);
    source.textContent='1,234'; update(); expect(count.textContent).toBe('1,234'); expect(badge.hidden).toBe(false);
    source.textContent='—'; update(); expect(badge.hidden).toBe(true);
  });
});
