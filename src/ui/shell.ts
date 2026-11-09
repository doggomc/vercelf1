type ShellOptions = {
  nav?: boolean;
  transitions?: boolean;
};

const prefetched = new Set<string>();
const pathKey = (p: string) => p.replace(/\/index\.html$/, '/').replace(/\.html$/, '').replace(/\/+$/, '') || '/';

function crossPageHref(target: EventTarget | null): string | null {
  const a = (target as Element | null)?.closest?.('a');
  const raw = a?.getAttribute('href') || '';
  if (!a || !raw || raw[0] === '#' || (a.target && a.target !== '_self') || a.hasAttribute('download') || a.origin !== location.origin) return null;
  return pathKey(a.pathname) === pathKey(location.pathname) && a.search === location.search ? null : a.pathname + a.search + a.hash;
}

function prefetch(e: Event): void {
  const href = crossPageHref(e.target)?.split('#')[0];
  if (!href || prefetched.has(href) || (navigator as { connection?: { saveData?: boolean } }).connection?.saveData) return;
  prefetched.add(href);
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = href;
  document.head.appendChild(link);
}

function markCurrentLink(root: ParentNode): void {
  const here = pathKey(location.pathname);
  root.querySelectorAll<HTMLAnchorElement>('.nav-links a, .footer-nav a').forEach((a) => {
    if (a.origin !== location.origin) return;
    const t = pathKey(a.pathname);
    if (t === here || (t !== '/' && here.startsWith(t + '/'))) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

function bindNav(): void {
  const nav = document.querySelector<HTMLElement>('.nav');
  const toggle = document.getElementById('navToggle') as HTMLButtonElement | null;
  const menu = document.getElementById('navLinks');

  const setOpen = (open: boolean) => {
    menu?.classList.toggle('open', open);
    toggle?.setAttribute('aria-expanded', String(open));
    toggle?.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  };

  toggle?.addEventListener('click', () => setOpen(!menu?.classList.contains('open')));
  menu?.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setOpen(false)));

  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu?.classList.contains('open')) {
      setOpen(false);
      toggle?.focus();
    }
  });

  if (nav) {
    let stuck = false;
    const sync = () => {
      const next = scrollY > 8;
      if (next !== stuck) nav.classList.toggle('stuck', (stuck = next));
    };
    addEventListener('scroll', sync, { passive: true });
    sync();
  }
}

function bindTransitions(): void {
  if ('CSSViewTransitionRule' in window) return;

  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (matchMedia?.('(prefers-reduced-motion: reduce)').matches || document.body.classList.contains('is-leaving')) return;
    const href = crossPageHref(e.target);
    if (!href) return;
    e.preventDefault();
    document.body.classList.add('is-leaving');
    setTimeout(() => { location.href = href; }, 115);
  });

  const clear = () => document.body.classList.remove('is-leaving');
  addEventListener('pageshow', clear);
  addEventListener('pagehide', clear);
}

export function initShell(options: ShellOptions = {}): void {
  const { nav = true, transitions = true } = options;
  markCurrentLink(document);
  if (nav || document.body.dataset.page === 'cockpit') {
    const s = document.createElement('script'); s.type = 'module'; s.src = import.meta.env.DEV ? '/src/features/session-island.ts' : '/island.js'; document.head.append(s);
  }
  addEventListener('pointerdown', prefetch, { passive: true });
  document.querySelector('.nav')?.addEventListener('pointerover', prefetch, { passive: true });
  if (nav) {
    bindNav();
    void import('../features/page-gate').then((m) => m.initPageGate());
  }
  if (transitions) bindTransitions();

  const year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());
}
