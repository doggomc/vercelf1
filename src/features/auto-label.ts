/** Presentation only: retain the event label on the source for session matching. */
export function ppvDisplayLabel(provider: string | undefined, tag: string | undefined): string | null {
  if (provider !== 'ppv') return null;
  const match = String(tag || '').trim().match(/^(HD|FHD|UHD|4K)\s*\|\s*(.+)$/i);
  if (!match) return null;
  const [, quality, rest] = match;
  const parts = rest.split(/\s+·\s+/);
  const broadcaster = parts.shift()?.trim().replace(/^sky sport f1$/i, 'Sky Sports F1');
  if (!broadcaster) return null;
  return [ `${broadcaster} ${quality.toUpperCase()}`, ...parts ].join(' · ');
}
