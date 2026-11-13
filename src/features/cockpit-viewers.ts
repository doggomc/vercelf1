/** Mirror the hidden shared counter into the visible cockpit control. */
export function mountCockpitViewerCount(): void {
  const source = document.getElementById('viewerCount');
  const badge = document.getElementById('theaterOnline');
  const count = document.getElementById('theaterOnlineCount');
  if (!source || !badge || !count) return;
  const sync = () => {
    const text = (source.textContent || '').trim();
    if (text && text !== '—') {
      count.textContent = text;
      badge.hidden = false;
    } else {
      badge.hidden = true;
    }
  };
  sync();
  new MutationObserver(sync).observe(source, { childList: true, characterData: true, subtree: true });
}
