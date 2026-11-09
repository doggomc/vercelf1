import { initShell } from '../ui/shell';
import '../viewer-counter';
import {
  buildPrivateCockpitHref,
  fetchAllOtherStreams,
  type OtherStreamItem,
  type OtherStreamProvider,
} from '../lib/other-streams';

initShell();
document
  .querySelectorAll<HTMLAnchorElement>('.nav-links a[href="/other.html"], .footer-nav a[href="/other.html"]')
  .forEach((a) => a.setAttribute('aria-current', 'page'));

type ProviderFilter = 'all' | OtherStreamProvider;

const PROVIDER_BADGE: Record<OtherStreamProvider, string> = {
  embdlol: 'EMBDLOL',
  ppv: 'PPV',
  weelo: 'Weelo',
};

const gridEl = document.getElementById('streamsGrid');
const emptyEl = document.getElementById('streamsEmpty');
const emptyTitleEl = document.getElementById('streamsEmptyTitle');
const emptyTextEl = document.getElementById('streamsEmptyText');
const filtersEl = document.getElementById('providerFilters');
const searchInput = document.getElementById('streamSearch') as HTMLInputElement | null;
const refreshBtn = document.getElementById('refreshStreamsBtn') as HTMLButtonElement | null;
const backendMeta = document.querySelector<HTMLMetaElement>('meta[name="freef1-help-api"]')?.content;

let allItems: OtherStreamItem[] = [];
let activeProvider: ProviderFilter = 'all';
let searchQuery = '';
let loading = false;
let lastLoadedAt = 0;

function createStreamCard(item: OtherStreamItem): HTMLAnchorElement {
  const card = document.createElement('a');
  card.className = 'team-card os-stream-card';
  card.href = buildPrivateCockpitHref(item);
  card.style.setProperty('--tc', item.color);

  const top = document.createElement('div');
  top.className = 't-top';

  const bar = document.createElement('span');
  bar.className = 't-bar';
  bar.setAttribute('aria-hidden', 'true');
  top.appendChild(bar);

  const badges = document.createElement('div');
  badges.className = 'os-card-badges';

  const liveBadge = document.createElement('span');
  liveBadge.className = 'os-badge os-badge-live';
  const dot = document.createElement('span');
  dot.className = 'os-live-dot';
  dot.setAttribute('aria-hidden', 'true');
  liveBadge.appendChild(dot);
  liveBadge.appendChild(document.createTextNode(item.alwaysLive ? '24/7' : 'Live'));

  const providerBadge = document.createElement('span');
  providerBadge.className = 'os-badge';
  providerBadge.textContent = PROVIDER_BADGE[item.provider];

  badges.appendChild(liveBadge);
  badges.appendChild(providerBadge);
  top.appendChild(badges);

  const body = document.createElement('div');
  const name = document.createElement('div');
  name.className = 't-name';
  name.textContent = item.title;

  const sub = document.createElement('div');
  sub.className = 't-sub';
  sub.textContent = item.subtitle;

  body.appendChild(name);
  body.appendChild(sub);

  card.appendChild(top);
  card.appendChild(body);
  return card;
}

function updateCounts(counts: Record<'all' | OtherStreamProvider, number>): void {
  if (!filtersEl) return;
  for (const key of ['all', 'embdlol', 'ppv', 'weelo'] as const) {
    const badge = filtersEl.querySelector<HTMLElement>(`[data-count="${key}"]`);
    if (badge) badge.textContent = String(counts[key]);
  }
}

function renderList(): void {
  if (!gridEl || !emptyEl) return;
  const needle = searchQuery.trim().toLowerCase();

  const filtered = allItems.filter((item) => {
    if (activeProvider !== 'all' && item.provider !== activeProvider) return false;
    if (!needle) return true;
    const haystack = `${item.title} ${item.category} ${item.subtitle} ${item.provider}`.toLowerCase();
    return haystack.includes(needle);
  });

  gridEl.replaceChildren(...filtered.map(createStreamCard));
  const isEmpty = filtered.length === 0;
  gridEl.hidden = isEmpty;
  emptyEl.hidden = !isEmpty;

  if (isEmpty && emptyTitleEl && emptyTextEl) {
    if (needle) {
      emptyTitleEl.textContent = 'No streams match your search';
      emptyTextEl.textContent = 'Try clearing the search box or switching the provider tab above.';
    } else if (activeProvider !== 'all') {
      const label = PROVIDER_BADGE[activeProvider];
      emptyTitleEl.textContent = `No live non-F1 ${label} streams right now`;
      emptyTextEl.textContent = `${label} channels appear here automatically as soon as non-F1 events go on air.`;
    } else {
      emptyTitleEl.textContent = 'No live non-F1 streams right now';
      emptyTextEl.textContent = 'Check back shortly or hit Refresh when events start.';
    }
  }
}

async function loadStreams(): Promise<void> {
  if (loading) return;
  loading = true;
  if (refreshBtn) {
    refreshBtn.disabled = true;
    refreshBtn.textContent = 'Refreshing…';
  }
  try {
    const result = await fetchAllOtherStreams({ backend: backendMeta });
    allItems = result.items;
    lastLoadedAt = Date.now();
    updateCounts(result.counts);
    renderList();
  } catch {
    updateCounts({ all: 0, embdlol: 0, ppv: 0, weelo: 0 });
    allItems = [];
    renderList();
  } finally {
    loading = false;
    if (refreshBtn) {
      refreshBtn.disabled = false;
      refreshBtn.textContent = 'Refresh';
    }
  }
}

filtersEl?.addEventListener('click', (e) => {
  const btn = (e.target as Element | null)?.closest<HTMLButtonElement>('button[data-provider]');
  if (!btn) return;
  const next = btn.dataset.provider as ProviderFilter | undefined;
  if (!next) return;
  activeProvider = next;
  filtersEl.querySelectorAll<HTMLButtonElement>('button[data-provider]').forEach((b) => {
    const selected = b === btn;
    b.classList.toggle('is-active', selected);
    b.setAttribute('aria-selected', String(selected));
  });
  renderList();
});

searchInput?.addEventListener('input', () => {
  searchQuery = searchInput.value;
  renderList();
});

refreshBtn?.addEventListener('click', () => {
  void loadStreams();
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && Date.now() - lastLoadedAt > 90_000) {
    void loadStreams();
  }
});

void loadStreams();
