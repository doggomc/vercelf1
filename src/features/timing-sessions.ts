import type { OpenF1Session } from '../pages/live-timing-feed';

/** OpenF1's "latest" can be a future scheduled race. Only offer sessions that
 * have started (with a small clock-skew allowance), using their actual meeting. */
export function availableTimingSessions(rows: OpenF1Session[], now = Date.now()): OpenF1Session[] {
  return rows.filter(s => Number.isFinite(s.session_key) && Number.isFinite(s.meeting_key) && Number.isFinite(Date.parse(s.date_start)) && Date.parse(s.date_start) <= now + 10 * 60_000)
    .sort((a, b) => Date.parse(a.date_start) - Date.parse(b.date_start));
}
export function latestTimingMeeting(rows: OpenF1Session[], now = Date.now()): OpenF1Session[] {
  const started = availableTimingSessions(rows, now);
  const meeting = started.at(-1)?.meeting_key;
  return meeting === undefined ? [] : started.filter(s => s.meeting_key === meeting);
}

export async function fetchTimingSessions(fetchSessions: (params: Record<string, string | number>) => Promise<OpenF1Session[]>): Promise<OpenF1Session[]> {
  try {
    const latest = (await fetchSessions({ session_key: 'latest' })).at(-1);
    if (latest) {
      const sessions = availableTimingSessions(await fetchSessions({ meeting_key: latest.meeting_key }));
      if (sessions.length) return sessions;
    }
  } catch { /* Fall back to the season listing. */ }
  return latestTimingMeeting(await fetchSessions({ year: new Date().getUTCFullYear() }));
}
