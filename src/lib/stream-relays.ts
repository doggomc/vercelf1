/** Backend stripped player and manifest/key endpoints, not metadata discovery. */
export function isStreamRelayUrl(value: unknown): boolean {
  if (typeof value !== 'string' || !value) return false;
  try {
    const path = new URL(value, 'https://f1admin.onrender.com').pathname;
    return /(?:^|\/)api\/stream\/(?:weellz-embed|weellz-key|embdlol-embed|strmfree-embed|strmfree-m3u8|ppv-embed|ppv-m3u8)(?:\/|$)/i.test(path);
  } catch { return false; }
}
