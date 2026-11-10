import { describe, expect, it } from 'vitest';
import {
  buildPrivateCockpitHref,
  buildStreamfreeUrls,
  parseStreamfreeStreams,
  fetchAllOtherStreams,
  isEmbdlolF1Channel,
  isFormula1Text,
  parseEmbdlolStruct,
  parsePpvStreams,
  parsePrivateCockpitParams,
  parseWeeloEvents,
} from '../src/lib/other-streams';

describe('Other streams non-F1 filtering & private cockpit resolution', () => {
  it('adds only live StreamFree variants as direct non-stripped embeds and round trips them to the cockpit', () => {
    const payload = { streams: [
      { name: 'Alavés vs England', category: 'soccer', league: 'Cup', stream_key: 'alavés-vs-england', sources: [
        { quality: 'FHD', url: 'https://strmfree.st/embed/soccer/alav%C3%A9s-vs-england1080p', live: true, broadcast: 'Main' },
        { quality: 'HD', url: 'https://streamfree.top/embed/soccer/alav%C3%A9s-vs-england720p2', live: true, broadcast: 'Alternate' },
        { quality: 'HD', url: 'https://strmfree.st/embed/soccer/offline', live: false },
        { quality: 'HD', url: 'https://evil.example/embed/soccer/evil', live: true },
      ] },
      { name: 'Formula 1 Grand Prix', category: 'racing', stream_key: 'f1-race', sources: [
        { url: 'https://strmfree.st/embed/racing/f1-race1080p', live: true },
      ] },
      { name: 'Waiting match', category: 'soccer', sources: [] },
    ] };
    const items = parseStreamfreeStreams(payload);
    expect(items).toHaveLength(2);
    expect(items.map(item => item.title)).toEqual(['Alavés vs England · Main', 'Alavés vs England · Alternate']);
    for (const item of items) {
      expect(item.provider).toBe('strmfree');
      expect(item.embedUrl).toMatch(/^https:\/\/(strmfree\.st|streamfree\.top)\/embed\//);
      expect(item.embedUrl).toBe(item.fallbackUrl);
      const resolved = parsePrivateCockpitParams(new URL(buildPrivateCockpitHref(item), 'https://freef1-live.vercel.app').search);
      expect(resolved?.embedUrl).toBe(item.embedUrl);
      expect(resolved?.fallbackUrl).toBe(item.embedUrl);
      expect(resolved?.embedUrl).not.toContain('/api/stream/');
    }
    expect(buildStreamfreeUrls('soccer/match', 'evil.example')).toBeNull();
    expect(buildStreamfreeUrls('soccer/../admin')).toBeNull();
    expect(buildStreamfreeUrls('racing/f1-race')).toBeNull();
    expect(parsePrivateCockpitParams('?s=4&id=soccer%2Fmatch&host=evil.example')).toBeNull();
  });

  it('fetches StreamFree independently without interrupting the other providers', async () => {
    const mockFetch: typeof fetch = async (input) => {
      if (String(input).includes('strmfree.st')) return new Response(JSON.stringify({ streams: [{
        name: 'Tennis final', category: 'tennis', stream_key: 'final', sources: [{ live: true, quality: 'FHD', url: 'https://strmfree.st/embed/tennis/final1080p' }],
      }] }), { status: 200 });
      throw new Error('other provider offline');
    };
    const result = await fetchAllOtherStreams({ fetchImpl: mockFetch });
    expect(result.providerOk.strmfree).toBe(true);
    expect(result.counts.strmfree).toBe(1);
    expect(result.items[0]?.embedUrl).toBe('https://strmfree.st/embed/tennis/final1080p');
  });

  it('excludes Formula 1 channels from embdlol while keeping non-F1 sports and feeder series', () => {
    expect(isEmbdlolF1Channel('f1friuhd')).toBe(true);
    expect(isEmbdlolF1Channel('f1mexicofullhd1')).toBe(true);
    expect(isEmbdlolF1Channel('F1 - Las Vegas - Race - Sky')).toBe(true);
    expect(isEmbdlolF1Channel('Formula 1 Qatar Grand Prix')).toBe(true);
    expect(isEmbdlolF1Channel('Sky Sports F1')).toBe(true);
    expect(isEmbdlolF1Channel('fullhd1')).toBe(true);

    expect(isEmbdlolF1Channel('ufc310main')).toBe(false);
    expect(isEmbdlolF1Channel('f2monacofullhd1')).toBe(false);
    expect(isEmbdlolF1Channel('Formula 3 Feature Race')).toBe(false);
    expect(isEmbdlolF1Channel('MotoGP Catalan Grand Prix')).toBe(false);

    const parsed = parseEmbdlolStruct({
      code: 200,
      channels: [
        { id: '11111111-2222-3333-4444-555555555555', channelname: 'f1vegasuhd' },
        { id: '22222222-3333-4444-5555-666666666666', channelname: 'ufc310main' },
        { id: '33333333-4444-5555-6666-777777777777', channelname: 'f2monacofullhd1' },
      ],
    });

    expect(parsed.map((item) => item.id)).toEqual([
      '22222222-3333-4444-5555-666666666666',
      '33333333-4444-5555-6666-777777777777',
    ]);
    expect(parsed[0]?.embedUrl).toBe(
      'https://f1admin.onrender.com/api/stream/embdlol-embed?id=22222222-3333-4444-5555-666666666666',
    );
    expect(parsed[0]?.fallbackUrl).toBe(
      'https://embdlol.st/embed/22222222-3333-4444-5555-666666666666',
    );
  });

  it('returns only live non-F1 HD PPV streams and expands distinct HD substreams', () => {
    const nowSec = 1_794_236_700;
    const parsed = parsePpvStreams(
      {
        timestamp: nowSec,
        streams: [
          {
            category: 'Motorsports',
            streams: [
              {
                id: 1,
                name: 'Formula 1 Las Vegas Grand Prix',
                tag: 'F1',
                uri_name: 'f1/2026/vegas/sky',
                starts_at: nowSec - 600,
                ends_at: nowSec + 7200,
                always_live: 0,
                iframe: 'https://taifood-blog.asia/embed/f1/2026/vegas/sky',
                viewers: '400',
              },
            ],
          },
          {
            category: 'American Football',
            streams: [
              {
                id: 2,
                name: 'NFL Network',
                tag: '24/7 channel',
                uri_name: 'nfl-network',
                always_live: 1,
                iframe: 'https://taifood-blog.asia/embed/nfl-network',
                viewers: '26',
                substreams: [
                  {
                    id: 20,
                    name: 'NFL Network',
                    uri_name: 'nfl-network_540p',
                    source_tag: 'SD | NFL Network',
                    iframe: 'https://taifood-blog.asia/embed/nfl-network_540p',
                  },
                ],
              },
              {
                id: 3,
                name: 'Bills at Vikings',
                tag: 'NFL',
                uri_name: 'nfl/2026-11-09/buf-min',
                starts_at: nowSec - 300,
                ends_at: nowSec + 7200,
                always_live: 0,
                iframe: 'https://taifood-blog.asia/embed/nfl/2026-11-09/buf-min',
                viewers: '85',
                substreams: [
                  {
                    id: 31,
                    name: 'Bills at Vikings',
                    uri_name: 'nfl/2026-11-09/buf-min/skycast',
                    source_tag: 'HD | SkyCast',
                    iframe: 'https://taifood-blog.asia/embed/nfl/2026-11-09/buf-min/skycast',
                  },
                ],
              },
              {
                id: 4,
                name: 'Future Game Tomorrow',
                tag: 'NFL',
                uri_name: 'nfl/2026-11-10/nyg-dal',
                starts_at: nowSec + 86_400,
                ends_at: nowSec + 93_600,
                always_live: 0,
                iframe: 'https://taifood-blog.asia/embed/nfl/2026-11-10/nyg-dal',
                viewers: '0',
              },
            ],
          },
        ],
      },
      'https://f1admin.onrender.com',
      nowSec,
    );

    expect(parsed.map((item) => item.id)).toEqual([
      'nfl/2026-11-09/buf-min',
      'nfl/2026-11-09/buf-min/skycast',
      'nfl-network',
    ]);
    const nflNet = parsed.find((i) => i.id === 'nfl-network')!;
    expect(nflNet.embedUrl).toBe(
      'https://f1admin.onrender.com/api/stream/ppv-embed?slug=nfl-network&host=taifood-blog.asia',
    );
    const liveGame = parsed.find((i) => i.id === 'nfl/2026-11-09/buf-min')!;
    expect(liveGame.embedUrl).toBe('https://taifood-blog.asia/embed/nfl/2026-11-09/buf-min');
  });

  it('returns only live non-F1 Weelo streams and excludes F1, F1 Academy, and F1 weekend shows', () => {
    const parsed = parseWeeloEvents(
      {
        events: [
          {
            id: 'ev-f1',
            name: 'F1 Race',
            series: 'Formula 1',
            series_key: 'f1',
            live: true,
            channels: [{ name: 'Sky', stream: 'f1stream1234', lang: 'en' }],
          },
          {
            id: 'ev-show',
            name: 'Pre-Race Show',
            series: 'Show',
            series_key: 'show',
            live: true,
            channels: [{ name: 'F1TV', stream: 'showstream12', lang: 'en' }],
          },
          {
            id: 'ev-f2-live',
            name: 'F2 Feature Race',
            series: 'Formula 2',
            series_key: 'f2',
            live: false,
            channels: [
              { name: 'World Feed', stream: 'f2worldfeed99', lang: 'en' },
              { name: 'Spanish', stream: 'f2espfeed8888', lang: 'es' },
            ],
          },
          {
            id: 'ev-f3-off',
            name: 'F3 Sprint Race',
            series: 'Formula 3',
            series_key: 'f3',
            live: false,
            channels: [{ name: 'World Feed', stream: 'f3offline777', lang: 'en' }],
          },
        ],
      },
      {
        events: [
          { id: 'ev-f2-live', live: true, done: false },
          { id: 'ev-f3-off', live: false, done: true },
        ],
      },
    );

    expect(parsed.map((item) => item.id)).toEqual(['f2worldfeed99', 'f2espfeed8888']);
    expect(parsed[0]?.embedUrl).toBe(
      'https://f1admin.onrender.com/api/stream/weellz-embed?stream=f2worldfeed99',
    );
    expect(parsed[0]?.fallbackUrl).toBe('https://weellz.live/beta?stream=f2worldfeed99');
  });

  it('round-trips private cockpit URLs safely and blocks F1 or untrusted hosts', () => {
    const [sample] = parsePpvStreams(
      {
        timestamp: 1_794_236_700,
        streams: [
          {
            category: 'Cricket',
            streams: [
              {
                id: 99,
                name: 'Willow',
                tag: '24/7 channel',
                uri_name: '247-willow',
                always_live: 1,
                iframe: 'https://taifood-blog.asia/embed/247-willow',
                viewers: '24',
              },
            ],
          },
        ],
      },
      'https://f1admin.onrender.com',
      1_794_236_700,
    );

    const href = buildPrivateCockpitHref(sample!);
    expect(href.startsWith('/private-cockpit.html?')).toBe(true);
    expect(href).not.toMatch(/ppv|embdlol|weelo/i);

    const resolved = parsePrivateCockpitParams(href.split('?')[1] || '');
    expect(resolved).not.toBeNull();
    expect(resolved?.provider).toBe('ppv');
    expect(resolved?.title).toBe('Willow');
    expect(resolved?.stagePath).toBe('freef1://live/other/willow');
    expect(resolved?.stagePath).not.toMatch(/ppv|embdlol|weelo/i);
    expect(resolved?.embedUrl).toBe(
      'https://f1admin.onrender.com/api/stream/ppv-embed?slug=247-willow&host=taifood-blog.asia',
    );

    expect(parsePrivateCockpitParams('s=2&id=f1/2026/vegas/sky&title=Formula+1')).toBeNull();
    expect(parsePrivateCockpitParams('s=2&id=247-willow&host=http://localhost:3000')).toBeNull();
    expect(parsePrivateCockpitParams('s=unknown&id=abc12345')).toBeNull();
    expect(isFormula1Text('Formula 2 Feature Race')).toBe(false);
    expect(isFormula1Text('Formula 1 Las Vegas Grand Prix')).toBe(true);
  });

  it('aggregates upstream providers resiliently even when one provider fails', async () => {
    const mockFetch: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes('embdlol')) throw new Error('network timeout');
      if (url.includes('api.ppv.st')) {
        return new Response(
          JSON.stringify({
            timestamp: 1_794_236_700,
            streams: [
              {
                category: 'Golf',
                streams: [
                  {
                    id: 10,
                    name: 'Sky Sports Golf',
                    tag: '24/7 channel',
                    uri_name: 'sky-sports-golf',
                    always_live: 1,
                    iframe: 'https://taifood-blog.asia/embed/sky-sports-golf',
                    viewers: '7',
                  },
                ],
              },
            ],
          }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({ events: [] }), { status: 200 });
    };

    const res = await fetchAllOtherStreams({ fetchImpl: mockFetch });
    expect(res.providerOk.embdlol).toBe(false);
    expect(res.providerOk.ppv).toBe(true);
    expect(res.counts.ppv).toBe(1);
    expect(res.counts.all).toBe(1);
  });
});
