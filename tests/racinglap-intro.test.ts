import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { isRacingLapReplay } from '../src/features/racinglap-intro';
import { requestPlayerAutoplay } from '../src/features/player-autoplay';
describe('player presentation', () => {
  it('recognises RacingLap replays', () => {
    expect(isRacingLapReplay('https://weellz.live/replay?id=abc')).toBe(true);
    expect(isRacingLapReplay('https://weellz.live.evil.test/replay?id=abc')).toBe(false);
  });
  it('requests autoplay only for supported embeds without changing unknown URLs', () => {
    expect(requestPlayerAutoplay('https://weellz.live/beta?stream=abc')).toBe('https://weellz.live/beta?stream=abc&autoplay=1');
    expect(requestPlayerAutoplay('https://weellz.live/replay?id=abc')).toBe('https://weellz.live/replay?id=abc&autoplay=1');
    expect(requestPlayerAutoplay('https://ok.ru/videoembed/123?nochat=1')).toBe('https://ok.ru/videoembed/123?nochat=1&autoplay=1');
    expect(requestPlayerAutoplay('https://example.com/player?signature=abc')).toBe('https://example.com/player?signature=abc');
    expect(requestPlayerAutoplay('https://weellz.live.evil.test/beta?stream=abc')).toBe('https://weellz.live.evil.test/beta?stream=abc');
  });
  it('does not create the custom RacingLap intro on any cockpit', () => {
    for (const file of ['../src/app.ts','../src/pages/private-cockpit.ts','../src/pages/replay-cockpit.ts']) {
      const source = readFileSync(new URL(file, import.meta.url), 'utf8');
      expect(source).not.toContain('playRacingLapIntro');
      expect(source).toContain('requestPlayerAutoplay');
    }
  });
});
