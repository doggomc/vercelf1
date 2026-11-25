import { BACKEND_API } from '../config';

export type OtherStreamProvider = 'embdlol' | 'ppv' | 'weelo' | 'strmfree' | 'timstreams' | 'zlive' | 'aura' | 'bintv' | 'ntv' | 'matchora' | 'live24' | 'esportex';

/** Priority for directory headings and provider selector; remaining providers
 * retain alphabetical order by their display name. */
export function compareStreamProviders(a: OtherStreamProvider, b: OtherStreamProvider, labels: Record<OtherStreamProvider, string>): number {
  const priority: Partial<Record<OtherStreamProvider, number>> = { ppv: 0, embdlol: 1, strmfree: 2 };
  return (priority[a] ?? 3) - (priority[b] ?? 3) || labels[a].localeCompare(labels[b]);
}

export interface OtherStreamItem {
  key: string;
  provider: OtherStreamProvider;
  id: string;
  host?: string;
  title: string;
  category: string;
  subtitle: string;
  tag: string;
  viewers: number;
  alwaysLive: boolean;
  startAt?: number;
  status?: 'live' | 'scheduled';
  embedUrl: string;
  fallbackUrl: string;
  color: string;
}

/** Only show streams not explicitly marked scheduled; some providers do not
 * supply a live flag, so their existing live-only feeds remain eligible. */
export function isDirectoryLive(item: OtherStreamItem): boolean {
  return item.status !== 'scheduled';
}


export interface OtherStreamsResult {
  items: OtherStreamItem[];
  counts: Record<'all' | OtherStreamProvider, number>;
  providerOk: Record<OtherStreamProvider, boolean>;
}

const DEFAULT_BACKEND = BACKEND_API;
const EMBDLOL_STRUCT_URL = 'https://api.embdlol.st/struct';
const MATCHORA_URL = 'https://matchora.to/api/v1/schedule?watchable=1';
const ESPORTEX_URL = 'https://api.esportex.site/api/streams';
const LIVE24_URL = 'https://ntv.cx/api/get-matches?server=falcon&type=both';
const NTV_RAPTOR_URL = 'https://ntv.cx/api/get-matches?server=raptor&type=both';
const NTV_CACHE_KEY = 'freef1-ntv-raptor-v1';
const BINTV_EVENTS_URL = 'https://api.bintv.link/api/public/bintvjson';
const BINTV_CACHE_KEY = 'freef1-bintv-v1';
const AURA_SCHEDULE_URL = 'https://aurasports.cfd/api/schedule';
const ZLIVE_MANIFEST_URL = 'https://zlive.st/embed/manifest.json';
const TIMSTREAMS_EVENTS_URL = 'https://tim-streams.com/api/live-upcoming';
const STREAMFREE_STREAMS_URL = 'https://strmfree.st/api/v1/streams';
const STREAMFREE_CACHE_KEY = 'freef1-streamfree-v1';
const STREAMFREE_CACHE_MS = 60_000;
const PPV_STREAMS_URL = 'https://api.ppv.st/api/streams';
const WEELO_PLAYERS_URLS = [
  'https://weelo.live/players/events.json',
  'https://v.weellz.live/players/events.json',
];
const RACINGLAP_STREAMS_URL = 'https://racinglap.net/api/v1/streams.json';
const WEELO_FEED_URL = 'https://weelo.live/feed/events.json';
const RACINGLAP_STATUS_URL = 'https://racinglap.net/api/status.json';
const PPV_STRIPPED_HOST = 'taifood-blog.asia';

/* Explicit non-F1 motorsport series so e.g. "Formula 2 Monaco Grand Prix" or
   "MotoGP Catalan Grand Prix" stays included while Formula 1 is strictly excluded. */
const NON_F1_SERIES_RE = /\b(?:formula\s*[234e]\b|f[234]\b|fe\b|moto\s*gp|moto\s*[23e]\b|indycar|nascar|supercars|porsche\s*supercup|supercup|wrc|wec|imsa|dtm|karting)\b/i;

/* Any Formula 1 session, broadcaster channel, or F1 weekend shoulder show. */
const F1_TEXT_RE = /\b(?:formula[\s_-]*1|f1(?:\s*tv|\s*uhd|\s*4k|\s*world|\s*academy|\s*live|\s*race|\s*qualifying|\s*sprint|\s*practice)?|sky[\s_-]*(?:sports[\s_-]*)?f1)\b/i;

/* Bare embdlol feed keys reserved for its Formula 1 directory. */
const EMB_BARE_F1_KEYS = new Set([
  'fullhd1', 'fullhd2', 'fullhd3',
  'skyita', 'skydeu', 'skyit', 'skyde', 'skyuk',
  'appletv', 'apple', 'f1tv', 'world', 'atv', 'uhd', '4k',
]);

const PROVIDER_COLORS: Record<OtherStreamProvider, string> = {
  embdlol: '#FF8000',
  ppv: '#00D2BE',
  weelo: '#38BDF8',
  strmfree: '#E75D38',
  timstreams: '#8B7CF6',
  zlive: '#B48CFF',
  aura: '#C1FF55',
  bintv: '#58B6E8',
  ntv: '#E3BC45',
  matchora: '#E55F67',
  live24: '#4B9DDE',
  esportex: '#7A87F5',
};

const CATEGORY_COLORS: Record<string, string> = {
  'american football': '#22C55E',
  'australian football': '#F59E0B',
  basketball: '#F97316',
  cricket: '#10B981',
  football: '#34D399',
  soccer: '#34D399',
  golf: '#84CC16',
  'ice hockey': '#38BDF8',
  rugby: '#14B8A6',
  wrestling: '#A855F7',
  fighting: '#EF4444',
  combat: '#EF4444',
  mma: '#EF4444',
  boxing: '#EF4444',
  motorsport: '#38BDF8',
  motorsports: '#38BDF8',
  'formula 2': '#38BDF8',
  'formula 3': '#FB923C',
  'porsche supercup': '#C084FC',
  '24/7 streams': '#00D2BE',
};

const UPPER_TOKENS = new Set([
  'ufc', 'nfl', 'nba', 'nhl', 'mlb', 'mls', 'wwe', 'aew', 'pga', 'liv', 'atp', 'wta',
  'ucl', 'uel', 'fa', 'f2', 'f3', 'f4', 'fe', 'gt', 'gt3', 'wec', 'wrc', 'dtm', 'imsa',
  'uhd', '4k', 'fhd', 'hd', 'uk', 'usa', 'us', 'es', 'it', 'de', 'fr', 'nl', 'pt', 'tv',
  'espn', 'tnt', 'cbs', 'nbc', 'abc', 'sky', 'dazn', 'tsn', 'sn',
]);

export function resolveBackendOrigin(raw?: string): string {
  const candidate = String(raw || '').trim().replace(/\/+$/, '');
  return /^https:\/\/[a-z0-9.-]+$/i.test(candidate) ? candidate : DEFAULT_BACKEND;
}

export function isSafePublicHost(rawHost: string): boolean {
  const clean = String(rawHost || '').trim().toLowerCase().replace(/^www\./, '');
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(clean)) return false;
  if (/^(?:localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(clean)) return false;
  if (/\.(?:local|internal|localhost)$/.test(clean)) return false;
  return true;
}

