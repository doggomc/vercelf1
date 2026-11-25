import { initShell } from '../ui/shell';
import '../viewer-counter';
import { streamCategory } from '../lib/stream-categories';
import { channelLogo } from '../lib/channel-logos';
import { channelSpriteIndex } from '../lib/channel-sprite';
import { otherStreamSection, compareOtherStreams } from '../lib/stream-order';
import {
  buildPrivateCockpitHref,
  compareStreamProviders,
  isDirectoryLive,
  fetchAllOtherStreams,
  type OtherStreamItem,
} from '../lib/other-streams';

initShell();
document
  .querySelectorAll<HTMLAnchorElement>('.nav-links a[href="/other"], .footer-nav a[href="/other"]')
  .forEach((a) => a.setAttribute('aria-current', 'page'));

const LAUNCH_ARROW_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>';

const gridEl = document.getElementById('streamsGrid');
const emptyEl = document.getElementById('streamsEmpty');
const emptyTitleEl = document.getElementById('streamsEmptyTitle');
const emptyTextEl = document.getElementById('streamsEmptyText');
const filtersEl = document.getElementById('categoryFilters');
const categoryScroll = document.getElementById('categoryScroll');
const scrollPrev = document.getElementById('categoryScrollPrev') as HTMLButtonElement | null;
const scrollNext = document.getElementById('categoryScrollNext') as HTMLButtonElement | null;
const gliderEl = document.getElementById('tabsGlider');
const liveTotalEl = document.getElementById('liveTotalCount');
const providerFilter = document.getElementById('providerFilter') as HTMLSelectElement | null;
const PROVIDER_LABELS: Record<OtherStreamItem['provider'], string> = { matchora: 'Matchora', live24: 'Live24', esportex: 'EmbedSportex', aura: 'Aura Sports', bintv: 'BinTV', ntv: 'NTV Raptor', embdlol: 'EMB', ppv: 'PPV', strmfree: 'StreamFree', timstreams: 'TimStreams', weelo: 'RacingLap', zlive: 'ZLive' };
let activeProvider = 'all';
const searchInput = document.getElementById('streamSearch') as HTMLInputElement | null;
const clearSearchBtn = document.getElementById('clearSearchBtn') as HTMLButtonElement | null;
const refreshBtn = document.getElementById('refreshStreamsBtn') as HTMLButtonElement | null;
const refreshLabel = document.getElementById('refreshStreamsLabel');
const backendMeta = document.querySelector<HTMLMetaElement>('meta[name="freef1-help-api"]')?.content;

let allItems: OtherStreamItem[] = [];
let activeCategory = 'all';
let searchQuery = '';
let loading = false;
let lastLoadedAt = 0;
let switchTimer = 0;

