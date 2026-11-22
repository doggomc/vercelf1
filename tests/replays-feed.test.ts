import { describe, it, expect } from 'vitest';
import archive from '../src/data/replays-browser.json';
import { groupWeekends, safeSource, replayHref, fullRacesEvents, mergeRacingLap, type Event } from '../src/lib/replays-feed';
const event = (series: Event['series'], round=13): Event => ({ id:`${series}-${round}`, title:'Grand Prix', series, season:2026, round, circuit:'Monza', country:'Italy', sessions:[{ key:'race', name:'Race', startsAt:'', replay:{ id:'abc', publishedAt:'2026-01-01', sources:[{label:'International Feed',url:'https://weellz.live/replay?id=abc'}] } }] });
describe('replays feed', () => {
  it('groups series by race weekend and orders newest first', () => { const w=groupWeekends([event('f2'),event('f1',14),event('f1')]); expect(w.map(x=>x.round)).toEqual([14,13]);expect(w[1].events).toHaveLength(2); });
  it('only accepts approved replay embeds', () => { expect(safeSource('https://weellz.live/replay?id=abc')).toBeTruthy(); expect(safeSource('https://weellz.live.evil.test/replay?id=abc')).toBeNull();expect(safeSource('javascript:alert(1)')).toBeNull(); });
  it('converts FullRaces Mexico into a single race with both OK.ru broadcasts', () => {
    const items = [{slug:'race-f1-2026-mexico-city-grand-prix',season:2026,session:'Race',sessionKey:'race',event:'Mexico City Grand Prix',date:'2026-11-01',players:[{provider:'F1TV 1080p',url:'https://ok.ru/videoembed/16714114796204'},{provider:'SkySports',url:'https://ok.ru/videoembed/16723911707308?nochat=1&autoplay=1'}]}];
    const [e] = fullRacesEvents(items);
    expect(e.round).toBe(19); expect(e.sessions[0].replay.sources.map(x=>x.label)).toEqual(['F1TV 1080p','SkySports']);
    expect(e.sessions[0].replay.sources.every(x=>x.url.includes('nochat=1'))).toBe(true);
    expect(safeSource('https://ok.ru.evil.test/videoembed/123')).toBeNull();
    expect(safeSource('https://ok.ru/videoembed/123/other')).toBeNull();
  });
  it('includes every indexed 2026 round through 20 and recognises FullRaces practice spellings', () => {
    const events = fullRacesEvents(archive.items);
    expect(events.filter(e => e.season === 2026).map(e => e.round).sort((a,b) => a-b)).toEqual(Array.from({length:20}, (_, i) => i+1));
    const china = events.find(e => e.season === 2026 && e.round === 2)!;
    expect(china.sessions.map(s => s.key)).toEqual(expect.arrayContaining(['fp1', 'sprint-qualifying']));
  });
  it('merges Weellz into matching sessions without duplicates and adds missing sessions', () => {
    const existing = fullRacesEvents([{slug:'race-f1-2026-mexico-city-grand-prix',season:2026,sessionKey:'race',event:'Mexico City',date:'2026-11-01',players:[{provider:'SkySports',url:'https://ok.ru/videoembed/123'}]}]);
    const feed = {label:'Weellz · F1 TV',url:'https://weellz.live/replay?id=TG5Ocb9P9Ge-f1tv'};
    const items = [{season:2026,round:19,key:'race',id:'TG5Ocb9P9Ge',sources:[feed,feed]}, {season:2026,round:19,key:'fp1',id:'practice',sources:[feed]}, {season:2026,round:19,key:'race',id:'bad',sources:[{label:'bad',url:'https://evil.test/replay?id=bad'}]}];
    const [merged] = mergeRacingLap(existing,items);
    expect(merged.id).toBe(existing[0].id);
    expect(merged.sessions.find(s=>s.key==='race')!.replay.sources.map(s=>s.label)).toEqual(['Weellz · F1 TV','SkySports']);
    expect(merged.sessions.find(s=>s.key==='fp1')!.replay.sources).toHaveLength(1);
    expect(existing[0].sessions[0].replay.sources).toHaveLength(1);
  });
  it('creates a missing 2026 weekend from the schedule and rejects unsupported seasons', () => {
    const item = {season:2026,round:19,key:'race',id:'abc',sources:[{label:'Weellz',url:'https://weellz.live/replay?id=abc'}]};
    const merged = mergeRacingLap([], [item,{...item,season:2025}]);
    expect(merged).toHaveLength(1); expect(merged[0].round).toBe(19); expect(merged[0].sessions[0].key).toBe('race');
  });
  it('uses event and session identifiers in links', () => { const e=event('f1');expect(replayHref(e,e.sessions[0])).toBe('/replay-cockpit?e=f1-13&s=race'); });
});
