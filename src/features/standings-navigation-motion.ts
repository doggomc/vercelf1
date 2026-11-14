/** Give a chosen championship card or row a moment of feedback before navigation. */
export function initStandingsNavigationMotion(): void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let chosen: HTMLElement | null = null;
  const clear = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    chosen?.classList.remove('is-opening-profile');
    chosen = null;
  };
  window.addEventListener('pageshow', clear);
  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a.st-leader, a.st-who');
    if (!link || link.target && link.target !== '_self' || link.hasAttribute('download') || link.origin !== location.origin || !/^\/(drivers|teams)\/[^/]+\/?$/.test(link.pathname)) return;
    event.preventDefault();
    clear();
    chosen = link;
    link.classList.add('is-opening-profile');
    timer = setTimeout(() => { location.assign(link.href); }, 360);
  }, { capture: true });
}
