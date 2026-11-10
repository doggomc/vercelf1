import { initShell } from '../ui/shell';
import '../viewer-counter';
import {
  buildPrivateCockpitHref,
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

  const head = document.createElement('div');
  head.className = 'os-card-head';

  const idGroup = document.createElement('div');
  idGroup.className = 'os-card-id';

  const bar = document.createElement('span');
  bar.className = 't-bar';
  bar.setAttribute('aria-hidden', 'true');
  idGroup.appendChild(bar);

  const badges = document.createElement('div');
  badges.className = 'os-card-badges';

  const liveBadge = document.createElement('span');
  liveBadge.className = `os-badge ${item.alwaysLive ? 'os-badge-247' : 'os-badge-live'}`;
  const dot = document.createElement('span');
  dot.className = 'os-live-dot';
  dot.setAttribute('aria-hidden', 'true');
  liveBadge.appendChild(dot);
  liveBadge.appendChild(document.createTextNode(item.alwaysLive ? '24/7' : 'Live'));
  badges.appendChild(liveBadge);
  idGroup.appendChild(badges);

  const launch = document.createElement('span');
  launch.className = 'os-launch-ico';
  launch.setAttribute('aria-hidden', 'true');
  launch.innerHTML = LAUNCH_ARROW_SVG;

  head.appendChild(idGroup);
  head.appendChild(launch);

  const body = document.createElement('div');
  body.className = 'os-card-body';

  const cat = document.createElement('span');
  cat.className = 'os-card-cat';
  cat.textContent = item.category;

  const name = document.createElement('div');
  name.className = 't-name';
  name.textContent = item.title;

  body.appendChild(cat);
  body.appendChild(name);

  const foot = document.createElement('div');
  foot.className = 'os-card-foot';

  const footTag = document.createElement('span');
  footTag.className = 'os-foot-tag';
  footTag.textContent = item.tag || (item.alwaysLive ? '24/7 channel' : 'Live broadcast');
  foot.appendChild(footTag);

  if (item.viewers > 0) {
    const viewers = document.createElement('span');
    viewers.className = 'os-foot-viewers';
    const vDot = document.createElement('i');
    vDot.setAttribute('aria-hidden', 'true');
    viewers.appendChild(vDot);
    viewers.appendChild(document.createTextNode(`${item.viewers} watching`));
    foot.appendChild(viewers);
  } else {
    const ready = document.createElement('span');
    ready.textContent = 'Theater HD';
    foot.appendChild(ready);
  }

  card.appendChild(head);
  card.appendChild(body);
  card.appendChild(foot);
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
  for (const item of allItems) {
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
  nodes.push(makeFilterButton('all', 'All', allItems.length, activeCategory === 'all'));
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
    if (activeCategory !== 'all' && item.category !== activeCategory) return false;
    if (!needle) return true;
    const haystack = `${item.title} ${item.category} ${item.subtitle}`.toLowerCase();
    return haystack.includes(needle);
  });

  gridEl.replaceChildren(...filtered.map((item, idx) => createStreamCard(item, idx)));
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
    allItems = result.items;
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
