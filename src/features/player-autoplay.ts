/** Ask known players to autoplay without altering signed or unfamiliar provider URLs.
 * Browsers and providers can still require a user gesture. */
export function requestPlayerAutoplay(value: string): string {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return value;
    const known = (url.hostname === 'weellz.live' && ['/beta', '/at', '/replay'].includes(url.pathname)) ||
      (url.hostname === 'ok.ru' && /^\/videoembed\/\d+$/.test(url.pathname));
    if (!known) return value;
    url.searchParams.set('autoplay', '1');
    return url.href;
  } catch { return value; }
}
