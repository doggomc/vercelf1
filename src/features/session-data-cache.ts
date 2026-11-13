/** Session rosters can change; reuse successful nonempty responses briefly. */
export function createRosterCache<T>(ttl = 5 * 60_000) {
  const entries = new Map<number, { at: number; data: T[] }>();
  const pending = new Map<number, Promise<T[]>>();
  return async (key: number, load: () => Promise<T[]>): Promise<T[]> => {
    const cached = entries.get(key);
    if (cached && Date.now() >= cached.at && Date.now() - cached.at < ttl) return cached.data;
    const inFlight = pending.get(key);
    if (inFlight) return inFlight;
    const task = Promise.resolve().then(load).then(data => {
      if (Array.isArray(data) && data.length) {
        if (entries.size >= 20 && !entries.has(key)) entries.delete(entries.keys().next().value!);
        entries.set(key, { at: Date.now(), data });
      }
      return data;
    });
    pending.set(key, task);
    try { return await task; } finally { pending.delete(key); }
  };
}

/** Recent classifications refresh hourly; older ones still revalidate daily. */
export function resultCacheFresh(savedAt: unknown, sessionStart: unknown, now = Date.now()): boolean {
  const at = Number(savedAt);
  if (!Number.isFinite(at) || at <= 0 || at > now) return false;
  const start = typeof sessionStart === 'string' ? Date.parse(sessionStart) : NaN;
  const recent = !Number.isFinite(start) || now - start < 48 * 3600_000;
  return now - at < (recent ? 3600_000 : 24 * 3600_000);
}
