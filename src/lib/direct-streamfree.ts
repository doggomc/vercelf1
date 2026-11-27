/** Only provider-hosted Sky F1 embeds are eligible for the direct stripped source. */
export function isDirectStreamfreeSkyUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port &&
      ['strmfree.st', 'streamfree.top'].includes(url.hostname) &&
      /^\/embed\/racing\/skyf1(?:1080p)?\/?$/i.test(url.pathname);
  } catch { return false; }
}
