import '../interaction-guard';
import { initShell } from '../ui/shell';
import { initPageGate } from '../features/page-gate';
import '../viewer-counter';
import { setCounterContext } from '../features/counter-context';
import { mountCockpitViewerCount } from '../features/cockpit-viewers';
import { extractTimstreamsPlayer, parsePrivateCockpitParams } from '../lib/other-streams';

initShell({ nav: false, transitions: false });

const IFRAME_ALLOW = 'autoplay; fullscreen; picture-in-picture; encrypted-media';

/* Always in theater mode without settings. */
document.body.classList.add('theater', 'theater-no-sources');

const stageBox = document.getElementById('stageBox');
const stageLabel = document.getElementById('stageLabel');
const overridePill = document.getElementById('overridePill');
const loaderEl = document.getElementById('loader');
const loaderTextEl = document.getElementById('loaderText');
const noStreamEl = document.getElementById('noStream');
const noStreamTitleEl = document.getElementById('noStreamTitle');
const noStreamTextEl = document.getElementById('noStreamText');
const badgeEl = document.getElementById('watchSessionBadge');
const categoryEl = document.getElementById('watchSessionCountdown');
const titleEl = document.getElementById('watchSessionTitle');
const metaEl = document.getElementById('watchSessionMeta');
const reloadBtn = document.getElementById('reloadFeedBtn') as HTMLButtonElement | null;
const retryBtn = document.getElementById('nsRetryBtn') as HTMLButtonElement | null;
const backendMeta = document.querySelector<HTMLMetaElement>('meta[name="freef1-help-api"]')?.content;

mountCockpitViewerCount();

function isStrippedEmbed(url: string): boolean {
  return (
    url.includes('/api/stream/weellz-embed') ||
    url.includes('/api/stream/embdlol-embed') ||
    url.includes('/api/stream/strmfree-embed') ||
    url.includes('/api/stream/ppv-embed')
  );
}

function makeStreamIframe(url: string, streamTitle: string): HTMLIFrameElement {
  const frame = document.createElement('iframe');
  frame.src = url;
  frame.allow = IFRAME_ALLOW;
  frame.setAttribute('allow', IFRAME_ALLOW);
  frame.allowFullscreen = true;
  if (isStrippedEmbed(url)) {
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
    frame.referrerPolicy = 'origin';
  } else {
    frame.referrerPolicy = 'origin';
  }
  frame.title = streamTitle || 'Live stream';
  return frame;
}

const resolved = parsePrivateCockpitParams(location.search, backendMeta);
let activeToken = 0;

function clearFrames(): void {
  if (!stageBox) return;
  stageBox.querySelectorAll('iframe, video').forEach((node) => node.remove());
}

function showMissingState(): void {
  clearFrames();
  loaderEl?.classList.add('hidden');
  noStreamEl?.classList.add('visible');
  if (noStreamTitleEl) noStreamTitleEl.textContent = 'No stream selected';
  if (noStreamTextEl) {
    noStreamTextEl.textContent = 'Choose an available channel on Other streams to launch its private theater cockpit.';
  }
  if (retryBtn) retryBtn.hidden = true;
  if (reloadBtn) reloadBtn.hidden = true;
  if (titleEl) titleEl.textContent = 'Private Cockpit';
  if (metaEl) metaEl.textContent = 'No active stream';
  if (overridePill) {
    overridePill.textContent = 'Standby';
    overridePill.classList.remove('active');
  }
}

function isLocalDevHost(): boolean {
  return location.hostname === 'localhost' || location.hostname === '127.0.0.1';
}

async function mountStream(useFallback = false): Promise<void> {
  if (document.getElementById('partialOutageStage')) return;
  if (!resolved || !stageBox) {
    showMissingState();
    return;
  }

  // Aggregate by display name, without sending provider URLs or visitor identifiers.
  const label = resolved.title.replace(/[\x00-\x1f<>]/g, '').replace(/https?:\/\/\S+/gi, '').trim().slice(0, 160) || 'Other stream';
  let hash = 2166136261; for (const c of label) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619);
  setCounterContext({ kind: 'other', key: `stream:${(hash >>> 0).toString(36)}`, label });
  const token = ++activeToken;
  /* f1admin stripped embeds restrict frame-ancestors to *.vercel.app / *.netlify.app,
     so local dev/preview uses the direct upstream embed URL. */
  const preferFallback = useFallback || isLocalDevHost();
  let targetUrl = preferFallback ? resolved.fallbackUrl : resolved.embedUrl;

  clearFrames();
  noStreamEl?.classList.remove('visible');
  if (loaderTextEl) loaderTextEl.textContent = useFallback ? 'Switching to backup feed…' : 'Establishing feed…';
  loaderEl?.classList.remove('hidden');

  if (resolved.provider === 'timstreams') {
    try {
      const response = await fetch(`https://tim-streams.com/api/watch/${encodeURIComponent(resolved.id)}`, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error('Provider unavailable');
      const player = extractTimstreamsPlayer(await response.json(), resolved.id);
      if (!player) throw new Error('No permitted player');
      if (token !== activeToken || document.getElementById('partialOutageStage')) return;
      targetUrl = player;
    } catch {
      if (token !== activeToken) return;
      loaderEl?.classList.add('hidden');
      if (noStreamTitleEl) noStreamTitleEl.textContent = 'Feed unavailable';
      if (noStreamTextEl) noStreamTextEl.textContent = 'The TimStreams player could not be loaded. Please try again later.';
      noStreamEl?.classList.add('visible');
      return;
    }
  }

  const frame = makeStreamIframe(targetUrl, resolved.title);
  let settled = false;

  const finishLoad = () => {
    if (token !== activeToken || settled) return;
    settled = true;
    frame.classList.add('is-ready');
    loaderEl?.classList.add('hidden');
  };

  frame.addEventListener('load', finishLoad, { once: true });

  /* Safety settle: if a cross-origin subresource stalls onload while video is playing,
     lift the spinner cleanly; if stripped relay completely fails, try fallbackUrl. */
  setTimeout(() => {
    if (token !== activeToken || settled) return;
    finishLoad();
  }, 4200);

  frame.addEventListener('error', () => {
    if (token !== activeToken) return;
    if (!useFallback && resolved.fallbackUrl && resolved.fallbackUrl !== resolved.embedUrl) {
      void mountStream(true);
      return;
    }
    settled = true;
    loaderEl?.classList.add('hidden');
    noStreamEl?.classList.add('visible');
  });

  stageBox.appendChild(frame);
}

if (!resolved) {
  void initPageGate();
  showMissingState();
} else {
  document.title = `${resolved.title} — Private Cockpit · FreeF1`;
  if (stageLabel) stageLabel.textContent = resolved.stagePath;
  if (overridePill) {
    overridePill.textContent = resolved.provider === 'timstreams' ? 'Scheduled event' : resolved.alwaysLive ? '24/7 · Live' : 'Live Feed';
    overridePill.classList.add('active');
  }
  if (badgeEl) badgeEl.textContent = resolved.provider === 'timstreams' ? (resolved.startAt && resolved.startAt > Date.now() ? 'Upcoming' : 'Scheduled') : 'Live now';
  if (categoryEl) categoryEl.textContent = resolved.category;
  if (titleEl) titleEl.textContent = resolved.title;
  if (metaEl) metaEl.textContent = resolved.subtitle;

  void initPageGate().then(() => { void mountStream(false); });
}

reloadBtn?.addEventListener('click', () => { void mountStream(false); });
retryBtn?.addEventListener('click', () => { void mountStream(false); });