export function isFormula1Text(raw: string): boolean {
  const text = String(raw || '').trim();
  if (!text) return false;
  if (F1_TEXT_RE.test(text)) return true;
  if (/\/embed\/f1\//i.test(text) || /(?:^|\s)f1\//i.test(text)) return true;
  if (/\bgrand[\s_-]*prix\b/i.test(text) && !NON_F1_SERIES_RE.test(text)) return true;
  return false;
}

export function isEmbdlolF1Channel(channelName: string): boolean {
  const raw = String(channelName || '').trim();
  if (!raw) return true;
  if (isFormula1Text(raw)) return true;
  const flat = raw.toLowerCase().replace(/[\s_-]+/g, '');
  if (/^(?:f[234]|formula[234e]|motogp|moto[23e]|indycar|nascar|wec|wrc|supercup)/.test(flat)) {
    return false;
  }
  if (/^(?:f1|formula1|skyf1|skysportsf1)/.test(flat)) return true;
  if (/^daznf1(?:hd)?$/.test(flat)) return true;
  if (EMB_BARE_F1_KEYS.has(flat)) return true;
  return false;
}

export function isLowResStream(text: string): boolean {
  return /\b(?:360|480|540)p\b|_540p\b|^\s*SD\s*\|/i.test(String(text || ''));
}

export function formatEmbdlolTitle(channelName: string): string {
  const raw = String(channelName || '').trim();
  if (!raw) return 'Live Channel';
  if (/\s/.test(raw) && /[A-Z]/.test(raw)) return raw.replace(/\s+/g, ' ');
  const spaced = raw
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])(\d)/gi, '$1 $2')
    .replace(/(\d)([a-z])/gi, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
  return spaced
    .split(' ')
    .filter(Boolean)
    .map((word) => {
      const lower = word.toLowerCase();
      if (UPPER_TOKENS.has(lower)) return lower.toUpperCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

export function pickStreamColor(provider: OtherStreamProvider, category: string): string {
  const key = String(category || '').trim().toLowerCase();
  return CATEGORY_COLORS[key] || PROVIDER_COLORS[provider];
}

export function buildEmbdlolUrls(rawId: string, backend = DEFAULT_BACKEND): { embedUrl: string; fallbackUrl: string } | null {
  const clean = String(rawId || '').trim();
  const match = clean.match(/\/embed\/([A-Za-z0-9_-]{4,80})(?:[/?#]|$)/i);
  const id = match ? match[1] : clean;
  if (!/^[A-Za-z0-9_-]{4,80}$/.test(id)) return null;
  const direct = `https://embdlol.st/embed/${encodeURIComponent(id)}`;
  return { embedUrl: direct, fallbackUrl: direct };
}

export function buildWeeloUrls(rawStreamId: string, backend = DEFAULT_BACKEND): { embedUrl: string; fallbackUrl: string } | null {
  const clean = String(rawStreamId || '').trim();
  const match = clean.match(/[?&]stream=([A-Za-z0-9_-]{4,180})(?:[&#]|$)/i);
  const id = match ? match[1] : clean;
  if (!/^[A-Za-z0-9_-]{4,180}$/.test(id)) return null;
  const direct = `https://weellz.live/beta?stream=${encodeURIComponent(id)}`;
  return { embedUrl: direct, fallbackUrl: direct };
}

export function normalizePpvPath(rawSlug: string): string {
  const clean = String(rawSlug || '').trim().replace(/^\/+|\/+$/g, '');
  if (!clean || clean.length > 150 || /\.\.|[\s?#\\]/.test(clean)) return '';
  if (!/^[a-z0-9][a-z0-9/_-]{1,149}$/i.test(clean)) return '';
  if (isLowResStream(clean)) return '';
  return clean;
}

export function buildPpvUrls(
  rawSlug: string,
  rawHostOrIframe?: string,
  backend = DEFAULT_BACKEND,
): { slug: string; host: string; embedUrl: string; fallbackUrl: string } | null {
  let host = PPV_STRIPPED_HOST;
  let slugCandidate = rawSlug;

  const iframeStr = String(rawHostOrIframe || '').trim();
  if (/^https:\/\//i.test(iframeStr)) {
    try {
      const parsed = new URL(iframeStr);
      const parsedHost = parsed.hostname.toLowerCase().replace(/^www\./, '');
      if (!isSafePublicHost(parsedHost)) return null;
      host = parsedHost;
      const m = parsed.pathname.match(/^\/embed\/(.+)$/i);
      if (m && !slugCandidate) slugCandidate = m[1];
    } catch {
      return null;
    }
  } else if (iframeStr) {
    const cleanHost = iframeStr.toLowerCase().replace(/^www\./, '');
    if (!isSafePublicHost(cleanHost)) return null;
    host = cleanHost;
  }

  const slug = normalizePpvPath(slugCandidate);
  if (!slug || isFormula1Text(slug)) return null;

  const directUrl = `https://${host}/embed/${slug}`;
  return { slug, host, embedUrl: directUrl, fallbackUrl: directUrl };
}

/** StreamFree embeds are used directly, without the stripped backend player. */
export function buildStreamfreeUrls(rawId: string, rawHost = 'strmfree.st'): { id: string; host: string; embedUrl: string; fallbackUrl: string } | null {
  const host = String(rawHost || '').trim().toLowerCase();
  if (host !== 'strmfree.st' && host !== 'streamfree.top') return null;
  let id: string;
  try { id = decodeURIComponent(String(rawId || '').trim()); } catch { return null; }
  const parts = id.split('/');
  if (parts.length !== 2 || !/^[a-z0-9-]{1,40}$/i.test(parts[0]) ||
      !/^[\p{L}\p{N}_-]{1,180}$/u.test(parts[1]) || isFormula1Text(id)) return null;
  const path = parts.map(encodeURIComponent).join('/');
  const embedUrl = `https://${host}/embed/${path}`;
  return { id, host, embedUrl, fallbackUrl: embedUrl };
}

export function parseStreamfreeStreams(payload: unknown): OtherStreamItem[] {
  const streams = Array.isArray((payload as { streams?: unknown[] } | null)?.streams)
    ? (payload as { streams: Array<Record<string, unknown>> }).streams : [];
  const items: OtherStreamItem[] = [];
  const seen = new Set<string>();
  for (const event of streams) {
    if (!event || typeof event !== 'object') continue;
    const title = String(event.name || '').trim();
    const rawCategory = String(event.category || '').trim();
    const league = String(event.league || '').trim();
    if (!title || !rawCategory || isFormula1Text(`${title} ${rawCategory} ${league} ${event.stream_key || ''}`)) continue;
    const category = formatEmbdlolTitle(rawCategory);
    const sources = Array.isArray(event.sources) ? event.sources as Array<Record<string, unknown>> : [];
    for (const source of sources) {
      if (!source || source.live !== true) continue;
      let url: URL;
      try { url = new URL(String(source.url || '')); } catch { continue; }
      if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash || !url.pathname.startsWith('/embed/')) continue;
      const built = buildStreamfreeUrls(url.pathname.slice('/embed/'.length), url.hostname);
      if (!built || built.id.split('/')[0].toLowerCase() !== rawCategory.toLowerCase() || seen.has(built.embedUrl)) continue;
      const broadcast = String(source.broadcast || '').trim();
      const quality = String(source.quality || '').trim();
      if (isFormula1Text(`${broadcast} ${built.id}`)) continue;
      seen.add(built.embedUrl);
      const distinctTitle = sources.filter(s => s && s.live === true).length > 1 && broadcast ? `${title} · ${broadcast}` : title;
      items.push({
        key: `strmfree:${built.host}/${built.id}`, provider: 'strmfree', id: built.id, host: built.host,
        title: distinctTitle, category, subtitle: [league || category, 'StreamFree', broadcast, quality].filter(Boolean).join(' · '),
        tag: `${quality || 'Live'} · StreamFree`, viewers: Math.max(0, Number.parseInt(String(event.viewers || '0'), 10) || 0),
        alwaysLive: false, embedUrl: built.embedUrl, fallbackUrl: built.fallbackUrl,
        color: pickStreamColor('strmfree', category),
      });
    }
  }
  return items;
}

function inferChannelCategory(rawName: string, rawCategory?: unknown): string {
  const explicit = String(rawCategory || '').trim();
  if (explicit && !/^(?:embdlol|ppv|weelo|weellz)$/i.test(explicit)) return explicit;
  const s = rawName.toLowerCase();
  if (/\b(?:f2|formula\s*2)\b/.test(s)) return 'Formula 2';
  if (/\b(?:f3|formula\s*3)\b/.test(s)) return 'Formula 3';
  if (/\b(?:motogp|indycar|nascar|wec|wrc|supercup)\b/.test(s)) return 'Motorsport';
  if (/\b(?:ufc|mma|boxing|fight)\b/.test(s)) return 'Combat';
  if (/\b(?:nfl|cfb)\b/.test(s)) return 'American Football';
  if (/\bnba\b/.test(s)) return 'Basketball';
  if (/\bnhl\b/.test(s)) return 'Ice Hockey';
  return 'Live Channel';
}

export function parseEmbdlolStruct(payload: unknown, backend = DEFAULT_BACKEND): OtherStreamItem[] {
  const channels = Array.isArray((payload as { channels?: unknown[] } | null)?.channels)
    ? ((payload as { channels: Array<Record<string, unknown>> }).channels)
    : [];
  const out: OtherStreamItem[] = [];
  const seen = new Set<string>();

  for (const entry of channels) {
    if (!entry || typeof entry !== 'object') continue;
    const rawId = String(entry.id || '').trim();
    const rawName = String(entry.channelname || entry.name || '').trim();
    if (!rawId || !rawName) continue;
    if (isLowResStream(rawName) || isEmbdlolF1Channel(rawName)) continue;

    const urls = buildEmbdlolUrls(rawId, backend);
    if (!urls || seen.has(rawId)) continue;
    seen.add(rawId);

    const title = formatEmbdlolTitle(rawName);
    const category = inferChannelCategory(rawName, entry.category);
    const isUhd = /\b(?:uhd|4k)\b/i.test(rawName);
    const tag = isUhd ? '4K UHD' : 'Live HD';

    out.push({
      key: `1:${rawId}`,
      provider: 'embdlol',
      id: rawId,
      title,
      category,
      subtitle: `${category} · ${tag}`,
      tag,
      viewers: 0,
      alwaysLive: false,
      embedUrl: urls.embedUrl,
      fallbackUrl: urls.fallbackUrl,
      color: pickStreamColor('embdlol', category),
    });
  }

  return out;
}

export function parsePpvStreams(
  payload: unknown,
  backend = DEFAULT_BACKEND,
  nowSecOverride?: number,
): OtherStreamItem[] {
  const data = payload as { timestamp?: number; streams?: Array<Record<string, unknown>> } | null;
  const categories = Array.isArray(data?.streams) ? data.streams : [];
  const nowSec = typeof nowSecOverride === 'number' && Number.isFinite(nowSecOverride)
    ? nowSecOverride
    : (typeof data?.timestamp === 'number' && data.timestamp > 1_000_000_000 ? data.timestamp : Math.floor(Date.now() / 1000));

  const out: OtherStreamItem[] = [];
  const seenSlugs = new Set<string>();

  for (const group of categories) {
    if (!group || typeof group !== 'object') continue;
    const groupCategory = String(group.category || '').trim() || 'Live Sport';
    if (isFormula1Text(groupCategory)) continue;

    const streams = Array.isArray(group.streams) ? (group.streams as Array<Record<string, unknown>>) : [];
    for (const item of streams) {
      if (!item || typeof item !== 'object') continue;
      const alwaysLive = Boolean(item.always_live) || Boolean(group.always_live);
      const startsAt = Number(item.starts_at || 0);
      const endsAt = Number(item.ends_at || 0);
      const isLiveNow = alwaysLive || (startsAt > 0 && nowSec >= startsAt - 600 && (!endsAt || nowSec <= endsAt));
      if (!isLiveNow) continue;

      const category = String(item.category_name || groupCategory).trim() || 'Live Sport';
      const parentName = String(item.name || '').trim();
      const parentTag = String(item.tag || '').trim();
      const parentSourceTag = String(item.source_tag || '').trim();
      const parentUri = String(item.uri_name || '').trim();
      const parentIframe = String(item.iframe || '').trim();
      const viewers = Math.max(0, Number.parseInt(String(item.viewers || '0'), 10) || 0);

      const combinedCheck = `${category} ${parentName} ${parentTag} ${parentSourceTag} ${parentUri} ${parentIframe}`;
      if (isFormula1Text(combinedCheck)) continue;

      const pushVariant = (
        uriName: string,
        iframeUrl: string,
        variantTitle: string,
        sourceTag: string,
        variantViewers: number,
      ) => {
        if (isLowResStream(`${uriName} ${iframeUrl} ${sourceTag} ${variantTitle}`)) return;
        if (isFormula1Text(`${variantTitle} ${sourceTag} ${uriName} ${iframeUrl}`)) return;
        const resolved = buildPpvUrls(uriName, iframeUrl, backend);
        if (!resolved) return;
        const dedupeKey = `${resolved.host}/${resolved.slug}`;
        if (seenSlugs.has(dedupeKey)) return;
        seenSlugs.add(dedupeKey);

        const cleanTag = sourceTag.replace(/^\s*HD\s*\|\s*/i, '').trim() || parentTag || 'Live HD';
        const subParts = [category];
        if (parentTag && parentTag.toLowerCase() !== category.toLowerCase()) subParts.push(parentTag);
        else if (cleanTag && cleanTag.toLowerCase() !== variantTitle.toLowerCase()) subParts.push(cleanTag);
        if (variantViewers > 0) subParts.push(`${variantViewers} watching`);

        out.push({
          key: `ppv:${resolved.slug}`,
          provider: 'ppv',
          id: resolved.slug,
          host: resolved.host !== PPV_STRIPPED_HOST ? resolved.host : undefined,
          title: variantTitle || cleanTag || resolved.slug,
          category,
          subtitle: subParts.join(' · '),
          tag: alwaysLive ? '24/7 Live' : (parentTag || 'Live'),
          viewers: variantViewers,
          alwaysLive,
          embedUrl: resolved.embedUrl,
          fallbackUrl: resolved.fallbackUrl,
          color: pickStreamColor('ppv', category),
        });
      };

      pushVariant(parentUri, parentIframe, parentName, parentSourceTag, viewers);

      const substreams = Array.isArray(item.substreams) ? (item.substreams as Array<Record<string, unknown>>) : [];
      for (const sub of substreams) {
        if (!sub || typeof sub !== 'object') continue;
        const subUri = String(sub.uri_name || '').trim();
        const subIframe = String(sub.iframe || '').trim();
        const subSourceTag = String(sub.source_tag || '').trim();
        const subLabel = subSourceTag.replace(/^\s*HD\s*\|\s*/i, '').trim();
        const subName = String(sub.name || parentName).trim();
        const distinctTitle = subLabel && subLabel.toLowerCase() !== subName.toLowerCase()
          ? (alwaysLive ? subLabel : `${subName} · ${subLabel}`)
          : subName;
        pushVariant(subUri, subIframe, distinctTitle, subSourceTag, 0);
      }
    }
  }

  out.sort((a, b) => {
    if (a.alwaysLive !== b.alwaysLive) return a.alwaysLive ? 1 : -1;
    if (b.viewers !== a.viewers) return b.viewers - a.viewers;
    return a.title.localeCompare(b.title);
  });

  return out;
}

export function isWeeloF1Event(ev: Record<string, unknown>): boolean {
  const seriesKey = String(ev.series_key || '').trim().toLowerCase();
  const series = String(ev.series || '').trim().toLowerCase();
  if (seriesKey === 'f1') return true;
  if (seriesKey === 'f1a' || seriesKey === 'show') return false;
  if (series === 'f1' || series === 'formula 1') return true;
  if (series === 'f1 academy' || series === 'show') return false;
  const text = `${ev.series || ''} ${ev.series_key || ''} ${ev.name || ''} ${ev.title || ''} ${ev.weekend || ''}`;
  return isFormula1Text(text);
}

const WEELO_SERIES_NAMES: Record<string, string> = {
  f2: 'Formula 2',
  f3: 'Formula 3',
  psc: 'Porsche Supercup',
  supercup: 'Porsche Supercup',
  fe: 'Formula E',
  indycar: 'IndyCar',
  motogp: 'MotoGP',
  wec: 'WEC',
  wrc: 'WRC',
  nascar: 'NASCAR',
};

export function parseWeeloEvents(
  playersPayload: unknown,
  statusPayload?: unknown,
  feedPayload?: unknown,
  backend = DEFAULT_BACKEND,
): OtherStreamItem[] {
  const liveMap = new Map<string, boolean>();
  const statusEvents = Array.isArray((statusPayload as { events?: unknown[] } | null)?.events)
    ? ((statusPayload as { events: Array<Record<string, unknown>> }).events)
    : [];
  for (const s of statusEvents) {
    if (s && typeof s === 'object' && s.id) {
      liveMap.set(String(s.id), Boolean(s.live) && !Boolean(s.done));
    }
  }

  const out: OtherStreamItem[] = [];
  const seenStreams = new Set<string>();

  const playerEvents = Array.isArray((playersPayload as { events?: unknown[] } | null)?.events)
    ? ((playersPayload as { events: Array<Record<string, unknown>> }).events)
    : [];

  for (const ev of playerEvents) {
    if (!ev || typeof ev !== 'object') continue;
    const evId = String(ev.id || '').trim();
    const isLive = evId && liveMap.has(evId) ? Boolean(liveMap.get(evId)) : Boolean(ev.live);
    if (!isLive || isWeeloF1Event(ev)) continue;

    const rawSeries = String(ev.series || ev.series_key || 'Motorsport').trim();
    const category = WEELO_SERIES_NAMES[rawSeries.toLowerCase()] || rawSeries || 'Motorsport';
    const sessionName = String(ev.name || 'Live Session').trim();
    const weekend = String(ev.weekend || '').trim();
    const channels = Array.isArray(ev.channels) ? (ev.channels as Array<Record<string, unknown>>) : [];

    for (const ch of channels) {
      if (!ch || typeof ch !== 'object') continue;
      const streamId = String(ch.stream || '').trim();
      const chName = String(ch.name || 'Main Feed').trim();
      const lang = String(ch.lang || '').trim();
      if (!streamId || (isWeeloF1Event(ev))) continue;

      const urls = buildWeeloUrls(streamId, backend);
      if (!urls || seenStreams.has(streamId)) continue;
      seenStreams.add(streamId);

      const title = channels.length > 1 ? `${sessionName} · ${chName}` : sessionName;
      const subParts = [category];
      if (weekend && !isFormula1Text(weekend)) subParts.push(weekend);
      if (lang) subParts.push(lang.toUpperCase());
      else if (chName) subParts.push(chName);

      out.push({
        key: `weelo:${streamId}`,
        provider: 'weelo',
        id: streamId,
        title,
        category,
        subtitle: subParts.join(' · '),
        tag: lang ? lang.toUpperCase() : 'Live',
        viewers: 0,
        alwaysLive: false,
        embedUrl: urls.embedUrl,
        fallbackUrl: urls.fallbackUrl,
        color: pickStreamColor('weelo', category),
      });
    }
  }

  const feedEvents = Array.isArray((feedPayload as { events?: unknown[] } | null)?.events)
    ? ((feedPayload as { events: Array<Record<string, unknown>> }).events)
    : [];

  for (const ev of feedEvents) {
    if (!ev || typeof ev !== 'object') continue;
    if (!Boolean(ev.live) || isWeeloF1Event(ev)) continue;
    const rawSeries = String(ev.series || 'Motorsport').trim();
    if (rawSeries.toLowerCase() === 'general' && isFormula1Text(String(ev.title || ''))) continue;

    const category = WEELO_SERIES_NAMES[rawSeries.toLowerCase()] || rawSeries || 'Motorsport';
    const eventTitle = String(ev.title || ev.name || 'Live Session').trim();
    const streams = Array.isArray(ev.streams) ? (ev.streams as Array<Record<string, unknown>>) : [];

    for (const st of streams) {
      if (!st || typeof st !== 'object') continue;
      const rawUrl = String(st.url || '').trim();
      const urls = buildWeeloUrls(rawUrl, backend);
      if (!urls) continue;
      const streamMatch = rawUrl.match(/[?&]stream=([A-Za-z0-9_-]{4,80})/i);
      const streamId = streamMatch ? streamMatch[1] : '';
      if (!streamId || seenStreams.has(streamId)) continue;
      const label = String(st.label || 'Feed').trim();
      const language = String(st.language || '').trim();
      if (isWeeloF1Event(ev)) continue;
      seenStreams.add(streamId);

      const title = streams.length > 1 && label ? `${eventTitle} · ${label}` : eventTitle;
      const subParts = [category];
      if (language) subParts.push(language);

      out.push({
        key: `weelo:${streamId}`,
        provider: 'weelo',
        id: streamId,
        title,
        category,
        subtitle: subParts.join(' · '),
        tag: language || 'Live',
        viewers: 0,
        alwaysLive: false,
        embedUrl: urls.embedUrl,
        fallbackUrl: urls.fallbackUrl,
        color: pickStreamColor('weelo', category),
      });
    }
  }

  return out;
}

/** RacingLap API: only currently live non-F1 sessions, including F1 Academy and shows. */
export function parseRacingLapOther(payload: unknown, now = Date.now()): OtherStreamItem[] {
  const data=payload as {api?:string;version?:number;events?:unknown[]};
  if (!data || data.api !== 'racinglap' || data.version !== 1 || !Array.isArray(data.events)) throw new Error('Invalid RacingLap catalogue');
  const result:OtherStreamItem[]=[]; const seen=new Set<string>();
  for (const raw of data.events) {
    if (!raw || typeof raw !== 'object') continue;
    const e=raw as Record<string,any>, series=e.series;
    if (!series || typeof series !== 'object' || typeof series.key !== 'string' || !series.key || (series.key.toLowerCase()==='f1' || /^(?:f1|formula\s*1)$/i.test(String(series.name || '').trim())) || e.state!=='live' || !Array.isArray(e.channels)) continue;
    const seriesName=String(series.name || series.key).trim().slice(0,80) || 'Motorsport';
    const category=series.key.toLowerCase()==='show'?'Shows':series.key.toLowerCase()==='f1a'?'F1 Academy':seriesName;
    const session=String(e.session || 'Live Session').trim().slice(0,100);
    const weekend=String(e.weekend || '').trim().slice(0,100);
    for (const ch of e.channels) {
      if (!ch || typeof ch !== 'object' || typeof ch.embed !== 'string') continue;
      if (ch.opens && Number.isFinite(Date.parse(ch.opens)) && Date.parse(ch.opens)>now) continue;
      const name=String(ch.name || 'Main Feed').trim().slice(0,80); if (isLowResStream(name)) continue;
      let url:URL; try { url=new URL(ch.embed); } catch { continue; }
      const id=url.searchParams.get('stream') || '';
      const urls=buildWeeloUrls(id);
      // Ensure the direct embed is byte-for-byte the API address, without added parameters.
      if (!urls || ch.embed!==urls.embedUrl || url.hash || url.searchParams.getAll('stream').length!==1 || [...url.searchParams.keys()].some(k=>k!=='stream')) continue;
      const dedupe=`${String(e.id || '')}:${id}:${name}`;if (seen.has(dedupe)) continue;seen.add(dedupe);
      const title=e.channels.length>1?`${session} · ${name}`:session;
      const lang=typeof ch.language==='string'?ch.language.toUpperCase().slice(0,8):'';
      result.push({key:`weelo:${dedupe}`,provider:'weelo',id,title,category,subtitle:[category,weekend,lang].filter(Boolean).join(' · '),tag:lang||'Live',viewers:0,alwaysLive:false,status:'live',embedUrl:ch.embed,fallbackUrl:ch.embed,color:pickStreamColor('weelo',category)});
    }
  }
  return result;
}

/** TimStreams publishes naive event times in America/New_York. Convert to UTC
 * using the date's actual zone offset, not the viewer's local time zone. */
export function parseTimstreamsTime(raw: unknown): number | null {
  const text = String(raw || '');
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(text);
  if (!match) return null;
  const [, y, m, d, h, min, sec] = match;
  const desired = Date.UTC(+y, +m - 1, +d, +h, +min, +(sec || 0));
  if (!Number.isFinite(desired)) return null;
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  let result = desired;
  for (let i = 0; i < 2; i++) {
    const parts = Object.fromEntries(fmt.formatToParts(result).filter(p => p.type !== 'literal').map(p => [p.type, Number(p.value)]));
    const observed = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    result += desired - observed;
  }
  return result;
}

/** Embed the provider's own event page so it controls feed selection and updates. */
export function buildTimstreamsUrls(rawId: string): { embedUrl: string; fallbackUrl: string } | null {
  const id = String(rawId || '').trim();
  if (!/^[a-z0-9][a-z0-9-]{0,159}$/i.test(id) || isFormula1Text(id)) return null;
  const url = `https://tim-streams.com/watch/${encodeURIComponent(id)}`;
  return { embedUrl: url, fallbackUrl: url };
}

/** The provider's event API returns its current player URL. Keep this an
 * explicit host/path allowlist: a URL in a query string must never select a host. */
export function extractTimstreamsPlayer(payload: unknown, eventId: string): string | null {
  const item = (payload as { item?: { url?: unknown; vip?: unknown; streams?: unknown } } | null)?.item;
  if (!item || item.url !== eventId || item.vip === true || !Array.isArray(item.streams)) return null;
  for (const value of item.streams) {
    if (!value || typeof value !== 'object') continue;
    const stream = value as { url?: unknown; vip?: unknown };
    if (stream.vip === true || typeof stream.url !== 'string') continue;
    try {
      const url = new URL(stream.url);
      if (url.protocol === 'https:' && url.hostname === 'ehgembxe.cfd' && !url.port && !url.username && !url.password && !url.search && !url.hash && /^\/[a-z0-9-]{1,160}$/i.test(url.pathname)) return url.href;
    } catch { /* Ignore malformed provider URLs. */ }
  }
  return null;
}

export function parseTimstreamsEvents(payload: unknown): OtherStreamItem[] {
  const data = payload as { events?: unknown; genres?: unknown } | null;
  if (!Array.isArray(data?.events)) return [];
  const categories = new Map<string, string>();
  if (Array.isArray(data.genres)) for (const genre of data.genres) {
    if (genre && typeof genre === 'object') {
      const g = genre as Record<string, unknown>;
      if (g.id != null && typeof g.name === 'string') categories.set(String(g.id), g.name.trim().slice(0, 80));
    }
  }
  const out: OtherStreamItem[] = [], seen = new Set<string>();
  for (const value of data.events) {
    if (!value || typeof value !== 'object') continue;
    const event = value as Record<string, unknown>;
    const id = String(event.url || '').trim();
    const title = String(event.name || '').trim().slice(0, 140);
    const category = categories.get(String(event.genre)) || 'Other sports';
    const startAt = parseTimstreamsTime(event.time);
    const streams = Array.isArray(event.streams) ? event.streams as Array<Record<string, unknown>> : [];
    if (!title || !startAt || event.vip === true || !streams.some(stream => stream && stream.vip !== true && typeof stream.url === 'string' && /^https:\/\//i.test(stream.url))) continue;
    if (seen.has(id) || isFormula1Text(`${title} ${id} ${category}`)) continue;
    const urls = buildTimstreamsUrls(id);
    if (!urls) continue;
    seen.add(id);
    out.push({ key: `timstreams:${id}`, provider: 'timstreams', id, title, category, subtitle: `${category} · TimStreams`, tag: 'TimStreams', viewers: 0, alwaysLive: false, startAt, status: 'scheduled', ...urls, color: pickStreamColor('timstreams', category) });
  }
  return out;
}

/** ZLive publishes a CORS-enabled manifest and a player-only embed API. */
export function buildZliveUrls(rawId: string): { embedUrl: string; fallbackUrl: string } | null {
  const id = String(rawId || '').trim();
  if (!/^[a-z0-9_-]{1,150}$/i.test(id) || isFormula1Text(id)) return null;
  const url = `https://zlive.st/embed/${encodeURIComponent(id)}`;
  return { embedUrl: url, fallbackUrl: url };
}

export function parseZliveSports(payload: unknown): OtherStreamItem[] {
  const channels = (payload as { channels?: unknown } | null)?.channels;
  if (!Array.isArray(channels)) return [];
  const items: OtherStreamItem[] = [], seen = new Set<string>();
  for (const value of channels) {
    if (!value || typeof value !== 'object') continue;
    const channel = value as Record<string, unknown>;
    const id = String(channel.id || '').trim();
    const title = String(channel.name || '').trim().slice(0, 140);
    const group = String(channel.sport || '').trim();
    if (channel.live !== true || !title || isFormula1Text(`${title} ${id} ${group}`) || isLowResStream(`${title} ${channel.quality || ''}`) || seen.has(id)) continue;
    const category = /^sports?$/i.test(group) ? 'Sports' : group === 'Kids' ? 'Kids' : '24/7 Channels';
    const urls = buildZliveUrls(id);
    if (!urls) continue;
    seen.add(id);
    const region = String(channel.region || '').trim().slice(0, 40);
    const quality = String(channel.quality || '').trim().slice(0, 20);
    items.push({ key: `zlive:${id}`, provider: 'zlive', id, title, category, subtitle: [category, region, 'ZLive'].filter(Boolean).join(' · '), tag: ['ZLive', quality].filter(Boolean).join(' · '), viewers: 0, alwaysLive: true, ...urls, color: pickStreamColor('zlive', category) });
  }
  return items;
}

/** AuraSports publishes sports events and a player-only embed endpoint. */
export function buildAuraUrls(rawId: string): { embedUrl: string; fallbackUrl: string } | null {
  const id = String(rawId || '').trim();
  if (!/^[a-z0-9_-]{1,160}$/i.test(id) || isFormula1Text(id)) return null;
  const url = `https://play.aurasportsplayer.cfd/event/${encodeURIComponent(id)}`;
  return { embedUrl: url, fallbackUrl: url };
}

export function parseAuraEvents(payload: unknown): OtherStreamItem[] {
  if (!Array.isArray(payload)) return [];
  const items: OtherStreamItem[] = [], seen = new Set<string>();
  for (const group of payload) {
    if (!group || typeof group !== 'object' || !Array.isArray(group.schedule)) continue;
    for (const raw of group.schedule) {
      if (!raw || typeof raw !== 'object') continue;
      const event = raw as Record<string, unknown>;
      const id = String(event.id || '').trim(), title = String(event.title || '').trim().slice(0, 140);
      const category = String(event.league_name || event.category || group.category_name || 'Sports').trim().slice(0, 80);
      const state = String(event.status || '').toLowerCase();
      const startAt = Number(event.date);
      if (!title || seen.has(id) || !['live', 'scheduled'].includes(state) || !Number.isFinite(startAt) || startAt < 1e12 || startAt > 4e12 || isFormula1Text(`${title} ${id} ${category}`)) continue;
      const urls = buildAuraUrls(id); if (!urls) continue;
      seen.add(id);
      items.push({ key: `aura:${id}`, provider: 'aura', id, title, category, subtitle: `${category} · Aura Sports`, tag: 'Aura Sports', viewers: 0, alwaysLive: false, startAt, status: state === 'live' ? 'live' : 'scheduled', ...urls, color: pickStreamColor('aura', category) });
    }
  }
  return items;
}

/** BinTV wraps player URLs in a base64url parameter. Resolve only recognised
 * player hosts and paths; never let a crafted cockpit link select an arbitrary URL. */
export function buildBintvUrls(rawId: string): { embedUrl: string; fallbackUrl: string } | null {
  const encoded = String(rawId || '').trim();
  if (!/^[A-Za-z0-9_-]{1,800}$/.test(encoded)) return null;
  try {
    const raw = atob(encoded.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - encoded.length % 4) % 4));
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash) return null;
    const allowed = (['ehgembxe.cfd', 'shoewiki.click'].includes(url.hostname) && /^\/bintv\/[a-z0-9-]{1,160}$/i.test(url.pathname)) ||
      (url.hostname === 'embdlol.st' && /^\/embed\/[a-z0-9_-]{4,80}$/i.test(url.pathname));
    if (!allowed || isFormula1Text(url.pathname)) return null;
    const embedUrl = `https://bintv-sources.pages.dev/?id=${encodeURIComponent(encoded)}`;
    return { embedUrl, fallbackUrl: embedUrl };
  } catch { return null; }
}

export function parseBintvStreams(payload: unknown): OtherStreamItem[] {
  if (!payload || typeof payload !== 'object') return [];
  const data = payload as Record<string, unknown>;
  const out: OtherStreamItem[] = [], seen = new Set<string>();
  for (const section of ['Live Events', 'Upcoming Events', '24/7 Channels']) {
    const rows = data[section]; if (!Array.isArray(rows)) continue;
    for (const raw of rows) {
      if (!raw || typeof raw !== 'object') continue;
      const e = raw as Record<string, unknown>;
      const name = String(e.Name || '').trim().slice(0, 140), category = String(e.Category || '').trim().slice(0, 80);
      const alwaysLive = section === '24/7 Channels';
      if (!name || isFormula1Text(`${name} ${category} ${e.ID || ''}`)) continue;
      const starts = String(e.Date || '').trim();
      const date = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC$/.test(starts) ? Date.parse(starts.replace(' ', 'T').replace(' UTC', ':00Z')) : NaN;
      const sources = Array.isArray(e.Streams) ? e.Streams : [];
      for (const source of sources) {
        if (!source || typeof source !== 'object') continue;
        const stream = source as Record<string, unknown>;
        const label = String(stream.Name || '').trim().slice(0, 80);
        if (isFormula1Text(label)) continue;
        let wrapper: URL; try { wrapper = new URL(String(stream.Iframe || '')); } catch { continue; }
        if (wrapper.protocol !== 'https:' || wrapper.hostname !== 'bintv-sources.pages.dev' || wrapper.port || wrapper.username || wrapper.password || wrapper.pathname !== '/' || wrapper.hash || [...wrapper.searchParams.keys()].some(k => k !== 'id') || wrapper.searchParams.getAll('id').length !== 1) continue;
        const id = wrapper.searchParams.get('id') || ''; const urls = buildBintvUrls(id);
        const eventId = String(e.ID || '').trim();
        const key = `${section}:${eventId}:${id}`; if (!urls || seen.has(key)) continue;
        seen.add(key);
        const display = sources.length > 1 && label ? `${name} · ${label}` : name;
        const startAt = Number.isFinite(date) ? date : undefined;
        const displayCategory = category || (alwaysLive ? '24/7 Channels' : 'Sports');
        out.push({ key: `bintv:${key}`, provider: 'bintv', id, title: display, category: displayCategory, subtitle: [displayCategory, label, 'BinTV'].filter(Boolean).join(' · '), tag: label ? `BinTV · ${label}` : 'BinTV', viewers: Math.max(0, Math.min(Number(e.Viewers) || 0, 100000000)), alwaysLive, startAt, status: section === 'Upcoming Events' ? 'scheduled' : 'live', ...urls, color: pickStreamColor('bintv', category) });
      }
    }
  }
  return out;
}

/** Raptor currently publishes direct PPV player URLs. Keep to this host and
 * let the provider's player handle playback, with no video relay or site chat. */
export function buildNtvUrls(rawId: string): { embedUrl: string; fallbackUrl: string } | null {
  const slug = normalizePpvPath(rawId);
  if (!slug || isFormula1Text(slug)) return null;
  const url = `https://taifood-blog.asia/embed/${slug}`;
  return { embedUrl: url, fallbackUrl: url };
}

export function parseNtvRaptor(payload: unknown, now = Date.now()): OtherStreamItem[] {
  const data = payload as { success?: unknown; all?: unknown } | null;
  if (data?.success !== true || !Array.isArray(data.all)) return [];
  const out: OtherStreamItem[] = [], seen = new Set<string>();
  for (const raw of data.all) {
    if (!raw || typeof raw !== 'object') continue;
    const event = raw as Record<string, unknown>;
    const name = String(event.title || '').trim().slice(0, 140), category = String(event.category || '').trim().slice(0, 80);
    const eventId = String(event.id || '');
    const alwaysLive = /24\/7/i.test(String(event.tournament || ''));
    const live = event.live === true || String(event.status || '').toLowerCase() === 'live';
    const startAt = Number(event.date);
    if (!name || !category || isFormula1Text(`${name} ${category} ${eventId}`)) continue;
    if (!live && (!Number.isFinite(startAt) || startAt <= now || startAt > 4e12)) continue;
    const sources = Array.isArray(event.sources) ? event.sources : [];
    for (const source of sources) {
      if (!source || typeof source !== 'object') continue;
      const entry = source as Record<string, unknown>;
      let url: URL; try { url = new URL(String(entry.url || '')); } catch { continue; }
      if (url.protocol !== 'https:' || url.hostname !== 'taifood-blog.asia' || url.port || url.username || url.password || url.search || url.hash || !url.pathname.startsWith('/embed/')) continue;
      const slug = url.pathname.slice('/embed/'.length);
      if (isLowResStream(slug) || isFormula1Text(`${slug} ${entry.source || ''}`)) continue;
      const urls = buildNtvUrls(slug); if (!urls || seen.has(urls.embedUrl)) continue;
      seen.add(urls.embedUrl);
      const label = String(entry.source || '').trim().slice(0, 60);
      out.push({ key: `ntv:${slug}`, provider: 'ntv', id: slug, title: name, category, subtitle: [category, String(event.tournament || '').slice(0, 80), 'NTV Raptor'].filter(Boolean).join(' · '), tag: label ? `NTV Raptor · ${label}` : 'NTV Raptor', viewers: 0, alwaysLive, startAt: startAt > 1e12 && startAt < 4e12 ? startAt : undefined, status: live ? 'live' : 'scheduled', ...urls, color: pickStreamColor('ntv', category) });
    }
  }
  return out;
}

/** Fantastic Soda's Matchora and Live24 feeds: keep only positively identified
 * live sports, and build player URLs from constrained IDs rather than trusting URLs. */
const SODA_SPORTS = /\b(?:football|soccer|basketball|hockey|cricket|tennis|golf|rugby|baseball|boxing|mma|ufc|wrestling|volleyball|handball|racing|motorsport|darts|snooker|cycling|curling|badminton|table tennis|lacrosse|futsal|american football|australian football|esports?)\b/i;
export function buildMatchoraUrls(id: string): { embedUrl: string; fallbackUrl: string } | null {
  if (!/^[0-9]{1,20}$/.test(id)) return null;
  const url = `https://matchora.pro/embed/channel/${id}`;
  return { embedUrl: url, fallbackUrl: url };
}
export function buildLive24Urls(id: string): { embedUrl: string; fallbackUrl: string } | null {
  if (!/^[a-z0-9][a-z0-9-]{0,159}$/.test(id) || isFormula1Text(id)) return null;
  const url = `https://livelive24.st/live24.html?url=${encodeURIComponent(id)}`;
  return { embedUrl: url, fallbackUrl: url };
}
export function parseMatchora(payload: unknown, now = Date.now()): OtherStreamItem[] {
  const data = payload as {events?: unknown} | null;
  if (!Array.isArray(data?.events)) return [];
  const out: OtherStreamItem[] = [], seen = new Set<string>();
  for (const raw of data.events) {
    if (!raw || typeof raw !== 'object') continue;
    const e = raw as Record<string, unknown>;
    const category = String(e.sport || '').trim().slice(0, 80), league = String(e.league || '').trim().slice(0, 80);
    const title = [e.home, e.away].map(x => String(x || '').trim()).filter(Boolean).join(' vs ').slice(0, 140);
    const kickoff = Number(e.kickoff) * 1000, eventId = String(e.id || '');
    if (e.live !== true || e.finished === true || !title || !SODA_SPORTS.test(category) || isFormula1Text(`${title} ${category} ${league} ${eventId}`) || !Number.isFinite(kickoff) || kickoff <= 0 || kickoff > now) continue;
    for (const rawChannel of Array.isArray(e.channels) ? e.channels : []) {
      if (!rawChannel || typeof rawChannel !== 'object') continue;
      const c = rawChannel as Record<string, unknown>, id = String(c.id || ''), name = String(c.name || '').trim().slice(0, 80);
      if (c.dead === true || c.playing === false || isFormula1Text(`${name} ${id}`) || isLowResStream(String(c.quality || ''))) continue;
      const urls = buildMatchoraUrls(id), key = `${eventId}:${id}`;
      if (!urls || seen.has(key)) continue;
      seen.add(key);
      out.push({key:`matchora:${key}`,provider:'matchora',id,title,category,subtitle:[category,league,name].filter(Boolean).join(' · '),tag:name ? `Matchora · ${name}` : 'Matchora',viewers:Math.max(0,Math.min(Number(c.watching)||0,100000000)),alwaysLive:false,startAt:kickoff,status:'live',...urls,color:pickStreamColor('matchora',category)});
    }
  }
  return out;
}
export function parseLive24(payload: unknown, now = Date.now()): OtherStreamItem[] {
  const data = payload as {success?: unknown; live?: unknown} | null;
  if (data?.success !== true || !Array.isArray(data.live)) return [];
  const out: OtherStreamItem[] = [], seen = new Set<string>();
  for (const raw of data.live) {
    if (!raw || typeof raw !== 'object') continue;
    const e = raw as Record<string, unknown>, title = String(e.title || '').trim().slice(0,140), category = String(e.category || '').trim().slice(0,80), league = String(e.tournament || '').trim().slice(0,80), startAt = Number(e.date);
    if (e.live !== true || !title || !SODA_SPORTS.test(`${category} ${league} ${title}`) || isFormula1Text(`${title} ${category} ${league} ${e.id || ''}`) || !Number.isFinite(startAt) || startAt <= 0 || startAt > now) continue;
    for (const rawSource of Array.isArray(e.sources) ? e.sources : []) {
      if (!rawSource || typeof rawSource !== 'object') continue;
      const source = rawSource as Record<string, unknown>; let url: URL;
      try { url = new URL(String(source.url || '')); } catch { continue; }
      if (url.protocol !== 'https:' || url.hostname !== 'livelive24.st' || url.port || url.username || url.password || url.pathname !== '/live24.html' || url.hash || [...url.searchParams.keys()].some(k => k !== 'url') || url.searchParams.getAll('url').length !== 1) continue;
      const id = url.searchParams.get('url') || '', label = String(source.channelName || '').trim().slice(0,80), urls = buildLive24Urls(id);
      if (!urls || seen.has(id) || isFormula1Text(label) || isLowResStream(label)) continue;
      seen.add(id);
      out.push({key:`live24:${id}`,provider:'live24',id,title,category,subtitle:[category,league,label].filter(Boolean).join(' · '),tag:label ? `Live24 · ${label}` : 'Live24',viewers:0,alwaysLive:false,startAt,status:'live',...urls,color:pickStreamColor('live24',category)});
    }
  }
  return out;
}

/** EmbedSportex: preserve the provider player and opaque fragment, never proxy video. */
export function buildEsportexUrls(rawId: string): {embedUrl:string;fallbackUrl:string} | null {
  const match=/^([as]):([A-Za-z0-9+/_=-]{1,600})$/.exec(String(rawId || ''));
  if (!match) return null;
  const url=`https://${match[1] === 's' ? 'streams' : 'api'}.esportex.site/player#${match[2]}`;
  return {embedUrl:url,fallbackUrl:url};
}
export function parseEsportexStreams(payload:unknown,now=Date.now()):OtherStreamItem[] {
  const data=payload as Record<string,unknown> | null;
  if (!data || data.success!==true) throw new Error('Invalid EmbedSportex catalogue');
  const categories:Record<string,string>={football:'Football',basketball:'Basketball',amfootball:'American Football',baseball:'Baseball',badminton:'Badminton',volleyball:'Volleyball',tennis:'Tennis',race:'Motorsport',fight:'Combat Sports',hockey:'Hockey',rugby:'Rugby',cricket:'Cricket',other:'Sports'};
  if (!Object.keys(categories).some(k=>Array.isArray(data[k]))) throw new Error('Invalid EmbedSportex catalogue');
  const result:OtherStreamItem[]=[],seen=new Set<string>();
  const time=(v:unknown)=>typeof v==='string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(v) ? Date.parse(v.replace(' ','T')+'+07:00') : NaN;
  for (const [key,category] of Object.entries(categories)) {
    if (!Array.isArray(data[key])) continue;
    for (const row of (data[key] as unknown[]).slice(0,1000)) {
      if (!row || typeof row!=='object') continue;
      const event=row as Record<string,unknown>,title=String(event.tag||'').trim().slice(0,140),league=String(event.league||'').trim().slice(0,80),slug=String(event.slug||'').trim();
      const start=time(event.kickoff),end=time(event.endTime);
      if (!title || !Number.isFinite(start) || !Number.isFinite(end) || end<=start || start>now || now>=end || isFormula1Text(`${title} ${league} ${slug}`) || !Array.isArray(event.iframes)) continue;
      for (const value of event.iframes.slice(0,50)) {
        if (!value || typeof value!=='object') continue;
        const frame=value as Record<string,unknown>, label=String(frame.server||'').trim().slice(0,70);
        if (isLowResStream(label) || /^SD\d*(?:\s|\/|$)/i.test(label) || isFormula1Text(label) || typeof frame.url!=='string') continue;
        let u:URL; try { u=new URL(frame.url); } catch { continue; }
        if (u.protocol!=='https:' || !['streams.esportex.site','api.esportex.site'].includes(u.hostname) || u.username || u.password || u.port || u.pathname!=='/player' || u.search || !u.hash) continue;
        const id=`${u.hostname.startsWith('streams.')?'s':'a'}:${u.hash.slice(1)}`,urls=buildEsportexUrls(id);
        if (!urls || urls.embedUrl!==frame.url || seen.has(`${slug}:${id}`)) continue;
        seen.add(`${slug}:${id}`);
        result.push({key:`esportex:${slug}:${id}`,provider:'esportex',id,title:label?`${title} · ${label}`:title,category,subtitle:[category,league].filter(Boolean).join(' · '),tag:label?`EmbedSportex · ${label}`:'EmbedSportex',viewers:0,alwaysLive:false,startAt:start,status:'live',...urls,color:pickStreamColor('esportex',category)});
      }
    }
  }
  return result;
}

const PROVIDER_TO_CODE: Record<OtherStreamProvider, string> = {
  embdlol: '1',
  ppv: '2',
  weelo: '3',
  strmfree: '4',
  timstreams: '5',
  zlive: '6',
  aura: '7',
  bintv: '8',
  ntv: '9',
  matchora: '10',
  live24: '11',
  esportex: '12',
};

const CODE_TO_PROVIDER: Record<string, OtherStreamProvider> = {
  '1': 'embdlol',
  '2': 'ppv',
  '3': 'weelo',
  '4': 'strmfree',
  '5': 'timstreams',
  '6': 'zlive',
  '7': 'aura',
  '8': 'bintv',
  '9': 'ntv',
  '10': 'matchora',
  '11': 'live24',
  '12': 'esportex',
  embdlol: 'embdlol',
  ppv: 'ppv',
  weelo: 'weelo',
  strmfree: 'strmfree',
  timstreams: 'timstreams',
  zlive: 'zlive',
  aura: 'aura',
  bintv: 'bintv',
  ntv: 'ntv',
  matchora: 'matchora',
  live24: 'live24',
  esportex: 'esportex',
};

function slugifyStreamLabel(value: string): string {
  const clean = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return clean || 'stream';
}

export function buildPrivateCockpitHref(item: OtherStreamItem): string {
  const params = new URLSearchParams();
  params.set('s', PROVIDER_TO_CODE[item.provider]);
  params.set('id', item.id);
  if (item.host) params.set('host', item.host);
  params.set('title', item.title);
  params.set('cat', item.category);
  if (item.subtitle) params.set('sub', item.subtitle);
  if (item.alwaysLive) params.set('al', '1');
  if ((item.provider === 'timstreams' || item.provider === 'aura' || item.provider === 'bintv' || item.provider === 'ntv' || item.provider === 'weelo') && item.startAt) params.set('start', String(item.startAt));
  if ((item.provider === 'aura' || item.provider === 'bintv' || item.provider === 'ntv' || item.provider === 'weelo') && item.status === 'scheduled') params.set('scheduled', '1');
  return `/private-cockpit?${params.toString()}`;
}

export interface ResolvedPrivateStream {
  provider: OtherStreamProvider;
  id: string;
  title: string;
  category: string;
  subtitle: string;
  alwaysLive: boolean;
  startAt?: number;
  status?: 'live' | 'scheduled';
  stagePath: string;
  embedUrl: string;
  fallbackUrl: string;
}

export function parsePrivateCockpitParams(
  search: string,
  backend = DEFAULT_BACKEND,
): ResolvedPrivateStream | null {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const codeRaw = String(params.get('s') || params.get('p') || '').trim().toLowerCase();
  const provider = CODE_TO_PROVIDER[codeRaw];
  if (!provider) return null;

  const rawId = String(params.get('id') || '').trim();
  if (!rawId) return null;

  let embedUrl = '';
  let fallbackUrl = '';
  let cleanId = rawId;

  if (provider === 'embdlol') {
    const urls = buildEmbdlolUrls(rawId, backend);
    if (!urls) return null;
    embedUrl = urls.embedUrl;
    fallbackUrl = urls.fallbackUrl;
  } else if (provider === 'weelo') {
    const urls = buildWeeloUrls(rawId, backend);
    if (!urls) return null;
    embedUrl = urls.embedUrl;
    fallbackUrl = urls.fallbackUrl;
  } else if (provider === 'esportex') {
    const urls=buildEsportexUrls(rawId);
    if (!urls) return null;
    embedUrl=urls.embedUrl; fallbackUrl=urls.fallbackUrl;
  } else if (provider === 'matchora' || provider === 'live24') {
    const urls = provider === 'matchora' ? buildMatchoraUrls(rawId) : buildLive24Urls(rawId);
    if (!urls) return null;
    embedUrl = urls.embedUrl;
    fallbackUrl = urls.fallbackUrl;
  } else if (provider === 'ntv') {
    const urls = buildNtvUrls(rawId);
    if (!urls) return null;
    embedUrl = urls.embedUrl;
    fallbackUrl = urls.fallbackUrl;
  } else if (provider === 'bintv') {
    const urls = buildBintvUrls(rawId);
    if (!urls) return null;
    embedUrl = urls.embedUrl;
    fallbackUrl = urls.fallbackUrl;
  } else if (provider === 'aura') {
    const urls = buildAuraUrls(rawId);
    if (!urls) return null;
    embedUrl = urls.embedUrl;
    fallbackUrl = urls.fallbackUrl;
  } else if (provider === 'zlive') {
    const urls = buildZliveUrls(rawId);
    if (!urls) return null;
    embedUrl = urls.embedUrl;
    fallbackUrl = urls.fallbackUrl;
  } else if (provider === 'timstreams') {
    const urls = buildTimstreamsUrls(rawId);
    if (!urls) return null;
    embedUrl = urls.embedUrl;
    fallbackUrl = urls.fallbackUrl;
  } else if (provider === 'strmfree') {
    const urls = buildStreamfreeUrls(rawId, String(params.get('host') || 'strmfree.st'));
    if (!urls) return null;
    cleanId = urls.id;
    embedUrl = urls.embedUrl;
    fallbackUrl = urls.fallbackUrl;
  } else {
    const rawHost = String(params.get('host') || '').trim();
    const urls = buildPpvUrls(rawId, rawHost, backend);
    if (!urls) return null;
    cleanId = urls.slug;
    embedUrl = urls.embedUrl;
    fallbackUrl = urls.fallbackUrl;
  }

  const title = String(params.get('title') || '').trim().slice(0, 140) || cleanId;
  const category = String(params.get('cat') || '').trim().slice(0, 80) || 'Live Feed';
  const subtitle = String(params.get('sub') || '').trim().slice(0, 180) || `${category} · Live`;
  const alwaysLive = params.get('al') === '1';

  if (provider === 'weelo' ? /^(?:f1|formula\s*1)$/i.test(category) : isFormula1Text(`${title} ${category} ${cleanId}`)) return null;

  return {
    provider,
    id: cleanId,
    title,
    category,
    subtitle,
    alwaysLive,
    startAt: (provider === 'timstreams' || provider === 'aura' || provider === 'bintv' || provider === 'ntv' || provider === 'weelo') && /^\d{13}$/.test(params.get('start') || '') ? Number(params.get('start')) : undefined,
    status: provider === 'timstreams' || ((provider === 'aura' || provider === 'bintv' || provider === 'ntv' || provider === 'weelo') && params.get('scheduled') === '1') ? 'scheduled' : undefined,
    stagePath: `freef1://live/other/${slugifyStreamLabel(title)}`,
    embedUrl,
    fallbackUrl,
  };
}

async function fetchJsonWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 8500,
  fetchImpl: typeof fetch = fetch,
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, {
      ...init,
      signal: controller.signal,
      headers: { Accept: 'application/json', ...(init.headers || {}) },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchStreamfree(fetchImpl: typeof fetch, useCache: boolean): Promise<unknown> {
  if (useCache) {
    try {
      const cached = JSON.parse(localStorage.getItem(STREAMFREE_CACHE_KEY) || 'null');
      if (cached && Date.now() - cached.at >= 0 && Date.now() - cached.at < STREAMFREE_CACHE_MS && Array.isArray(cached.data?.streams)) return cached.data;
    } catch { /* Storage may be unavailable. */ }
  }
  const data = await fetchJsonWithTimeout(STREAMFREE_STREAMS_URL, {}, 8500, fetchImpl);
  if (!Array.isArray((data as { streams?: unknown } | null)?.streams)) throw new Error('Invalid StreamFree response');
  if (useCache) {
    try { localStorage.setItem(STREAMFREE_CACHE_KEY, JSON.stringify({ at: Date.now(), data })); } catch { /* Storage is optional. */ }
  }
  return data;
}

async function fetchBintv(fetchImpl: typeof fetch, useCache: boolean): Promise<unknown> {
  if (useCache) {
    try {
      const cached = JSON.parse(localStorage.getItem(BINTV_CACHE_KEY) || 'null');
      if (cached && Date.now() - cached.at >= 0 && Date.now() - cached.at < 60_000 && Array.isArray(cached.data?.['Live Events'])) return cached.data;
    } catch { /* Storage is optional. */ }
  }
  const data = await fetchJsonWithTimeout(BINTV_EVENTS_URL, {}, 8500, fetchImpl);
  if (!Array.isArray((data as Record<string, unknown> | null)?.['Live Events'])) throw new Error('Invalid BinTV response');
  if (useCache) { try { localStorage.setItem(BINTV_CACHE_KEY, JSON.stringify({at: Date.now(), data})); } catch { /* Optional. */ } }
  return data;
}

async function fetchNtv(fetchImpl: typeof fetch, useCache: boolean): Promise<unknown> {
  if (useCache) {
    try {
      const cached = JSON.parse(localStorage.getItem(NTV_CACHE_KEY) || 'null');
      if (cached && Date.now() - cached.at >= 0 && Date.now() - cached.at < 60_000 && Array.isArray(cached.data?.all)) return cached.data;
    } catch { /* Storage is optional. */ }
  }
  const data = await fetchJsonWithTimeout(NTV_RAPTOR_URL, {}, 8500, fetchImpl);
  if (!Array.isArray((data as { all?: unknown } | null)?.all)) throw new Error('Invalid NTV response');
  if (useCache) { try { localStorage.setItem(NTV_CACHE_KEY, JSON.stringify({at: Date.now(), data})); } catch { /* Optional. */ } }
  return data;
}

export async function fetchAllOtherStreams(options: {
  backend?: string;
  fetchImpl?: typeof fetch;
} = {}): Promise<OtherStreamsResult> {
  const backend = resolveBackendOrigin(options.backend);
  const fetchImpl = options.fetchImpl || fetch;

  const fetchWeeloPlayers = async (): Promise<unknown> => {
    let lastError: unknown;
    for (const url of WEELO_PLAYERS_URLS) {
      try {
        return await fetchJsonWithTimeout(url, { referrerPolicy: 'no-referrer' }, 8500, fetchImpl);
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error('Weelo unavailable');
  };

  // One public RacingLap request normally; the old discovery sources are only a failure fallback.
  const fetchRacingLap = async (): Promise<OtherStreamItem[]> => {
    try {
      return parseRacingLapOther(await fetchJsonWithTimeout(RACINGLAP_STREAMS_URL, {}, 6500, fetchImpl));
    } catch {
      const [players, status, feed] = await Promise.allSettled([
        fetchWeeloPlayers(),
        fetchJsonWithTimeout(RACINGLAP_STATUS_URL, {referrerPolicy:'no-referrer'},6500,fetchImpl),
        fetchJsonWithTimeout(WEELO_FEED_URL, {referrerPolicy:'no-referrer'},6500,fetchImpl),
      ]);
      if (players.status !== 'fulfilled' && feed.status !== 'fulfilled') throw new Error('RacingLap unavailable');
      return parseWeeloEvents(players.status==='fulfilled'?players.value:null,status.status==='fulfilled'?status.value:null,feed.status==='fulfilled'?feed.value:null,backend);
    }
  };
  const [embRes, ppvRes, weeloRes, streamfreeRes, timstreamsRes, zliveRes, auraRes, bintvRes, ntvRes, matchoraRes, live24Res, esportexRes] = await Promise.allSettled([
    fetchJsonWithTimeout(EMBDLOL_STRUCT_URL, {}, 8500, fetchImpl),
    fetchJsonWithTimeout(PPV_STREAMS_URL, {}, 8500, fetchImpl),
    fetchRacingLap(),
    fetchStreamfree(fetchImpl, !options.fetchImpl),
    fetchJsonWithTimeout(TIMSTREAMS_EVENTS_URL, {}, 8500, fetchImpl),
    fetchJsonWithTimeout(ZLIVE_MANIFEST_URL, {}, 8500, fetchImpl),
    fetchJsonWithTimeout(AURA_SCHEDULE_URL, {}, 8500, fetchImpl),
    fetchBintv(fetchImpl, !options.fetchImpl),
    fetchNtv(fetchImpl, !options.fetchImpl),
    fetchJsonWithTimeout(MATCHORA_URL, {}, 8500, fetchImpl),
    fetchJsonWithTimeout(LIVE24_URL, {}, 8500, fetchImpl),
    (async () => parseEsportexStreams(await fetchJsonWithTimeout(ESPORTEX_URL, {}, 8500, fetchImpl)))(),
  ]);

  const embItems = embRes.status === 'fulfilled' ? parseEmbdlolStruct(embRes.value, backend) : [];
  const ppvItems = ppvRes.status === 'fulfilled' ? parsePpvStreams(ppvRes.value, backend) : [];
  const weeloOk = weeloRes.status === 'fulfilled';
  const weeloItems = weeloRes.status === 'fulfilled' ? weeloRes.value : [];

  const streamfreeItems = streamfreeRes.status === 'fulfilled' ? parseStreamfreeStreams(streamfreeRes.value) : [];
  const timstreamsItems = timstreamsRes.status === 'fulfilled' ? parseTimstreamsEvents(timstreamsRes.value) : [];
  const zliveItems = zliveRes.status === 'fulfilled' ? parseZliveSports(zliveRes.value) : [];
  const auraItems = auraRes.status === 'fulfilled' ? parseAuraEvents(auraRes.value) : [];
  const bintvItems = bintvRes.status === 'fulfilled' ? parseBintvStreams(bintvRes.value) : [];
  const ppvUrls = new Set(ppvItems.map(item => item.embedUrl));
  const ntvItems = ntvRes.status === 'fulfilled' ? parseNtvRaptor(ntvRes.value).filter(item => !ppvUrls.has(item.embedUrl)) : [];
  const matchoraItems = matchoraRes.status === 'fulfilled' ? parseMatchora(matchoraRes.value) : [];
  const live24Items = live24Res.status === 'fulfilled' ? parseLive24(live24Res.value) : [];
  const esportexItems = esportexRes.status === 'fulfilled' ? esportexRes.value : [];
  const items = [...esportexItems, ...embItems, ...weeloItems, ...ppvItems, ...streamfreeItems, ...timstreamsItems, ...zliveItems, ...auraItems, ...bintvItems, ...ntvItems, ...matchoraItems, ...live24Items];

  return {
    items,
    counts: {
      all: items.length,
      embdlol: embItems.length,
      ppv: ppvItems.length,
      weelo: weeloItems.length,
      strmfree: streamfreeItems.length,
      timstreams: timstreamsItems.length,
      zlive: zliveItems.length,
      aura: auraItems.length,
      bintv: bintvItems.length,
      ntv: ntvItems.length,
      matchora: matchoraItems.length,
      live24: live24Items.length,
      esportex: esportexItems.length,
    },
    providerOk: {
      embdlol: embRes.status === 'fulfilled',
      ppv: ppvRes.status === 'fulfilled',
      weelo: weeloOk,
      strmfree: streamfreeRes.status === 'fulfilled',
      timstreams: timstreamsRes.status === 'fulfilled',
      zlive: zliveRes.status === 'fulfilled',
      aura: auraRes.status === 'fulfilled',
      bintv: bintvRes.status === 'fulfilled',
      ntv: ntvRes.status === 'fulfilled',
      matchora: matchoraRes.status === 'fulfilled',
      live24: live24Res.status === 'fulfilled',
      esportex: esportexRes.status === 'fulfilled',
    },
  };
}
