import { describe, it, expect } from 'vitest';
import { availableTimingSessions, latestTimingMeeting, fetchTimingSessions } from '../src/features/timing-sessions';
import type { OpenF1Session } from '../src/pages/live-timing-feed';
const row = (session_key: number, meeting_key: number, date_start: string) => ({session_key,meeting_key,date_start,session_name:'Session',session_type:'Practice',date_end:date_start} as OpenF1Session);
const now = Date.parse('2026-11-07T16:00:00Z');
describe('timing session availability', () => {
  const all = [row(5,2,'2026-11-08T17:00:00Z'),row(1,1,'2026-10-25T15:00:00Z'),row(3,2,'2026-11-07T14:30:00Z'),row(2,2,'2026-11-06T15:30:00Z'),row(4,2,'2026-11-07T18:00:00Z')];
  it('does not select a future latest race and orders started sessions', () => {
    expect(availableTimingSessions(all.filter(s=>s.meeting_key===2),now).map(s=>s.session_key)).toEqual([2,3]);
  });
  it('finds the latest started meeting from a season fallback', () => {
    expect(latestTimingMeeting(all,now).map(s=>s.session_key)).toEqual([2,3]);
  });
});

it('falls back to the season listing when the latest endpoint fails', async () => {
  const now = new Date();
  const date = new Date(now.getTime() - 3600000).toISOString();
  const calls: Record<string, string | number>[] = [];
  const result = await fetchTimingSessions(async params => { calls.push(params); if ('session_key' in params) throw new Error('offline'); return [row(22, 4, date)]; });
  expect(result.map(s => s.session_key)).toEqual([22]);
  expect(calls[1]).toHaveProperty('year');
});
