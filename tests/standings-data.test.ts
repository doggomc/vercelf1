import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); vi.resetModules(); });
describe('shared standings requests', () => {
  it('coalesces matching requests, keeps endpoints separate, and refreshes after a minute', async () => {
    vi.useFakeTimers();
    const fetch = vi.fn(async (_url: string) => new Response('{"ok":true}'));
    vi.stubGlobal('fetch', fetch);
    const { fetchStandings } = await import('../src/services/standings-data');
    const both = await Promise.all([fetchStandings('driverstandings'), fetchStandings('driverstandings')]);
    expect(both).toEqual([{ ok: true }, { ok: true }]); expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(fetch.mock.calls[0][0])).toContain('/driverstandings/?limit=100');
    await fetchStandings('constructorstandings'); expect(fetch).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(60_000); await fetchStandings('driverstandings'); expect(fetch).toHaveBeenCalledTimes(3);
  });
  it('clears a failed request so the next call can retry', async () => {
    const fetch = vi.fn().mockRejectedValueOnce(Error('offline')).mockResolvedValueOnce(new Response('{}'));
    vi.stubGlobal('fetch', fetch);
    const { fetchStandings } = await import('../src/services/standings-data');
    await expect(fetchStandings('driverstandings')).rejects.toThrow('offline');
    await expect(fetchStandings('driverstandings')).resolves.toEqual({});
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
