import { describe, it, expect } from 'vitest';
import archive from '../src/data/replays-browser.json';
import { groupWeekends, safeSource, replayHref, fullRacesEvents, type Event } from '../src/lib/replays-feed';
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
  it('uses event and session identifiers in links', () => { const e=event('f1');expect(replayHref(e,e.sessions[0])).toBe('/replay-cockpit?e=f1-13&s=race'); });
});
