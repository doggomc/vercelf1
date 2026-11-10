import { describe, it, expect } from 'vitest';
import { groupWeekends, safeSource, replayHref, type Event } from '../src/lib/replays-feed';
const event = (series: Event['series'], round=13): Event => ({ id:`${series}-${round}`, title:'Grand Prix', series, season:2026, round, circuit:'Monza', country:'Italy', sessions:[{ key:'race', name:'Race', startsAt:'', replay:{ id:'abc', publishedAt:'2026-01-01', sources:[{label:'International Feed',url:'https://weellz.live/replay?id=abc'}] } }] });
describe('replays feed', () => {
  it('groups series by race weekend and orders newest first', () => { const w=groupWeekends([event('f2'),event('f1',14),event('f1')]); expect(w.map(x=>x.round)).toEqual([14,13]);expect(w[1].events).toHaveLength(2); });
  it('only accepts approved replay embeds', () => { expect(safeSource('https://weellz.live/replay?id=abc')).toBeTruthy(); expect(safeSource('https://weellz.live.evil.test/replay?id=abc')).toBeNull();expect(safeSource('javascript:alert(1)')).toBeNull(); });
  it('uses event and session identifiers in links', () => { const e=event('f1');expect(replayHref(e,e.sessions[0])).toBe('/replay-cockpit?e=f1-13&s=race'); });
});
