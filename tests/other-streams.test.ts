import { describe, expect, it } from 'vitest';
import {
  buildPrivateCockpitHref,
  compareStreamProviders,
  isDirectoryLive,
  buildStreamfreeUrls,
  buildTimstreamsUrls,
  buildZliveUrls,
  buildAuraUrls,
  buildBintvUrls,
  buildNtvUrls,
  buildMatchoraUrls,
  buildLive24Urls,
  parseMatchora,
  parseLive24,
  parseNtvRaptor,
  parseBintvStreams,
  parseAuraEvents,
  parseZliveSports,
  extractTimstreamsPlayer,
  parseTimstreamsEvents,
  parseTimstreamsTime,
  parseStreamfreeStreams,
  fetchAllOtherStreams,
  isEmbdlolF1Channel,
  isFormula1Text,
  parseEmbdlolStruct,
  parsePpvStreams,
  parsePrivateCockpitParams,
  parseWeeloEvents,
  parseRacingLapOther,
} from '../src/lib/other-streams';

describe('Other streams non-F1 filtering & private cockpit resolution', () => {
  it('adds only live non-F1 Matchora sports channel players', () => {
    const now = 1900000000000;
    const base = {id:'event1', home:'Team A', away:'Team B', sport:'Football', league:'League', kickoff:1899999000, live:true, finished:false, channels:[{id:'12345',name:'Sports HD',playing:true,dead:false},{id:'12346',name:'F1',playing:true}]};
    const items = parseMatchora({events:[base, {...base,id:'future',kickoff:1900000001}, {...base,id:'f1',league:'Formula 1'}, {...base,id:'non-sport',sport:'Movies'}, {...base,id:'finished',finished:true}]},now);
    expect(items).toHaveLength(1);
    expect(items[0].embedUrl).toBe('https://matchora.pro/embed/channel/12345');
    expect(parsePrivateCockpitParams(buildPrivateCockpitHref(items[0]).split('?')[1])?.embedUrl).toBe(items[0].embedUrl);
    expect(buildMatchoraUrls('../unsafe')).toBeNull();
  });
  it('validates Live24 player URLs and excludes future and F1 events', () => {
    const now = 1900000000000;
    const event = {title:'Team A vs Team B', category:'Football', tournament:'League', live:true,date:now-1000,sources:[{url:'https://livelive24.st/live24.html?url=game-stream-1',channelName:'Stream 1'},{url:'https://evil.test/live24.html?url=bad'}]};
    const items = parseLive24({success:true,live:[event,{...event,title:'Formula 1',date:now-1},{...event,date:now+1}]},now);
    expect(items).toHaveLength(1);
    expect(parsePrivateCockpitParams(buildPrivateCockpitHref(items[0]).split('?')[1])?.embedUrl).toBe(items[0].embedUrl);
    expect(buildLive24Urls('../bad')).toBeNull();
  });

  it('hides scheduled streams from the directory, including unconfirmed past starts', () => {
    const item = parseNtvRaptor({success:true,all:[{id:'ppv-2',title:'Teams',category:'Football',date:2000000000000,live:false,sources:[{url:'https://taifood-blog.asia/embed/soccer/match'}]}]}, 1900000000000)[0];
    expect(isDirectoryLive(item)).toBe(false);
    expect(isDirectoryLive({...item, status:'live'})).toBe(true);
    expect(isDirectoryLive({...item, status:undefined})).toBe(true);
  });

  it('orders PPV, EMB and StreamFree first, with the remaining providers alphabetically', () => {
    const labels = {matchora:'Matchora', live24:'Live24', esportex:'EmbedSportex', ppv:'PPV', embdlol:'EMB', strmfree:'StreamFree', aura:'Aura Sports', bintv:'BinTV', ntv:'NTV Raptor', timstreams:'TimStreams', weelo:'Weelo', zlive:'ZLive'};
    const providers: Array<keyof typeof labels> = ['zlive','embdlol','aura','strmfree','ppv','bintv'];
    expect(providers.sort((a,b)=>compareStreamProviders(a,b,labels))).toEqual(['ppv','embdlol','strmfree','aura','bintv','zlive']);
  });

  it('adds NTV Raptor sports with direct player embeds and correct status', () => {
    const now = Date.parse('2026-11-15T14:00:00Z');
    const items = parseNtvRaptor({success:true,all:[
      {id:'ppv-1',title:'NFL Network',category:'American Football',tournament:'24/7 channel',live:true,date:0,sources:[{source:'main',url:'https://taifood-blog.asia/embed/nfl-network'},{source:'sd',url:'https://taifood-blog.asia/embed/nfl-network_540p'}]},
      {id:'ppv-2',title:'Team A vs Team B',category:'Football',date:now+3600000,live:false,sources:[{source:'main',url:'https://taifood-blog.asia/embed/soccer/match'}]},
      {id:'ppv-3',title:'Cartoon Channel',category:'24/7 Streams',tournament:'24/7 channel',live:true,sources:[{url:'https://taifood-blog.asia/embed/cartoon'}]},
      {id:'ppv-4',title:'Formula 1 Grand Prix',category:'Motorsport',live:true,sources:[{url:'https://taifood-blog.asia/embed/f1'}]},
      {id:'ppv-5',title:'Bad',category:'Football',live:true,sources:[{url:'https://evil.example/embed/test'}]},
    ]},now);
    expect(items.map(i=>i.title)).toEqual(['NFL Network','Team A vs Team B','Cartoon Channel']);
    expect(items[0].alwaysLive).toBe(true);
    expect(items[1].status).toBe('scheduled');
    const resolved = parsePrivateCockpitParams(new URL(buildPrivateCockpitHref(items[1]), 'https://freef1-live.vercel.app').search);
    expect(resolved?.embedUrl).toBe('https://taifood-blog.asia/embed/soccer/match');
    expect(resolved?.status).toBe('scheduled');
    expect(buildNtvUrls('../bad')).toBeNull();
  });

  it('fetches NTV independently and avoids duplicate PPV player URLs', async () => {
    const mockFetch: typeof fetch = async input => {
      if (String(input).includes('ntv.cx')) return new Response(JSON.stringify({success:true,all:[{id:'ppv-1',title:'NFL Network',category:'American Football',tournament:'24/7 channel',live:true,sources:[{source:'main',url:'https://taifood-blog.asia/embed/nfl-network'}]}]}),{status:200});
      if (String(input).includes('api.ppv.st')) return new Response(JSON.stringify({timestamp:1794753000,streams:[{category:'American Football',streams:[{name:'NFL Network',always_live:1,uri_name:'nfl-network',iframe:'https://taifood-blog.asia/embed/nfl-network'}]}]}),{status:200});
      throw new Error('offline');
    };
    const result = await fetchAllOtherStreams({fetchImpl:mockFetch});
    expect(result.providerOk.ntv).toBe(true);
    expect(result.counts.ppv).toBe(1);
    expect(result.counts.ntv).toBe(0);
    expect(result.items.filter(i=>i.embedUrl==='https://taifood-blog.asia/embed/nfl-network')).toHaveLength(1);
  });

  it('adds BinTV events and 24/7 channels with validated player-only URLs', () => {
    const encode = (url: string) => btoa(url).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const id = encode('https://ehgembxe.cfd/bintv/test-123');
    const wrapper = `https://bintv-sources.pages.dev/?id=${id}`;
    const events = parseBintvStreams({
      'Live Events': [{ID:'ev1',Name:'Teams',Category:'Soccer',Status:'Live',Streams:[{Name:'HD',Iframe:wrapper}]}],
      'Upcoming Events': [{ID:'ev2',Name:'Teams tomorrow',Category:'Basketball',Date:'2026-11-15 18:00 UTC',Streams:[{Name:'HD',Iframe:wrapper}]}],
      '24/7 Channels': [
        {ID:'ch1',Name:'ESPN',Streams:[{Name:'ESPN',Iframe:wrapper}]},
        {ID:'ch2',Name:'Cartoon Network',Streams:[{Name:'Cartoon',Iframe:wrapper}]},
        {ID:'ch3',Name:'Sky Sports F1',Streams:[{Name:'Sky Sports F1',Iframe:wrapper}]},
        {ID:'ch4',Name:'Bad Sport',Streams:[{Name:'Bad',Iframe:`https://bintv-sources.pages.dev/?id=${encode('https://evil.example/abc')}`}]},
      ],
    });
    expect(events.map(e => e.title)).toEqual(['Teams', 'Teams tomorrow', 'ESPN', 'Cartoon Network']);
    expect(events[0].embedUrl).toBe(wrapper);
    expect(events[1].startAt).toBe(Date.parse('2026-11-15T18:00:00Z'));
    expect(events[2].alwaysLive).toBe(true);
    const resolved = parsePrivateCockpitParams(new URL(buildPrivateCockpitHref(events[1]), 'https://freef1-live.vercel.app').search);
    expect(resolved?.embedUrl).toBe(events[1].embedUrl);
    expect(resolved?.status).toBe('scheduled');
    expect(buildBintvUrls(encode('https://shoewiki.click/bintv/test-123'))?.embedUrl).toContain('bintv-sources.pages.dev');
    expect(buildBintvUrls(encode('https://shoewiki.click.evil.example/bintv/test'))).toBeNull();
    expect(buildBintvUrls(encode('https://shoewiki.click/not-bintv/test'))).toBeNull();
    expect(buildBintvUrls(encode('https://evil.example/abc'))).toBeNull();
    expect(buildBintvUrls(encode('https://ehgembxe.cfd/bintv/test?x=1'))).toBeNull();
    expect(buildBintvUrls(encode('https://ehgembxe.cfd.evil.example/bintv/test'))).toBeNull();
  });

  it('fetches BinTV independently from other providers', async () => {
    const id = btoa('https://ehgembxe.cfd/bintv/test-123').replace(/=/g, '');
    const mockFetch: typeof fetch = async input => {
      if (String(input).includes('api.bintv.link')) return new Response(JSON.stringify({'Live Events':[{ID:'ev',Name:'Game',Category:'Soccer',Streams:[{Name:'HD',Iframe:`https://bintv-sources.pages.dev/?id=${id}`}]}]}), {status:200});
      throw new Error('offline');
    };
    const result = await fetchAllOtherStreams({fetchImpl:mockFetch});
    expect(result.providerOk.bintv).toBe(true);
    expect(result.counts.bintv).toBe(1);
  });

  it('adds live and scheduled Aura Sports events via the player-only embed', () => {
    const items = parseAuraEvents([{ category_name: 'nfl', schedule: [
      { id: 'espn-123', title: 'Team A at Team B', league_name: 'NFL', status: 'live', date: 1794751200000, iframeUrl: 'https://evil.test/anything' },
      { id: 'espn-456', title: 'Team C at Team D', league_name: 'NFL', status: 'scheduled', date: 1794762000000 },
      { id: 'f1-race', title: 'Formula 1 race', league_name: 'F1', status: 'live', date: 1794751200000 },
      { id: 'past', title: 'Finished game', league_name: 'NFL', status: 'finished', date: 1794751200000 },
      { id: '../bad', title: 'Bad', league_name: 'NFL', status: 'live', date: 1794751200000 },
    ] }]);
    expect(items.map(i => i.id)).toEqual(['espn-123', 'espn-456']);
    expect(items[0].embedUrl).toBe('https://play.aurasportsplayer.cfd/event/espn-123');
    expect(items[0].status).toBe('live');
    expect(items[1].status).toBe('scheduled');
    const resolved = parsePrivateCockpitParams(new URL(buildPrivateCockpitHref(items[1]), 'https://freef1-live.vercel.app').search);
    expect(resolved?.status).toBe('scheduled');
    expect(resolved?.startAt).toBe(1794762000000);
    expect(resolved?.embedUrl).toBe('https://play.aurasportsplayer.cfd/event/espn-456');
    expect(buildAuraUrls('../bad')).toBeNull();
    expect(parsePrivateCockpitParams('?s=7&id=https%3A%2F%2Fevil.example')).toBeNull();
  });

  it('fetches Aura independently of other providers', async () => {
    const mockFetch: typeof fetch = async input => {
      if (String(input).includes('aurasports.cfd/api/schedule')) return new Response(JSON.stringify([{category_name:'nfl',schedule:[{id:'espn-123',title:'Team A at Team B',status:'live',date:1794751200000}]}]), {status:200});
      throw new Error('offline');
    };
    const result = await fetchAllOtherStreams({fetchImpl: mockFetch});
    expect(result.providerOk.aura).toBe(true);
    expect(result.counts.aura).toBe(1);
  });

  it('includes live ZLive channels and uses the provider player-only embed', () => {
    const items = parseZliveSports({ channels: [
      { id: 'TSN4', name: 'TSN 4', sport: 'Sports', live: true, quality: 'FHD', region: 'CA', url: 'https://evil.example/should-not-be-used' },
      { id: 'adult-swim', name: 'Adult Swim', sport: 'Kids', live: true },
      { id: 'sky-f1', name: 'Sky Sports F1', sport: 'Sports', live: true },
      { id: 'movie', name: 'Movie channel', sport: 'Entertainment', live: true },
      { id: 'offline', name: 'Offline channel', sport: 'Sports', live: false },
      { id: '../bad', name: 'Bad path', sport: 'Sports', live: true },
    ] });
    expect(items.map(item => item.title)).toEqual(['TSN 4', 'Adult Swim', 'Movie channel']);
    expect(items[1].alwaysLive).toBe(true);
    expect(items[0].embedUrl).toBe('https://zlive.st/embed/TSN4');
    expect(parsePrivateCockpitParams(new URL(buildPrivateCockpitHref(items[0]), 'https://freef1-live.vercel.app').search)?.embedUrl).toBe(items[0].embedUrl);
    expect(buildZliveUrls('../bad')).toBeNull();
    expect(parsePrivateCockpitParams('?s=6&id=https%3A%2F%2Fevil.example')).toBeNull();
  });

  it('fetches ZLive independently of other providers', async () => {
    const mockFetch: typeof fetch = async input => {
      if (String(input).includes('zlive.st/embed/manifest.json')) return new Response(JSON.stringify({channels:[{id:'TSN4',name:'TSN 4',sport:'Sports',live:true}]}), {status:200});
      throw new Error('offline');
    };
    const result = await fetchAllOtherStreams({fetchImpl: mockFetch});
    expect(result.providerOk.zlive).toBe(true);
    expect(result.counts.zlive).toBe(1);
    expect(result.items[0].provider).toBe('zlive');
  });

  it('adds free TimStreams events and opens only validated provider event pages', () => {
    const parsed = parseTimstreamsEvents({ genres: [{ id: 1, name: 'Soccer' }, { id: 2, name: 'Motorsport' }], events: [
      { url: 'home-v-away', name: 'Home vs Away', genre: 1, time: '2026-11-15T09:00', streams: [{ url: 'https://example.com/player', vip: false }] },
      { url: 'f2-race', name: 'Formula 2 race', genre: 2, time: '2026-11-15T10:00', streams: [{ url: 'https://example.com/player' }] },
      { url: 'formula-1-race', name: 'Formula 1 race', genre: 2, time: '2026-11-15T10:00', streams: [{ url: 'https://example.com/player' }] },
      { url: 'premium', name: 'Premium', genre: 1, time: '2026-11-15T10:00', vip: true, streams: [{ url: 'https://example.com/player' }] },
      { url: 'secret', name: 'Premium only', genre: 1, time: '2026-11-15T10:00', streams: [{ url: 'https://example.com/player', vip: true }] },
      { url: '../admin', name: 'Invalid', genre: 1, time: '2026-11-15T10:00', streams: [{ url: 'https://example.com/player' }] },
    ] });
    expect(parsed.map(item => item.id)).toEqual(['home-v-away', 'f2-race']);
    expect(parsed[0].startAt).toBe(Date.parse('2026-11-15T14:00:00Z'));
    expect(parseTimstreamsTime('2026-07-01T09:00')).toBe(Date.parse('2026-07-01T13:00:00Z'));
    expect(buildTimstreamsUrls('../admin')).toBeNull();
    expect(buildTimstreamsUrls('https://evil.test')).toBeNull();
    const result = parsePrivateCockpitParams(new URL(buildPrivateCockpitHref(parsed[0]), 'https://freef1-live.vercel.app').search);
    expect(result?.embedUrl).toBe('https://tim-streams.com/watch/home-v-away');
    expect(result?.startAt).toBe(parsed[0].startAt);
    expect(parsePrivateCockpitParams('?s=5&id=https%3A%2F%2Fevil.test')).toBeNull();
  });

  it('uses only the current, free and allowlisted TimStreams player without the chat page', () => {
    const payload = { item: { url: 'home-v-away', streams: [
      { url: 'https://evil.example/player' },
      { url: 'https://ehgembxe.cfd/abc-123' },
    ] } };
    expect(extractTimstreamsPlayer(payload, 'home-v-away')).toBe('https://ehgembxe.cfd/abc-123');
    expect(extractTimstreamsPlayer(payload, 'other-event')).toBeNull();
    expect(extractTimstreamsPlayer({ item: { url: 'home-v-away', vip: true, streams: payload.item.streams } }, 'home-v-away')).toBeNull();
    expect(extractTimstreamsPlayer({ item: { url: 'home-v-away', streams: [{url: 'https://ehgembxe.cfd/abc', vip: true}] } }, 'home-v-away')).toBeNull();
    expect(extractTimstreamsPlayer({ item: { url: 'home-v-away', streams: [{url: 'https://ehgembxe.cfd.evil.example/abc'}] } }, 'home-v-away')).toBeNull();
  });

  it('fetches TimStreams independently while preserving other providers on failure', async () => {
    const mockFetch: typeof fetch = async input => {
      if (String(input).includes('tim-streams.com')) return new Response(JSON.stringify({ genres: [{id: 1, name: 'Soccer'}], events: [{ url:'home-v-away', name:'Home vs Away', genre:1, time:'2026-11-15T09:00', streams:[{url:'https://example.com/player'}] }] }), { status: 200 });
      throw new Error('offline');
    };
    const result = await fetchAllOtherStreams({fetchImpl: mockFetch});
    expect(result.providerOk.timstreams).toBe(true);
    expect(result.counts.timstreams).toBe(1);
    expect(result.items[0].provider).toBe('timstreams');
  });

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
    for (const name of ['skyf1', 'skyf1uhd', 'f1atvp', 'daznf1', 'skyf1de', 'skyf1it']) expect(isEmbdlolF1Channel(name), name).toBe(true);
    expect(isEmbdlolF1Channel('SkyMainEvent')).toBe(false);

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
      'https://embdlol.st/embed/22222222-3333-4444-5555-666666666666',
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
      'https://taifood-blog.asia/embed/nfl-network',
    );
    const liveGame = parsed.find((i) => i.id === 'nfl/2026-11-09/buf-min')!;
    expect(liveGame.embedUrl).toBe('https://taifood-blog.asia/embed/nfl/2026-11-09/buf-min');
  });

  it('returns live non-F1 Weelo streams, including F1 shows', () => {
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

    expect(parsed.map((item) => item.id)).toEqual(['showstream12', 'f2worldfeed99', 'f2espfeed8888']);
    expect(parsed[1]?.embedUrl).toBe(
      'https://weellz.live/beta?stream=f2worldfeed99',
    );
    expect(parsed[1]?.fallbackUrl).toBe('https://weellz.live/beta?stream=f2worldfeed99');
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
    expect(href.startsWith('/private-cockpit?')).toBe(true);
    expect(href).not.toMatch(/ppv|embdlol|weelo/i);

    const resolved = parsePrivateCockpitParams(href.split('?')[1] || '');
    expect(resolved).not.toBeNull();
    expect(resolved?.provider).toBe('ppv');
    expect(resolved?.title).toBe('Willow');
    expect(resolved?.stagePath).toBe('freef1://live/other/willow');
    expect(resolved?.stagePath).not.toMatch(/ppv|embdlol|weelo/i);
    expect(resolved?.embedUrl).toBe(
      'https://taifood-blog.asia/embed/247-willow',
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

it('discovers live RacingLap non-F1 series and shows, preserves player URL and excludes upcoming/F1', () => {
  const event=(key:string, name:string, state='live')=>({id:key,series:{key,name},session:key==='show'?'F1 Pre-Race Show':'Race',weekend:'Las Vegas',state,channels:[{name:'World Feed',language:'en',embed:'https://weellz.live/beta?stream=abcdef123'}]});
  const result=parseRacingLapOther({api:'racinglap',version:1,events:[event('f1','Formula 1'),event('f2','Formula 2'),event('f1a','F1 Academy'),event('show','Show'),event('indycar','IndyCar','upcoming'),{...event('evil','Other'),channels:[{name:'bad',embed:'https://weellz.live.evil.test/beta?stream=abcd'}]}]});
  expect(result.map(i=>i.category)).toEqual(['Formula 2','F1 Academy','Shows']);
  expect(result.every(i=>i.embedUrl==='https://weellz.live/beta?stream=abcdef123')).toBe(true);
  for (const item of result) expect(parsePrivateCockpitParams(new URL(buildPrivateCockpitHref(item),'https://example.test').search)?.embedUrl).toBe(item.embedUrl);
  expect(()=>parseRacingLapOther({events:[]})).toThrow();
});
it('uses one RacingLap API request and falls back to old sources only on failure', async () => {
  const requests:string[]=[];
  const make=async (fail:boolean)=>fetchAllOtherStreams({fetchImpl:async input=>{const u=String(input);requests.push(u);if(u.includes('/api/v1/streams.json') && u.includes('racinglap.net')) {if(fail) throw Error('offline');return new Response(JSON.stringify({api:'racinglap',version:1,events:[]}));} if(u.includes('weelo.live/players/events.json'))return new Response(JSON.stringify({events:[]}));throw Error('offline');}});
  let result=await make(false);expect(result.providerOk.weelo).toBe(true);expect(requests.filter(u=>u.includes('racinglap.net/api/v1/streams')).length).toBe(1);expect(requests.some(u=>u.includes('weelo.live/players/events'))).toBe(false);expect(requests.some(u=>u.includes('racinglap.net/api/status'))).toBe(false);
  requests.length=0;result=await make(true);expect(result.providerOk.weelo).toBe(true);expect(requests.some(u=>u.includes('weelo.live/players/events'))).toBe(true);
});
