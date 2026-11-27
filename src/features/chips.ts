/* Race Control's per-chip name and link.
   Loaded the first time a site snapshot arrives, so the editing path costs the startup bundle
   nothing: most visitors never see a snapshot field they would use. */
import type { StreamSource } from './chip-types';
import { isStreamRelayUrl } from '../lib/stream-relays';
import { isDirectStreamfreeSkyUrl } from '../lib/direct-streamfree';

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

function isRacingLapBackup(value: unknown): value is string {
  try {
    if (typeof value !== 'string' || value.length > 512) return false;
    const u = new URL(value);
    const key = u.pathname === '/beta' ? 'stream' : u.pathname === '/at' ? 'id' : '';
    return u.protocol === 'https:' && u.hostname === 'weellz.live' && !u.username && !u.password && !u.port && !u.hash && !!key && [...u.searchParams.keys()].every(k => k === key) && u.searchParams.getAll(key).length === 1 && /^[A-Za-z0-9_-]{3,180}$/.test(u.searchParams.get(key) || '');
  } catch { return false; }
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
  const signature = JSON.stringify({ disabled: payload?.disabled || [], overrides: payload?.overrides || {}, custom: payload?.custom || [], order: payload?.order || [], autoStreams: payload?.autoStreams === true, relaysDisabled: payload?.relaysDisabled === true, autoEntries: payload?.autoEntries || [] });
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
  builtins.forEach(source => {
    const override = overrides[source.id];
    // A control-plane override must not turn the direct stripped Sky source into a relay.
    setChip(source, source.id === 'sky-strmfree' && override?.url && !isDirectStreamfreeSkyUrl(override.url) ? {...override, url: undefined} : override);
    const relayOverride = source.links.some(link => link.provider === 'custom' && isStreamRelayUrl(link.url));
    source.hidden = payload?.autoStreams === true || disabled.has(source.id) ||
      (payload?.relaysDisabled === true && ((source.stripped && source.id !== 'sky-strmfree') || relayOverride));
  });
  custom.forEach(source => { source.hidden = payload?.autoStreams === true || disabled.has(source.id) || (payload?.relaysDisabled === true && source.links.some(link => isStreamRelayUrl(link.url))); });
  const automatic: StreamSource[] = payload?.autoStreams && Array.isArray(payload?.autoEntries) ? payload.autoEntries.flatMap((item: any) => {
    const original: StreamSource = {
    id: item.id, label: item.label, lang: item.tab === 'other' ? 'other' : 'en',
    managedAuto: true, autoProvider: item.provider, autoTag: item.tag,
    eventSession: ['bintv','weelo'].includes(item.provider) && typeof item.eventSession === 'string' ? item.eventSession.slice(0,120) : undefined,
    eventStart: item.provider === 'weelo' && Number.isFinite(item.eventStart) ? item.eventStart : undefined,
    weelo: item.provider === 'weelo' ? new URL(item.url).searchParams.get('stream') || undefined : undefined,
    special: ['onboard', 'data', 'feed'].includes(item.special) ? item.special : undefined,
    links: [{ provider: 'custom', quality: 0, url: item.url }, ...(item.provider === 'weelo' && Array.isArray(item.backups) ? item.backups.filter((url: unknown) => isRacingLapBackup(url)).slice(0,5).map((url: string) => ({ provider: 'custom', quality: 0, url })) : [])]
    };
    // Replace the ordinary StreamFree player with its sandboxed direct version.
    // Keep the original ID so Race Control ordering and disabled settings still apply.
    if (item.provider === 'strmfree') return [{...original, stripped: true, sandboxDirect: true}];
    return [original];
  }) : [];
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
