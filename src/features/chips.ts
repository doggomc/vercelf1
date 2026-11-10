/* Race Control's per-chip name and link.
   Loaded the first time a site snapshot arrives, so the editing path costs the startup bundle
   nothing: most visitors never see a snapshot field they would use. */
import type { StreamSource } from './chip-types';

export interface ChipOverrides { [id: string]: { label?: string; url?: string } }
let previousSignature = '';
const defaultOrder = new WeakMap<StreamSource[], string[]>();

/* A custom address replaces the chip's pool outright; clearing the field brings the pool straight
   back. The shipped name and links are remembered the first time a chip is touched. */
export function setChip(source: StreamSource, custom: { label?: string; url?: string } = {}) {
  source.base ||= { label: source.label, links: source.links };
  source.label = custom.label || source.base.label;
  source.links = custom.url ? [{ provider: 'custom', quality: 0, url: custom.url }] : source.base.links;
}

/* Keep the last applied overrides here, so app.ts does not need a variable for them. */
export function applySourceConfig(payload: any, host: {
  sources: StreamSource[];
  current: () => number;
  setCurrent: (index: number) => void;
  usable: (source: StreamSource | undefined) => boolean;
  normalize: () => void;
  render: () => void;
  reload: () => void;
}) {
  const signature = JSON.stringify({ disabled: payload?.disabled || [], overrides: payload?.overrides || {}, custom: payload?.custom || [], order: payload?.order || [], autoStreams: payload?.autoStreams === true, autoEntries: payload?.autoEntries || [] });
  if (signature === previousSignature) return;
  previousSignature = signature;
  const previous = host.sources[host.current()];
  const previousId = previous?.id;
  const previousUrl = previous?.links?.[0]?.provider === 'custom' ? previous.links[0].url : '';
  const builtins = host.sources.filter(source => !source.managedCustom && !source.managedAuto);
  if (!defaultOrder.has(host.sources)) defaultOrder.set(host.sources, builtins.map(source => source.id));
  const custom: StreamSource[] = (Array.isArray(payload?.custom) ? payload.custom : []).map((item: any) => ({
    id: item.id, label: item.label, lang: item.tab === 'other' ? 'other' : 'en',
    managedCustom: true, links: [{ provider: 'custom', quality: 0, url: item.url }]
  }));
  const disabled = new Set<string>(Array.isArray(payload?.disabled) ? payload.disabled : []);
  const overrides: ChipOverrides = payload?.overrides || {};
  builtins.forEach(source => { source.hidden = payload?.autoStreams === true || disabled.has(source.id); setChip(source, overrides[source.id]); });
  custom.forEach(source => { source.hidden = payload?.autoStreams === true || disabled.has(source.id); });
  const automatic: StreamSource[] = payload?.autoStreams && Array.isArray(payload?.autoEntries) ? payload.autoEntries.map((item: any) => ({
    id: item.id, label: item.label, lang: item.tab === 'other' ? 'other' : 'en',
    managedAuto: true, autoProvider: item.provider, autoTag: item.tag,
    weelo: item.provider === 'weelo' ? new URL(item.url).searchParams.get('stream') || undefined : undefined,
    special: ['onboard', 'data', 'feed'].includes(item.special) ? item.special : undefined,
    links: [{ provider: 'custom', quality: 0, url: item.url }]
  })) : [];
  const combined = [...builtins, ...custom, ...automatic];
  const rank = new Map<string, number>((Array.isArray(payload?.order) ? payload.order : []).map((id: string, i: number) => [id, i]));
  const baseline = new Map((defaultOrder.get(host.sources) || []).map((id, index) => [id, index]));
  combined.sort((a,b) => (rank.get(a.id) ?? 1e6) - (rank.get(b.id) ?? 1e6) || (baseline.get(a.id) ?? 1e6) - (baseline.get(b.id) ?? 1e6));
  host.sources.splice(0, host.sources.length, ...combined);
  const index = combined.findIndex(source => source.id === previousId);
  host.setCurrent(index);
  const selected = combined[index];
  const stillUsable = host.usable(selected);
  if (!stillUsable) host.normalize();
  host.render();
  const selectedUrl = selected?.links?.[0]?.provider === 'custom' ? selected.links[0].url : '';
  if (!stillUsable || previousUrl !== selectedUrl) host.reload();
}
