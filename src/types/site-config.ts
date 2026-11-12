export type ControllablePageId =
  | 'cockpit'
  | 'schedule'
  | 'standings'
  | 'live-timing'
  | 'drivers'
  | 'teams'
  | 'other'
  | 'replays'
  | 'other-streams'
  | 'help';

const VALID_PAGE_IDS = new Set<ControllablePageId>([
  'cockpit',
  'schedule',
  'standings',
  'live-timing',
  'drivers',
  'teams',
  'other',
  'replays',
  'other-streams',
  'help',
]);

export interface Maintenance { active: boolean; message?: string; eta?: string; startedAt?: number; updatedAt?: number; }
export interface PageControl { disabled: ControllablePageId[]; updatedAt?: number; }
export interface StreamOverride { active: boolean; url?: string; type?: string; }
export interface StreamWindow { active: boolean; reason?: string; startedAt?: number; updatedAt?: number; }
export interface SiteConfig {
  failover?: { active: boolean; updatedAt?: number };
  maintenance?: Maintenance;
  pages?: PageControl;
  streamOverride?: StreamOverride;
  sources?: { autoStreams?: boolean; relaysDisabled?: boolean; disabled: string[]; overrides?: Record<string, { label?: string; url?: string }>; custom?: { id: string; label: string; url: string; tab: 'en' | 'other' }[]; order?: string[] };
  streamWindow?: StreamWindow;
  news?: unknown[];
}
const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const text = (value: unknown, limit: number): string | undefined => typeof value === 'string' ? value.slice(0, limit) : undefined;
const timestamp = (value: unknown): number | undefined => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;

/** SSE and cached JSON are untrusted. Ignore malformed fields rather than corrupting UI state. */
export function parseSiteConfig(value: unknown): SiteConfig | null {
  if (!record(value)) return null;
  const result: SiteConfig = {};
  if (record(value.failover) && typeof value.failover.active === 'boolean') result.failover = { active: value.failover.active, updatedAt: timestamp(value.failover.updatedAt) };
  if (record(value.maintenance) && typeof value.maintenance.active === 'boolean') {
    const m = value.maintenance;
    result.maintenance = { active: m.active as boolean, message: text(m.message, 500), eta: text(m.eta, 120), startedAt: timestamp(m.startedAt), updatedAt: timestamp(m.updatedAt) };
  }
  if (record(value.pages) && Array.isArray(value.pages.disabled)) {
    const disabled = value.pages.disabled
      .filter((id): id is string => typeof id === 'string')
      .map((id) => id.trim().toLowerCase() as ControllablePageId)
      .filter((id) => VALID_PAGE_IDS.has(id));
    result.pages = {
      disabled: [...new Set(disabled)],
      updatedAt: timestamp(value.pages.updatedAt),
    };
  }
  const override = value.streamOverride ?? value.override;
  if (record(override) && typeof override.active === 'boolean') {
    const url = text(override.url, 4000);
    let safeUrl: string | undefined;
    try { const parsed = new URL(url || ''); if (parsed.protocol === 'https:') safeUrl = parsed.href; } catch { /* invalid URL */ }
    result.streamOverride = { active: override.active && Boolean(safeUrl), url: safeUrl, type: text(override.type, 12) };
  }
  if (record(value.sources) && Array.isArray(value.sources.disabled)) {
    result.sources = { autoStreams: value.sources.autoStreams === true, relaysDisabled: value.sources.relaysDisabled === true, disabled: value.sources.disabled.filter((id): id is string => typeof id === 'string').slice(0, 120) };
    /* Race Control's per-chip name and link. HTTPS only, the rule the backend enforces. */
    const overrides: Record<string, { label?: string; url?: string }> = {};
    for (const [id, entry] of Object.entries(record(value.sources.overrides) ? value.sources.overrides : {}).slice(0, 120)) {
      if (!record(entry)) continue;
      const label = text(entry.label, 40)?.trim();
      const url = text(entry.url, 500) || '';
      if (label || /^https:\/\//i.test(url)) overrides[id] = { ...(label ? { label } : {}), ...(/^https:\/\//i.test(url) ? { url } : {}) };
    }
    result.sources.overrides = overrides;
    result.sources.order = Array.isArray(value.sources.order) ? [...new Set(value.sources.order.filter((id): id is string => typeof id === 'string' && /^[a-z0-9-]{1,80}$/.test(id)).slice(0, 200))] : [];
    result.sources.custom = [];
    if (Array.isArray(value.sources.custom)) for (const item of value.sources.custom.slice(0, 50)) {
      if (!record(item) || typeof item.id !== 'string' || result.sources.custom.some(source => source.id === item.id) || !/^custom-[a-z0-9-]{1,60}$/.test(item.id) || typeof item.label !== 'string' || !item.label.trim() || typeof item.url !== 'string') continue;
      try {
        const url = new URL(item.url);
        if (url.protocol !== 'https:' || url.username || url.password || url.href.length > 500) continue;
        result.sources.custom.push({ id:item.id, label:item.label.trim().slice(0,40), url:url.href, tab:item.tab === 'other' ? 'other' : 'en' });
      } catch { /* ignore malformed custom sources */ }
    }
  }
  if (record(value.streamWindow) && typeof value.streamWindow.active === 'boolean') {
    const w = value.streamWindow;
    result.streamWindow = { active: w.active as boolean, reason: text(w.reason, 120), startedAt: timestamp(w.startedAt), updatedAt: timestamp(w.updatedAt) };
  }
  if (Array.isArray(value.news)) result.news = value.news.slice(0, 100);
  return result;
}
