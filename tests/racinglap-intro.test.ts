import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {isRacingLapDirect, isRacingLapReplay} from '../src/features/racinglap-intro';
const app=readFileSync(new URL('../src/app.ts',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/styles/app.css',import.meta.url),'utf8');
describe('RacingLap stream intro',()=>{
  it('targets only direct RacingLap player sources, not other or relayed feeds',()=>{
    expect(isRacingLapDirect({autoProvider:'weelo'},'https://weellz.live/beta?stream=abc')).toBe(true);
    expect(isRacingLapDirect({weelo:'abc'},'https://weellz.live/at?id=abc')).toBe(true);
    expect(isRacingLapDirect({autoProvider:'weelo',stripped:true},'https://weellz.live/beta?stream=abc')).toBe(false);
    expect(isRacingLapDirect({autoProvider:'ppv'},'https://weellz.live/beta?stream=abc')).toBe(false);
    expect(isRacingLapDirect({autoProvider:'weelo'},'https://weellz.live.evil.test/beta?stream=abc')).toBe(false);
    expect(isRacingLapDirect({autoProvider:'weelo'},'https://f1admin.onrender.com/api/stream/weellz-embed?stream=abc')).toBe(false);
  });
  it('recognises direct RacingLap replays only',()=>{
    expect(isRacingLapReplay('https://weellz.live/replay?id=abc')).toBe(true);
    expect(isRacingLapReplay('https://ok.ru/videoembed/123')).toBe(false);
    expect(isRacingLapReplay('https://weellz.live.evil.test/replay?id=abc')).toBe(false);
  });
  it('preserves the player and clears the intro on new loads and errors',()=>{
    const attempt=app.slice(app.indexOf('function attemptSource('),app.indexOf('function load()'));
    expect(attempt).toContain('makeStreamIframe(targetUrl');
    expect(attempt).toContain('racingLapIntroToken !== token');
    expect(app.slice(app.indexOf('function showNoStream('),app.indexOf('function hideNoStream('))).toContain('clearRacingLapIntro(stageBox)');
    expect(app.slice(app.indexOf('function load()'),app.indexOf('let streamOverride ='))).toContain('clearRacingLapIntro(stageBox)');
    expect(css).toContain('pointer-events:none');
    expect(css).toContain('prefers-reduced-motion:reduce');
  });
});
