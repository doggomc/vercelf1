import { describe, expect, it } from 'vitest';
import { fitHakunaFrame, isHakunaCleanPlayer } from '../src/features/hakuna-frame';

describe('Hakuna clean player fitting', () => {
  it('only fits the specific clean player, never another provider', () => {
    expect(isHakunaCleanPlayer('https://hakunamatata5.org/sky-main-event/clean.html')).toBe(true);
    expect(isHakunaCleanPlayer('https://hakunamatata5.org/sky-main-event/clean.html?v=1')).toBe(true);
    expect(isHakunaCleanPlayer('https://hakunamatata5.org/hakunamatata5.html')).toBe(false);
    expect(isHakunaCleanPlayer('https://evil.example/sky-main-event/clean.html')).toBe(false);
    expect(isHakunaCleanPlayer('not a URL')).toBe(false);
  });
  it('scales the full 500px player to each stage size', () => {
    for (const [width, height] of [[320,180], [800,450], [1600,900]]) {
      const fit = fitHakunaFrame(width, height)!;
      expect(fit.width * fit.scale).toBeCloseTo(width);
      expect(500 * fit.scale).toBeCloseTo(height);
    }
    expect(fitHakunaFrame(0, 0)).toBeNull();
  });
});
