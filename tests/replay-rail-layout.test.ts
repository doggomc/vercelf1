import { describe, expect, it } from 'vitest';
import { replayRailWidth } from '../src/features/replay-rail-layout';
describe('replay rail geometry', () => {
  it('leaves a 16px gap from the player and a 16px outer gutter', () => {
    const playerRight = 1115, containerRight = 1360;
    const width = replayRailWidth(playerRight, containerRight, 1360);
    expect(width).toBe(213);
    expect(containerRight - 16 - width).toBeGreaterThanOrEqual(playerRight + 16);
  });
  it('places the rail underneath when there is too little room or on a narrow screen', () => {
    expect(replayRailWidth(1200, 1360, 1360)).toBe(0);
    expect(replayRailWidth(500, 1050, 1050)).toBe(0);
  });
  it('caps the rail width and rounds down rather than encroaching on the gap', () => {
    expect(replayRailWidth(800, 1500, 1500)).toBe(320);
    expect(replayRailWidth(1100.2, 1300, 1300)).toBe(167);
  });
});
