import type { OtherStreamItem, OtherStreamProvider } from './other-streams';
import { otherStreamSection } from './stream-order';

/** Preserve only feeds belonging to providers whose refresh failed. */
export function retainFailedProviderFeeds(fresh: OtherStreamItem[], previous: OtherStreamItem[], failed: readonly OtherStreamProvider[]): OtherStreamItem[] {
  const keys = new Set(fresh.map(item => item.key));
  return [...fresh, ...previous.filter(item => failed.includes(item.provider) && !keys.has(item.key))];
}

/** Match only exact normalized always-on channel names; never collapse events. */
export function groupDirectoryChannels(items: OtherStreamItem[]): OtherStreamItem[][] {
  const groups = new Map<string, OtherStreamItem[]>();
  items.forEach(item => {
    const name = item.title.toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
    const key = item.alwaysLive && name ? `channel:${otherStreamSection(item)}:${item.category}:${name}` : `event:${item.key}`;
    const group = groups.get(key) || []; group.push(item); groups.set(key, group);
  });
  return [...groups.values()];
}
