import type { OtherStreamItem, OtherStreamProvider } from './other-streams';

/** Preserve only feeds belonging to providers whose refresh failed. */
export function retainFailedProviderFeeds(fresh: OtherStreamItem[], previous: OtherStreamItem[], failed: readonly OtherStreamProvider[]): OtherStreamItem[] {
  const keys = new Set(fresh.map(item => item.key));
  return [...fresh, ...previous.filter(item => failed.includes(item.provider) && !keys.has(item.key))];
}

