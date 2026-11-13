import '../interaction-guard';
import { initShell } from '../ui/shell';
import { initPageGate } from '../features/page-gate';
import '../viewer-counter';
import { mountCockpitViewerCount } from '../features/cockpit-viewers';
import { parsePrivateCockpitParams } from '../lib/other-streams';

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

function mountStream(useFallback = false): void {
  if (document.getElementById('partialOutageStage')) return;
  if (!resolved || !stageBox) {
    showMissingState();
    return;
  }

  const token = ++activeToken;
  /* f1admin stripped embeds restrict frame-ancestors to *.vercel.app / *.netlify.app,
     so local dev/preview uses the direct upstream embed URL. */
  const preferFallback = useFallback || isLocalDevHost();
  const targetUrl = preferFallback ? resolved.fallbackUrl : resolved.embedUrl;

  clearFrames();
  noStreamEl?.classList.remove('visible');
  if (loaderTextEl) loaderTextEl.textContent = useFallback ? 'Switching to backup feed…' : 'Establishing feed…';
  loaderEl?.classList.remove('hidden');

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
      mountStream(true);
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
    overridePill.textContent = resolved.alwaysLive ? '24/7 · Live' : 'Live Feed';
    overridePill.classList.add('active');
  }
  if (badgeEl) badgeEl.textContent = 'Live now';
  if (categoryEl) categoryEl.textContent = resolved.category;
  if (titleEl) titleEl.textContent = resolved.title;
  if (metaEl) metaEl.textContent = resolved.subtitle;

  void initPageGate().then(() => mountStream(false));
}

reloadBtn?.addEventListener('click', () => mountStream(false));
retryBtn?.addEventListener('click', () => mountStream(false));
