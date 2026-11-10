export type OtherStreamProvider = 'embdlol' | 'ppv' | 'weelo' | 'strmfree';

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
  embedUrl: string;
  fallbackUrl: string;
  color: string;
}

export interface OtherStreamsResult {
  items: OtherStreamItem[];
  counts: Record<'all' | OtherStreamProvider, number>;
  providerOk: Record<OtherStreamProvider, boolean>;
}

const DEFAULT_BACKEND = 'https://f1admin.onrender.com';
const EMBDLOL_STRUCT_URL = 'https://api.embdlol.st/struct';
const STREAMFREE_STREAMS_URL = 'https://strmfree.st/api/v1/streams';
const STREAMFREE_CACHE_KEY = 'freef1-streamfree-v1';
const STREAMFREE_CACHE_MS = 60_000;
const PPV_STREAMS_URL = 'https://api.ppv.st/api/streams';
const WEELO_PLAYERS_URLS = [
  'https://weelo.live/players/events.json',
  'https://v.weellz.live/players/events.json',
];
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
  const origin = resolveBackendOrigin(backend);
  return {
    embedUrl: `${origin}/api/stream/embdlol-embed?id=${encodeURIComponent(id)}`,
    fallbackUrl: `https://embdlol.st/embed/${encodeURIComponent(id)}`,
  };
}

export function buildWeeloUrls(rawStreamId: string, backend = DEFAULT_BACKEND): { embedUrl: string; fallbackUrl: string } | null {
  const clean = String(rawStreamId || '').trim();
  const match = clean.match(/[?&]stream=([A-Za-z0-9_-]{4,80})(?:[&#]|$)/i);
  const id = match ? match[1] : clean;
  if (!/^[A-Za-z0-9_-]{4,80}$/.test(id)) return null;
  const origin = resolveBackendOrigin(backend);
  return {
    embedUrl: `${origin}/api/stream/weellz-embed?stream=${encodeURIComponent(id)}`,
    fallbackUrl: `https://weellz.live/beta?stream=${encodeURIComponent(id)}`,
  };
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
  const origin = resolveBackendOrigin(backend);

  /* Live Render /api/stream/ppv-embed supports single-segment non-F1 slugs on taifood-blog.asia.
     Multi-segment event slugs (e.g. nfl/2026-11-09/buf-min) load directly via HTTPS embed. */
  const canUseStripped = host === PPV_STRIPPED_HOST && /^[a-z0-9][a-z0-9_-]{1,150}$/i.test(slug);
  return {
    slug,
    host,
    embedUrl: canUseStripped
      ? `${origin}/api/stream/ppv-embed?slug=${encodeURIComponent(slug)}&host=${encodeURIComponent(host)}`
      : directUrl,
    fallbackUrl: directUrl,
  };
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
  if (seriesKey === 'f1' || seriesKey === 'f1a' || seriesKey === 'show') return true;
  if (series === 'f1' || series === 'formula 1' || series === 'f1 academy' || series === 'show') return true;
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
      if (!streamId || isFormula1Text(`${sessionName} ${chName}`)) continue;

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
      if (isFormula1Text(`${eventTitle} ${label}`)) continue;
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

const PROVIDER_TO_CODE: Record<OtherStreamProvider, string> = {
  embdlol: '1',
  ppv: '2',
  weelo: '3',
  strmfree: '4',
};

const CODE_TO_PROVIDER: Record<string, OtherStreamProvider> = {
  '1': 'embdlol',
  '2': 'ppv',
  '3': 'weelo',
  '4': 'strmfree',
  embdlol: 'embdlol',
  ppv: 'ppv',
  weelo: 'weelo',
  strmfree: 'strmfree',
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
  return `/private-cockpit?${params.toString()}`;
}

export interface ResolvedPrivateStream {
  provider: OtherStreamProvider;
  id: string;
  title: string;
  category: string;
  subtitle: string;
  alwaysLive: boolean;
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

  if (isFormula1Text(`${title} ${category} ${cleanId}`)) return null;

  return {
    provider,
    id: cleanId,
    title,
    category,
    subtitle,
    alwaysLive,
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

  const [embRes, ppvRes, weeloPlayersRes, statusRes, weeloFeedRes, streamfreeRes] = await Promise.allSettled([
    fetchJsonWithTimeout(EMBDLOL_STRUCT_URL, {}, 8500, fetchImpl),
    fetchJsonWithTimeout(PPV_STREAMS_URL, {}, 8500, fetchImpl),
    fetchWeeloPlayers(),
    fetchJsonWithTimeout(RACINGLAP_STATUS_URL, { referrerPolicy: 'no-referrer' }, 6500, fetchImpl),
    fetchJsonWithTimeout(WEELO_FEED_URL, { referrerPolicy: 'no-referrer' }, 6500, fetchImpl),
    fetchStreamfree(fetchImpl, !options.fetchImpl),
  ]);

  const embItems = embRes.status === 'fulfilled' ? parseEmbdlolStruct(embRes.value, backend) : [];
  const ppvItems = ppvRes.status === 'fulfilled' ? parsePpvStreams(ppvRes.value, backend) : [];
  const weeloOk = weeloPlayersRes.status === 'fulfilled' || weeloFeedRes.status === 'fulfilled';
  const weeloItems = weeloOk
    ? parseWeeloEvents(
        weeloPlayersRes.status === 'fulfilled' ? weeloPlayersRes.value : null,
        statusRes.status === 'fulfilled' ? statusRes.value : null,
        weeloFeedRes.status === 'fulfilled' ? weeloFeedRes.value : null,
        backend,
      )
    : [];

  const streamfreeItems = streamfreeRes.status === 'fulfilled' ? parseStreamfreeStreams(streamfreeRes.value) : [];
  const items = [...embItems, ...weeloItems, ...ppvItems, ...streamfreeItems];

  return {
    items,
    counts: {
      all: items.length,
      embdlol: embItems.length,
      ppv: ppvItems.length,
      weelo: weeloItems.length,
      strmfree: streamfreeItems.length,
    },
    providerOk: {
      embdlol: embRes.status === 'fulfilled',
      ppv: ppvRes.status === 'fulfilled',
      weelo: weeloOk,
      strmfree: streamfreeRes.status === 'fulfilled',
    },
  };
}
