import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRosterCache, resultCacheFresh } from '../src/features/session-data-cache';

afterEach(() => vi.useRealTimers());
describe('session data caching', () => {
  it('shares roster requests per session, then refreshes after five minutes', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-01T12:00:00Z'));
    const get = createRosterCache<number>();
    const load = vi.fn().mockResolvedValueOnce([1]).mockResolvedValueOnce([1, 2]);
    expect(await Promise.all([get(4, load), get(4, load)])).toEqual([[1], [1]]);
    expect(await get(4, load)).toEqual([1]); expect(load).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(300_000);
    expect(await get(4, load)).toEqual([1, 2]); expect(load).toHaveBeenCalledTimes(2);
  });
  it('does not cache empty rosters or failures and isolates session keys', async () => {
    const get = createRosterCache<number>();
    const load = vi.fn().mockResolvedValueOnce([]).mockRejectedValueOnce(Error('offline')).mockResolvedValue([3]);
    expect(await get(1, load)).toEqual([]);
    await expect(get(1, load)).rejects.toThrow('offline');
    expect(await get(1, load)).toEqual([3]);
    expect(await get(2, load)).toEqual([3]); expect(load).toHaveBeenCalledTimes(4);
  });
  it('revalidates recent results hourly and older results daily, including legacy timestamps', () => {
    const now = Date.parse('2026-11-05T12:00:00Z');
    const recent = '2026-11-04T12:00:00Z', old = '2026-10-01T12:00:00Z';
    expect(resultCacheFresh(now - 3599_000, recent, now)).toBe(true);
    expect(resultCacheFresh(now - 3600_000, recent, now)).toBe(false);
    expect(resultCacheFresh(now - 23 * 3600_000, old, now)).toBe(true);
    expect(resultCacheFresh(now - 24 * 3600_000, old, now)).toBe(false);
    expect(resultCacheFresh(0, old, now)).toBe(false);
    expect(resultCacheFresh(now + 1, old, now)).toBe(false);
    expect(resultCacheFresh(now - 3600_000, null, now)).toBe(false);
  });
});
