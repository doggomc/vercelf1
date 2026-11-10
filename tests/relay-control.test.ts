import { describe, it, expect } from 'vitest';
import { isStreamRelayUrl } from '../src/lib/stream-relays';
import { parseSiteConfig } from '../src/types/site-config';
import { buildEmbdlolUrls, buildPpvUrls, buildWeeloUrls, buildStreamfreeUrls, parsePrivateCockpitParams } from '../src/lib/other-streams';

describe('relay controls', () => {
  it('recognises document, playlist and key relay URLs, including the local proxy prefix', () => {
    for (const path of ['/api/stream/weellz-embed','/api/stream/weellz-key/abc','/api/stream/embdlol-embed','/api/stream/strmfree-embed','/api/stream/strmfree-m3u8/live/a/index.m3u8','/api/stream/ppv-embed','/api/stream/ppv-m3u8/sub.m3u8','/control-api/api/stream/strmfree-embed']) expect(isStreamRelayUrl(path),path).toBe(true);
    for (const path of ['https://weellz.live/beta?stream=abc','/api/stream/auto','/api/stream/sources','/api/stream/resolve']) expect(isStreamRelayUrl(path),path).toBe(false);
  });
  it('parses the reversible relay state, defaulting older snapshots to enabled', () => {
    expect(parseSiteConfig({sources:{disabled:[],relaysDisabled:true}})?.sources?.relaysDisabled).toBe(true);
    expect(parseSiteConfig({sources:{disabled:[]}})?.sources?.relaysDisabled).toBe(false);
  });
  it('uses direct providers for every Other Streams player and old private-cockpit links', () => {
    const rows = [buildEmbdlolUrls('abc123'), buildWeeloUrls('abc123'), buildPpvUrls('nfl-network'), buildStreamfreeUrls('soccer/abc123')];
    for (const row of rows) { expect(row).not.toBeNull(); expect(row?.embedUrl).toBe(row?.fallbackUrl); expect(isStreamRelayUrl(row?.embedUrl)).toBe(false); }
    for (const query of ['?s=1&id=abc123','?s=2&id=nfl-network','?s=3&id=abc123','?s=4&id=soccer%2Fabc123']) {
      const row = parsePrivateCockpitParams(query); expect(row).not.toBeNull(); expect(isStreamRelayUrl(row?.embedUrl)).toBe(false);
    }
  });
});
