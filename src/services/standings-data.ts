import { JOLPI, SITE_SEASON } from '../config';

// The table and progression graphs share both in-flight and recent responses.
const cache = new Map<string, { expires: number; request: Promise<any> }>();
export function fetchStandings(endpoint: 'driverstandings' | 'constructorstandings'): Promise<any> {
  const existing = cache.get(endpoint);
  if (existing && existing.expires > Date.now()) return existing.request;
  const request = fetch(`${JOLPI}/${SITE_SEASON}/${endpoint}/?limit=100`, {
    headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(12000),
  }).then(response => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }).catch(error => { if (cache.get(endpoint)?.request === request) cache.delete(endpoint); throw error; });
  cache.set(endpoint, { expires: Date.now() + 60_000, request });
  return request;
}