function prefersReducedMotion(): boolean {
  return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

function syncScrollArrows(): void {
  if (!categoryScroll || !scrollPrev || !scrollNext) return;
  const max = Math.max(0, categoryScroll.scrollWidth - categoryScroll.clientWidth);
  scrollPrev.disabled = categoryScroll.scrollLeft <= 1;
  scrollNext.disabled = categoryScroll.scrollLeft >= max - 1;
}

function scrollCategories(direction: number): void {
  if (!categoryScroll) return;
  categoryScroll.scrollBy({ left: direction * Math.max(140, categoryScroll.clientWidth * .7), behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}
scrollPrev?.addEventListener('click', () => scrollCategories(-1));
scrollNext?.addEventListener('click', () => scrollCategories(1));
categoryScroll?.addEventListener('scroll', syncScrollArrows, { passive: true });
if (categoryScroll && typeof ResizeObserver !== 'undefined') new ResizeObserver(syncScrollArrows).observe(categoryScroll);

function syncTabGlider(immediate = false): void {
  if (!filtersEl || !gliderEl) return;
  const activeBtn = filtersEl.querySelector<HTMLButtonElement>('button.os-filter.is-active');
  if (!activeBtn) return;

  /* Read geometry first before writing styles (zero layout thrash). */
  const x = activeBtn.offsetLeft;
  const width = activeBtn.offsetWidth;
  if (width <= 0) return;

  if (immediate || prefersReducedMotion()) {
    gliderEl.style.transition = 'none';
  } else {
    gliderEl.style.transition = '';
  }

  filtersEl.classList.add('has-glider');
  filtersEl.style.setProperty('--glider-x', `${x}px`);
  filtersEl.style.setProperty('--glider-scale', String(width / 100));
  filtersEl.style.setProperty('--glider-opacity', '1');

  if (immediate && !prefersReducedMotion()) {
    requestAnimationFrame(() => {
      if (gliderEl) gliderEl.style.transition = '';
    });
  }
}

function createStreamCard(item: OtherStreamItem, index: number): HTMLAnchorElement {
  const card = document.createElement('a');
  card.className = 'team-card os-stream-card';
  card.href = buildPrivateCockpitHref(item);
  card.style.setProperty('--tc', item.color);
  card.style.setProperty('--stagger', `${Math.min(index * 20, 220)}ms`);

  // A typographic channel mark keeps this directory distinctive without fetching
  // third-party logos or pretending the directory has artwork for every feed.
  const mark = document.createElement('span');
  mark.className = 'os-channel-mark';
  mark.setAttribute('aria-hidden', 'true');
  const words = item.title.match(/[\p{L}\p{N}]+/gu) || [];
  mark.textContent = (words.length > 1 ? words[0][0] + words[1][0] : (words[0] || 'TV').slice(0, 2)).toUpperCase();
  const spriteIndex = channelSpriteIndex(item.title, item.subtitle);
  const logo = spriteIndex === null ? channelLogo(item.title) : null;
  if (spriteIndex !== null) {
    mark.classList.add('has-sprite');
    const image = document.createElement('img');
    image.src = '/assets/channel-logos/channels.webp';
    image.alt = '';
    image.loading = 'lazy';
    image.style.left = `-${(spriteIndex % 10) * 68}px`;
    image.style.top = `-${Math.floor(spriteIndex / 10) * 48}px`;
    image.addEventListener('error', () => { image.remove(); mark.classList.remove('has-sprite'); }, { once:true });
    mark.appendChild(image);
  } else if (logo) {
    const image = document.createElement('img');
    image.src = logo;
    image.alt = '';
    image.addEventListener('error', () => { image.remove(); mark.classList.remove('has-logo'); }, { once:true });
    mark.appendChild(image);
    mark.classList.add('has-logo');
  }

  const body = document.createElement('div');
  body.className = 'os-card-body';
  const provider = document.createElement('span');
  provider.className = 'os-card-provider';
  const providerName = PROVIDER_LABELS[item.provider];
  provider.textContent = item.tag && !item.tag.toLowerCase().includes(providerName.toLowerCase()) ? `${providerName} · ${item.tag}` : item.tag || providerName;
  const name = document.createElement('div');
  name.className = 't-name';
  name.textContent = item.title;
  const cat = document.createElement('span');
  cat.className = 'os-card-cat';
  cat.textContent = item.category;
  body.append(provider, name, cat);

  const foot = document.createElement('div');
  foot.className = 'os-card-foot';
  const scheduled = item.status === 'scheduled';
  const badge = document.createElement('span');
  badge.className = `os-badge ${scheduled ? 'os-badge-scheduled' : item.alwaysLive ? 'os-badge-247' : 'os-badge-live'}`;
  const dot = document.createElement('span');
  dot.className = 'os-live-dot';
  dot.setAttribute('aria-hidden', 'true');
  badge.append(dot, document.createTextNode(scheduled ? 'Scheduled' : item.alwaysLive ? '24/7' : 'Live'));
  foot.appendChild(badge);
  if (scheduled && item.startAt) {
    const time = document.createElement('time');
    time.dateTime = new Date(item.startAt).toISOString();
    time.textContent = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(item.startAt);
    foot.appendChild(time);
  } else if (item.viewers > 0) {
    const viewers = document.createElement('span');
    viewers.className = 'os-foot-viewers';
    viewers.textContent = `${item.viewers} watching`;
    foot.appendChild(viewers);
  }
  const launch = document.createElement('span');
  launch.className = 'os-launch-ico';
  launch.setAttribute('aria-hidden', 'true');
  launch.innerHTML = LAUNCH_ARROW_SVG;
  card.append(mark, body, foot, launch);
  return card;
}

function makeFilterButton(key: string, label: string, count: number, isActive: boolean): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = `os-filter${isActive ? ' is-active' : ''}`;
  btn.type = 'button';
  btn.setAttribute('role', 'tab');
  btn.setAttribute('aria-selected', String(isActive));
  btn.dataset.category = key;

  const labelEl = document.createElement('span');
  labelEl.textContent = label;

  const countEl = document.createElement('span');
  countEl.className = 'os-filter-count';
  countEl.textContent = String(count);

  btn.appendChild(labelEl);
  btn.appendChild(countEl);
  return btn;
}

function renderFilters(immediateGlider = false): void {
  if (!filtersEl) return;
  const categoryMap = new Map<string, number>();
  const providerItems = activeProvider === 'all' ? allItems : allItems.filter(item => item.provider === activeProvider);
  for (const item of providerItems) {
    categoryMap.set(item.category, (categoryMap.get(item.category) || 0) + 1);
  }

  if (activeCategory !== 'all' && !categoryMap.has(activeCategory)) {
    activeCategory = 'all';
  }

  const sortedCategories = [...categoryMap.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return a[0].localeCompare(b[0]);
  });

  const nodes: Node[] = [];
  if (gliderEl) nodes.push(gliderEl);
  nodes.push(makeFilterButton('all', 'All', providerItems.length, activeCategory === 'all'));
  for (const [cat, count] of sortedCategories) {
    nodes.push(makeFilterButton(cat, cat, count, activeCategory === cat));
  }

  filtersEl.replaceChildren(...nodes);
  requestAnimationFrame(() => { syncTabGlider(immediateGlider); syncScrollArrows(); });
}

function renderList(): void {
  if (!gridEl || !emptyEl) return;
  const needle = searchQuery.trim().toLowerCase();

  const filtered = allItems.filter((item) => {
    if (activeProvider !== 'all' && item.provider !== activeProvider) return false;
    if (activeCategory !== 'all' && item.category !== activeCategory) return false;
    if (!needle) return true;
    const haystack = `${item.title} ${item.category} ${item.subtitle} ${PROVIDER_LABELS[item.provider]}`.toLowerCase();
    return haystack.includes(needle);
  });

  filtered.sort((a, b) => compareOtherStreams(a, b, PROVIDER_LABELS));
  const nodes: Node[] = [];
  let previousProvider = '';
  let previousSection = '';
  filtered.forEach((item, idx) => {
    const section = otherStreamSection(item);
    if (section !== previousSection) {
      previousSection = section;
      previousProvider = '';
      const heading = document.createElement('h2');
      heading.className = 'os-section-heading';
      heading.textContent = section === 'sports' ? 'Sports & motorsport' : 'Entertainment & other channels';
      nodes.push(heading);
    }
    if (item.provider !== previousProvider) {
      previousProvider = item.provider;
      const heading = document.createElement('h3');
      heading.className = 'os-provider-heading';
      heading.textContent = PROVIDER_LABELS[item.provider];
      nodes.push(heading);
    }
    nodes.push(createStreamCard(item, idx));
  });
  gridEl.replaceChildren(...nodes);
  const isEmpty = filtered.length === 0;
  gridEl.hidden = isEmpty;
  emptyEl.hidden = !isEmpty;

  if (isEmpty && emptyTitleEl && emptyTextEl) {
    if (needle) {
      emptyTitleEl.textContent = 'No streams match your filter';
      emptyTextEl.textContent = 'Clear the search field or switch to another category above.';
    } else if (activeCategory !== 'all') {
      emptyTitleEl.textContent = `No live ${activeCategory} streams right now`;
      emptyTextEl.textContent = 'Feeds appear automatically as soon as live broadcasts begin.';
    } else {
      emptyTitleEl.textContent = 'No live streams right now';
      emptyTextEl.textContent = 'Check back shortly or hit Refresh when events start.';
    }
  }
}

function switchCategoryAnimated(next: string, direction: number): void {
  activeCategory = next;
  syncTabGlider(false);

  if (!gridEl || prefersReducedMotion()) {
    renderList();
    return;
  }

  window.clearTimeout(switchTimer);
  gridEl.style.setProperty('--os-dir', String(direction));
  gridEl.classList.add('is-switching');

  switchTimer = window.setTimeout(() => {
    renderList();
    requestAnimationFrame(() => {
      gridEl.classList.remove('is-switching');
    });
  }, 115);
}

async function loadStreams(initial = false): Promise<void> {
  if (loading) return;
  loading = true;
  if (refreshBtn) {
    refreshBtn.disabled = true;
    refreshBtn.classList.add('is-spinning');
  }
  if (refreshLabel) refreshLabel.textContent = 'Syncing…';

  try {
    const result = await fetchAllOtherStreams({ backend: backendMeta });
    allItems = result.items.filter(isDirectoryLive).map(item => ({ ...item, category: streamCategory(item.category, item.title) }));
    if (providerFilter) {
      const providers = [...new Set(allItems.map(item => item.provider))].sort((a, b) => compareStreamProviders(a, b, PROVIDER_LABELS));
      if (activeProvider !== 'all' && !providers.includes(activeProvider as OtherStreamItem['provider'])) activeProvider = 'all';
      providerFilter.replaceChildren(new Option('All providers', 'all'), ...providers.map(provider => new Option(PROVIDER_LABELS[provider], provider)));
      providerFilter.value = activeProvider;
    }
    lastLoadedAt = Date.now();
    if (liveTotalEl) liveTotalEl.textContent = String(allItems.length);
    renderFilters(initial);
    renderList();
  } catch {
    allItems = [];
    if (liveTotalEl) liveTotalEl.textContent = '0';
    renderFilters(initial);
    renderList();
  } finally {
    loading = false;
    if (refreshBtn) {
      refreshBtn.disabled = false;
      refreshBtn.classList.remove('is-spinning');
    }
    if (refreshLabel) refreshLabel.textContent = 'Refresh';
  }
}

providerFilter?.addEventListener('change', () => {
  activeProvider = providerFilter.value;
  renderFilters(true);
  renderList();
});

filtersEl?.addEventListener('click', (e) => {
  const btn = (e.target as Element | null)?.closest<HTMLButtonElement>('button[data-category]');
  if (!btn || !filtersEl) return;
  const next = btn.dataset.category;
  if (!next || next === activeCategory) return;

  const buttons = [...filtersEl.querySelectorAll<HTMLButtonElement>('button[data-category]')];
  const prevIdx = buttons.findIndex((b) => b.classList.contains('is-active'));
  const nextIdx = buttons.indexOf(btn);
  const direction = nextIdx >= prevIdx ? 1 : -1;

  buttons.forEach((b) => {
    const selected = b === btn;
    b.classList.toggle('is-active', selected);
    b.setAttribute('aria-selected', String(selected));
  });

  btn.scrollIntoView?.({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'nearest', inline: 'nearest' });
  switchCategoryAnimated(next, direction);
});

searchInput?.addEventListener('input', () => {
  searchQuery = searchInput.value;
  if (clearSearchBtn) clearSearchBtn.hidden = searchQuery.length === 0;
  renderList();
});

clearSearchBtn?.addEventListener('click', () => {
  if (!searchInput) return;
  searchInput.value = '';
  searchQuery = '';
  clearSearchBtn.hidden = true;
  searchInput.focus();
  renderList();
});

refreshBtn?.addEventListener('click', () => {
  void loadStreams(false);
});

window.addEventListener('resize', () => { syncTabGlider(true); syncScrollArrows(); }, { passive: true });

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && Date.now() - lastLoadedAt > 90_000) {
    void loadStreams(false);
  }
});

void loadStreams(true);
